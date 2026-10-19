import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  getDocs,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Database,
  Download,
  Loader2,
  Trash2,
  Users,
} from 'lucide-react';

const CONFIRMATION_WORD = 'ZERAR';

/**
 * Converte os documentos do Firestore em JSON, transformando Timestamps
 * em datas ISO legíveis.
 */
const serializeDocs = (docs: QueryDocumentSnapshot<DocumentData>[]) => {
  return JSON.stringify(
    docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    (_key, value) => {
      if (value && typeof value === 'object' && typeof value.toDate === 'function') {
        return value.toDate().toISOString();
      }
      return value;
    },
    2,
  );
};

const downloadJson = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const buildBackupFilename = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `backup-agendamentos-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
};

const SettingsPage = () => {
  const { toast } = useToast();
  const [scheduleCount, setScheduleCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isPreparingReset, setIsPreparingReset] = useState(false);
  const [pendingDocs, setPendingDocs] = useState<QueryDocumentSnapshot<DocumentData>[]>([]);

  const loadCounts = async () => {
    setLoadingCounts(true);
    setError(null);
    try {
      const [schedulesSnapshot, clientsSnapshot] = await Promise.all([
        getDocs(collection(db, 'schedules')),
        getDocs(collection(db, 'clients')),
      ]);
      setScheduleCount(schedulesSnapshot.size);
      setClientCount(clientsSnapshot.size);
    } catch (err) {
      console.error('Erro ao carregar dados do banco:', err);
      setError('Não foi possível carregar os dados. Verifique sua conexão e permissões.');
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    try {
      const snapshot = await getDocs(collection(db, 'schedules'));
      if (snapshot.empty) {
        toast({ title: 'Nada para exportar', description: 'Não há agendamentos no banco de dados.' });
        return;
      }
      downloadJson(serializeDocs(snapshot.docs), buildBackupFilename());
      toast({
        title: 'Backup gerado',
        description: `${snapshot.size} agendamentos exportados para o arquivo JSON.`,
      });
    } catch (err) {
      console.error('Erro ao gerar backup:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o backup dos agendamentos.',
        variant: 'destructive',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const openResetDialog = async () => {
    setConfirmationText('');
    setIsPreparingReset(true);
    setError(null);
    try {
      const snapshot = await getDocs(collection(db, 'schedules'));
      setPendingDocs(snapshot.docs);
      setScheduleCount(snapshot.size);
      if (snapshot.empty) {
        toast({ title: 'Nada para excluir', description: 'Não há agendamentos no banco de dados.' });
        return;
      }
      setIsDialogOpen(true);
    } catch (err) {
      console.error('Erro ao preparar a exclusão:', err);
      setError('Não foi possível carregar os agendamentos para exclusão.');
      setIsDialogOpen(false);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os agendamentos. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsPreparingReset(false);
    }
  };

  const handleResetSchedules = async () => {
    if (confirmationText.trim().toUpperCase() !== CONFIRMATION_WORD) return;
    if (isPreparingReset || pendingDocs.length === 0) return;

    const docs = pendingDocs;

    // Backup automático ANTES de qualquer exclusão. Disparado de forma síncrona
    // no clique para o navegador não bloquear o download.
    downloadJson(serializeDocs(docs), buildBackupFilename());

    setIsDeleting(true);
    setDeletedCount(0);
    setError(null);

    try {
      // Exclui em lotes de 500 (limite do Firestore por batch)
      for (let index = 0; index < docs.length; index += 500) {
        const chunk = docs.slice(index, index + 500);
        const batch = writeBatch(db);
        chunk.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        setDeletedCount((previous) => Math.min(previous + chunk.length, docs.length));
      }

      setScheduleCount(0);
      setPendingDocs([]);
      setIsDialogOpen(false);
      setConfirmationText('');
      toast({
        title: 'Agendamentos excluídos',
        description: `${docs.length} agendamentos foram removidos e o backup foi baixado. Os ${clientCount} clientes foram mantidos.`,
      });
      await loadCounts();
    } catch (err) {
      console.error('Erro ao zerar agendamentos:', err);
      setError('Não foi possível concluir a exclusão. Nenhum cliente foi afetado.');
      toast({
        title: 'Erro na exclusão',
        description: 'O processo foi interrompido. Verifique sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isConfirmationValid = confirmationText.trim().toUpperCase() === CONFIRMATION_WORD;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex justify-between items-center">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Database className="w-7 h-7 text-primary" />
            Configurações do Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os dados utilizados pelo Agendador Natalinas.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Agendamentos
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {loadingCounts ? <Loader2 className="w-6 h-6 animate-spin" /> : scheduleCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Registros na coleção de agendamentos
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clientes
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {loadingCounts ? <Loader2 className="w-6 h-6 animate-spin" /> : clientCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cadastros de clientes (não são afetados pelo reset)
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-border/50 mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Backup dos Agendamentos
            </CardTitle>
            <CardDescription>
              Baixe uma cópia completa de todos os agendamentos em formato JSON antes de iniciar
              um novo ciclo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleBackupNow} disabled={isBackingUp || loadingCounts}>
              {isBackingUp ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Baixar backup agora
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-destructive/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Zona de Perigo — Reset Anual
            </CardTitle>
            <CardDescription>
              Use esta ação uma vez por ano, ao encerrar o ciclo de playlists natalinas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">O que acontece ao zerar os agendamentos:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Todos os <strong>{scheduleCount}</strong> agendamentos são excluídos permanentemente;</li>
                <li>Um backup JSON é baixado automaticamente antes da exclusão;</li>
                <li>Os <strong>{clientCount}</strong> clientes são mantidos intactos;</li>
                <li>Esta ação não pode ser desfeita pelo sistema.</li>
              </ul>
            </div>

            <Button
              variant="destructive"
              onClick={openResetDialog}
              disabled={loadingCounts || scheduleCount === 0 || isPreparingReset}
            >
              {isPreparingReset ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Zerar agendamentos
            </Button>
            {scheduleCount === 0 && !loadingCounts && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                Não há agendamentos para excluir no momento.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (isDeleting) return;
          setIsDialogOpen(open);
          if (!open) setConfirmationText('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirmar exclusão de agendamentos
            </DialogTitle>
            <DialogDescription>
              Esta ação excluirá permanentemente <strong>{pendingDocs.length} agendamentos</strong> e
              manterá os {clientCount} clientes. Um backup JSON será baixado automaticamente antes da
              exclusão — se o navegador bloquear o download, permita downloads para este site.
            </DialogDescription>
          </DialogHeader>

          {isPreparingReset ? (
            <div className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Carregando agendamentos...
            </div>
          ) : (
            <div className="space-y-2 py-2">
              <Label htmlFor="confirmation">
                Para confirmar, digite <strong>{CONFIRMATION_WORD}</strong> abaixo:
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
                placeholder={CONFIRMATION_WORD}
                autoComplete="off"
                disabled={isDeleting}
              />
              {isDeleting && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Excluindo agendamentos... {deletedCount}/{pendingDocs.length}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetSchedules}
              disabled={!isConfirmationValid || isDeleting || isPreparingReset || pendingDocs.length === 0}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir {pendingDocs.length} agendamentos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
};

export default SettingsPage;
