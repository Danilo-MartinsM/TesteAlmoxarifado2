// =====================
// Funções globais úteis
// =====================

// Mostrar mensagens (toast)
function showToast(mensagem, tipo = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.innerText = mensagem;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Carregar categorias em qualquer select com Select2
async function carregarCategoriasSelect(selectElement, textoTodas = "Todas as Categorias", valorSelecionado = null) {
  try {
    const response = await fetch("http://localhost:8001/categorias");
    const categorias = await response.json();

    selectElement.innerHTML = "";

    // Opção "Todas as Categorias"
    const optTodas = document.createElement("option");
    optTodas.value = "";
    optTodas.textContent = textoTodas;
    selectElement.appendChild(optTodas);

    // Demais categorias
    categorias.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.nome;
      selectElement.appendChild(opt);
    });

    // Inicializa ou atualiza Select2
    if (!$(selectElement).data("select2")) {
      $(selectElement).select2({
        width: "resolve",
        placeholder: textoTodas,
        allowClear: true
      });
    }

    // Seleciona a categoria desejada ou "Todas"
    $(selectElement).val(valorSelecionado ?? "").trigger("change");

  } catch (err) {
    console.error("Erro ao carregar categorias:", err);
    showToast("Erro ao carregar categorias", "error");
  }
}

// ==========================
// Login
// ==========================
if (document.getElementById("form-login")) {
  document.getElementById("form-login").addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    try {
      const response = await fetch("http://localhost:8001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha })
      });

      if (response.ok) {
        showToast("Login realizado com sucesso", "success");
        setTimeout(() => window.location.href = "dashboard.html", 1000);
      } else {
        showToast("Email ou senha incorretos", "error");
      }
    } catch (err) {
      console.error("Erro no login:", err);
      showToast("Erro no servidor", "error");
    }
  });
}

