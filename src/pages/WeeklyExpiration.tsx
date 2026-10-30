import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { formatDate, getStartOfWeek, getEndOfWeek } from '@/lib/date-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, ArrowLeft, Undo2, PlayCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Link, useSearchParams } from 'react-router-dom';
import { parse, isWithinInterval, endOfDay, isBefore, isAfter, addDays } from 'date-fns';
import { Input } from '@/components/ui/input'; // Adicionado: Import do componente Input
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ScheduleObservation } from '@/components/ScheduleObservation';

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
  veiculacaoTratada?: boolean;
  status?: "draft" | "scheduled" | "active" | "completed" | "cancelled";
  observation?: string;
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

const WeeklyExpirationPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [activeTab, setActiveTab] = useState<'expiring' | 'broadcasting'>('expiring');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // Adicionado: Estado para o termo de busca
  const [actionFilter, setActionFilter] = useState<'all' | 'marcar_ok' | 'desmarcar'>('all'); // Novo estado para o filtro de ação

  const weekParam = searchParams.get('week');
  const weekReferenceDate = useMemo(() => {
    if (weekParam) {
      const parsed = parse(weekParam, 'yyyy-MM-dd', new Date());
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, [weekParam]);

  const selectedWeek = useMemo(() => {
    const start = getStartOfWeek(weekReferenceDate);
    const end = getEndOfWeek(weekReferenceDate);
    return {
      start,
      end,
      range: `${formatDate(start, 'dd/MM')} - ${formatDate(end, 'dd/MM')}`,
    };
  }, [weekReferenceDate]);

  const expiringSchedules = useMemo(() => allSchedules.filter(schedule => {
    if (!schedule.endDate) return false;
    const endDate = parseDate(schedule.endDate);
    return endDate ? isWithinInterval(endDate, { start: selectedWeek.start, end: selectedWeek.end }) : false;
  }), [allSchedules, selectedWeek]);

  const broadcastSchedules = useMemo(() => allSchedules.filter(schedule => {
    const startDate = parseDate(schedule.startDate);
    return startDate ? isWithinInterval(startDate, { start: selectedWeek.start, end: selectedWeek.end }) : false;
  }), [allSchedules, selectedWeek]);

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
        setAllSchedules(schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule)));
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
    setAllSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, validadeTratada: newStatus } : s));

    try {
      const scheduleRef = doc(db, 'schedules', scheduleId);
      await updateDoc(scheduleRef, { validadeTratada: newStatus });
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      // Reverte em caso de erro
      setAllSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, validadeTratada: currentStatus } : s));
      // TODO: Adicionar toast de erro
    }
  };

  const handleToggleBroadcastTreated = async (scheduleId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    // Atualiza a UI otimisticamente
    setAllSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, veiculacaoTratada: newStatus } : s));

    try {
      const scheduleRef = doc(db, 'schedules', scheduleId);
      await updateDoc(scheduleRef, { veiculacaoTratada: newStatus });
    } catch (err) {
      console.error("Erro ao atualizar status de veiculação:", err);
      // Reverte em caso de erro
      setAllSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, veiculacaoTratada: currentStatus } : s));
      // TODO: Adicionar toast de erro
    }
  };

  const navigateWeek = (weekOffset: number) => {
    const targetWeek = addDays(selectedWeek.start, weekOffset * 7);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('week', formatDate(targetWeek, 'yyyy-MM-dd'));
      return next;
    }, { replace: true });
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

  // Função de filtragem
  const filterSchedules = (schedules: Schedule[], term: string, activeTab: 'expiring' | 'broadcasting', actionFilter: 'all' | 'marcar_ok' | 'desmarcar'): Schedule[] => {
    const lowercasedTerm = term.toLowerCase();

    return schedules.filter(schedule => {
      const clientNameMatch = schedule.clientName?.toLowerCase().includes(lowercasedTerm);
      
      const startDate = parseDate(schedule.startDate);
      const endDate = parseDate(schedule.endDate);

      const startDateMatch = startDate ? formatDate(startDate, 'dd/MM/yyyy').includes(lowercasedTerm) : false;
      const endDateMatch = endDate ? formatDate(endDate, 'dd/MM/yyyy').includes(lowercasedTerm) : false;

      // Lógica para a coluna "Ação"
      const isTreated = (activeTab === 'expiring' && schedule.validadeTratada) || (activeTab === 'broadcasting' && schedule.veiculacaoTratada);
      let actionFilterMatch = true; // Por padrão, corresponde a todos

      if (actionFilter === 'marcar_ok') {
        actionFilterMatch = !isTreated; // Se 'Marcar OK' for selecionado, mostrar apenas os não tratados
      } else if (actionFilter === 'desmarcar') {
        actionFilterMatch = isTreated; // Se 'Desmarcar' for selecionado, mostrar apenas os tratados
      }

      // Combina o filtro de texto com o filtro de ação
      const textMatch = clientNameMatch || startDateMatch || endDateMatch;

      if (term && actionFilter !== 'all') {
        return textMatch && actionFilterMatch;
      } else if (term) {
        return textMatch;
      } else if (actionFilter !== 'all') {
        return actionFilterMatch;
      } else {
        return true; // Nenhum filtro aplicado
      }
    });
  };

  const filteredExpiringSchedules = filterSchedules(expiringSchedules, searchTerm, 'expiring', actionFilter);
  const filteredBroadcastSchedules = filterSchedules(broadcastSchedules, searchTerm, 'broadcasting', actionFilter);

  const currentSchedules = activeTab === 'expiring' ? filteredExpiringSchedules : filteredBroadcastSchedules;
  const pendingCount = activeTab === 'expiring' 
    ? filteredExpiringSchedules.filter(s => !s.validadeTratada).length
    : filteredBroadcastSchedules.filter(s => !s.veiculacaoTratada).length;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex justify-between items-center">
          <Link to="/">
            <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Voltar ao Dashboard</Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-lg font-semibold text-foreground">
                {pendingCount} / {currentSchedules.length}
              </p>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'expiring' ? 'Pendentes / Total Expirando' : 'Pendentes / Total em Veiculação'}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
        
        {/* Campo de busca e filtro de ação */}
        <div className="mb-6 flex gap-4">
          <Input
            type="text"
            placeholder="Buscar por cliente ou data (DD/MM/AAAA)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={actionFilter} onValueChange={(value: 'all' | 'marcar_ok' | 'desmarcar') => setActionFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="marcar_ok">Marcar OK</SelectItem>
              <SelectItem value="desmarcar">Desmarcar</SelectItem>
            </SelectContent>
          </Select>
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
            <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-2xl">
              <span className="flex items-center gap-2">
                {activeTab === 'expiring' ? (
                  <><AlertTriangle className="w-6 h-6 text-amber-600" />Validades da Semana</>
                ) : (
                  <><PlayCircle className="w-6 h-6 text-green-600" />Veiculações da Semana</>
                )}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => navigateWeek(-1)}
                  title="Semana anterior"
                  aria-label="Ver semana anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="min-w-[104px] text-center text-sm font-medium text-foreground" aria-live="polite">
                  {selectedWeek.range}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => navigateWeek(1)}
                  title="Próxima semana"
                  aria-label="Ver próxima semana"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              {activeTab === 'expiring' 
                ? 'Lista de clientes com playlists vencendo na semana selecionada.'
                : 'Lista de clientes que iniciarão a veiculação na semana selecionada.'}
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
                                        <TableHead className="text-left font-semibold">Cliente</TableHead>
                                        <TableHead className="text-left">Período</TableHead>
                                        {activeTab === 'expiring' ? (
                                          <>
                                            <TableHead className="text-left">Data de Término</TableHead>
                                            <TableHead className="text-left">Estilo/Transmissão/Tipo</TableHead>
                                          </>
                                        ) : (
                                          <>
                                            <TableHead className="text-left">Período de Veiculação</TableHead>
                                            <TableHead className="text-left">Status</TableHead>
                                            <TableHead className="text-left">Estilo/Transmissão/Tipo</TableHead>
                                          </>
                                        )}
                                        <TableHead className="text-left">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSchedules.length > 0 ? (
                    currentSchedules.map((schedule) => {
                      const dynamicStatus = getDynamicStatus(schedule);
                      return (
                        <TableRow 
                          key={schedule.id} 
                          data-state={(
                            (activeTab === 'expiring' && schedule.validadeTratada) || 
                            (activeTab === 'broadcasting' && schedule.veiculacaoTratada)
                          ) ? 'treated' : 'untreated'} 
                          className="data-[state=treated]:text-muted-foreground data-[state=treated]:line-through"
                        >
                          <TableCell className="text-left font-medium">{schedule.clientName}</TableCell>
                          <TableCell className="text-left"><Badge variant="secondary">{schedule.period}</Badge></TableCell>
                          
                          {activeTab === 'expiring' ? (
                            <>
                              <TableCell className="text-left">{formatDate(schedule.endDate)}</TableCell>
                              <TableCell className="text-left">
                                <div className="flex flex-wrap gap-1">
                                  {schedule.musicStyle && (
                                    <Badge variant="outline" className="text-xs">{schedule.musicStyle}</Badge>
                                  )}
                                  {schedule.broadcast && (
                                    <Badge variant="outline" className="text-xs">{schedule.broadcast}</Badge>
                                  )}
                                  {schedule.playlistTypes && (
                                    <Badge variant="outline" className="text-xs">{schedule.playlistTypes.join(', ')}</Badge>
                                  )}
                                  <ScheduleObservation
                                    observation={schedule.observation}
                                    className="h-6 px-2 text-[11px]"
                                  />
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-left">{formatDate(schedule.startDate)} - {formatDate(schedule.endDate)}</TableCell>
                              <TableCell className="text-left">
                                <Badge className={getStatusColor(dynamicStatus)}>
                                  {getStatusText(dynamicStatus)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-left">
                                <div className="flex flex-wrap gap-1">
                                  {schedule.musicStyle && (
                                    <Badge variant="outline" className="text-xs">{schedule.musicStyle}</Badge>
                                  )}
                                  {schedule.broadcast && (
                                    <Badge variant="outline" className="text-xs">{schedule.broadcast}</Badge>
                                  )}
                                  {schedule.playlistTypes && (
                                    <Badge variant="outline" className="text-xs">{schedule.playlistTypes.join(', ')}</Badge>
                                  )}
                                  <ScheduleObservation
                                    observation={schedule.observation}
                                    className="h-6 px-2 text-[11px]"
                                  />
                                </div>
                              </TableCell>
                            </>
                          )}
                          
                          {/* Coluna de Ação - sempre presente */}
                          <TableCell className="text-left">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => activeTab === 'expiring' 
                                ? handleToggleTreated(schedule.id, !!schedule.validadeTratada)
                                : handleToggleBroadcastTreated(schedule.id, !!schedule.veiculacaoTratada)
                              }
                            >
                              {(
                                (activeTab === 'expiring' && schedule.validadeTratada) ||
                                (activeTab === 'broadcasting' && schedule.veiculacaoTratada)
                              ) ? (
                                <><Undo2 className="w-4 h-4 mr-2" />Desmarcar</>
                              ) : (
                                <><CheckCircle className="w-4 h-4 mr-2 text-green-500" />Marcar OK</>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell 
                        colSpan={activeTab === 'expiring' ? 5 : 6} 
                        className="text-center h-24 text-muted-foreground"
                      >
                        {activeTab === 'expiring' 
                          ? 'Nenhum agendamento vencendo na semana selecionada.'
                          : 'Nenhum novo agendamento inicia a veiculação na semana selecionada.'}
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
