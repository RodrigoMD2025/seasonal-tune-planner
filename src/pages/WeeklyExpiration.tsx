import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { isDateInCurrentWeek, formatDate, getStartOfWeek, getEndOfWeek } from '@/lib/date-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, ArrowLeft, Undo2, Calendar, PlayCircle, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { parse, isWithinInterval, endOfDay, isBefore, isAfter } from 'date-fns';

interface Schedule {
  id: string;
  clientName?: string;
  startDate: Timestamp | string;
  endDate: Timestamp | string;
  period: string;
  musicStyle?: string;
  broadcast?: string;
  playlistTypes?: string[];
  validadeTratada?: boolean;
  status?: "draft" | "scheduled" | "active" | "completed" | "cancelled";
}

const WeeklyExpirationPage = () => {
  const [expiringSchedules, setExpiringSchedules] = useState<Schedule[]>([]);
  const [broadcastSchedules, setBroadcastSchedules] = useState<Schedule[]>([]);
  const [activeTab, setActiveTab] = useState<'expiring' | 'broadcasting'>('expiring');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    
    if (!startDate || !endDate) return schedule.status;
    
    const endOfLastDay = endOfDay(endDate);
    const isActive = !isBefore(today, startDate) && !isAfter(today, endOfLastDay);
    const isPastPeriod = isAfter(today, endOfLastDay);
    
    if (isPastPeriod) {
      return 'completed';
    }
    
    if (schedule.status === 'scheduled' && isActive) {
      return 'active';
    }
    
    return schedule.status;
  };

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      try {
        const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
        const allSchedules: Schedule[] = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));

        // Filtrar agendamentos que expiram esta semana
        const expiringThisWeek = allSchedules.filter(s => {
          if (!s.endDate) return false;
          const dateToCheck = s.endDate instanceof Timestamp ? s.endDate.toDate() : s.endDate;
          return isDateInCurrentWeek(dateToCheck);
        });

        // Filtrar agendamentos que estão em veiculação esta semana
        const today = new Date();
        const startOfWeek = getStartOfWeek(today);
        const endOfWeek = getEndOfWeek(today);
        
        const broadcastingThisWeek = allSchedules.filter(s => {
          const startDate = parseDate(s.startDate);
          const endDate = parseDate(s.endDate);
          
          if (!startDate || !endDate) return false;
          
          // Verifica se o período de veiculação tem interseção com a semana atual
          const weekInterval = { start: startOfWeek, end: endOfWeek };
          const scheduleInterval = { start: startDate, end: endOfDay(endDate) };
          
          return isWithinInterval(startOfWeek, scheduleInterval) || 
                 isWithinInterval(endOfWeek, scheduleInterval) ||
                 isWithinInterval(startDate, weekInterval) ||
                 isWithinInterval(endDate, weekInterval);
        });

        setExpiringSchedules(expiringThisWeek);
        setBroadcastSchedules(broadcastingThisWeek);
      } catch (err) {
        console.error("Erro ao buscar agendamentos:", err);
        setError('Não foi possível carregar os dados.');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  const handleToggleTreated = async (scheduleId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    // Atualiza a UI otimisticamente
    setExpiringSchedules(expiringSchedules.map(s => s.id === scheduleId ? { ...s, validadeTratada: newStatus } : s));

    try {
      const scheduleRef = doc(db, 'schedules', scheduleId);
      await updateDoc(scheduleRef, { validadeTratada: newStatus });
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      // Reverte em caso de erro
      setExpiringSchedules(expiringSchedules.map(s => s.id === scheduleId ? { ...s, validadeTratada: currentStatus } : s));
      // TODO: Adicionar toast de erro
    }
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

  const currentSchedules = activeTab === 'expiring' ? expiringSchedules : broadcastSchedules;
  const pendingCount = activeTab === 'expiring' 
    ? expiringSchedules.filter(s => !s.validadeTratada).length
    : broadcastSchedules.filter(s => getDynamicStatus(s) === 'active').length;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex justify-between items-center">
          <Link to="/">
            <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Voltar ao Dashboard</Button>
          </Link>
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">
              {pendingCount} / {currentSchedules.length}
            </p>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'expiring' ? 'Pendentes / Total Expirando' : 'Ativas / Total em Veiculação'}
            </p>
          </div>
        </div>
        
        {/* Tabs Navigation */}
        <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg w-fit">
          <Button 
            variant={activeTab === 'expiring' ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setActiveTab('expiring')}
            className="px-6"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Validades da Semana
          </Button>
          <Button 
            variant={activeTab === 'broadcasting' ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setActiveTab('broadcasting')}
            className="px-6"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Veiculações da Semana
          </Button>
        </div>
        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              {activeTab === 'expiring' ? (
                <><AlertTriangle className="w-6 h-6 text-amber-600" />Validades da Semana</>
              ) : (
                <><PlayCircle className="w-6 h-6 text-green-600" />Veiculações da Semana</>
              )}
            </CardTitle>
            <CardDescription>
              {activeTab === 'expiring' 
                ? 'Lista de clientes com playlists expirando esta semana.'
                : 'Lista de clientes com veiculações ativas ou programadas para esta semana.'}
            </CardDescription>
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
                    {activeTab === 'expiring' ? (
                      <TableHead>Data de Término</TableHead>
                    ) : (
                      <>
                        <TableHead>Período de Veiculação</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Estilo/Transmissão</TableHead>
                      </>
                    )}
                    {activeTab === 'expiring' && <TableHead className="text-right">Ação</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSchedules.length > 0 ? (
                    currentSchedules.map((schedule) => {
                      const dynamicStatus = getDynamicStatus(schedule);
                      return (
                        <TableRow 
                          key={schedule.id} 
                          data-state={activeTab === 'expiring' && schedule.validadeTratada ? 'treated' : 'untreated'} 
                          className={activeTab === 'expiring' ? "data-[state=treated]:text-muted-foreground data-[state=treated]:line-through" : ""}
                        >
                          <TableCell className="font-medium">{schedule.clientName}</TableCell>
                          <TableCell><Badge variant="secondary">{schedule.period}</Badge></TableCell>
                          
                          {activeTab === 'expiring' ? (
                            <>
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
                            </>
                          ) : (
                            <>
                              <TableCell>{formatDate(schedule.startDate)} - {formatDate(schedule.endDate)}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(dynamicStatus)}>
                                  {getStatusText(dynamicStatus)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {schedule.musicStyle && (
                                    <Badge variant="outline" className="text-xs">{schedule.musicStyle}</Badge>
                                  )}
                                  {schedule.broadcast && (
                                    <Badge variant="outline" className="text-xs">{schedule.broadcast}</Badge>
                                  )}
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell 
                        colSpan={activeTab === 'expiring' ? 4 : 5} 
                        className="text-center h-24 text-muted-foreground"
                      >
                        {activeTab === 'expiring' 
                          ? 'Nenhum agendamento expirando esta semana.'
                          : 'Nenhuma veiculação programada para esta semana.'}
                      </TableCell>
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
