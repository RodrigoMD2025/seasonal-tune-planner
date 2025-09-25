import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, User } from "lucide-react";
import { useState, useEffect } from "react";
import { doc, updateDoc } from 'firebase/firestore'; // Importar doc e updateDoc
import { db } from '../config/firebase'; // Importar a instância do Firestore
import { useToast } from "@/hooks/use-toast"; // Importar useToast

interface Client {
  id: string;
  name: string;
  musicStyle: string;
  phone?: string;
  email?: string;
  contact?: string;
  status: "active" | "inactive";
}

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientToEdit: Client | null;
  onClientUpdated: () => void;
}

export const EditClientDialog = ({ open, onOpenChange, clientToEdit, onClientUpdated }: EditClientDialogProps) => {
  const [name, setName] = useState("");
  const [musicStyle, setMusicStyle] = useState(""); // Renomeado de 'style' para 'musicStyle'
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const { toast } = useToast(); // Inicializar useToast

  useEffect(() => {
    if (clientToEdit) {
      setName(clientToEdit.name);
      setMusicStyle(clientToEdit.musicStyle); // Usar musicStyle
      setPhone(clientToEdit.phone || "");
      setEmail(clientToEdit.email || "");
      setContact(clientToEdit.contact || "");
      setStatus(clientToEdit.status);
    }
  }, [clientToEdit]);

  const handleSubmit = async (e: React.FormEvent) => { // Adicionado 'async'
    e.preventDefault();

    if (!clientToEdit?.id) {
      toast({
        title: "Erro",
        description: "ID do cliente não encontrado para atualização.",
        variant: "destructive",
      });
      return;
    }

    try {
      const clientRef = doc(db, "clients", clientToEdit.id);
      await updateDoc(clientRef, {
        name: name,
        musicStyle: musicStyle, // Usar musicStyle do estado
        phone: phone,
        email: email,
        contact: contact,
        status: status,
      });
      onClientUpdated(); // Recarrega a lista de clientes
      onOpenChange(false); // Fecha o diálogo após salvar
      toast({
        title: "Sucesso!",
        description: `Cliente "${name}" atualizado com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o cliente. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const musicStyles = [
    "CMD", "ICMD", "FMD", "APMD", "LMD"
  ];

  if (!clientToEdit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Editar Cliente
          </DialogTitle>
          <DialogDescription>
            Atualize as informações do cliente abaixo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-4 gap-y-6 pt-2">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="name">Nome do Cliente</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome completo do cliente"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="musicStyle">Estilo Musical</Label>
                  <Select value={musicStyle} onValueChange={setMusicStyle} required>
                    <SelectTrigger id="musicStyle">
                      <SelectValue placeholder="Selecione o estilo" />
                    </SelectTrigger>
                    <SelectContent>
                      {musicStyles.map((styleOption) => (
                        <SelectItem key={styleOption} value={styleOption}>
                          {styleOption}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value: "active" | "inactive") => setStatus(value)}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@email.com"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="contact">Contato Responsável</Label>
                  <Input
                    id="contact"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Nome do responsável"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-christmas shadow-christmas">
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
