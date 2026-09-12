# Todo-List

Todo List desenvolvido com JavaScript puro (sem framework, sem build step), explorando manipulação do DOM, eventos e uma camada de dados isolada.

## Como rodar

O app usa ES Modules (`<script type="module">`), então abrir `index.html` direto pelo `file://` **não funciona** — o navegador bloqueia imports de módulo nesse contexto. Sirva a pasta com um servidor estático simples, por exemplo:

```bash
# Node
npx serve .

# Python 3
python -m http.server 8080
```

Ou use a extensão "Live Server" do VS Code. Depois acesse a URL indicada pelo servidor (ex.: http://localhost:8080).

## Camada de dados

Toda leitura/escrita de tarefas passa por `scripts/tasksService.js` (`getAll/create/toggle/remove`). Hoje essa camada **simula os dados em memória** — ou seja, criar, concluir ou excluir tarefas **não persiste entre reloads** ainda; é um estado temporário até um backend real ser conectado.

Ao longo do semestre, `tasksService.js` vai trocar essa simulação por chamadas `fetch()` contra uma API REST (implementada em JS, Elixir ou Python — todas seguindo o mesmo contrato). Quando isso acontecer, configure a URL do backend na constante `API_BASE_URL`, no topo de `scripts/tasksService.js` — é o único lugar que precisa mudar. O restante do app (`scripts/script.js`) só conhece `tasksService.getAll/create/toggle/remove` e não sabe se os dados vêm de memória ou de uma API.

### Contrato da API (quando plugada)

```
GET    /todos
POST   /todos        {title}   → 400 se inválido
PATCH  /todos/:id/toggle        → 404 se não existe
DELETE /todos/:id               → 404 se não existe
GET    /health
```
