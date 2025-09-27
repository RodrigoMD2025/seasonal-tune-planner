import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Trash2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";

import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

interface Period {
  id: string;
  startDate: string;
  endDate: string;
  playlistTypes: string[];
  broadcast: string;
}

interface Client {
  id: string;
  name: string;
  musicStyle: string;
}

interface ExistingSchedule {
  id: string;
  startDate: string | Timestamp;
  endDate: string | Timestamp;
  period: string;
  broadcast: string;
}

interface CreateScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateScheduleDialog = ({ open, onOpenChange }: CreateScheduleDialogProps) => {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [musicStyle, setMusicStyle] = useState<string>("");
  const [periods, setPeriods] = useState<Period[]>([]); // Começa vazio
  const [clients, setClients] = useState<Client[]>([]);
  const [existingSchedules, setExistingSchedules] = useState<ExistingSchedule[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      if (!open) return;
      try {
        setLoadingClients(true);
        const clientsCollection = collection(db, "clients");
        const clientSnapshot = await getDocs(clientsCollection);
        const clientsList = clientSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, musicStyle: doc.data().musicStyle })).sort((a, b) => a.name.localeCompare(b.name));
        setClients(clientsList);
      } catch (err) { console.error("Erro ao buscar clientes:", err); toast({ title: "Erro", description: "Não foi possível carregar a lista de clientes.", variant: "destructive" });
      } finally { setLoadingClients(false); }
    };
    fetchClients();
  }, [open, toast]);

  useEffect(() => {
    const clientData = clients.find(c => c.id === selectedClient);
    setMusicStyle(clientData ? clientData.musicStyle : "");

    const fetchExistingSchedules = async () => {
      if (!selectedClient) {
        setExistingSchedules([]);
        return;
      }
      setLoadingExisting(true);
      try {
        const q = query(collection(db, "schedules"), where("client", "==", selectedClient));
        const scheduleSnapshot = await getDocs(q);
        const schedulesList = scheduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ExistingSchedule);
        setExistingSchedules(schedulesList);
      } catch (err) { console.error("Erro ao buscar agendamentos existentes:", err); }
      finally { setLoadingExisting(false); }
    };

    fetchExistingSchedules();
  }, [selectedClient, clients]);

  const addPeriod = () => setPeriods([...periods, { id: Date.now().toString(), startDate: "", endDate: "", playlistTypes: [], broadcast: "" }]);
  const removePeriod = (id: string) => setPeriods(periods.filter(p => p.id !== id));
  const updatePeriod = (id: string, field: keyof Period, value: any) => setPeriods(periods.map(p => p.id === id ? { ...p, [field]: value } : p));
  const togglePlaylistType = (periodId: string, type: string) => {
    const period = periods.find(p => p.id === periodId);
    if (!period) return;
    const newTypes = period.playlistTypes.includes(type) ? period.playlistTypes.filter(t => t !== type) : [...period.playlistTypes, type];
    updatePeriod(periodId, 'playlistTypes', newTypes);
  };

  const resetForm = () => {
    setSelectedClient("");
    setMusicStyle("");
    setPeriods([]);
    setExistingSchedules([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const clientData = clients.find(c => c.id === selectedClient);
    const validPeriods = periods.filter(p => p.startDate && p.endDate && p.playlistTypes.length > 0 && p.broadcast);

    if (!clientData || validPeriods.length === 0) {
      toast({ title: "Erro de Validação", description: "Preencha o cliente e ao menos um período completo.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      const schedulesCollection = collection(db, "schedules");
      const creationPromises = validPeriods.map((period, index) => addDoc(schedulesCollection, {
        client: clientData.id,
        clientName: clientData.name,
        musicStyle: clientData.musicStyle,
        startDate: period.startDate,
        endDate: period.endDate,
        playlistTypes: period.playlistTypes,
        broadcast: period.broadcast,
        period: `Período ${existingSchedules.length + index + 1}`,
        validadeTratada: false,
        status: "scheduled",
        createdAt: new Date(),
      }));

      await Promise.all(creationPromises);
      toast({ title: "Sucesso!", description: `${creationPromises.length} novo(s) período(s) criado(s).` });
      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error("Erro ao criar agendamento:", err);
      toast({ title: "Erro", description: "Não foi possível criar o agendamento.", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" />Novo Agendamento</DialogTitle>
          <DialogDescription>Selecione um cliente para ver os períodos existentes e adicionar novos.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Informações do Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client">Cliente</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient} disabled={loadingClients}>
                    <SelectTrigger>{loadingClients ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}<SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                    <SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div><Label htmlFor="musicStyle">Estilo Musical</Label><Input id="musicStyle" value={musicStyle} readOnly className="bg-muted" /></div>
              </div>
            </CardContent>
          </Card>

          {loadingExisting && <div className="text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}
          {existingSchedules.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Períodos Já Cadastrados</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {existingSchedules.map((s, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-muted/50 rounded-md text-sm">
                    <span className="font-semibold">{s.period}</span>
                    <span>{formatDate(s.startDate)} - {formatDate(s.endDate)}</span>
                    <Badge variant="secondary">{s.broadcast}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Adicionar Novo(s) Período(s)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {periods.length === 0 && selectedClient && (
                <div className="text-center py-4">
                  <Button type="button" variant="outline" onClick={addPeriod}><Plus className="w-4 h-4 mr-2" />Adicionar Novo Período</Button>
                </div>
              )}
              {periods.map((period, index) => (
                <Card key={period.id} className="bg-muted/30">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm">Novo Período #{existingSchedules.length + index + 1}</CardTitle>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removePeriod(period.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Data de Início</Label><Input type="date" value={period.startDate} onChange={(e) => updatePeriod(period.id, 'startDate', e.target.value)} /></div>
                      <div><Label>Data de Término</Label><Input type="date" value={period.endDate} onChange={(e) => updatePeriod(period.id, 'endDate', e.target.value)} /></div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tipo de Playlist</Label>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center space-x-2"><Checkbox id={`c-instr-${period.id}`} checked={period.playlistTypes.includes('Instrumental')} onCheckedChange={() => togglePlaylistType(period.id, 'Instrumental')} /><Label htmlFor={`c-instr-${period.id}`} className="text-sm">Instrumental</Label></div>
                        <div className="flex items-center space-x-2"><Checkbox id={`c-vocal-${period.id}`} checked={period.playlistTypes.includes('Vocal')} onCheckedChange={() => togglePlaylistType(period.id, 'Vocal')} /><Label htmlFor={`c-vocal-${period.id}`} className="text-sm">Vocal</Label></div>
                      </div>
                    </div>
                    <div>
                      <Label>Tipo de Veiculação</Label>
                      <Select value={period.broadcast} onValueChange={(value) => updatePeriod(period.id, 'broadcast', value)}><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger><SelectContent><SelectItem value="Mesclada">Mesclada</SelectItem><SelectItem value="100% Natal">100% Natal</SelectItem></SelectContent></Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {periods.length > 0 && (
                <div className="text-center mt-4">
                  <Button type="button" variant="outline" size="sm" onClick={addPeriod}><Plus className="w-4 h-4 mr-2" />Adicionar outro Período</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" className="bg-gradient-christmas shadow-christmas" disabled={isSubmitting || periods.length === 0}>{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar Agendamento</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};