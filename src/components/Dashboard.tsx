import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Plus, FileSpreadsheet, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { ScheduleList } from "./ScheduleList";
import { ClientList } from "./ClientList";
import { useEffect, useState } from "react";
import { CreateScheduleDialog } from "./CreateScheduleDialog";
import { ImportClientsDialog } from "./ImportClientsDialog";
import { Link } from 'react-router-dom';

import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { getStartOfWeek, getEndOfWeek, isDateInCurrentWeek, formatDate } from '@/lib/date-utils';

interface Schedule {
  id: string;
  client: string;
  startDate: Timestamp | string;
  endDate: Timestamp | string;
  period: string;
  validadeTratada?: boolean;
  [key: string]: any;
}

interface DashboardStat {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  variant: "primary" | "secondary" | "accent" | "warning";
  chartData?: { name: string; value: number; }[];
  barChartData?: { name: string; count: number; }[];
}

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("schedules");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const initialStats: DashboardStat[] = [
    {
      title: "Validade Próxima (Semana)",
      value: "0",
      description: "Carregando...",
      icon: AlertTriangle,
      variant: "warning" as const,
    },
    {
      title: "Clientes Cadastrados",
      value: "0",
      description: "Carregando...",
      icon: Users,
      variant: "secondary" as const,
    },
    {
      title: "Novo(s) Agendamento(s) esta Semana",
      value: "0",
      description: "De Domingo a Sábado",
      icon: Calendar,
      variant: "secondary" as const,
    },
    {
      title: "Clientes Agendados",
      value: "0%",
      description: "Porcentagem total",
      icon: Users,
      variant: "accent" as const,
      chartData: [{ name: 'Agendados', value: 0 }, { name: 'Não Agendados', value: 100 }]
    },
  ];

  const [dashboardStats, setDashboardStats] = useState<DashboardStat[]>(initialStats);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setStatsLoading(true);
        const clientsSnapshot = await getDocs(collection(db, "clients"));
        const clientsCount = clientsSnapshot.size;

        const schedulesSnapshot = await getDocs(collection(db, "schedules"));
        const allSchedules: Schedule[] = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));

        const startOfWeekDate = getStartOfWeek(new Date());
        const endOfWeekDate = getEndOfWeek(new Date());

        const expiringThisWeekUntreated = allSchedules.filter(s => {
          if (!s.endDate || s.validadeTratada) return false; // Ignora se já foi tratado
          const dateToCheck = s.endDate instanceof Timestamp ? s.endDate.toDate() : s.endDate;
          return isDateInCurrentWeek(dateToCheck);
        });

        const weekRange = `${formatDate(startOfWeekDate, 'dd/MM')} - ${formatDate(endOfWeekDate, 'dd/MM')}`;

        const clientsWithActiveSchedules = new Set(allSchedules.map(s => s.client));
        const scheduledClientsCount = clientsWithActiveSchedules.size;
        const percentageScheduledClients = clientsCount > 0 
          ? ((scheduledClientsCount / clientsCount) * 100).toFixed(0) 
          : "0";

        const schedulesThisWeek = allSchedules.filter(s => {
          if (!s.createdAt) return false;
          const createdAtDate = s.createdAt instanceof Timestamp ? s.createdAt.toDate() : s.createdAt;
          return isDateInCurrentWeek(createdAtDate);
        });
        const newSchedulesThisWeekCount = schedulesThisWeek.length;

        const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        const schedulesPerDayOfWeek = days.map((dayName) => ({ name: dayName, count: 0 }));
        schedulesThisWeek.forEach(schedule => {
          const createdAtDate = schedule.createdAt instanceof Timestamp ? schedule.createdAt.toDate() : new Date(schedule.createdAt);
          const dayIndex = createdAtDate.getDay();
          schedulesPerDayOfWeek[dayIndex].count++;
        });

        setDashboardStats(prevStats => prevStats.map(stat => {
          switch (stat.title) {
            case "Validade Próxima (Semana)":
              return {
                ...stat,
                value: expiringThisWeekUntreated.length.toString(),
                description: `Clientes pendentes para ${weekRange}`,
              };
            case "Clientes Cadastrados":
              return { ...stat, value: clientsCount.toString(), description: `${clientsCount} cliente(s) no total` };
            case "Novo(s) Agendamento(s) esta Semana":
              return { 
                ...stat, 
                value: newSchedulesThisWeekCount.toString(), 
                description: `De Domingo a Sábado`,
                barChartData: schedulesPerDayOfWeek,
              };
            case "Clientes Agendados":
              return { 
                ...stat, 
                value: `${percentageScheduledClients}%`, 
                description: `${scheduledClientsCount} de ${clientsCount} clientes agendados`,
                chartData: [
                  { name: 'Agendados', value: parseInt(percentageScheduledClients) },
                  { name: 'Não Agendados', value: 100 - parseInt(percentageScheduledClients) }
                ]
              };
            default:
              return stat;
          }
        }));
      } catch (err) {
        console.error("Erro ao buscar estatísticas do dashboard:", err);
        setStatsError("Não foi possível carregar as estatísticas.");
      } finally {
        setStatsLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                🎄 Music Delivery - Sistema de Playlists Natalinas
              </h1>
              <p className="text-muted-foreground mt-1">
                Gerencie agendamentos de playlists sazonais
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsImportDialogOpen(true)}
                className="shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Importar Clientes
              </Button>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gradient-christmas shadow-christmas"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsLoading ? (
            <div className="col-span-full text-center py-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground mt-2">Carregando estatísticas...</p>
            </div>
          ) : statsError ? (
            <div className="col-span-full text-center py-4 text-destructive">
              <p>{statsError}</p>
            </div>
          ) : (
            dashboardStats.map((stat) => (
              <Card key={stat.title} className="shadow-sm border-border/50 hover:shadow-md transition-shadow flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.variant === 'warning' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                  
                  {stat.title === "Clientes Agendados" && stat.chartData && (
                    <div className="h-[100px] w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stat.chartData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} fill="#8884d8" paddingAngle={5} dataKey="value">
                            {stat.chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? "#82ca9d" : "#ffc658"} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {stat.title === "Novo(s) Agendamento(s) esta Semana" && stat.barChartData && (
                    <div className="h-[100px] w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stat.barChartData}>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
                          <YAxis axisLine={false} tickLine={false} width={20} style={{ fontSize: '10px' }} />
                          <Tooltip cursor={{ fill: 'transparent' }} />
                          <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
                {stat.title === "Validade Próxima (Semana)" && (
                  <div className="p-4 pt-0 mt-auto">
                    <Link to="/validade-semanal">
                      <Button variant="outline" size="sm" className="w-full">
                        Ver Detalhes <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg w-fit">
          <Button variant={activeTab === "schedules" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("schedules")} className="px-6">
            <Calendar className="w-4 h-4 mr-2" />
            Agendamentos
          </Button>
          <Button variant={activeTab === "clients" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("clients")} className="px-6">
            <Users className="w-4 h-4 mr-2" />
            Clientes
          </Button>
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