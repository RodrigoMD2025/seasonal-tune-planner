import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Download, FileSpreadsheet, Filter, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { formatDate } from "@/lib/date-utils";
import { parse, endOfDay, isBefore, isAfter } from 'date-fns';
import * as XLSX from 'xlsx';

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
  createdAt?: Timestamp | string | Date;
}

interface ReportOptions {
  includeAll: boolean;
  includeActive: boolean;
  includeScheduled: boolean;
  includeCompleted: boolean;
  includeCancelled: boolean;
  format: 'xlsx' | 'csv';
  sortBy: 'client' | 'startDate' | 'status';
}

const parseDate = (date: string | Timestamp): Date | null => {
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === 'string') {
    let parsedDate = parse(date, 'yyyy-MM-dd', new Date());
    if (isNaN(parsedDate.getTime())) { 
      parsedDate = parse(date, 'dd/MM/yyyy', new Date()); 
    }
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

const getStatusText = (status: string) => {
  switch (status) {
    case "active": return "Em Veiculação";
    case "scheduled": return "Agendado";
    case "completed": return "Concluída";
    case "cancelled": return "Cancelado";
    case "draft": return "Rascunho";
    default: return status;
  }
};

export const ReportGenerator = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const [reportOptions, setReportOptions] = useState<ReportOptions>({
    includeAll: true,
    includeActive: true,
    includeScheduled: true,
    includeCompleted: true,
    includeCancelled: false,
    format: 'xlsx',
    sortBy: 'client'
  });

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const schedulesCollection = collection(db, "schedules");
      const scheduleSnapshot = await getDocs(schedulesCollection);
      const schedulesList: Schedule[] = scheduleSnapshot.docs.map(doc => 
        ({ id: doc.id, ...doc.data() } as Schedule)
      );
      setSchedules(schedulesList);
    } catch (err) {
      console.error("Erro ao buscar agendamentos:", err);
      toast({ 
        title: "Erro", 
        description: "Não foi possível carregar os dados.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSchedules();
    }
  }, [isOpen]);

  const filterSchedules = (schedules: Schedule[]): Schedule[] => {
    return schedules.filter(schedule => {
      const dynamicStatus = getDynamicStatus(schedule);
      
      if (reportOptions.includeAll) return true;
      
      switch (dynamicStatus) {
        case 'active':
          return reportOptions.includeActive;
        case 'scheduled':
          return reportOptions.includeScheduled;
        case 'completed':
          return reportOptions.includeCompleted;
        case 'cancelled':
          return reportOptions.includeCancelled;
        default:
          return false;
      }
    });
  };

  const sortSchedules = (schedules: Schedule[]): Schedule[] => {
    return [...schedules].sort((a, b) => {
      switch (reportOptions.sortBy) {
        case 'client':
          return a.clientName.localeCompare(b.clientName);
        case 'startDate':
          const dateA = parseDate(a.startDate)?.getTime() || 0;
          const dateB = parseDate(b.startDate)?.getTime() || 0;
          return dateB - dateA;
        case 'status':
          const statusA = getDynamicStatus(a);
          const statusB = getDynamicStatus(b);
          return statusA.localeCompare(statusB);
        default:
          return 0;
      }
    });
  };

  const generateReport = () => {
    setExporting(true);
    
    try {
      const filteredSchedules = filterSchedules(schedules);
      const sortedSchedules = sortSchedules(filteredSchedules);

      // Preparar dados para exportação
      const reportData = sortedSchedules.map((schedule, index) => ({
        'Nº': index + 1,
        'Cliente': schedule.clientName,
        'Período': schedule.period,
        'Estilo Musical': schedule.musicStyle,
        'Data Início': formatDate(schedule.startDate),
        'Data Término': formatDate(schedule.endDate),
        'Status': getStatusText(getDynamicStatus(schedule)),
        'Transmissão': schedule.broadcast,
        'Tipos de Playlist': schedule.playlistTypes.join(', '),
        'Criado em': schedule.createdAt ? formatDate(schedule.createdAt) : 'N/A'
      }));

      const fileName = `relatorio-agendamentos-${new Date().toISOString().split('T')[0]}`;

      if (reportOptions.format === 'xlsx') {
        // Criar workbook Excel
        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Agendamentos");

        // Ajustar largura das colunas
        const colWidths = [
          { wch: 5 },   // Nº
          { wch: 25 },  // Cliente
          { wch: 20 },  // Período
          { wch: 15 },  // Estilo Musical
          { wch: 12 },  // Data Início
          { wch: 12 },  // Data Término
          { wch: 15 },  // Status
          { wch: 15 },  // Transmissão
          { wch: 30 },  // Tipos de Playlist
          { wch: 15 }   // Criado em
        ];
        ws['!cols'] = colWidths;

        // Salvar arquivo
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } else {
        // Gerar CSV
        const ws = XLSX.utils.json_to_sheet(reportData);
        const csv = XLSX.utils.sheet_to_csv(ws);
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${fileName}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Relatório gerado com sucesso!",
        description: `${reportData.length} agendamento(s) exportado(s) em formato ${reportOptions.format.toUpperCase()}.`,
      });

      setIsOpen(false);

    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const filteredCount = schedules.length > 0 ? filterSchedules(schedules).length : 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="shadow-sm">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Gerar Relatório
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Gerar Relatório de Agendamentos
          </DialogTitle>
          <DialogDescription>
            Configure as opções do relatório e exporte os dados dos agendamentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status dos dados */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium">
                {loading ? "Carregando..." : `${schedules.length} agendamentos encontrados`}
              </span>
            </div>
            <Badge variant="secondary">
              {filteredCount} serão exportados
            </Badge>
          </div>

          {/* Filtros de Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtrar por Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeAll"
                  checked={reportOptions.includeAll}
                  onCheckedChange={(checked) => 
                    setReportOptions(prev => ({ ...prev, includeAll: !!checked }))
                  }
                />
                <label htmlFor="includeAll" className="font-medium">
                  Incluir todos os status
                </label>
              </div>

              {!reportOptions.includeAll && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeActive"
                      checked={reportOptions.includeActive}
                      onCheckedChange={(checked) => 
                        setReportOptions(prev => ({ ...prev, includeActive: !!checked }))
                      }
                    />
                    <label htmlFor="includeActive" className="text-sm">Em Veiculação</label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeScheduled"
                      checked={reportOptions.includeScheduled}
                      onCheckedChange={(checked) => 
                        setReportOptions(prev => ({ ...prev, includeScheduled: !!checked }))
                      }
                    />
                    <label htmlFor="includeScheduled" className="text-sm">Agendado</label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeCompleted"
                      checked={reportOptions.includeCompleted}
                      onCheckedChange={(checked) => 
                        setReportOptions(prev => ({ ...prev, includeCompleted: !!checked }))
                      }
                    />
                    <label htmlFor="includeCompleted" className="text-sm">Concluída</label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeCancelled"
                      checked={reportOptions.includeCancelled}
                      onCheckedChange={(checked) => 
                        setReportOptions(prev => ({ ...prev, includeCancelled: !!checked }))
                      }
                    />
                    <label htmlFor="includeCancelled" className="text-sm">Cancelado</label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Opções de Exportação */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Formato</label>
              <Select 
                value={reportOptions.format} 
                onValueChange={(value) => 
                  setReportOptions(prev => ({ ...prev, format: value as 'xlsx' | 'csv' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ordenar por</label>
              <Select 
                value={reportOptions.sortBy} 
                onValueChange={(value) => 
                  setReportOptions(prev => ({ ...prev, sortBy: value as 'client' | 'startDate' | 'status' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Nome do Cliente</SelectItem>
                  <SelectItem value="startDate">Data de Início</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={generateReport} 
              disabled={loading || exporting || filteredCount === 0}
              className="bg-gradient-christmas shadow-christmas"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar Relatório
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};