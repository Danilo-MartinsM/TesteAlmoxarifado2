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
const formLogin = document.getElementById("login-form");
if (formLogin) {
  formLogin.addEventListener("submit", async e => {
    e.preventDefault();

    const username = formLogin.querySelector("input[name=username]").value;
    const senha = formLogin.querySelector("input[name=senha]").value;

    try {
      const response = await fetch("http://localhost:8001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ username, senha })         
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.mensagem || "Login realizado com sucesso", "success");
        setTimeout(() => window.location.href = "dashboard.html", 1000);
      } else {
        showToast(data.detail || "Usuário ou senha incorretos", "error");
      }
    } catch (err) {
      console.error("Erro no login:", err);
      showToast("Erro no servidor", "error");
    }
  });
}


// ==========================
// Estoque
// ==========================
document.addEventListener("DOMContentLoaded", () => {

  const buscaInput = document.getElementById("busca");
  const categoriaSelect = $('#filtroCategoria'); // Select2
  const dataInput = document.getElementById("filtro-data");
  const tabelaBody = document.querySelector("#tabela-produtos tbody");

  // Inicializa Select2
  categoriaSelect.select2({
    placeholder: "Todas as Categorias",
    allowClear: true,
    width: "200px"
  });

  // Carrega categorias da API
  fetch("http://localhost:8001/categorias")
    .then(res => res.json())
    .then(data => {
      data.forEach(cat => {
        const option = new Option(cat.nome, cat.id, false, false);
        categoriaSelect.append(option);
      });
      categoriaSelect.trigger('change');
      atualizarTabela(); // chama só depois que categorias estão carregadas
    })
    .catch(err => console.error("Erro ao carregar categorias:", err));

  // ==========================
  // Função para carregar produtos com filtros
  // ==========================
  async function carregarProdutos(filtros = {}) {
    try {
      let url = "http://localhost:8001/produtos?";
      if (filtros.categoria) url += `categoria_id=${filtros.categoria}&`;
      if (filtros.busca) url += `busca=${encodeURIComponent(filtros.busca)}&`;
      if (filtros.data) url += `data=${filtros.data}&`;

      const response = await fetch(url);
      const produtos = await response.json();

      tabelaBody.innerHTML = "";

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
        tabelaBody.appendChild(tr);
      });

    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
      showToast("Erro ao carregar produtos", "error");
    }
  }

  // ==========================
  // Pega filtros atuais
  // ==========================
  function getFiltrosAtuais() {
    return {
      busca: buscaInput.value || undefined,
      categoria: categoriaSelect.val() || undefined,
      data: dataInput.value || undefined
    };
  }

  // ==========================
  // Atualiza tabela usando filtros atuais
  // ==========================
  function atualizarTabela() {
    carregarProdutos(getFiltrosAtuais());
  }

  // ==========================
  // Eventos dos filtros
  // ==========================
  buscaInput.addEventListener("input", atualizarTabela);
  categoriaSelect.on("change", atualizarTabela);
  dataInput.addEventListener("change", atualizarTabela);

  // ==========================
  // Exclusão de produtos
  // ==========================
  window.confirmarExclusaoProduto = function(idProduto) {
    const modal = document.getElementById("modalConfirmacaoExclusao");
    modal.style.display = "block";

    document.getElementById("btnConfirmarExclusao").onclick = async () => {
      try {
        const resp = await fetch(`http://localhost:8001/produtos/${idProduto}`, { method: "DELETE" });
        const data = await resp.json(); 
        if (resp.ok) {
          showToast(data.mensagem || "Produto excluído com sucesso", "success");
          atualizarTabela(); // atualiza mantendo filtros
        } else {
          showToast(data.detail || "Erro ao excluir produto", "error");
        }
      } catch (err) {
        console.error("Erro ao excluir produto:", err);
        showToast("Erro ao excluir produto", "error");
      }
      modal.style.display = "none";
    };
  };

  window.fecharModalExclusao = function() {
    document.getElementById("modalConfirmacaoExclusao").style.display = "none";
  };

});




// ==========================
// Entradas e Saídas
// ==========================
function configurarFormMovimentacao(formId, selectProdutoId, rota, resetOnSuccess = true) {
  const form = document.getElementById(formId);
  const selectProduto = document.getElementById(selectProdutoId);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const id_produto = selectProduto.value;
    const quantidade = Number(form.querySelector("input[type=number]").value);
    const data_alteracao = new Date().toISOString().slice(0, 19).replace("T", " ");

    try {
      const response = await fetch(`http://localhost:8001/${rota}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_produto, quantidade, data_alteracao }) 
      });

      const data = await response.json(); 

      if (response.ok) {
        showToast(data.mensagem || `${rota} registrada com sucesso!`, "success");
        if (resetOnSuccess) {
          form.reset();
          $(selectProduto).val("").trigger("change");
        }
      } else {
        showToast(data.detail || `Erro ao registrar ${rota}`, "error");
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
    const lembrete = document.getElementById("relatorio-data").value;

    try {
      const response = await fetch("http://localhost:8001/relatorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, descricao, lembrete })
      });

      const data = await response.json(); 

      if (response.ok) {
        showToast(data.mensagem || "Relatório criado com sucesso!", "success");
        document.getElementById("form-novo-relatorio").reset();
        document.getElementById("modal-novo-relatorio").style.display = "none";
      } else {
        showToast(data.detail || "Erro ao criar relatório", "error");
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
