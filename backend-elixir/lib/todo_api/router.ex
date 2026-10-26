defmodule TodoApi.Router do
  @moduledoc """
  Borda HTTP: implementa o mesmo contrato dos outros backends.

      GET    /todos             -> lista as tarefas
      POST   /todos             -> cria (400 se o título for inválido)
      PATCH  /todos/:id/toggle  -> alterna (404 se não existir)
      DELETE /todos/:id         -> remove, 204 sem corpo (404 se não existir)
      GET    /health            -> {"status": "ok"}

  Nenhuma regra de negócio mora aqui: cada rota lê a requisição, chama
  uma função pura de TodoApi.Todos (através de TodoApi.Estado) e traduz
  o resultado para status + JSON.
  """
  use Plug.Router
  use Plug.ErrorHandler

  alias TodoApi.{Estado, Todos}

  # Cada requisição passa por estas etapas, nesta ordem:
  plug CORSPlug
  plug :match
  plug Plug.Parsers, parsers: [:json], pass: ["*/*"], json_decoder: Jason
  plug :dispatch

  get "/health" do
    responder(conn, 200, %{status: "ok"})
  end

  get "/todos" do
    responder(conn, 200, Todos.listar(Estado.atual()))
  end

  post "/todos" do
    titulo = conn.body_params["title"]

    case Estado.aplicar(fn estado -> Todos.criar(estado, titulo) end) do
      {:ok, tarefa} -> responder(conn, 201, tarefa)
      {:error, :titulo_invalido} -> responder(conn, 400, %{erro: "Título é obrigatório."})
    end
  end

  patch "/todos/:id/toggle" do
    with {:ok, numero} <- ler_id(id),
         {:ok, tarefa} <- Estado.aplicar(fn estado -> Todos.alternar(estado, numero) end) do
      responder(conn, 200, tarefa)
    else
      _ -> responder(conn, 404, %{erro: "Essa tarefa não existe."})
    end
  end

  delete "/todos/:id" do
    with {:ok, numero} <- ler_id(id),
         {:ok, _removida} <- Estado.aplicar(fn estado -> Todos.remover(estado, numero) end) do
      send_resp(conn, 204, "")
    else
      _ -> responder(conn, 404, %{erro: "Essa tarefa não existe."})
    end
  end

  match _ do
    responder(conn, 404, %{erro: "Rota não encontrada."})
  end

  # O :id chega da URL como texto ("3"). Só aceitamos se for um número inteiro,
  # sem sobra ("3abc" é recusado).
  defp ler_id(texto) do
    case Integer.parse(texto) do
      {numero, ""} -> {:ok, numero}
      _ -> :error
    end
  end

  defp responder(conn, status, corpo) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(status, Jason.encode!(corpo))
  end

  # JSON malformado no corpo: responde 400 em JSON em vez de derrubar a requisição.
  @impl Plug.ErrorHandler
  def handle_errors(conn, _erro) do
    responder(conn, conn.status, %{erro: "Requisição inválida."})
  end
end
