import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Interface alinhada com a nova estrutura de dados
interface Schedule {
  id: string;
  clientName: string;
  musicStyle: string;
  startDate: string | Timestamp;
  endDate: string | Timestamp;
  playlistTypes: string[];
  broadcast: string;
  period: string;
  status: string;
}

interface EditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleToEdit: Schedule | null;
  onScheduleUpdated: () => void;
}

export const EditScheduleDialog = ({ open, onOpenChange, scheduleToEdit, onScheduleUpdated }: EditScheduleDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<Schedule>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (scheduleToEdit) {
      // Converte Timestamps para strings no formato YYYY-MM-DD para os inputs de data
      const formattedSchedule = {
        ...scheduleToEdit,
        startDate: scheduleToEdit.startDate instanceof Timestamp 
          ? scheduleToEdit.startDate.toDate().toISOString().split('T')[0] 
          : scheduleToEdit.startDate,
        endDate: scheduleToEdit.endDate instanceof Timestamp 
          ? scheduleToEdit.endDate.toDate().toISOString().split('T')[0] 
          : scheduleToEdit.endDate,
      };
      setFormData(formattedSchedule);
    } else {
      setFormData({}); // Limpa o formulário se não houver agendamento
    }
  }, [scheduleToEdit]);

  const handleChange = (field: keyof Schedule, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePlaylistType = (type: string) => {
    const currentTypes = formData.playlistTypes || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    handleChange('playlistTypes', newTypes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleToEdit) return;
    setIsSubmitting(true);

    try {
      const scheduleRef = doc(db, "schedules", scheduleToEdit.id);
      await updateDoc(scheduleRef, {
        ...formData,
        updatedAt: new Date(),
      });

      toast({ title: "Sucesso!", description: "Agendamento atualizado com sucesso." });
      onOpenChange(false);
      onScheduleUpdated();
    } catch (err) {
      console.error("Erro ao atualizar agendamento:", err);
      toast({ title: "Erro", description: "Não foi possível atualizar o agendamento.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Agendamento</DialogTitle>
          <DialogDescription>Modifique os detalhes deste período de agendamento.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{formData.clientName} - {formData.period}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Início</Label>
                  <Input type="date" value={formData.startDate as string || ''} onChange={(e) => handleChange('startDate', e.target.value)} />
                </div>
                <div>
                  <Label>Data de Término</Label>
                  <Input type="date" value={formData.endDate as string || ''} onChange={(e) => handleChange('endDate', e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Tipo de Playlist</Label>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-instrumental" checked={formData.playlistTypes?.includes('Instrumental')} onCheckedChange={() => togglePlaylistType('Instrumental')} />
                    <Label htmlFor="edit-instrumental">Instrumental</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-vocal" checked={formData.playlistTypes?.includes('Vocal')} onCheckedChange={() => togglePlaylistType('Vocal')} />
                    <Label htmlFor="edit-vocal">Vocal</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label>Tipo de Veiculação</Label>
                <Select value={formData.broadcast || ''} onValueChange={(value) => handleChange('broadcast', value)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mesclada">Mesclada (Repertório base + Músicas de Natal)</SelectItem>
                    <SelectItem value="100% Natal">100% Natal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
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
