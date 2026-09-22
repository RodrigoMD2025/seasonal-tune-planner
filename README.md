# 🎄 Agendador Natalinas

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC.svg)](https://tailwindcss.com/)

Sistema web avançado para **agendamento e gerenciamento de playlists sazonais de Natal**. Permite a configuração de múltiplos períodos de veiculação, tipos de playlist e estilos para diversos clientes, com um dashboard inteligente para acompanhamento em tempo real e acesso seguro via autenticação.

## 🎬 Apresentação do Projeto

<div align="center">
  <img src="assets/videos/gifs/apresentacao.gif" alt="Apresentação do Projeto" width="720">
</div>

---

## 🎯 Problema de Negócio

O acompanhamento das playlists natalinas veiculadas para os clientes exigia controle manual de múltiplos períodos, datas de início e término, e status de veiculação.

Esse processo apresentava desafios como:

* 📅 dificuldade para acompanhar, cliente a cliente, quais períodos de veiculação estavam ativos, agendados ou já concluídos;
* ⏳ necessidade de atualizar manualmente o status de cada agendamento conforme as datas avançavam;
* 🔎 falta de uma visão consolidada de quantos clientes tinham veiculação ativa em um determinado dia;
* 🚨 risco de perder o prazo de validade de um período sem perceber a tempo;
* 📋 nenhuma visão semanal unificada de validades e veiculações para tratamento;
* 📊 dificuldade para gerar relatórios filtrados e formatados para análise externa;
* 🔐 ausência de controle de acesso ao sistema de agendamentos.

O problema central era transformar o agendamento e o acompanhamento de playlists sazonais em um **processo centralizado, com status automático e visibilidade em tempo real**.

---

## 💡 Solução Desenvolvida

Foi desenvolvido um sistema web completo de agendamento, com autenticação, dashboard de métricas e gestão de status automatizada:

```text
Cadastro do cliente e do período
        ↓
Login autenticado (Firebase Authentication)
        ↓
Agendamento do período de veiculação
        ↓
Firestore (dados em tempo real)
        ↓
Atualização automática de status
   (Agendado → Em Veiculação → Concluída)
        ↓
Dashboard com métricas e gráficos
        ↓
Gestão Semanal + Relatórios (Excel/CSV)
```

A solução combina **React, TypeScript, Firebase (Firestore + Authentication) e Recharts** para transformar o acompanhamento manual de playlists natalinas em um fluxo automatizado, seguro e visual, com:

- 🔐 **Login seguro** com rotas protegidas e sessão persistente
- 📊 **Dashboard em tempo real** com cards e gráficos de métricas-chave
- 🔄 **Status dinâmico automático** (`Agendado` → `Em Veiculação` → `Concluída`)
- 📋 **Gestão semanal unificada** de validades e veiculações
- 📈 **Relatórios exportáveis** em Excel/CSV com filtros e ordenação
- 🏢 **Cadastro e importação em lote** de clientes

---

## 📈 Resultado

A automação transformou um controle manual e disperso em um fluxo centralizado, com status sempre atualizado e visibilidade imediata da operação.

### Ganhos observados

* 📊 visão consolidada e em tempo real de validades próximas, clientes agendados e veiculações ativas;
* 🔄 eliminação da atualização manual de status: o sistema transiciona `Agendado` → `Em Veiculação` → `Concluída` sozinho, considerando o horário exato do período;
* 📋 acompanhamento semanal mais rápido, com validades e veiculações reunidas em uma única página com abas;
* 📈 geração de relatórios filtrados (por status, cliente ou data) em Excel/CSV sem trabalho manual de planilha;
* 🔐 acesso ao sistema restrito a usuários autorizados, com sessão persistente entre acessos;
* 🏢 cadastro de clientes mais ágil, com importação em lote e histórico de períodos visível ao agendar um novo;
* 🎨 comunicação visual mais clara do status de cada agendamento, com tags coloridas por estado.

> **Nota:** os ganhos acima representam funcionalidades e melhorias observáveis proporcionadas pelo sistema. Não são apresentados percentuais de produtividade sem uma medição formal do processo antes e depois da implementação.

---

## ✨ Funcionalidades Principais

### 🔐 Sistema de Autenticação
- ✅ **Login Seguro:** Acesso ao sistema protegido por e-mail e senha.
- ✅ **Gerenciamento no Firebase:** Usuários autorizados são gerenciados diretamente no painel do Firebase Authentication.
- ✅ **Rotas Protegidas:** Todas as páginas da aplicação, exceto a de login, são acessíveis apenas para usuários autenticados.
- ✅ **Sessão Persistente:** O login é mantido mesmo após fechar e reabrir o navegador.

### 📊 Dashboard Dinâmico
- ✅ **Métricas em Tempo Real:** Acompanhe o status atual das operações com cards que mostram:
  - **Validade Próxima:** Quantos agendamentos vencem na semana atual, com um gráfico de distribuição diária.
  - **Clientes Agendados:** Total de clientes que possuem pelo menos um agendamento, com gráfico de pizza (Agendados vs. Não Agendados).
  - **Novos Agendamentos:** Contagem de novos períodos criados na semana, com gráfico de barras diário.
  - **Veiculação Natalinas:** Percentual e contagem de clientes com playlists ativas *hoje*, com gráfico de pizza (Veiculados vs. Não Veiculados).
- ✅ **Cálculos Precisos:** Lógica aprimorada para contagem de clientes ativos considerando horários exatos.
- ✅ **Navegação Rápida:** Acesse a lista de clientes e agendamentos através de abas.

### 📅 Gestão de Agendamentos
- ✅ **Períodos Independentes:** Cada período de veiculação é um agendamento individual, permitindo flexibilidade total.
- ✅ **CRUD Completo:** Crie, edite e exclua agendamentos de forma simples e direta na lista principal.
- ✅ **Status Dinâmico Inteligente:** Sistema de tags que atualiza automaticamente:
  - `Agendado` → `Em Veiculação` (quando o período inicia)
  - `Em Veiculação` → `Concluída` (automaticamente no dia seguinte ao fim do período)
- ✅ **Busca Avançada:** Filtre agendamentos por nome do cliente em tempo real.
- ✅ **Lógica de Datas Aprimorada:** Cálculos precisos considerando até 23:59h do último dia do período.
- ✅ **Relatórios Personalizados:** Exporte dados filtrados para Excel ou CSV com todas as informações dos agendamentos.

### 📋 Gestão Semanal Completa
- ✅ **Página Unificada:** Tela dedicada (`/validade-semanal`) com dois módulos principais:
  - **Validades da Semana:** Agendamentos que expiram na semana atual
  - **Veiculações da Semana:** Agendamentos ativos ou em período de veiculação
- ✅ **Sistema de Abas Intuitivo:** Navegação rápida entre os dois módulos
- ✅ **Fluxos de Tratamento Duplos:** 
  - Validades: Marque como "tratadas" quando resolvidas
  - Veiculações: Marque como "tratadas" quando verificadas/confirmadas
- ✅ **Acompanhamento Visual:** Status coloridos para diferentes estados de veiculação
- ✅ **Contadores Dinâmicos:** 
  - Validades: Pendentes vs Total Expirando
  - Veiculações: Ativas vs Total em Veiculação
- ✅ **Informações Rica:** Estilo musical, tipo de transmissão e períodos completos

### 📊 Sistema de Relatórios
- ✅ **Exportação Flexível:** Gere relatórios em formato Excel (.xlsx) ou CSV para análise externa
- ✅ **Filtros Inteligentes:** 
  - Todos os status ou filtro específico por: Em Veiculação, Agendado, Concluída, Cancelado
  - Contagem em tempo real dos registros que serão exportados
- ✅ **Opções de Ordenação:** 
  - Por nome do cliente (alfabética)
  - Por data de início (mais recente primeiro)
  - Por status (agrupamento lógico)
- ✅ **Dados Completos Exportados:**
  - Informações do cliente e período
  - Datas de início e término formatadas
  - Status dinâmico atual
  - Tipo de transmissão e estilo musical
  - Lista de tipos de playlist
  - Data de criação do agendamento

### 🏢 Gestão de Clientes
- ✅ **Cadastro Simplificado:** Adicione e gerencie clientes facilmente.
- ✅ **Importação em Lote:** Importe uma lista de clientes diretamente de um arquivo.

### 💡 Experiência de Uso (UX) Aprimorada
- ✅ **Adição Inteligente de Períodos:** Ao criar um novo agendamento, o sistema exibe o histórico de períodos do cliente selecionado, tornando a adição de novos períodos mais contextual e eficiente.
- ✅ **Interface Responsiva:** Acesse e gerencie o sistema de qualquer dispositivo.
- ✅ **Configuração Otimizada:** Environment variables organizadas para desenvolvimento e produção.
- ✅ **Visual Refinado:** Interface com cores temáticas natalinas e componentes padronizados.
- ✅ **Feedback Visual:** Tags coloridas para diferentes estados (Verde: ativo, Amarelo: agendado, Cinza escuro: concluída).
- ✅ **Layout Otimizado:** Header reorganizado para melhor distribuição dos botões de ação.
- ✅ **Gestão de Dados:** Sistema robusto de tratamento de timestamps do Firestore.

---

## 🆕 Melhorias Recentes

### v3.0.0 - Sistema de Autenticação
- ✅ **Implementação de Login:** Adicionada página de login com autenticação via e-mail e senha.
- ✅ **Segurança de Rotas:** Todas as rotas da aplicação agora são protegidas, exigindo login para acesso.
- ✅ **Integração com Firebase Auth:** Utilização do serviço de Autenticação do Firebase para gerenciamento seguro de usuários.
- ✅ **Fluxo de Logout:** Adicionado botão e funcionalidade de logout no dashboard.

### v2.3.1 - Tratamento de Veiculações
- ✅ **Ações Unificadas:** Coluna "Ação" em ambas as abas (Validades e Veiculações)
- ✅ **Controle Individual:** Sistema separado de "Marcar como Tratado" para veiculações
- ✅ **Estados Independentes:** Campos `validadeTratada` e `veiculacaoTratada` funcionam separadamente
- ✅ **Feedback Visual Consistente:** Mesmo comportamento de risco e desmarcação em ambas as abas
- ✅ **Contadores Atualizados:** Ambas as abas mostram "Pendentes / Total" baseado no tratamento

### v2.3.0 - Gestão Semanal Aprimorada
- ✅ **Página Unificada:** Combinação de "Validades da Semana" e "Veiculações da Semana" em uma interface única
- ✅ **Sistema de Abas:** Navegação intuitiva entre validades e veiculações
- ✅ **Acompanhamento de Veiculações:** Nova funcionalidade para monitorar agendamentos ativos durante a semana
- ✅ **Status Dinâmico Visual:** Badges coloridas para diferentes estados de veiculação
- ✅ **Informações Detalhadas:** Exibição de estilo musical, transmissão e períodos completos
- ✅ **Contadores Inteligentes:** Contagem separada para validades pendentes e veiculações ativas

### v2.2.0 - Sistema de Relatórios Completo
- ✅ **Exportação Excel/CSV:** Gere relatórios completos em formato Excel (.xlsx) ou CSV
- ✅ **Filtros Avançados:** Filtre por status (Em Veiculação, Agendado, Concluída, etc.)
- ✅ **Opções de Ordenação:** Ordene por nome do cliente, data de início ou status
- ✅ **Dados Completos:** Inclui todas as informações (cliente, período, datas, status, transmissão, playlists)
- ✅ **Interface Intuitiva:** Modal dedicado com configurações flexíveis de exportação
- ✅ **Correção de Timestamps:** Fix para exibição correta de datas do Firestore

### v2.1.0 - Sistema de Tags Dinâmicas Aprimorado
- ✅ **Transição Automática de Status:** O sistema agora gerencia automaticamente a transição completa:
  - `Agendado` (amarelo) → `Em Veiculação` (verde) → `Concluída` (cinza escuro)
- ✅ **Lógica de Tempo Precisa:** Considera até 23:59h do último dia para marcar como ativo
- ✅ **Finalização Automática:** No dia seguinte ao término, agendamentos passam automaticamente para "Concluída"

### v2.0.0 - Funcionalidades de Busca e UX
- ✅ **Filtro de Busca em Tempo Real:** Campo de busca para filtrar agendamentos por nome do cliente
- ✅ **Interface Refinada:** Componentes redesenhados com melhor hierarquia visual
- ✅ **Configuração Otimizada:** Organização melhorada dos arquivos de ambiente (.env)

### v1.9.0 - Dashboard com Métricas Avançadas
- ✅ **Gráficos Interativos:** Visualizações com Recharts para todas as métricas
- ✅ **Cálculos Inteligentes:** Algoritmos aprimorados para contagem de clientes ativos
- ✅ **Página de Validades:** Tela dedicada para gestão de agendamentos que expiram

---

## 🛠️ Tecnologias

### Frontend
- **[React 18](https://reactjs.org/)** - Biblioteca UI moderna
- **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática
- **[Vite](https://vitejs.dev/)** - Build tool otimizada
- **[React Router](https://reactrouter.com/)** - Roteamento para SPAs
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework CSS utility-first
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes UI elegantes
- **[Recharts](https://recharts.org/)** - Gráficos para React
- **[XLSX](https://www.npmjs.com/package/xlsx)** - Biblioteca para geração de arquivos Excel/CSV

### Backend & Dados
- **[Firebase](https://firebase.google.com/)** - Plataforma BaaS (Backend as a Service)
  - **Firestore** - Banco de dados NoSQL em tempo real
  - **Firebase Authentication** - Sistema de autenticação de usuários
- **[GitHub Pages](https://pages.github.com/)** - Hospedagem estática para o frontend

---

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 20+
- npm ou yarn

### Instalação
1.  **Clone o repositório**
    ```bash
    git clone https://github.com/RodrigoMD2025/seasonal-tune-planner.git
    cd seasonal-tune-planner
    ```
2.  **Instale as dependências**
    ```bash
    npm install
    ```
3.  **Configure o ambiente**
    - Renomeie `.env.example` para `.env`
    - Preencha o arquivo `.env` com suas credenciais do Firebase. Você pode encontrá-las nas **Configurações do Projeto** no seu painel do Firebase.
4.  **Execute o projeto**
    ```bash
    npm run dev
    ```

### Deploy (GitHub Pages)
O deploy é feito automaticamente via GitHub Actions toda vez que um novo commit é enviado para a branch `main`.

---

## 🤝 Contribuição

Contribuições são bem-vindas! Siga o padrão de conventional commits.

```
feat: Nova funcionalidade
fix: Correção de bug
docs: Mudanças na documentação
style: Formatação, ponto e vírgula, etc.
refactor: Refatoração de código
perf: Melhoria de performance
test: Adição ou correção de testes
```

---

## 📝 Licença

Este projeto está sob a licença **MIT**.

---

<div align="center">

**Desenvolvido com ❤️ para a temporada natalina 🎄**

[⬆️ Voltar ao topo](#-agendador-natalinas)

</div>
