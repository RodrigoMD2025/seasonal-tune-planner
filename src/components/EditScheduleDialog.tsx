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

import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
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

interface EditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleToEdit: any; // O agendamento a ser editado
  onScheduleUpdated: () => void; // Callback para recarregar a lista
}

export const EditScheduleDialog = ({ open, onOpenChange, scheduleToEdit, onScheduleUpdated }: EditScheduleDialogProps) => {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [musicStyle, setMusicStyle] = useState<string>("");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carregar dados do agendamento para edição
  useEffect(() => {
    if (open && scheduleToEdit) {
      setSelectedClient(scheduleToEdit.client);
      setMusicStyle(scheduleToEdit.musicStyle);
      // Mapear períodos para o formato do estado local
      setPeriods(scheduleToEdit.periods.map((p: any) => ({
        id: p.id || Date.now().toString(), // Garante um ID único
        startDate: p.startDate instanceof Date ? p.startDate.toISOString().split('T')[0] : p.startDate, // Formato YYYY-MM-DD
        endDate: p.endDate instanceof Date ? p.endDate.toISOString().split('T')[0] : p.endDate, // Formato YYYY-MM-DD
        playlistTypes: p.playlistTypes || [],
        broadcast: p.broadcast || ""
      })));
    } else if (open && !scheduleToEdit) {
      // Se abrir sem scheduleToEdit, inicializa com 2 períodos vazios
      setPeriods([
        { id: "1", startDate: "", endDate: "", playlistTypes: [], broadcast: "" },
        { id: "2", startDate: "", endDate: "", playlistTypes: [], broadcast: "" }
      ]);
    }
  }, [open, scheduleToEdit]);

  // Fetch clients dynamically
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        const clientsCollection = collection(db, "clients");
        const clientSnapshot = await getDocs(clientsCollection);
        const clientsList = clientSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          musicStyle: doc.data().musicStyle,
        })).sort((a, b) => a.name.localeCompare(b.name)); // Added sorting
        setClients(clientsList);
      } catch (err) {
        console.error("Erro ao buscar clientes para o formulário:", err);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de clientes.",
          variant: "destructive",
        });
      } finally {
        setLoadingClients(false);
      }
    };
    if (open) { // Fetch clients only when dialog is open
      fetchClients();
    }
  }, [open]);

  // Update musicStyle when client is selected
  useEffect(() => {
    const clientData = clients.find(c => c.name === selectedClient);
    if (clientData) {
      setMusicStyle(clientData.musicStyle);
    } else {
      setMusicStyle("");
    }
  }, [selectedClient, clients]);

  const addPeriod = () => {
    setPeriods([
      ...periods,
      {
        id: Date.now().toString(),
        startDate: "",
        endDate: "",
        playlistTypes: [],
        broadcast: ""
      }
    ]);
  };

  const removePeriod = (id: string) => {
    if (periods.length > 1) {
      setPeriods(periods.filter(p => p.id !== id));
    }
  };

  const updatePeriod = (id: string, field: keyof Period, value: any) => {
    setPeriods(periods.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const togglePlaylistType = (periodId: string, type: string) => {
    const period = periods.find(p => p.id === periodId);
    if (!period) return;

    const currentTypes = period.playlistTypes;
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    
    updatePeriod(periodId, 'playlistTypes', newTypes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Basic validation
    if (!selectedClient || !musicStyle || periods.some(p => !p.startDate || !p.endDate || p.playlistTypes.length === 0 || !p.broadcast)) {
      toast({
        title: "Erro de Validação",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      if (scheduleToEdit && scheduleToEdit.id) {
        const scheduleRef = doc(db, "schedules", scheduleToEdit.id);
        await updateDoc(scheduleRef, {
          client: selectedClient,
          musicStyle: musicStyle,
          periods: periods.map(p => ({
            startDate: new Date(p.startDate), // Convert string to Date object
            endDate: new Date(p.endDate),     // Convert string to Date object
            playlistTypes: p.playlistTypes,
            broadcast: p.broadcast,
          })),
          // status: scheduleToEdit.status, // Manter status existente ou atualizar
          updatedAt: new Date(),
        });
        toast({
          title: "Sucesso!",
          description: "Agendamento atualizado com sucesso.",
        });
      } else {
        // Isso não deve acontecer se o diálogo for usado apenas para edição
        toast({
          title: "Erro",
          description: "Agendamento para edição não encontrado.",
          variant: "destructive",
        });
      }
      
      onOpenChange(false);
      onScheduleUpdated(); // Recarrega a lista
      // Reset form (opcional, dependendo do fluxo)
      setSelectedClient("");
      setMusicStyle("");
      setPeriods([
        {
          id: "1",
          startDate: "",
          endDate: "",
          playlistTypes: [],
          broadcast: ""
        },
        {
          id: "2",
          startDate: "",
          endDate: "",
          playlistTypes: [],
          broadcast: ""
        }
      ]);
    } catch (err) {
      console.error("Erro ao atualizar agendamento:", err);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o agendamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Editar Agendamento de Playlist
          </DialogTitle>
          <DialogDescription>
            Edite os períodos de veiculação da playlist natalina para o cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client">Cliente</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient} disabled={loadingClients}>
                    <SelectTrigger>
                      {loadingClients ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((clientItem) => (
                        <SelectItem key={clientItem.id} value={clientItem.name}>
                          {clientItem.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="musicStyle">Estilo Musical</Label>
                  <Input id="musicStyle" value={musicStyle} readOnly className="bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Períodos de Veiculação */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Períodos de Veiculação</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPeriod}
                className="ml-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Período
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {periods.map((period, index) => (
                <Card key={period.id} className="bg-muted/30">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm">Período {index + 1}</CardTitle>
                    {periods.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePeriod(period.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Datas */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Data de Início</Label>
                        <Input
                          type="date"
                          value={period.startDate}
                          onChange={(e) => updatePeriod(period.id, 'startDate', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Data de Término</Label>
                        <Input
                          type="date"
                          value={period.endDate}
                          onChange={(e) => updatePeriod(period.id, 'endDate', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Tipos de Playlist */}
                    <div>
                      <Label className="text-sm font-medium">Tipo de Playlist</Label>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`instrumental-${period.id}`}
                            checked={period.playlistTypes.includes('Instrumental')}
                            onCheckedChange={() => togglePlaylistType(period.id, 'Instrumental')}
                          />
                          <Label htmlFor={`instrumental-${period.id}`} className="text-sm">
                            Instrumental
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`vocal-${period.id}`}
                            checked={period.playlistTypes.includes('Vocal')}
                            onCheckedChange={() => togglePlaylistType(period.id, 'Vocal')}
                          />
                          <Label htmlFor={`vocal-${period.id}`} className="text-sm">
                            Vocal
                          </Label>
                        </div>
                      </div>
                      {period.playlistTypes.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {period.playlistTypes.map((type) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tipo de Veiculação */}
                    <div>
                      <Label>Tipo de Veiculação</Label>
                      <Select 
                        value={period.broadcast} 
                        onValueChange={(value) => updatePeriod(period.id, 'broadcast', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mesclada">
                            Mesclada (Repertório base + Músicas de Natal)
                          </SelectItem>
                          <SelectItem value="100% Natal">
                            100% Natal
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-christmas shadow-christmas" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};