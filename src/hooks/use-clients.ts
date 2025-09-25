import { useState } from 'react';

const API_URL = process.env.VITE_API_URL || '/api';

interface Client {
  _id: string;
  name: string;
  email: string;
  // Adicione outros campos conforme necessário
}

export function useClients() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async (): Promise<Client[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/clients`);
      if (!response.ok) throw new Error('Erro ao buscar clientes');
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (clientData: Omit<Client, '_id'>): Promise<Client | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });
      if (!response.ok) throw new Error('Erro ao criar cliente');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateClient = async (id: string, clientData: Partial<Client>): Promise<Client | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/clients?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });
      if (!response.ok) throw new Error('Erro ao atualizar cliente');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/clients?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao deletar cliente');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
  };
}