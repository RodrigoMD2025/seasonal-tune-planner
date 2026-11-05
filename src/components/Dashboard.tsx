import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Plus, FileSpreadsheet, Loader2, AlertTriangle, ArrowRight, PieChart as PieChartIcon, LogOut, RefreshCw, PlayCircle, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { ScheduleList } from "./ScheduleList";
import { ClientList } from "./ClientList";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { CreateScheduleDialog } from "./CreateScheduleDialog";
import { ImportClientsDialog } from "./ImportClientsDialog";
import { ReportGenerator } from "./ReportGenerator";
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, type TooltipProps } from 'recharts';
import { getStartOfWeek, getEndOfWeek, isDateInCurrentWeek, formatDate } from '@/lib/date-utils';
import { parse, isWithinInterval, endOfDay, isBefore, isAfter, addDays } from 'date-fns';

interface Schedule {
  id: string;
  client: string;
  clientName?: string;
  startDate: Timestamp | string;
  endDate: Timestamp | string;
  period: string;
  validadeTratada?: boolean;
  veiculacaoTratada?: boolean;
  createdAt?: Timestamp | string;
}

interface BarChartClient {
  name: string;
  treated?: boolean;
  period?: string;
}

interface BarChartDataPoint {
  name: string;
  count: number;
  clients?: BarChartClient[];
}

interface DashboardStat {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  chartData?: { name: string; value: number; }[];
  barChartData?: BarChartDataPoint[];
  // Novas propriedades para a alternância de gráficos
  altTitle?: string;
  altValue?: string;
  altDescription?: string;
  altBarChartData?: BarChartDataPoint[];
  altIcon?: React.ElementType;
}

type WeeklyChartType = 'expiring' | 'broadcasting';

const PIE_COLORS_VEICULACAO = ['#34d399', '#fde047']; // Verde e Amarelo
const PIE_COLORS_AGENDADOS = ['#818cf8', '#e5e7eb']; // Roxo e Cinza
const DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PERIOD_COLLATOR = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

const parseDate = (date: string | Timestamp): Date | null => {
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === 'string') {
    let parsedDate = parse(date, 'yyyy-MM-dd', new Date());
    if (isNaN(parsedDate.getTime())) { parsedDate = parse(date, 'dd/MM/yyyy', new Date()); }
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
  return null;
};

// Tooltip enxuto dos gráficos de barra: exibe apenas a quantidade de clientes do dia.
// Os detalhes (clientes e períodos) são exibidos no pop-up aberto ao clicar na barra.
const BarChartTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload as BarChartDataPoint | undefined;
  const clients = data?.clients ?? [];
  const uniqueClients = new Set(clients.map(client => client.name)).size;
  const count = clients.length > 0 ? uniqueClients : Number(data?.count ?? payload[0]?.value ?? 0);
  const dayLabel = typeof label === 'string' ? label : null;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="font-medium text-foreground">
        {dayLabel && <span>{dayLabel} • </span>}
        {count} {count === 1 ? 'Cliente' : 'Clientes'}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Clique na barra para ver os detalhes.</p>
    </div>
  );
};

type DayDialogMode = 'expiring' | 'broadcasting' | 'newSchedules';

type DisplayClient = {
  name: string;
  count: number;
  periods: string[];
  treatedCount: number;
};

const groupClientsByName = (clients: BarChartClient[]): DisplayClient[] =>
  Array.from(
    clients.reduce((map, client) => {
      const existing = map.get(client.name);
      if (existing) {
        existing.count += 1;
        if (client.period) existing.periods.push(client.period);
        if (client.treated) existing.treatedCount += 1;
      } else {
        map.set(client.name, {
          name: client.name,
          count: 1,
          periods: client.period ? [client.period] : [],
          treatedCount: client.treated ? 1 : 0,
        });
      }
      return map;
    }, new Map<string, DisplayClient>()).values(),
  );

const DAY_DIALOG_DESCRIPTIONS: Record<DayDialogMode, string> = {
  expiring: 'Clientes com playlists vencendo neste dia.',
  broadcasting: 'Clientes que iniciarão a veiculação neste dia.',
  newSchedules: 'Agendamentos criados neste dia.',
};

interface DayClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: BarChartDataPoint | null;
  mode: DayDialogMode;
}

