import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Plus, FileSpreadsheet, Loader2, AlertTriangle, ArrowRight, PieChart as PieChartIcon, LogOut, RefreshCw, PlayCircle } from "lucide-react";
import { ScheduleList } from "./ScheduleList";
import { ClientList } from "./ClientList";
import { useEffect, useState } from "react";
import { CreateScheduleDialog } from "./CreateScheduleDialog";
import { ImportClientsDialog } from "./ImportClientsDialog";
import { ReportGenerator } from "./ReportGenerator";
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getStartOfWeek, getEndOfWeek, isDateInCurrentWeek, formatDate } from '@/lib/date-utils';
import { parse, isWithinInterval, endOfDay, isBefore, isAfter } from 'date-fns';

interface Schedule {
  id: string;
  client: string;
  startDate: Timestamp | string;
  endDate: Timestamp | string;
  period: string;
  validadeTratada?: boolean;
}

interface DashboardStat {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  chartData?: { name: string; value: number; }[];
  barChartData?: { name: string; count: number; }[];
  // Novas propriedades para a alternância de gráficos
  altTitle?: string;
  altValue?: string;
  altDescription?: string;
  altBarChartData?: { name: string; count: number; }[];
  altIcon?: React.ElementType;
}

type WeeklyChartType = 'expiring' | 'broadcasting';

const PIE_COLORS_VEICULACAO = ['#34d399', '#fde047']; // Verde e Amarelo
const PIE_COLORS_AGENDADOS = ['#818cf8', '#e5e7eb']; // Roxo e Cinza

