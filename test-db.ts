import 'dotenv/config'; // Importa e carrega as variáveis de ambiente do .env
import mongoose from 'mongoose';
import connectDB from './src/config/mongodb.ts';

async function runTest() {
  try {
    console.log('Tentando conectar ao MongoDB...');
    await connectDB();
    console.log('Conexão com MongoDB estabelecida com sucesso!');

    // Exemplo: Buscar uma coleção (descomente se quiser testar)
    // const Client = (await import('./src/models/Client')).default;
    // const clients = await Client.find({});
    // console.log('Clientes encontrados:', clients.length);

  } catch (error) {
    console.error('Erro ao conectar ou interagir com MongoDB:', error);
  } finally {
    // É importante desconectar para que o script termine
    await mongoose.disconnect();
  }
}

runTest();
