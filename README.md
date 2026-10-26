# Flow — Todo List

Trabalho da disciplina **Paradigmas de Linguagens de Programação**: a mesma Todo List implementada em três paradigmas diferentes. O frontend é HTML/CSS/JavaScript puro (sem framework, sem build step) e conversa com o backend por uma API REST.

| Pasta | Linguagem | Paradigma | Onde ficam os dados | Frontend |
|---|---|---|---|---|
| `backend-js/` | JavaScript (Node + Express) | Imperativo | memória do processo | `frontend/` |
| `backend-elixir/` | Elixir (Plug + Cowboy) | Funcional | memória do processo | `frontend/` |
| `backend-python/` | Python (Flask) | Orientado a objetos | SQLite (`dados.db`) | `frontend-python/` |

JS e Elixir implementam **exatamente o mesmo contrato**, então o mesmo `frontend/` funciona com qualquer um dos dois: só muda a URL. A versão Python vai além do contrato (conta de usuário, senha com hash e banco de dados), por isso tem um frontend próprio.

## O mesmo problema, três paradigmas

Alternar uma tarefa entre concluída e pendente mostra bem a diferença:

| Paradigma | Como o toggle é feito | O que isso significa |
|---|---|---|
| Imperativo (`backend-js/server.js`) | `tarefa.completed = !tarefa.completed` | muda o objeto que está no array compartilhado |
| Orientado a objetos (`backend-python/app.py`) | `tarefa.toggle()` e depois `repositorio.salvar(tarefa)` | o próprio objeto controla a mudança do seu estado, que fica encapsulado |
| Funcional (`backend-elixir/lib/todo_api/todos.ex`) | `%{tarefa \| completed: not tarefa.completed}` | cria uma versão nova; a antiga continua intacta |

## Contrato da API (JS e Elixir)

```
GET    /todos
POST   /todos        {title}   → 201 com a tarefa criada · 400 se o título for inválido
PATCH  /todos/:id/toggle        → 200 com a tarefa atualizada · 404 se não existe
DELETE /todos/:id               → 204 sem corpo · 404 se não existe
GET    /health                  → {"status": "ok"}
```

Cada tarefa tem o formato `{"id": 1, "title": "...", "completed": false}`. Erros vêm como `{"erro": "mensagem"}`.

Nas duas versões **os dados ficam só em memória**: ao reiniciar o backend, a lista volta às 3 tarefas de exemplo.

## Como rodar

Backend e frontend são dois processos separados, então são precisos **dois terminais**. O frontend usa ES Modules (`<script type="module">`), por isso abrir o `index.html` direto pelo `file://` **não funciona**: precisa de um servidor estático.

### Imperativo: `backend-js/` (porta 4000)

```bash
cd backend-js
npm install
node server.js
```

### Funcional: `backend-elixir/` (porta 4001)

Requer Elixir 1.14 ou mais novo (o instalador oficial já inclui o Erlang/OTP).

```bash
cd backend-elixir
mix deps.get
mix test            # testes do núcleo funcional
mix run --no-halt   # sobe o servidor
```

### Frontend para JS ou Elixir: `frontend/` (porta 3000)

```bash
cd frontend
npx serve -l 3000 .
# ou: python -m http.server 3000
```

Acesse http://localhost:3000. O backend é escolhido na própria interface, pelo seletor **Backend** na sidebar (JavaScript ou Elixir); a escolha fica salva no navegador. As URLs de cada um ficam em `BACKENDS`, no topo de `frontend/scripts/tasksService.js`: para rodar tudo localmente, use `http://localhost:4000` (JS) e `http://localhost:4001` (Elixir).

### Orientado a objetos: `backend-python/` (porta 5000) + `frontend-python/`

```bash
cd backend-python
pip install -r requirements.txt
python app.py
```

```bash
cd frontend-python
python -m http.server 3001
```

Para rodar localmente, `API_BASE_URL` em `frontend-python/scripts/authService.js` e `frontend-python/scripts/tasksService.js` deve apontar para `http://localhost:5000`.

### Versões publicadas

