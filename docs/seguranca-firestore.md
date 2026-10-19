# 🔐 Segurança do Firestore — Correção urgente

## O problema encontrado

Durante a preparação do ambiente (19/10/2026), foi constatado que o banco Firestore do projeto
`seasonal-tune-planner` está **acessível sem autenticação**:

- Qualquer pessoa com a API key do site (que é pública, embutida no JavaScript) consegue **ler**
  todos os agendamentos e clientes.
- A mesma pessoa consegue **excluir** documentos sem estar logada.

As regras atuais do Firestore estão equivalentes a `allow read, write: if true`.

> ⚠️ **Isso significa que os dados de 135 clientes e 86 agendamentos estão expostos publicamente.**

## Correção

O arquivo [`firestore.rules`](../firestore.rules) na raiz do repositório contém a regra correta:
somente usuários autenticados podem ler ou gravar.

### Opção A — Pelo Console do Firebase (recomendado, mais rápido)

1. Acesse o [Console do Firebase](https://console.firebase.google.com/project/seasonal-tune-planner/firestore/databases/-default-/rules).
2. Confirme que o projeto selecionado é **seasonal-tune-planner**.
3. Apague o conteúdo atual da aba **Regras** e cole o conteúdo de `firestore.rules`:

   ```
   rules_version = '2';

   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

4. Clique em **Publicar**.
5. Valide:
   - Abra o site em uma aba anônima, sem estar logado. O sistema deve exigir login e não deve
     mais expor dados.
   - Faça login normalmente e confirme que dashboard, agendamentos e clientes continuam funcionando.
   - Acesse **Configurações → Zerar agendamentos** e confirme que a ação continua disponível
     (usuário logado tem permissão).

### Opção B — Pelo Firebase CLI

```bash
# instala a CLI (uma vez)
npx firebase-tools login

# dentro do repositório
npx firebase-tools use seasonal-tune-planner
npm run deploy:rules
```

O script `deploy:rules` executa `firebase deploy --only firestore:rules` usando o
`firestore.rules` deste repositório.

## Observações importantes

- **A API key do Firebase não é um segredo** — ela é pública por design e identifica o projeto.
  A segurança real vem das **regras do Firestore** e do **Firebase Authentication**.
- Depois da correção, o acesso anônimo via REST (apenas com a API key) deixa de funcionar.
- A funcionalidade de **reset anual** (Configurações → Zerar agendamentos) continua funcionando
  para usuários autenticados, pois utiliza a sessão do Firebase Auth do app.
- Se no futuro houver mais de um perfil de usuário (ex.: somente leitura), as regras podem ser
  refinadas na coleção `schedules` para restringir exclusões a administradores.
