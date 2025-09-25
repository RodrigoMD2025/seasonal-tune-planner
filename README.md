# Agendador de Musicas Natalinas

O Agendador de musicas natalinas é uma aplicação web desenvolvida para ajudar na organização e agendamento de serviços para clientes, com foco em atendimentos sazonais.

## Funcionalidades

- **Dashboard intuitivo:** Visualize de forma clara e rápida todos os seus clientes e agendamentos.
- **Gerenciamento de Clientes:**
  - Crie, edite e exclua clientes.
  - Importe uma lista de clientes a partir de um arquivo.
- **Gerenciamento de Agendamentos:**
  - Crie, edite e exclua agendamentos para cada cliente.
- **Interface Responsiva:** Acesse a aplicação de qualquer dispositivo, seja desktop, tablet ou smartphone.

## Tecnologias Utilizadas

Este projeto foi construído com as seguintes tecnologias:

- **Vite:** Build tool para desenvolvimento web moderno.
- **React:** Biblioteca para construção de interfaces de usuário.
- **TypeScript:** Superset de JavaScript que adiciona tipagem estática.
- **shadcn-ui:** Componentes de UI para React.
- **Tailwind CSS:** Framework CSS para estilização.
- **React Router:** Para gerenciamento de rotas na aplicação.
- **Firebase:** Utilizado para autenticação e/ou armazenamento de dados em tempo real.
- **Jest e React Testing Library:** Para testes unitários e de componentes.

## Instalação e Uso

Para rodar o projeto localmente, siga os passos abaixo:

1. **Clone o repositório:**
   ```sh
   git clone https://github.com/seu-usuario/seasonal-tune-planner.git
   cd seasonal-tune-planner
   ```

2. **Instale as dependências:**
   ```sh
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   - Renomeie o arquivo `.env.example` para `.env`.
   - Preencha as variáveis de ambiente com as suas credenciais do Firebase.

4. **Rode o servidor de desenvolvimento:**
   ```sh
   npm run dev
   ```
   A aplicação estará disponível em `http://localhost:8080`.

## Estrutura de Pastas

O projeto está organizado da seguinte forma:

```
seasonal-tune-planner/
├── public/               # Arquivos estáticos
├── src/
│   ├── assets/           # Imagens, fontes, etc.
│   ├── components/       # Componentes React reutilizáveis
│   │   └── ui/           # Componentes de UI (shadcn-ui)
│   ├── config/           # Configurações (ex: Firebase)
│   ├── hooks/            # Hooks customizados do React
│   ├── lib/              # Funções utilitárias
│   ├── models/           # Definições de tipos e interfaces
│   ├── pages/            # Páginas da aplicação
│   ├── App.tsx           # Componente principal da aplicação
│   └── main.tsx          # Ponto de entrada da aplicação
├── .env.example          # Exemplo de arquivo de variáveis de ambiente
├── package.json          # Dependências e scripts do projeto
└── README.md             # Este arquivo
```

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir uma issue ou enviar um pull request.