const Dashboard = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("schedules");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [weeklyChartType, setWeeklyChartType] = useState<WeeklyChartType>('expiring');

  const initialStats: DashboardStat[] = [
    { title: "Validade Próxima (Semana)", value: "0", description: "Carregando...", icon: AlertTriangle },
    { title: "Clientes Agendados", value: "0", description: "Carregando...", icon: Users, chartData: [] },
    { title: "Novo(s) Agendamento(s) esta Semana", value: "0", description: "De Domingo a Sábado", icon: Calendar },
    { title: "Veiculação Natalinas", value: "", description: "Carregando...", icon: PieChartIcon, chartData: [] },
  ];

  const [dashboardStats, setDashboardStats] = useState<DashboardStat[]>(initialStats);

  const parseDate = (date: string | Timestamp): Date | null => {
    if (date instanceof Timestamp) return date.toDate();
    if (typeof date === 'string') {
      let parsedDate = parse(date, 'yyyy-MM-dd', new Date());
      if (isNaN(parsedDate.getTime())) { parsedDate = parse(date, 'dd/MM/yyyy', new Date()); }
      return isNaN(parsedDate.getTime()) ? null : parsedDate;
    }
    return null;
  };

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setStatsLoading(true);
        const clientsSnapshot = await getDocs(collection(db, "clients"));
        const clientsCount = clientsSnapshot.size;

        const schedulesSnapshot = await getDocs(collection(db, "schedules"));
        const allSchedules: Schedule[] = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));

        const today = new Date();
        const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

        // Dados para "Validade Próxima"
        const expiringThisWeekUntreated = allSchedules.filter(s => !s.validadeTratada && s.endDate && isDateInCurrentWeek(s.endDate));
        const expirationsPerDayOfWeek = days.map((dayName) => ({ name: dayName, count: 0 }));
        expiringThisWeekUntreated.forEach(schedule => {
          const endDate = parseDate(schedule.endDate);
          if (endDate) {
            const dayIndex = endDate.getDay();
            expirationsPerDayOfWeek[dayIndex].count++;
          }
        });

        // Dados para "Veiculações da Semana"
        const broadcastingThisWeek = allSchedules.filter(s => {
          const startDate = parseDate(s.startDate);
          const endDate = parseDate(s.endDate);
          
          if (!startDate || !endDate) return false;
          
          const weekInterval = { start: startOfWeekDate, end: endOfWeekDate };
          const scheduleInterval = { start: startDate, end: endOfDay(endDate) };
          
          return isWithinInterval(startOfWeekDate, scheduleInterval) || 
                 isWithinInterval(endOfWeekDate, scheduleInterval) ||
                 isWithinInterval(startDate, weekInterval) ||
                 isWithinInterval(endDate, weekInterval);
        });

        const broadcastsPerDayOfWeek = days.map((dayName) => ({ name: dayName, count: 0 }));
        // Nova lógica: contar agendamentos que *começam* em cada dia da semana
        broadcastingThisWeek.forEach(schedule => {
          const startDate = parseDate(schedule.startDate);
          if (startDate && isDateInCurrentWeek(startDate)) { // Verifica se a startDate está na semana atual
            const dayIndex = startDate.getDay();
            broadcastsPerDayOfWeek[dayIndex].count++;
          }
        });

        // Dados para "Novo(s) Agendamento(s) esta Semana"
        const newSchedulesThisWeek = allSchedules.filter(s => {
          if (!s.createdAt) return false;
          const createdAtDate = s.createdAt instanceof Timestamp ? s.createdAt.toDate() : parseDate(s.createdAt as string);
          return createdAtDate && isDateInCurrentWeek(createdAtDate);
        });

        const newSchedulesPerDayOfWeek = days.map((dayName) => ({ name: dayName, count: 0 }));
        newSchedulesThisWeek.forEach(schedule => {
          const createdAtDate = schedule.createdAt instanceof Timestamp ? schedule.createdAt.toDate() : parseDate(schedule.createdAt as string);
          if (createdAtDate) {
            const dayIndex = createdAtDate.getDay();
            newSchedulesPerDayOfWeek[dayIndex].count++;
          }
        });

        setDashboardStats(prevStats => prevStats.map(stat => {
          switch (stat.title) {
            case "Validade Próxima (Semana)":
              return {
                ...stat,
                value: expiringThisWeekUntreated.length.toString(),
                description: `Clientes pendentes para ${weekRange}`,
                barChartData: expirationsPerDayOfWeek,
                altTitle: "Novos Agendamentos em Veiculação (Semana)", // Título atualizado
                altValue: broadcastingThisWeek.filter(s => {
                  const startDate = parseDate(s.startDate);
                  return startDate && isDateInCurrentWeek(startDate);
                }).length.toString(),
                altDescription: `Novos agendamentos que iniciam a veiculação esta semana (${weekRange})`, // Descrição atualizada
                altBarChartData: broadcastsPerDayOfWeek,
                altIcon: PlayCircle,
              };
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

  const toggleWeeklyChart = () => {
    setWeeklyChartType(prev => prev === 'expiring' ? 'broadcasting' : 'expiring');
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
              const isWeeklyCard = stat.title === "Validade Próxima (Semana)";
              const displayExpiring = isWeeklyCard && weeklyChartType === 'expiring';
              const displayBroadcasting = isWeeklyCard && weeklyChartType === 'broadcasting';

              const cardTitle = displayBroadcasting ? stat.altTitle : stat.title;
              const cardValue = displayBroadcasting ? stat.altValue : stat.value;
              const cardDescription = displayBroadcasting ? stat.altDescription : stat.description;
              const cardBarData = displayBroadcasting ? stat.altBarChartData : stat.barChartData;
              const cardIcon = displayBroadcasting ? stat.altIcon : stat.icon;
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
                    
                    {stat.barChartData && (
                      <div className="h-[100px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={cardBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={20} />
                            <Tooltip cursor={{ fill: '#f3f4f6' }} formatter={(value) => `${value}`}/>
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                              {cardBarData.map((entry, index) => (<Cell key={`cell-${index}`} fill={barColor} />))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {stat.title === "Veiculação Natalinas" && stat.chartData && (
                      <div className="h-[120px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={stat.chartData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} fill="#8884d8" paddingAngle={5} dataKey="value">
                              {stat.chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS_VEICULACAO[index % PIE_COLORS_VEICULACAO.length]} />))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} cliente(s)`} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 text-xs mt-2">
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS_VEICULACAO[0] }} /><span>Veiculados</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS_VEICULACAO[1] }} /><span>Não Veiculados</span></div>
                        </div>
                      </div>
                    )}

                    {stat.title === "Clientes Agendados" && stat.chartData && (
                      <div className="h-[120px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={stat.chartData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} fill="#8884d8" paddingAngle={5} dataKey="value">
                              {stat.chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS_AGENDADOS[index % PIE_COLORS_AGENDADOS.length]} />))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} cliente(s)`} />
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
                      <Link to="/validade-semanal" className="flex-grow">
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

        <div className="bg-card rounded-lg shadow-sm border border-border/50">
          {activeTab === "schedules" && <ScheduleList />}
          {activeTab === "clients" && <ClientList />}
        </div>
      </main>

      <CreateScheduleDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      <ImportClientsDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />
    </div>
  );
};

export default Dashboard;