const DayClientsDialog = ({ open, onOpenChange, data, mode }: DayClientsDialogProps) => {
  const displayClients = groupClientsByName(data?.clients ?? []);
  const dayLabel = data?.name ?? '';
  const pendingClients = displayClients.filter(client => client.treatedCount < client.count).length;
  const showTreatmentStats = mode === 'broadcasting' && displayClients.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {dayLabel && <>{dayLabel} • </>}
            {displayClients.length} {displayClients.length === 1 ? 'Cliente' : 'Clientes'}
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-justify">
            {DAY_DIALOG_DESCRIPTIONS[mode]}
          </DialogDescription>
          {showTreatmentStats && (
            <div className="pt-1">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${pendingClients > 0 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-green-500/15 text-green-700 dark:text-green-400'}`}>
                {pendingClients}/{displayClients.length} Clientes Pendentes
              </span>
            </div>
          )}
        </DialogHeader>

        {displayClients.length > 0 ? (
          <ul className="space-y-3">
            {displayClients.map((client, index) => {
              const allTreated = client.treatedCount > 0 && client.treatedCount === client.count;
              const someTreated = client.treatedCount > 0 && client.treatedCount < client.count;
              const sortedPeriods = [...client.periods].sort((a, b) => PERIOD_COLLATOR.compare(a, b));

              return (
                <li key={`${client.name}-${index}`} className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className={`min-w-0 text-base leading-relaxed text-justify ${allTreated ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      <span className="font-medium">{client.name}</span>
                      {sortedPeriods.length > 0 && (
                        <span className="font-normal text-muted-foreground"> • {sortedPeriods.join(' • ')}</span>
                      )}
                    </p>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {client.count > 1 && (
                        <Badge variant="secondary">{client.count} períodos</Badge>
                      )}
                      {allTreated && (
                        <Badge className="bg-green-600 text-white hover:bg-green-600">Tratativa concluída</Badge>
                      )}
                      {someTreated && (
                        <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                          {client.treatedCount}/{client.count} OK
                        </Badge>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-base text-muted-foreground">Nenhum cliente encontrado para este dia.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Dashboard = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("schedules");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [weeklyChartType, setWeeklyChartType] = useState<WeeklyChartType>('expiring');
  const [weekReferenceDate, setWeekReferenceDate] = useState(() => new Date());
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [clientNamesById, setClientNamesById] = useState<Map<string, string>>(() => new Map());
  const [dayDialog, setDayDialog] = useState<{ data: BarChartDataPoint; mode: DayDialogMode } | null>(null);

  const initialStats: DashboardStat[] = [
    { title: "Validade Próxima (Semana)", value: "0", description: "Carregando...", icon: AlertTriangle },
    { title: "Clientes Agendados", value: "0", description: "Carregando...", icon: Users, chartData: [] },
    { title: "Novo(s) Agendamento(s) esta Semana", value: "0", description: "De Domingo a Sábado", icon: Calendar },
    { title: "Veiculação Natalinas", value: "", description: "Carregando...", icon: PieChartIcon, chartData: [] },
  ];

  const [dashboardStats, setDashboardStats] = useState<DashboardStat[]>(initialStats);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setStatsLoading(true);
        const clientsSnapshot = await getDocs(collection(db, "clients"));
        const clientsCount = clientsSnapshot.size;
        const clientNameMap = new Map(
          clientsSnapshot.docs.map(clientDoc => [
            clientDoc.id,
            String(clientDoc.data().name || '').trim(),
          ]),
        );
        const getClientName = (schedule: Schedule) =>
          schedule.clientName?.trim() || clientNameMap.get(schedule.client) || 'Cliente sem nome';

        const schedulesSnapshot = await getDocs(collection(db, "schedules"));
        const allSchedules: Schedule[] = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
        setAllSchedules(allSchedules);
        setClientNamesById(clientNameMap);

        const today = new Date();

        const activeClients = new Set<string>();
        allSchedules.forEach(s => {
          const startDate = parseDate(s.startDate);
          const endDate = parseDate(s.endDate);
          if (startDate && endDate) {
            // Verifica se estamos dentro do período (incluindo o último dia até 23:59h)
            const endOfLastDay = endOfDay(endDate);
            const isActive = !isBefore(today, startDate) && !isAfter(today, endOfLastDay);
            if (isActive) {
              activeClients.add(s.client);
            }
          }
        });
        const activeClientsCount = activeClients.size;

        const clientsWithAnySchedule = new Set(allSchedules.map(s => s.client));
        const scheduledClientsCount = clientsWithAnySchedule.size;

        const startOfWeekDate = getStartOfWeek(today);
        const endOfWeekDate = getEndOfWeek(today);
        const weekRange = `${formatDate(startOfWeekDate, 'dd/MM')} - ${formatDate(endOfWeekDate, 'dd/MM')}`;

        // Dados para "Novo(s) Agendamento(s) esta Semana"
        const newSchedulesThisWeek = allSchedules.filter(s => {
          if (!s.createdAt) return false;
          const createdAtDate = s.createdAt instanceof Timestamp ? s.createdAt.toDate() : parseDate(s.createdAt as string);
          return createdAtDate && isDateInCurrentWeek(createdAtDate);
        });

        const newSchedulesPerDayOfWeek = DAYS_OF_WEEK.map((dayName) => ({ name: dayName, count: 0, clients: [] as BarChartClient[] }));
        newSchedulesThisWeek.forEach(schedule => {
          const createdAtDate = schedule.createdAt instanceof Timestamp ? schedule.createdAt.toDate() : parseDate(schedule.createdAt as string);
          if (createdAtDate) {
            const dayIndex = createdAtDate.getDay();
            newSchedulesPerDayOfWeek[dayIndex].count++;
            newSchedulesPerDayOfWeek[dayIndex].clients.push({ name: getClientName(schedule), period: schedule.period });
          }
        });

        setDashboardStats(prevStats => prevStats.map(stat => {
          switch (stat.title) {
            case "Clientes Agendados":
              return { ...stat, value: scheduledClientsCount.toString(), description: `De ${clientsCount} clientes totais`, chartData: [{ name: 'Agendados', value: scheduledClientsCount }, { name: 'Não Agendados', value: clientsCount - scheduledClientsCount }] };
            case "Novo(s) Agendamento(s) esta Semana":
              return { ...stat, value: newSchedulesThisWeek.length.toString(), description: `De Domingo a Sábado (${weekRange})`, barChartData: newSchedulesPerDayOfWeek };
            case "Veiculação Natalinas":
              return { ...stat, value: `${((activeClientsCount / clientsCount) * 100 || 0).toFixed(0)}%`, description: `${activeClientsCount} cliente(s) em veiculação hoje`, chartData: [{ name: 'Veiculados', value: activeClientsCount }, { name: 'Não Veiculados', value: clientsCount - activeClientsCount }] };
            default: return stat;
          }
        }));
      } catch (err) {
        console.error("Erro ao buscar estatísticas:", err);
        setStatsError("Não foi possível carregar as estatísticas.");
      } finally { setStatsLoading(false); }
    };

    fetchDashboardStats();
  }, []);

  const selectedWeek = useMemo(() => {
    const start = getStartOfWeek(weekReferenceDate);
    const end = getEndOfWeek(weekReferenceDate);
    return {
      start,
      end,
      range: `${formatDate(start, 'dd/MM')} - ${formatDate(end, 'dd/MM')}`,
    };
  }, [weekReferenceDate]);

  const weeklyCardStat = useMemo<DashboardStat>(() => {
    const { start, end } = selectedWeek;
    const getClientName = (schedule: Schedule) =>
      schedule.clientName?.trim() || clientNamesById.get(schedule.client) || 'Cliente sem nome';

    const expiringSchedules = allSchedules.filter(schedule => {
      if (schedule.validadeTratada || !schedule.endDate) return false;
      const endDate = parseDate(schedule.endDate);
      return endDate ? isWithinInterval(endDate, { start, end }) : false;
    });

    const expirationsPerDayOfWeek = DAYS_OF_WEEK.map((dayName) => ({ name: dayName, count: 0, clients: [] as BarChartClient[] }));
    expiringSchedules.forEach(schedule => {
      const endDate = parseDate(schedule.endDate);
      if (endDate) {
        const dayIndex = endDate.getDay();
        expirationsPerDayOfWeek[dayIndex].count++;
        expirationsPerDayOfWeek[dayIndex].clients.push({ name: getClientName(schedule), period: schedule.period });
      }
    });

    const broadcastingInWeek = allSchedules.filter(schedule => {
      const startDate = parseDate(schedule.startDate);
      const endDate = parseDate(schedule.endDate);

      if (!startDate || !endDate) return false;

      const weekInterval = { start, end };
      const scheduleInterval = { start: startDate, end: endOfDay(endDate) };

      return isWithinInterval(start, scheduleInterval) ||
             isWithinInterval(end, scheduleInterval) ||
             isWithinInterval(startDate, weekInterval) ||
             isWithinInterval(endDate, weekInterval);
    });

    const broadcastsPerDayOfWeek = DAYS_OF_WEEK.map((dayName) => ({ name: dayName, count: 0, clients: [] as BarChartClient[] }));
    broadcastingInWeek.forEach(schedule => {
      const startDate = parseDate(schedule.startDate);
      if (startDate && isWithinInterval(startDate, { start, end })) {
        const dayIndex = startDate.getDay();
        broadcastsPerDayOfWeek[dayIndex].count++;
        broadcastsPerDayOfWeek[dayIndex].clients.push({
          name: getClientName(schedule),
          period: schedule.period,
          treated: !!schedule.veiculacaoTratada,
        });
      }
    });

    const newBroadcastsCount = broadcastsPerDayOfWeek.reduce((total, day) => total + day.count, 0);

    return {
      title: "Validade Próxima (Semana)",
      value: expiringSchedules.length.toString(),
      description: "Clientes pendentes",
      icon: AlertTriangle,
      barChartData: expirationsPerDayOfWeek,
      altTitle: "Em Veiculação esta Semana",
      altValue: newBroadcastsCount.toString(),
      altDescription: "Com início na semana",
      altBarChartData: broadcastsPerDayOfWeek,
      altIcon: PlayCircle,
    };
  }, [allSchedules, clientNamesById, selectedWeek]);

  const handlePreviousWeek = () => {
    setWeekReferenceDate(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setWeekReferenceDate(prev => addDays(prev, 7));
  };

  const toggleWeeklyChart = () => {
    setWeeklyChartType(prev => prev === 'expiring' ? 'broadcasting' : 'expiring');
  };

  const handleBarClick = (entry: BarChartDataPoint, mode: DayDialogMode) => {
    setDayDialog({ data: entry, mode });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col items-start gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground">🎄 Sistema de Playlists Natalinas</h1>
              <p className="text-muted-foreground mt-1">Gerencie agendamentos de playlists sazonais</p>
            </div>
            <div className="flex gap-3 flex-shrink-0 items-center">
              <ReportGenerator />
              <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="shadow-sm"><FileSpreadsheet className="w-4 h-4 mr-2" />Importar Clientes</Button>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-christmas shadow-christmas"><Plus className="w-4 h-4 mr-2" />Novo Agendamento</Button>
              <Link to="/configuracoes">
                <Button variant="ghost" size="icon" title="Configurações">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsLoading ? (
            <div className="col-span-full text-center py-4"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /><p className="text-muted-foreground mt-2">Carregando...</p></div>
          ) : statsError ? (
            <div className="col-span-full text-center py-4 text-destructive"><p>{statsError}</p></div>
          ) : (
            dashboardStats.map((stat) => {
              const displayStat = stat.title === "Validade Próxima (Semana)" ? weeklyCardStat : stat;
              const isWeeklyCard = displayStat.title === "Validade Próxima (Semana)";
              const isNewSchedulesCard = displayStat.title === "Novo(s) Agendamento(s) esta Semana";
              const displayExpiring = isWeeklyCard && weeklyChartType === 'expiring';
              const displayBroadcasting = isWeeklyCard && weeklyChartType === 'broadcasting';

              const cardTitle = displayBroadcasting ? displayStat.altTitle : displayStat.title;
              const cardValue = displayBroadcasting ? displayStat.altValue : displayStat.value;
              const cardDescription = displayBroadcasting ? displayStat.altDescription : displayStat.description;
              const cardBarData = displayBroadcasting ? displayStat.altBarChartData : displayStat.barChartData;
              const cardIcon = displayBroadcasting ? displayStat.altIcon : displayStat.icon;
              const barColor = displayExpiring ? '#ef4444' : '#22c55e'; // Vermelho para validade, Verde para veiculação

              return (
                <Card key={stat.title} className="shadow-sm border-border/50 hover:shadow-md transition-shadow flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{cardTitle}</CardTitle>
                    {cardIcon && <cardIcon className={`h-4 w-4 text-muted-foreground`} />}
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col justify-start">
                    <div>
                      <div className="text-2xl font-bold text-foreground">{cardValue}</div>
                      <p className="text-xs text-muted-foreground mt-1">{cardDescription}</p>
                    </div>

                    {isWeeklyCard && (
                      <div className="mt-3 flex items-center justify-between gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={handlePreviousWeek}
                          title="Semana anterior"
                          aria-label="Ver semana anterior"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="min-w-0 text-center text-xs font-medium text-foreground" aria-live="polite">
                          {selectedWeek.range}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={handleNextWeek}
                          title="Próxima semana"
                          aria-label="Ver próxima semana"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    {displayStat.barChartData && (
                      <div className="h-[100px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={cardBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={20} />
                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<BarChartTooltip />} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                              {cardBarData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={barColor}
                                  className={(isWeeklyCard || isNewSchedulesCard) ? 'cursor-pointer' : undefined}
                                  onClick={(isWeeklyCard || isNewSchedulesCard)
                                    ? () => handleBarClick(entry, isWeeklyCard ? weeklyChartType : 'newSchedules')
                                    : undefined}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {displayStat.title === "Veiculação Natalinas" && displayStat.chartData && (
                      <div className="h-[120px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={displayStat.chartData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} fill="#8884d8" paddingAngle={5} dataKey="value">
                              {displayStat.chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS_VEICULACAO[index % PIE_COLORS_VEICULACAO.length]} />))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} ${Number(value) === 1 ? 'cliente' : 'clientes'}`} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 text-xs mt-2">
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS_VEICULACAO[0] }} /><span>Veiculados</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS_VEICULACAO[1] }} /><span>Não Veiculados</span></div>
                        </div>
                      </div>
                    )}

                    {displayStat.title === "Clientes Agendados" && displayStat.chartData && (
                      <div className="h-[120px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={displayStat.chartData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} fill="#8884d8" paddingAngle={5} dataKey="value">
                              {displayStat.chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS_AGENDADOS[index % PIE_COLORS_AGENDADOS.length]} />))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} ${Number(value) === 1 ? 'cliente' : 'clientes'}`} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 text-xs mt-2">
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS_AGENDADOS[0] }} /><span>Agendados</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS_AGENDADOS[1] }} /><span>Não Agendados</span></div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  {isWeeklyCard && (
                    <div className="p-4 pt-0 mt-auto flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex-grow !px-2 !text-xs !gap-1" onClick={toggleWeeklyChart}>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        {weeklyChartType === 'expiring' ? 'Ver Veiculações' : 'Ver Validades'}
                      </Button>
                      <Link to={`/validade-semanal?week=${formatDate(selectedWeek.start, 'yyyy-MM-dd')}`} className="flex-grow">
                        <Button variant="outline" size="sm" className="w-full !px-2 !text-xs !gap-1">
                          Ver Detalhes <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>

        <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg w-fit">
          <Button variant={activeTab === "schedules" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("schedules")} className="px-6"><Calendar className="w-4 h-4 mr-2" />Agendamentos</Button>
          <Button variant={activeTab === "clients" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("clients")} className="px-6"><Users className="w-4 h-4 mr-2" />Clientes</Button>
        </div>

        <div className="scroll-mt-6 bg-card rounded-lg shadow-sm border border-border/50">
          {activeTab === "schedules" && (
            <ScheduleList />
          )}
          {activeTab === "clients" && <ClientList />}
        </div>
      </main>

      <DayClientsDialog
        open={dayDialog !== null}
        onOpenChange={(open) => { if (!open) setDayDialog(null); }}
        data={dayDialog?.data ?? null}
        mode={dayDialog?.mode ?? 'expiring'}
      />

      <CreateScheduleDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      <ImportClientsDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />
    </div>
  );
};

export default Dashboard;
