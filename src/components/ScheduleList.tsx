import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Music, Edit, Trash2, Loader2, Search } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { EditScheduleDialog } from './EditScheduleDialog';
import { parse, isWithinInterval } from 'date-fns';

interface Schedule {
  id: string;
  clientName: string;
  musicStyle: string;
  startDate: string | Timestamp;
  endDate: string | Timestamp;
  playlistTypes: string[];
  broadcast: string;
  period: string;
  status: "draft" | "scheduled" | "active" | "completed" | "cancelled";
}

const parseDate = (date: string | Timestamp): Date | null => {
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === 'string') {
    let parsedDate = parse(date, 'yyyy-MM-dd', new Date());
    if (isNaN(parsedDate.getTime())) { parsedDate = parse(date, 'dd/MM/yyyy', new Date()); }
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
  return null;
};

const getDynamicStatus = (schedule: Schedule): Schedule['status'] => {
  const today = new Date();
  const startDate = parseDate(schedule.startDate);
  const endDate = parseDate(schedule.endDate);
  if (schedule.status === 'scheduled' && startDate && endDate && isWithinInterval(today, { start: startDate, end: endDate })) {
    return 'active';
  }
  return schedule.status;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active": return "bg-green-700 text-white";
    case "scheduled": return "bg-amber-500 text-white";
    case "completed": return "bg-muted text-muted-foreground";
    default: return "bg-secondary text-secondary-foreground";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "active": return "Em Veiculação";
    case "scheduled": return "Agendado";
    case "completed": return "Finalizado";
    default: return status;
  }
};

const getBroadcastColor = (broadcast: string) => {
  return broadcast === "100% Natal" ? "bg-christmas-red text-christmas-white" : "bg-indigo-600 text-white";
};

const getMusicStyleColor = (style: string) => {
  return "bg-blue-500 text-white";
};

export const ScheduleList = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState<Schedule | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const schedulesCollection = collection(db, "schedules");
      const scheduleSnapshot = await getDocs(schedulesCollection);
      const schedulesList: Schedule[] = scheduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
      schedulesList.sort((a, b) => {
        const dateA = a.startDate instanceof Timestamp ? a.startDate.toMillis() : new Date(a.startDate).getTime();
        const dateB = b.startDate instanceof Timestamp ? b.startDate.toMillis() : new Date(b.startDate).getTime();
        return dateB - dateA;
      });
      setSchedules(schedulesList);
    } catch (err) {
      console.error("Erro ao buscar agendamentos:", err);
      setError("Não foi possível carregar os agendamentos.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchSchedules(); }, []);

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este agendamento?")) return;
    try {
      await deleteDoc(doc(db, "schedules", id));
      toast({ title: "Sucesso!", description: "Agendamento excluído com sucesso." });
      fetchSchedules();
    } catch (err) {
      console.error("Erro ao excluir agendamento:", err);
      toast({ title: "Erro", description: "Não foi possível excluir o agendamento.", variant: "destructive" });
    }
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setScheduleToEdit(schedule);
    setIsEditDialogOpen(true);
  };

  const filteredSchedules = schedules.filter(schedule => 
    schedule.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-6 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" /><p className="text-muted-foreground">Carregando...</p></div>;
  if (error) return <div className="p-6 text-center text-destructive"><p>{error}</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="text-left">
          <h3 className="text-lg font-semibold text-foreground">Agendamentos de Playlist</h3>
          <p className="text-sm text-muted-foreground">Gerencie as programações natalinas dos clientes</p>
        </div>
        <div className="relative min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredSchedules.map((schedule) => {
          const dynamicStatus = getDynamicStatus(schedule);
          return (
            <Card key={schedule.id} className="shadow-sm border-border/50 hover:shadow-md transition-all">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-base font-medium text-foreground text-left">
                        {schedule.clientName} <span className="text-sm text-muted-foreground font-normal">- {schedule.period}</span>
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getMusicStyleColor(schedule.musicStyle)}>{schedule.musicStyle}</Badge>
                        <Badge className={getStatusColor(dynamicStatus)}>{getStatusText(dynamicStatus)}</Badge>
                        <Badge className={getBroadcastColor(schedule.broadcast)}>{schedule.broadcast}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditSchedule(schedule)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteSchedule(schedule.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex flex-col items-start">
                      <span className="text-muted-foreground">Início:</span>
                      <div className="font-medium text-foreground">{formatDate(schedule.startDate)}</div>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-muted-foreground">Término:</span>
                      <div className="font-medium text-foreground">{formatDate(schedule.endDate)}</div>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-muted-foreground">Tipo:</span>
                      <div className="flex items-center gap-1 font-medium text-foreground">
                        <Music className="w-3 h-3" />
                        {schedule.playlistTypes.join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredSchedules.length === 0 && !loading && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhum agendamento encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? `Nenhum resultado para "${searchTerm}".` : "Crie um agendamento para vê-lo aqui."}
          </p>
        </div>
      )}

      <EditScheduleDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen}
        scheduleToEdit={scheduleToEdit}
        onScheduleUpdated={fetchSchedules}
      />
    </div>
  );
};