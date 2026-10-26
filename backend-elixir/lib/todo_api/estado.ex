defmodule TodoApi.Estado do
  @moduledoc """
  Borda com estado.

  O núcleo (TodoApi.Todos) nunca altera nada: só calcula versões novas.
  Mas o servidor precisa lembrar, entre uma requisição e outra, qual é a
  versão ATUAL. Esse é o único papel deste módulo.

  Ele usa um Agent: um processo leve do Elixir que guarda um valor.
  As requisições não mexem nesse valor diretamente; elas pedem ao processo
  que aplique uma transformação pura e troque a versão atual pela nova.
  Como o processo atende um pedido de cada vez, duas requisições
  simultâneas nunca se atropelam.
  """
  use Agent

  alias TodoApi.Todos

  def start_link(_opcoes) do
    Agent.start_link(&Todos.estado_inicial/0, name: __MODULE__)
  end

  @doc "Lê a versão atual do estado."
  def atual do
    Agent.get(__MODULE__, fn estado -> estado end)
  end

  @doc """
  Aplica uma transformação pura do núcleo ao estado atual.

  Se ela devolver {:ok, valor, novo_estado}, o novo estado passa a ser o
  atual e quem chamou recebe {:ok, valor}. Se devolver {:error, motivo},
  o estado atual continua o mesmo e quem chamou recebe o erro.
  """
  # Decisão funcional (3): o efeito fica isolado na borda. As regras
  # (TodoApi.Todos) só calculam versões novas; este é o ÚNICO ponto do
  # sistema que decide qual versão passa a ser a atual.
  def aplicar(transformacao) do
    Agent.get_and_update(__MODULE__, fn estado ->
      case transformacao.(estado) do
        {:ok, valor, novo_estado} -> {{:ok, valor}, novo_estado}
        {:error, motivo} -> {{:error, motivo}, estado}
      end
    end)
  end
end
