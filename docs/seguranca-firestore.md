# 🔐 Segurança do Firestore — Guia e status

## Status atual (atualizado em 21/10/2026)

- ✅ As regras de [`firestore.rules`](../firestore.rules) foram **publicadas** no projeto
  `seasonal-tune-planner`.
- ✅ Leitura anônima via API REST agora retorna **HTTP 403 / PERMISSION_DENIED**.
- ✅ O **cadastro público de novas contas** foi **desativado** no Firebase Authentication
  (`client.permissions.disabledUserSignup = true`).
- ✅ A base permanece com **147 clientes e 4 agendamentos**.
- ✅ A chave de service account usada no deploy foi **revogada** em 20/10/2026
  (confirmado pelo responsável). Ela nunca foi commitada; o `.gitignore` cobre
  `*firebase-adminsdk*.json`.

> **Resultado:** o Firestore agora exige um usuário autenticado e não é mais acessível apenas
> com a API key pública. Mantenha o cadastro público desativado ou use a allowlist de UIDs
> abaixo para uma proteção adicional.

## Por que isso é importante

- **A API key do Firebase é pública por design.** Ela não protege nada sozinha; a segurança real
  vem das **regras do Firestore** e do **Firebase Authentication**.
- **A tela de login protege apenas a interface do site.** O Firestore é um serviço separado,
  acessível por qualquer cliente HTTP; sem regras, o login pode ser contornado.
- **Riscos concretos:** vazamento de dados de clientes (privacidade/LGPD), alteração de agendamentos
  e exclusão total de clientes/agendamentos.
- O app tem uma função de **reset anual** que apaga agendamentos; antes da correção, uma pessoa
  mal-intencionada poderia fazer algo equivalente sem estar logada.

## Como publicar as regras (referência)

### 1. Faça um backup (precaução)

No sistema: **Configurações → Backup de clientes e agendamentos**.
A publicação das regras não apaga dados, mas o backup é uma segurança extra.

### 2. Publique as regras no Console do Firebase

1. Acesse:
   [Console do Firebase → Firestore → Regras](https://console.firebase.google.com/project/seasonal-tune-planner/firestore/databases/-default-/rules)
2. Confirme que o projeto selecionado é **seasonal-tune-planner**.
3. Apague o conteúdo atual da aba **Regras** e cole:

   ```rules
   rules_version = '2';

   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

4. Clique em **Publicar**. A propagação pode levar cerca de 1 minuto.

> **Se o link de regras redirecionar para o overview:** normalmente é conta Google errada
> ou falta de permissão. Confirme o projeto em **Configurações do Projeto → Geral**, verifique
> seu papel em **Configurações do Projeto → Usuários e permissões** (é preciso ser **Owner**
> ou **Editor**) e entre com a conta dona do projeto. Como alternativa, use a CLI (Opção B),
> que não depende do redirecionamento do Console.

### 3. Desabilite o cadastro público de novas contas (muito importante)

> ✅ **Status:** já desativado em 20/10/2026. A configuração efetiva é
> `client.permissions.disabledUserSignup = true` (Identity Platform Admin API).

Com o cadastro aberto, qualquer pessoa pode criar uma conta usando a API key pública e, com a
regra acima, ter acesso total.

1. No Console: **Authentication → Settings** (ou **Configurações**).
2. Em **User actions / Ações do usuário**, desative
   **Allow new users to sign up / Permitir que novos usuários se cadastrem**.
3. Em **Authentication → Users**, confira se só existe a sua conta de administrador.
   Remova contas desconhecidas.

### 4. (Opcional, recomendado) Restrinja por UID

Se quiser uma proteção adicional — ou se preferir manter o cadastro habilitado para outros
usuários — troque a regra por uma allowlist de UIDs:

```rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && request.auth.uid in ['SEU_UID_AQUI'];
    }

    match /clients/{clientId} {
      allow read, write: if isAdmin();
    }

    match /schedules/{scheduleId} {
      allow read, write: if isAdmin();
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

O UID aparece em **Authentication → Users** (coluna **User UID**). Para mais de um administrador,
separe os UIDs por vírgula. Se a conta for excluída e recriada, o UID muda e a regra precisa
ser atualizada.

### 5. Valide

- **Logado:** abra o dashboard, a aba Clientes, edite/salve um cliente e confira a validade semanal.
- **Sem login:** abra o site em uma aba anônima; ele deve redirecionar para o login.
- **Acesso direto:** uma leitura REST sem token deve retornar **403 PERMISSION_DENIED**
  (validado em 20/10/2026). Se ainda retornar 200, aguarde a propagação e confira o projeto.
- **Cadastro público:** uma tentativa de criar conta via API deve retornar
  `ADMIN_ONLY_OPERATION` (cadastro desativado).
- **Edição/exclusão:** confirme que salvar e excluir clientes continuam funcionando com a sessão logada.

### 6. Atenção a automações

Scripts ou integrações que acessam o Firestore **sem autenticação** (por exemplo, importações ou
sincronizações via REST usando apenas a API key) vão parar de funcionar depois da publicação.
Elas precisam usar uma conta autenticada (Firebase Auth) ou o SDK Admin.

## Opção B — Firebase CLI

A CLI não está instalada globalmente, mas pode ser usada com `npx`:

```bash
npx firebase-tools login
npx firebase-tools use seasonal-tune-planner
npm run deploy:rules
```

Com uma service account, sem login interativo:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json
npx firebase-tools deploy --only firestore:rules --project seasonal-tune-planner
```

> **Troubleshooting — `403` em `serviceusage.googleapis.com`:** a CLI tenta confirmar se a API
> do Firestore está ativa. Se a service account não tiver `serviceusage.services.get`, o deploy
> para antes de publicar. Nesse caso, conceda **Service Usage Viewer**
> (`roles/serviceusage.serviceUsageViewer`) à service account ou publique diretamente pela
> Firebase Rules API (`projects.rulesets.create` + `projects.releases.update`). Foi esse o
> caminho usado no deploy de 20/10/2026.

> 🔑 **Chave de service account:** nunca commite o JSON. O `.gitignore` já cobre
> `*firebase-adminsdk*.json`. A chave usada no deploy de 20/10/2026 foi revogada nessa
> mesma data.

O script `deploy:rules` executa `firebase deploy --only firestore:rules` com o
`firestore.rules` deste repositório.

## Observações

- **A API key do Firebase não é um segredo** — ela é pública por design e identifica o projeto.
  A segurança real vem das **regras do Firestore** e do **Firebase Authentication**.
- O acesso anônimo via REST (apenas com a API key) agora retorna **403** (validado em 20/10/2026).
- O cadastro público está desativado; novas contas só podem ser criadas pelo Admin SDK/Console.
- A funcionalidade de **reset anual** (Configurações → Zerar agendamentos) continua funcionando
  para usuários autenticados, pois utiliza a sessão do Firebase Auth do app.
- Se no futuro houver mais de um perfil de usuário (ex.: somente leitura), as regras podem ser
  refinadas na coleção `schedules` para restringir exclusões a administradores.
- Como camada extra, é possível habilitar o **App Check** no Firebase para reduzir abuso da API key.
  Ele não substitui as regras de segurança.
