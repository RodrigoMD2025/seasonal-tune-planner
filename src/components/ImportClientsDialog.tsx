import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Upload, Download, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface ImportClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewClient {
  name: string;
  style: string;
  valid: boolean;
  error?: string;
}

export const ImportClientsDialog = ({ open, onOpenChange }: ImportClientsDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewClient[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header
      const dataLines = lines.slice(1);
      
      const preview: PreviewClient[] = dataLines.map((line, index) => {
        const [name, style] = line.split(',').map(item => item.trim());
        
        const valid = !!(name && style && name !== 'Cliente' && style !== 'Estilo');
        const error = !name ? 'Nome do cliente não encontrado' : 
                     !style ? 'Estilo musical não encontrado' : undefined;
        
        return {
          name: name || `Linha ${index + 2}`,
          style: style || 'N/A',
          valid,
          error
        };
      });
      
      setPreviewData(preview);
    } catch (error) {
      toast({
        title: "Erro ao processar arquivo",
        description: "Verifique se o arquivo está no formato CSV correto",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    const validClients = previewData.filter(client => client.valid);
    
    if (validClients.length === 0) {
      toast({
        title: "Nenhum cliente válido encontrado",
        description: "Verifique o formato dos dados no arquivo",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    let importedCount = 0;
    let errorCount = 0;

    try {
      const clientsCollection = collection(db, "clients");
      for (const client of validClients) {
        try {
          await addDoc(clientsCollection, {
            name: client.name,
            musicStyle: client.style,
            activeSchedules: 0, // Valor inicial
            email: "", // Email não está no CSV, pode ser adicionado depois ou ser opcional
            createdAt: new Date(), // Adiciona a data de criação
            // Adicione outros campos padrão se necessário
          });
          importedCount++;
        } catch (innerError) {
          console.error("Erro ao adicionar cliente ao Firestore:", innerError);
          errorCount++;
        }
      }

      if (importedCount > 0) {
        toast({
          title: "Importação concluída",
          description: `${importedCount} cliente(s) importado(s) com sucesso. ${errorCount > 0 ? `${errorCount} com erro.` : ''}`,
          duration: 5000,
        });
      } else if (errorCount > 0) {
        toast({
          title: "Erro na importação",
          description: `Nenhum cliente foi importado. ${errorCount} cliente(s) com erro.`,
          variant: "destructive",
          duration: 5000,
        });
      }

      onOpenChange(false);
      setFile(null);
      setPreviewData([]);

    } catch (outerError) {
      console.error("Erro geral na importação:", outerError);
      toast({
        title: "Erro inesperado na importação",
        description: "Ocorreu um erro ao tentar importar os clientes.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "Cliente,Estilo\nA Camponesa Restaurante,CMD\nABC Shopping,ICMD\nAlameda Shopping,FMD";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_clientes.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const validCount = previewData.filter(c => c.valid).length;
  const invalidCount = previewData.length - validCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Clientes
          </DialogTitle>
          <DialogDescription>
            Faça o upload de sua planilha CSV para importar clientes e estilos musicais
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instruções e Template */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Formato do Arquivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  O arquivo deve ser um CSV com duas colunas: <strong>Cliente</strong> e <strong>Estilo</strong>
                </p>
                <div className="bg-muted p-3 rounded-lg text-sm font-mono">
                  Cliente,Estilo<br/>
                  A Camponesa Restaurante,CMD<br/>
                  ABC Shopping,ICMD<br/>
                  Alameda Shopping,FMD
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Modelo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upload de Arquivo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload do Arquivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">Selecione o arquivo CSV</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="mt-1"
                  />
                </div>
                
                {file && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{file.name}</span>
                    <span>({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview dos Dados */}
          {previewData.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Preview dos Dados</CardTitle>
                <div className="flex gap-2">
                  {validCount > 0 && (
                    <Badge variant="secondary" className="bg-christmas-green text-christmas-white">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {validCount} válidos
                    </Badge>
                  )}
                  {invalidCount > 0 && (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {invalidCount} com erro
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {previewData.slice(0, 10).map((client, index) => (
                    <div key={index} className={`flex items-center justify-between p-2 rounded-lg border ${
                      client.valid 
                        ? 'bg-muted/30 border-border/30' 
                        : 'bg-destructive/10 border-destructive/30'
                    }`}>
                      <div className="flex items-center gap-3">
                        {client.valid ? (
                          <CheckCircle className="w-4 h-4 text-christmas-green" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                        <div>
                          <div className="font-medium text-sm">{client.name}</div>
                          {client.error && (
                            <div className="text-xs text-destructive">{client.error}</div>
                          )}
                        </div>
                      </div>
                      <Badge variant={client.valid ? "secondary" : "destructive"}>
                        {client.style}
                      </Badge>
                    </div>
                  ))}
                  {previewData.length > 10 && (
                    <div className="text-center text-sm text-muted-foreground py-2">
                      E mais {previewData.length - 10} registros...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!file || validCount === 0 || isProcessing}
              className="bg-gradient-christmas shadow-christmas"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processando...' : `Importar ${validCount} Cliente(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};