// ==========================
// Produtos
// ==========================
async function carregarProdutos(filtros = {}) {
  try {
    let url = "http://localhost:8001/produtos?";
    if (filtros.categoria) url += `categoria_id=${filtros.categoria}&`;
    if (filtros.busca) url += `busca=${filtros.busca}&`;

    const response = await fetch(url);
    const produtos = await response.json();

    const tabela = document.querySelector("#tabela-produtos tbody");
    tabela.innerHTML = "";

    produtos.forEach(prod => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${prod.id}</td>
        <td>${prod.nome}</td>
        <td>${prod.categoria}</td>
        <td>${prod.quantidade_inicial}</td>
        <td>${new Date(prod.ultima_alteracao).toLocaleDateString("pt-BR")}</td>
        <td>
          <button onclick="abrirEditarModal(${prod.id})" class="btn btn-edit">Editar</button>
          <button onclick="confirmarExclusaoProduto(${prod.id})" class="btn btn-delete">Excluir</button>
        </td>
      `;
      tabela.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar produtos:", err);
    showToast("Erro ao carregar produtos", "error");
  }
}

// Abrir modal de edição
async function abrirEditarModal(idProduto) {
  try {
    const response = await fetch(`http://localhost:8001/produtos/${idProduto}`);
    const produto = await response.json();

    document.getElementById("editar-id").value = produto.id;
    document.getElementById("editar-nome").value = produto.nome;

    const selectEditar = document.getElementById("editar-categoria");
    await carregarCategoriasSelect(selectEditar, "Selecione uma categoria", produto.categoria_id);

    const inputQuantidade = document.getElementById("editar-quantidade");
    if (inputQuantidade) inputQuantidade.value = produto.quantidade_inicial;

    document.getElementById("modal-editar-produto").style.display = "block";

  } catch (err) {
    console.error("Erro ao abrir modal de edição:", err);
    showToast("Erro ao abrir produto", "error");
  }
}

// Confirmar exclusão
function confirmarExclusaoProduto(idProduto) {
  const modal = document.getElementById("modalConfirmacaoExclusao");
  modal.style.display = "block";

  document.getElementById("btnConfirmarExclusao").onclick = async () => {
    try {
      const resp = await fetch(`http://localhost:8001/produtos/${idProduto}`, { method: "DELETE" });
      if (resp.ok) {
        showToast("Produto excluído com sucesso", "success");
        carregarProdutos();
      } else {
        showToast("Erro ao excluir produto", "error");
      }
    } catch (err) {
      console.error("Erro ao excluir produto:", err);
      showToast("Erro ao excluir produto", "error");
    }
    modal.style.display = "none";
  };
}

function fecharModalExclusao() {
  document.getElementById("modalConfirmacaoExclusao").style.display = "none";
}

// ==========================
// Entradas e Saídas
// ==========================
function configurarFormMovimentacao(formId, selectProdutoId, rota, resetOnSuccess = true) {
  const form = document.getElementById(formId);
  const selectProduto = document.getElementById(selectProdutoId);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const produto_id = selectProduto.value;
    const quantidade = form.querySelector("input[type=number]").value;

    try {
      const response = await fetch(`http://localhost:8001/${rota}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id, quantidade })
      });

      if (response.ok) {
        showToast(`${rota.charAt(0).toUpperCase() + rota.slice(1)} registrada com sucesso!`, "success");
        if (resetOnSuccess) {
          form.reset();
          $(selectProduto).val("").trigger("change");
        }
      } else {
        showToast(`Erro ao registrar ${rota}`, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro no servidor", "error");
    }
  });
}

// ==========================
// Relatórios
// ==========================
if (document.getElementById("btn-novo-relatorio")) {
  document.getElementById("btn-novo-relatorio").addEventListener("click", () => {
    document.getElementById("modal-novo-relatorio").style.display = "block";
  });

  document.getElementById("form-novo-relatorio").addEventListener("submit", async e => {
    e.preventDefault();
    const titulo = document.getElementById("relatorio-titulo").value;
    const descricao = document.getElementById("relatorio-descricao").value;
    const data = document.getElementById("relatorio-data").value;

    try {
      const response = await fetch("http://localhost:8001/relatorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, descricao, data })
      });

      if (response.ok) {
        showToast("Relatório criado com sucesso!", "success");
        document.getElementById("form-novo-relatorio").reset();
        document.getElementById("modal-novo-relatorio").style.display = "none";
      } else {
        showToast("Erro ao criar relatório", "error");
      }
    } catch (err) {
      console.error("Erro:", err);
      showToast("Erro no servidor", "error");
    }
  });
}

// ==========================
// Inicialização global
// ==========================
document.addEventListener("DOMContentLoaded", () => {

  // Carregar categorias nos filtros
  document.querySelectorAll('select[id^="filtroCategoria"]').forEach(select => {
    carregarCategoriasSelect(select, "Todas as Categorias");
  });

  // Estoque
  if (document.getElementById("tabela-produtos")) {
    carregarProdutos();

    const inputBusca = document.getElementById("busca");
    const selectCategoria = document.getElementById("filtroCategoria");

    // Filtro de busca
    inputBusca?.addEventListener("input", () => {
      carregarProdutos({ busca: inputBusca.value, categoria: $(selectCategoria).val() || undefined });
    });

    // Filtro de categoria usando Select2
    $(selectCategoria).on("change", () => {
      carregarProdutos({ busca: inputBusca.value, categoria: $(selectCategoria).val() || undefined });
    });
  }

  // Configurar formulários de movimentação
  if (document.getElementById("form-entrada")) {
    configurarFormMovimentacao("form-entrada", "produtoEntrada", "entradas");
    carregarCategoriasSelect(document.getElementById("categoriaEntrada"), "Todas as Categorias");
  }

  if (document.getElementById("form-saida")) {
    configurarFormMovimentacao("form-saida", "produtoSaida", "saidas");
  }
});
``