`frontend/` usa os backends JS e Elixir hospedados no Render (escolhidos pelo seletor da sidebar), e `frontend-python/` usa o backend Python hospedado no PythonAnywhere. No plano gratuito do Render, um serviço parado há 15 minutos "dorme" e leva até cerca de um minuto para responder à primeira requisição.

### Por que CORS

Frontend e backend rodam em origens diferentes (portas ou domínios diferentes), e o navegador bloqueia por padrão as chamadas `fetch()` entre origens. Os três backends liberam isso explicitamente: `cors()` no Express, `CORSPlug` no Elixir e `CORS(app)` no Flask.

## Backend funcional em detalhe (`backend-elixir/`)

O código separa as regras dos efeitos:

- **`lib/todo_api/todos.ex`: núcleo puro.** Funções que recebem o estado atual e devolvem `{:ok, valor, novo_estado}` ou `{:error, motivo}`. Nenhuma altera o valor recebido nem faz IO.
- **`lib/todo_api/estado.ex`: borda com estado.** Um Agent (processo do Elixir) guarda qual versão é a atual e a troca pela nova a cada operação. É o único ponto do sistema que "muda" algo.
- **`lib/todo_api/router.ex`: borda HTTP.** Traduz requisições para chamadas ao núcleo e o resultado para status + JSON. Sem regra de negócio.
- **`test/todos_test.exs`:** cada teste confere o resultado novo **e** que o estado de entrada continuou igual.

Os trechos marcados com `Decisão funcional` nos comentários são os pontos que mostram o paradigma.

## Backend orientado a objetos em detalhe (`backend-python/`)

Além do contrato básico, tem `POST /register` e `POST /login` (`{"username", "senha"}`), e as rotas de tarefas recebem o dono pelo `usuario_id` (na query string ou no corpo). As senhas nunca são salvas em texto puro: só o hash, gerado por `werkzeug.security`. `Usuario` e `Tarefa` escondem seu estado, e os repositórios são os únicos que sabem que existe SQL.

## Funcionalidades do frontend

- Criar, concluir/reabrir e excluir tarefas.
- Navegação por status (Todas / Pendentes / Concluídas), com contador em cada uma.
- Busca por título (`Ctrl/Cmd K` foca o campo), independente do filtro de status.
- Ordenação alternando entre mais recentes e ordem alfabética.
- Tema claro/escuro, com preferência salva no navegador e detecção automática do tema do sistema na primeira visita.
- Estados de carregando, erro (com botão "Tentar novamente") e vazio (mensagens diferentes para "nenhuma tarefa" e "nenhum resultado para o filtro/busca atual").
- Acessível por teclado: `Ctrl/Cmd N` abre o modal de nova tarefa, `Esc` fecha modal/sidebar mobile, foco preso dentro do modal enquanto aberto.

- Seletor de backend (JavaScript / Elixir) na sidebar, só no `frontend/`: troca o backend ao vivo e recarrega a lista. Se a troca acontecer enquanto o backend anterior ainda responde, a resposta atrasada é descartada.

Toda leitura/escrita de tarefas passa por `scripts/tasksService.js`, o único módulo que sabe que os dados vêm de uma API HTTP e qual backend está em uso. Ele também traduz o campo `completed` da API para o `done` usado internamente pela interface.

## Estrutura dos arquivos

```
frontend/                   frontend para JS e Elixir
  index.html
  styles/style.css
  scripts/script.js         UI: renderização e eventos
  scripts/tasksService.js   camada de dados (chama a API)

frontend-python/            frontend com login, para a versão Python
  scripts/authService.js    cadastro e login
  scripts/tasksService.js   tarefas do usuário logado

backend-js/                 imperativo
  server.js

backend-elixir/             funcional
  mix.exs                   dependências
  lib/todo_api/todos.ex     núcleo puro
  lib/todo_api/estado.ex    versão atual do estado (Agent)
  lib/todo_api/router.ex    rotas HTTP
  lib/todo_api/application.ex
  test/todos_test.exs

backend-python/             orientado a objetos
  app.py                    Tarefa, RepositorioDeTarefas e rotas
  usuarios.py               Usuario e RepositorioDeUsuarios
  requirements.txt
```
