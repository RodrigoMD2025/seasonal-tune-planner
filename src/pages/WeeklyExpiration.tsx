import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { isDateInCurrentWeek, formatDate } from '@/lib/date-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, ArrowLeft, Undo2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

interface Schedule {
  id: string;
  clientName?: string;
  endDate: Timestamp | string;
  period: string;
  validadeTratada?: boolean;
}

const WeeklyExpirationPage = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExpiringSchedules = async () => {
      setLoading(true);
      try {
        const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
        const allSchedules: Schedule[] = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));

        const expiringThisWeek = allSchedules.filter(s => {
          if (!s.endDate) return false;
          const dateToCheck = s.endDate instanceof Timestamp ? s.endDate.toDate() : s.endDate;
          return isDateInCurrentWeek(dateToCheck);
        });

        setSchedules(expiringThisWeek);
      } catch (err) {
        console.error("Erro ao buscar agendamentos:", err);
        setError('Não foi possível carregar os dados.');
      } finally {
        setLoading(false);
      }
    };

    fetchExpiringSchedules();
  }, []);

  const handleToggleTreated = async (scheduleId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    // Atualiza a UI otimisticamente
    setSchedules(schedules.map(s => s.id === scheduleId ? { ...s, validadeTratada: newStatus } : s));

    try {
      const scheduleRef = doc(db, 'schedules', scheduleId);
      await updateDoc(scheduleRef, { validadeTratada: newStatus });
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      // Reverte em caso de erro
      setSchedules(schedules.map(s => s.id === scheduleId ? { ...s, validadeTratada: currentStatus } : s));
      // TODO: Adicionar toast de erro
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex justify-between items-center">
          <Link to="/">
            <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Voltar ao Dashboard</Button>
          </Link>
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">
              {schedules.filter(s => !s.validadeTratada).length} / {schedules.length}
            </p>
            <p className="text-sm text-muted-foreground">Pendentes / Total na Semana</p>
          </div>
        </div>
        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl">Validades da Semana</CardTitle>
            <CardDescription>Lista de clientes com playlists expirando esta semana.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground mt-2">Carregando...</p>
              </div>
            ) : error ? (
              <p className="text-destructive text-center py-12">{error}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Cliente</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Data de Término</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.length > 0 ? (
                    schedules.map((schedule) => (
                      <TableRow key={schedule.id} data-state={schedule.validadeTratada ? 'treated' : 'untreated'} className="data-[state=treated]:text-muted-foreground data-[state=treated]:line-through">
                        <TableCell className="font-medium">{schedule.clientName}</TableCell>
                        <TableCell><Badge variant="secondary">{schedule.period}</Badge></TableCell>
                        <TableCell>{formatDate(schedule.endDate)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleToggleTreated(schedule.id, !!schedule.validadeTratada)}>
                            {schedule.validadeTratada ? (
                              <><Undo2 className="w-4 h-4 mr-2" />Desmarcar</>
                            ) : (
                              <><CheckCircle className="w-4 h-4 mr-2 text-green-500" />Marcar como Tratado</>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Nenhum agendamento expirando esta semana.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WeeklyExpirationPage;
