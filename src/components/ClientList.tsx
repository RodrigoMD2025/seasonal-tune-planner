import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, Edit, Trash2, Music, Loader2, Phone, Mail, UserRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { collection, getDocs, Timestamp, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { formatDate } from '@/lib/date-utils';
import { EditClientDialog } from './EditClientDialog';

// Nova interface Client para Firestore
interface Client {
  id: string;
  name: string;
  musicStyle: string;
  activeSchedules: number; // Será calculado
  email?: string; 
  phone?: string;
  contact?: string;
  status: "active" | "inactive";
  createdAt: Date;
}

interface Schedule {
  client: string; // ID do cliente
  clientName: string; // Nome do cliente
  status: "draft" | "scheduled" | "active" | "completed" | "cancelled";
}

const getMusicStyleColor = (style: string) => {
  // Todos os estilos musicais agora serão azuis
  return "bg-blue-500 text-white";
};

export const ClientList = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const { toast } = useToast();

  const fetchClientsAndSchedules = async () => {
    try {
      setLoading(true);
      
      // 1. Buscar todos os clientes
      const clientsCollection = collection(db, "clients");
      const clientSnapshot = await getDocs(clientsCollection);
      let clientsList: Client[] = clientSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Client, 'id' | 'createdAt'>,
        createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : new Date(), // Converte Timestamp
      }));

      // 2. Buscar todos os agendamentos
      const schedulesCollection = collection(db, "schedules");
      const scheduleSnapshot = await getDocs(schedulesCollection);
      const allSchedules: Schedule[] = scheduleSnapshot.docs.map(doc => doc.data() as Schedule);

      // 3. Calcular agendamentos ativos por cliente
      const activeSchedulesMap = new Map<string, number>();
      allSchedules.forEach(schedule => {
        if (schedule.status === 'scheduled' || schedule.status === 'active') {
          activeSchedulesMap.set(schedule.clientName, (activeSchedulesMap.get(schedule.clientName) || 0) + 1);
        }
      });

      // 4. Anexar contagem de agendamentos ativos aos clientes
      clientsList = clientsList.map(client => ({
        ...client,
        activeSchedules: activeSchedulesMap.get(client.name) || 0,
      }));

      // 5. Organizar a lista de clientes em ordem alfabética
      clientsList.sort((a, b) => a.name.localeCompare(b.name));

      setClients(clientsList);
    } catch (err) {
      console.error("Erro ao buscar clientes e agendamentos:", err);
      setError("Não foi possível carregar os clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientsAndSchedules();
  }, []);

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cliente "${clientName}" e todos os seus agendamentos?`)) {
      return;
    }
    try {
      // 1. Excluir agendamentos associados a este cliente
      const schedulesRef = collection(db, "schedules");
      const q = query(schedulesRef, where("client", "==", clientName));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(sDoc => deleteDoc(doc(db, "schedules", sDoc.id)));
      await Promise.all(deletePromises);

      // 2. Excluir o cliente
      await deleteDoc(doc(db, "clients", clientId));
      toast({
        title: "Sucesso!",
        description: `Cliente "${clientName}" e seus agendamentos excluídos com sucesso.`, 
      });
      fetchClientsAndSchedules(); // Recarrega a lista após a exclusão
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cliente. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEditClient = (client: Client) => {
    setClientToEdit(client);
    setIsEditDialogOpen(true);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.musicStyle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando clientes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="text-left">
          <h3 className="text-lg font-semibold text-foreground">Clientes Cadastrados</h3>
          <p className="text-sm text-muted-foreground">Gerencie a base de clientes e estilos musicais</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar clientes ou estilos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredClients.map((client) => (
          <Card key={client.id} className="shadow-sm border-border/50 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-christmas rounded-lg flex items-center justify-center shadow-sm">
                    <Users className="w-5 h-5 text-christmas-white" />
                  </div>
                  <div className="text-left">
                    <div className="flex justify-between items-start gap-x-10">
                      <div className="flex flex-col items-start">
                        <h4 className="font-medium text-foreground">{client.name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <Music className="w-3 h-3 text-muted-foreground" />
                            <Badge className={getMusicStyleColor(client.musicStyle)}>
                              {client.musicStyle}
                            </Badge>
                          </div>
                          <div className={`text-xs ${client.activeSchedules > 0 ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                            {client.activeSchedules} agendamento{client.activeSchedules !== 1 ? 's' : ''} ativo{client.activeSchedules !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-1">
                        {client.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.contact && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <UserRound className="w-3 h-3" />
                            <span>{client.contact}</span>
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span>{client.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <div className="text-sm text-muted-foreground">Última atualização</div>
                    <div className="text-sm font-medium text-foreground">
                      {formatDate(client.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClient(client)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClient(client.id, client.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? "Tente ajustar os termos da busca" 
              : "Comece importando sua planilha de clientes" // Ou adicione um botão para adicionar
            }
          </p>
        </div>
      )}

      <EditClientDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen}
        clientToEdit={clientToEdit}
        onClientUpdated={fetchClientsAndSchedules}
      />
    </div>
  );
};