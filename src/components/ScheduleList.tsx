import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Music, Edit, Trash2, Loader2, Search, Filter, X } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { EditScheduleDialog } from './EditScheduleDialog';
import { ScheduleObservation } from './ScheduleObservation';
import type { PlaylistFilter } from './PlaylistAdoptionCard';
import { parse, endOfDay, isBefore, isAfter } from 'date-fns';

interface Schedule {
  id: string;
  client?: string;
  clientName: string;
  musicStyle: string;
  startDate: string | Timestamp;
  endDate: string | Timestamp;
  playlistTypes: string[];
  broadcast: string;
  period: string;
  status: "draft" | "scheduled" | "active" | "completed" | "cancelled";
  createdAt?: string | Timestamp;
  observation?: string;
}

interface ScheduleListProps {
  playlistFilter?: PlaylistFilter | null;
  onClearPlaylistFilter?: () => void;
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

const getScheduleReferenceTime = (schedule: Schedule): number => {
  const createdAt = schedule.createdAt ? parseDate(schedule.createdAt) : null;
  if (createdAt) return createdAt.getTime();
  const startDate = parseDate(schedule.startDate);
  return startDate ? startDate.getTime() : 0;
};

const getDynamicStatus = (schedule: Schedule): Schedule['status'] => {
  const today = new Date();
  const startDate = parseDate(schedule.startDate);
  const endDate = parseDate(schedule.endDate);
  
  if (!startDate || !endDate) return schedule.status;
  
  // Verifica se estamos dentro do período (incluindo o último dia até 23:59h)
  const endOfLastDay = endOfDay(endDate);
  const isActive = !isBefore(today, startDate) && !isAfter(today, endOfLastDay);
  const isPastPeriod = isAfter(today, endOfLastDay);
  
  // Se o período já passou, automaticamente marca como completado
  if (isPastPeriod) {
    return 'completed';
  }
  
  // Se está dentro do período ativo, marca como ativo
  if (schedule.status === 'scheduled' && isActive) {
    return 'active';
  }
  
  return schedule.status;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active": return "bg-green-700 text-white";
    case "scheduled": return "bg-amber-500 text-white";
    case "completed": return "bg-gray-700 text-white";
    default: return "bg-secondary text-secondary-foreground";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "active": return "Em Veiculação";
    case "scheduled": return "Agendado";
    case "completed": return "Concluída";
    default: return status;
  }
};

const getBroadcastColor = (broadcast: string) => {
  return broadcast === "100% Natal" ? "bg-christmas-red text-christmas-white" : "bg-indigo-600 text-white";
};

const getMusicStyleColor = (style: string) => {
  return "bg-blue-500 text-white";
};

export const ScheduleList = ({ playlistFilter = null, onClearPlaylistFilter }: ScheduleListProps) => {
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

  const schedulesToDisplay = (() => {
    if (!playlistFilter) return schedules;

    const latestByClient = new Map<string, Schedule>();
    schedules.forEach(schedule => {
      const broadcast = schedule.broadcast?.trim();
      if (broadcast !== 'Mesclada' && broadcast !== '100% Natal') return;

      const clientKey = schedule.client || schedule.clientName || schedule.id;
      const current = latestByClient.get(clientKey);
      if (!current || getScheduleReferenceTime(schedule) > getScheduleReferenceTime(current)) {
        latestByClient.set(clientKey, schedule);
      }
    });

    return Array.from(latestByClient.values()).filter(
      schedule => schedule.broadcast?.trim() === playlistFilter,
    );
  })();

  const filteredSchedules = schedulesToDisplay.filter(schedule => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const formattedStartDate = formatDate(schedule.startDate).toLowerCase();
    const formattedEndDate = formatDate(schedule.endDate).toLowerCase();

    return (
      schedule.clientName.toLowerCase().includes(lowerCaseSearchTerm) ||
      formattedStartDate.includes(lowerCaseSearchTerm) ||
      formattedEndDate.includes(lowerCaseSearchTerm)
    );
  });

  if (loading) return <div className="p-6 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" /><p className="text-muted-foreground">Carregando...</p></div>;
  if (error) return <div className="p-6 text-center text-destructive"><p>{error}</p></div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-left">
          <h3 className="text-lg font-semibold text-foreground">Agendamentos de Playlist</h3>
          <p className="text-sm text-muted-foreground">Gerencie as programações natalinas dos clientes</p>
        </div>
        <div className="flex w-full items-center gap-2 lg:w-auto">
          <div className="relative min-w-0 flex-1 lg:min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {playlistFilter && (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm">
            <Filter className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-foreground">
              <span className="font-medium">{schedulesToDisplay.length} {schedulesToDisplay.length === 1 ? 'cliente' : 'clientes'}</span>
              {' '}com playlist <span className="font-medium">{playlistFilter}</span>.
              <span className="text-muted-foreground"> Exibindo o agendamento mais recente de cada cliente.</span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearPlaylistFilter}
            className="h-8 shrink-0 gap-1 self-start text-muted-foreground hover:text-foreground sm:self-auto"
          >
            <X className="h-4 w-4" />
            Limpar filtro
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSchedules.map((schedule) => {
          const dynamicStatus = getDynamicStatus(schedule);
          return (
            <Card key={schedule.id} className="h-full shadow-sm border-border/50 hover:shadow-md transition-all">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-medium text-foreground text-left">
                      {schedule.clientName} <span className="text-sm text-muted-foreground font-normal">- {schedule.period}</span>
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge className={getMusicStyleColor(schedule.musicStyle)}>{schedule.musicStyle}</Badge>
                      <Badge className={getStatusColor(dynamicStatus)}>{getStatusText(dynamicStatus)}</Badge>
                      <Badge className={getBroadcastColor(schedule.broadcast)}>{schedule.broadcast}</Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
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
                  {schedule.observation?.trim() && (
                    <div className="mt-3 border-t border-border/40 pt-3">
                      <ScheduleObservation observation={schedule.observation} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredSchedules.length === 0 && !loading && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {playlistFilter ? "Nenhum cliente encontrado" : "Nenhum agendamento encontrado"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? `Nenhum resultado para "${searchTerm}"${playlistFilter ? ` no filtro ${playlistFilter}` : ''}.`
              : playlistFilter
                ? `Nenhum cliente com playlist ${playlistFilter}.`
                : "Crie um agendamento para vê-lo aqui."}
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