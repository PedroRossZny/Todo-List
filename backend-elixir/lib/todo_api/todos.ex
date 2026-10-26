defmodule TodoApi.Todos do
  @moduledoc """
  Núcleo funcional da Todo List.

  Todas as funções deste módulo são PURAS: recebem o estado atual e devolvem
  um resultado novo. Nenhuma delas altera o valor recebido, e nenhuma faz
  IO (rede, disco, console, relógio). Por isso podem ser testadas sozinhas,
  sem servidor nenhum rodando.

  Formato do estado:

      %{proximo_id: 4, tarefas: [%{id: 3, title: "...", completed: false}, ...]}

  Operações que podem falhar devolvem tuplas no estilo Result:

      {:ok, valor, novo_estado}   # deu certo: o valor e a NOVA versão do estado
      {:error, motivo}            # não deu: o estado recebido continua valendo
  """

  @doc "Estado com que o servidor começa (a tarefa mais recente vem primeiro)."
  def estado_inicial do
    %{
      proximo_id: 4,
      tarefas: [
        %{id: 3, title: "Terceira tarefa", completed: false},
        %{id: 2, title: "Segunda tarefa", completed: true},
        %{id: 1, title: "Primeira tarefa", completed: true}
      ]
    }
  end

  @doc "Devolve a lista de tarefas de um estado."
  def listar(%{tarefas: tarefas}), do: tarefas

  @doc "Procura uma tarefa pelo id. Devolve a tarefa ou nil (ausência explícita)."
  def buscar(%{tarefas: tarefas}, id) do
    Enum.find(tarefas, fn tarefa -> tarefa.id == id end)
  end

  @doc """
  Cria uma tarefa. Duas cláusulas, escolhidas por pattern matching:
  a primeira só aceita título que seja texto; qualquer outra coisa
  (nil, número, booleano...) cai direto na segunda e vira erro.
  """
  def criar(estado, titulo) when is_binary(titulo) do
    case String.trim(titulo) do
      "" ->
        {:error, :titulo_invalido}

      titulo_limpo ->
        tarefa = %{id: estado.proximo_id, title: titulo_limpo, completed: false}

        # Decisão funcional (1): criar não altera a lista existente.
        # [tarefa | estado.tarefas] monta uma lista NOVA com a tarefa na frente,
        # que reaproveita a lista antiga como cauda. Quem ainda tem o estado
        # antigo continua vendo exatamente as mesmas 3 tarefas de antes.
        novo_estado = %{
          estado
          | proximo_id: estado.proximo_id + 1,
            tarefas: [tarefa | estado.tarefas]
        }

        {:ok, tarefa, novo_estado}
    end
  end

  def criar(_estado, _titulo_que_nao_e_texto), do: {:error, :titulo_invalido}

  @doc """
  Alterna uma tarefa entre concluída e pendente. Não muda a tarefa
  existente: cria uma versão nova dela e uma lista nova com essa versão.
  """
  def alternar(estado, id) do
    case buscar(estado, id) do
      nil ->
        {:error, {:nao_encontrada, id}}

      tarefa ->
        # Decisão funcional (2): em vez de `tarefa.completed = !tarefa.completed`
        # (como no backend JS), %{tarefa | completed: ...} cria uma CÓPIA da
        # tarefa com um campo diferente, e Enum.map monta uma lista nova com ela.
        atualizada = %{tarefa | completed: not tarefa.completed}

        tarefas =
          estado.tarefas
          |> Enum.map(fn t -> if t.id == id, do: atualizada, else: t end)

        {:ok, atualizada, %{estado | tarefas: tarefas}}
    end
  end

  @doc "Remove uma tarefa, devolvendo um estado novo sem ela."
  def remover(estado, id) do
    case buscar(estado, id) do
      nil ->
        {:error, {:nao_encontrada, id}}

      tarefa ->
        tarefas =
          estado.tarefas
          |> Enum.filter(fn t -> t.id != id end)

        {:ok, tarefa, %{estado | tarefas: tarefas}}
    end
  end
end
