# Flow — Todo List

Projeto full-stack: frontend em HTML/CSS/JavaScript puro (sem framework, sem build step) consumindo uma API REST. O backend atual (`backend-js/`) é em Node/Express, no paradigma imperativo; o mesmo contrato de API será reimplementado em Elixir (funcional) e Python (orientado a objetos) em ciclos futuros da disciplina, plugando no mesmo frontend.

## Como rodar

Backend e frontend rodam como dois processos separados — precisa de **dois terminais**.

**Terminal 1 — backend (porta 4000):**

```bash
cd backend-js
npm install
node server.js
```

**Terminal 2 — frontend (porta 3000):**

```bash
cd frontend
npx serve -l 3000 .
# ou: python -m http.server 3000
```

Depois acesse http://localhost:3000.

O frontend usa ES Modules (`<script type="module">`), então abrir `frontend/index.html` direto pelo `file://` **não funciona** — o navegador bloqueia imports de módulo nesse contexto. Por isso precisa de um servidor estático, mesmo que simples.

### Por que CORS

Frontend (`localhost:3000`) e backend (`localhost:4000`) são origens diferentes, então o navegador bloquearia as chamadas `fetch()` do frontend por padrão. O backend habilita CORS (`app.use(cors())`, em `backend-js/server.js`) para permitir isso.

## Funcionalidades

- Criar, concluir/reabrir e excluir tarefas.
- Navegação por status (Todas / Pendentes / Concluídas), com contador em cada uma.
- Busca por título (`Ctrl/Cmd K` foca o campo), independente do filtro de status.
- Ordenação alternando entre mais recentes e ordem alfabética.
- Tema claro/escuro, com preferência salva no navegador (persiste entre reloads) e detecção automática do tema do sistema operacional na primeira visita.
- Estados de carregando, erro (com botão "Tentar novamente") e vazio (mensagens diferentes para "nenhuma tarefa" e "nenhum resultado para o filtro/busca atual").
- Acessível por teclado: `Ctrl/Cmd N` abre o modal de nova tarefa, `Esc` fecha modal/sidebar mobile, foco preso dentro do modal enquanto aberto.

## Camada de dados e contrato da API

Toda leitura/escrita de tarefas no frontend passa por `frontend/scripts/tasksService.js` (`getAll/create/toggle/remove/health`) — é o único módulo que sabe que os dados vêm de uma API HTTP; `frontend/scripts/script.js` só chama esses métodos. A URL do backend fica na constante `API_BASE_URL`, no topo de `tasksService.js` — é o único lugar que muda se o backend rodar em outra porta/host, ou for trocado pela versão em Elixir/Python.

```
GET    /todos
POST   /todos        {title}   → 400 se inválido
PATCH  /todos/:id/toggle        → 404 se não existe
DELETE /todos/:id               → 404 se não existe
GET    /health
```

**Os dados são em memória no processo do backend** (`let todos` em `backend-js/server.js`) — ou seja, **não há persistência entre reinícios**: toda vez que o backend é reiniciado, a lista volta às 3 tarefas de exemplo.

## Estrutura dos arquivos

```
frontend/
  index.html                estrutura estática da página
  styles/style.css          aparência (cores, layout, responsividade)
  scripts/script.js         UI: renderização e eventos
  scripts/tasksService.js   camada de dados — chama a API REST

backend-js/
  server.js       API REST em Express (paradigma imperativo)
  package.json
```
