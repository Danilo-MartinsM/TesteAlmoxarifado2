// --- Variáveis globais ---
let ordemAtual = {
  coluna: "id",
  direcao: "asc"
};

document.addEventListener("DOMContentLoaded", () => {
  // Carrega categorias em todos os selects com ID que começa com "filtroCategoria"
  document.querySelectorAll('select[id^="filtroCategoria"]').forEach(select => {
    carregarCategoriasSelect(select, "Todas as Categorias");
  });

  // Aplica select2 aos filtros (apenas após o DOM estar carregado)
  $('#filtroProduto').select2();
  $('#filtroCategoria').select2();
});

// --- Funções auxiliares ---

// Carrega categorias em um select COM Select2 (formato idêntico ao de produtos)
function carregarCategoriasSelect(selectElement, textoPadrao = "Todas as Categorias") {
  fetch("http://localhost:8000/categorias")
  .then(res => res.json())
  .then(data => {
    selectElement.innerHTML = `<option value="">${textoPadrao}</option>`;
    data.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.nome;
      selectElement.appendChild(option);
    });
    
    // Aplica Select2 com mesmo formato do de produtos
    $(selectElement).select2({
      placeholder: textoPadrao,
      allowClear: true,
      width: '100%'
    });
  })
  .catch(() => {
    selectElement.innerHTML = `<option value="">Erro ao carregar categorias</option>`;
    });
  }
  
  
  // Carrega produtos em um select COM Select2
  function carregarProdutosSelect(selectElement, textoPadrao = "Todos os Produtos") {
    fetch("http://localhost:8000/produtos")
    .then(res => res.json())
    .then(data => {
      selectElement.innerHTML = `<option value="">${textoPadrao}</option>`;
      data.forEach(prod => {
        const option = document.createElement("option");
        option.value = prod.id;
        option.textContent = prod.nome;
        selectElement.appendChild(option);
      });
      
      // Aplica Select2 só aqui
      $(selectElement).select2({
        placeholder: textoPadrao,
        allowClear: true,
        width: '100%'
      });
    })
    .catch(() => {
      selectElement.innerHTML = `<option value="">Erro ao carregar produtos</option>`;
    });
  }
  
  // --- LOGIN ---
  if (document.getElementById("login-form")) {
    const form = document.getElementById("login-form");
    const mensagem = document.getElementById("mensagem");
    
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      
      const formData = new FormData(form);
      
      try {
        const response = await fetch("http://localhost:8000/login", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          mensagem.textContent = errorData.detail || "Erro no login.";
          mensagem.classList.remove("sucesso");
          mensagem.classList.add("erro");
          return;
        }
        
        const data = await response.json();
        mensagem.textContent = data.mensagem;
        mensagem.classList.remove("erro");
        mensagem.classList.add("sucesso");
        
        setTimeout(() => {
          window.location.href = "1_dashboard.html";
        }, 1000);
      } catch (error) {
        mensagem.textContent = "Erro na conexão.";
        mensagem.classList.remove("sucesso");
        mensagem.classList.add("erro");
        console.error("Erro no fetch:", error);
      }
    });
  }
  
  // --- CADASTRO DE PRODUTO ---
  if (document.getElementById("form-cadastro")) {
    const form = document.getElementById("form-cadastro");
    const categoriaSelect = document.getElementById("categoriaProduto");
    
    // Preenche o campo dataAlteracao com a data atual no formato correto
    const dataInput = document.getElementById("dataAlteracao");
    if (dataInput) {
      const agora = new Date();
      
      const ano = agora.getFullYear();
      const mes = String(agora.getMonth() + 1).padStart(2, '0');
      const dia = String(agora.getDate()).padStart(2, '0');
      const horas = String(agora.getHours()).padStart(2, '0');
      const minutos = String(agora.getMinutes()).padStart(2, '0');
      
      const dataLocal = `${ano}-${mes}-${dia}T${horas}:${minutos}`;
      dataInput.value = dataLocal;
    }
    
    if (categoriaSelect) carregarCategoriasSelect(categoriaSelect);
    
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const formData = new FormData();
      formData.append("nome", form.nomeProduto.value);
      formData.append("id_categoria", form.categoriaProduto.value);
      formData.append("data_alteracao", form.dataAlteracao.value);
      formData.append("quantidade_inicial", form.quantidadeInicial.value);
      
      try {
        const response = await fetch("http://localhost:8000/produtos", {
          method: "POST",
          body: formData,
        });
        
        const data = await response.json();
        if (response.ok) {
          showToast(data.mensagem || "Produto cadastrado com sucesso!", "success");
          form.reset();
        } else {
          showToast(data.detail || "Erro ao cadastrar.", "error");
        }
        
      } catch (err) {
        showToast("Erro ao conectar com o servidor.", "error");
      }
    });
  }
  
  // --- PÁGINA DE ESTOQUE ---
  if (document.getElementById("tabela-produtos")) {
    
    function carregarCategoriasSelect(selectElement, textoPadrao = "Todas as Categorias") {
      fetch("http://localhost:8000/categorias")
      .then(res => res.json())
      .then(data => {
        selectElement.innerHTML = `<option value="">${textoPadrao}</option>`;
        data.forEach(cat => {
          const option = document.createElement("option");
          option.value = cat.id;
          option.textContent = cat.nome;
          selectElement.appendChild(option);
        });
        
        // Aplica Select2 no select depois de carregar as opções
        $(selectElement).select2({
          placeholder: textoPadrao,
          allowClear: true,
          width: '100%'
        });
      })
      .catch(() => {
        selectElement.innerHTML = `<option value="">Erro ao carregar categorias</option>`;
      });
    }
    
    
    function carregarProdutos() {
      const busca = document.getElementById("busca")?.value || "";
      const categoria = document.getElementById("filtro-categoria").value;
      const dataFiltro = document.getElementById("filtro-data").value;
      
      let url = `http://localhost:8000/produtos?order_by=${ordemAtual.coluna}&order_dir=${ordemAtual.direcao}&busca=${encodeURIComponent(busca)}`;
      
      if (categoria) url += `&categoria_id=${categoria}`;
      if (dataFiltro) url += `&data=${encodeURIComponent(dataFiltro)}`;
      
      fetch(url)
      .then(res => res.json())
      .then(data => {
        const tbody = document.querySelector("#tabela-produtos tbody");
        tbody.innerHTML = "";
        
        data.forEach(produto => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
          <td>${produto.id}</td>
          <td>${produto.nome}</td>
          <td>${produto.categoria || "Sem categoria"}</td>
          <td>${produto.quantidade_inicial}</td>
          <td>${produto.ultima_alteracao ? new Date(produto.ultima_alteracao).toLocaleString("pt-BR") : '—'}</td>
          <td>
          <button onclick="abrirEditarModal(${produto.id}, '${produto.nome}', '${produto.id_categoria || ''}')">Editar</button>
          <button onclick="confirmarExclusaoProduto(${produto.id})">Excluir</button>
          </td>
          `;
          tbody.appendChild(tr);
        });
      })
      .catch(err => console.error("Erro ao carregar produtos", err));
    }
    
    function configurarOrdenacao() {
      const headers = document.querySelectorAll("#tabela-produtos thead th");
      headers.forEach(th => {
        th.style.cursor = "pointer";
        th.addEventListener("click", () => {
          const coluna = th.getAttribute("data-coluna");
          if (!coluna) return;
          
          if (ordemAtual.coluna === coluna) {
            ordemAtual.direcao = ordemAtual.direcao === "asc" ? "desc" : "asc";
          } else {
            ordemAtual.coluna = coluna;
            ordemAtual.direcao = "asc";
          }
          carregarProdutos();
        });
      });
    }
    
    // Modal editar produto
    function abrirEditarModal(id, nome, id_categoria) {
      document.getElementById("editar-id").value = id;
      document.getElementById("editar-nome").value = nome;
      
      const selectEditar = document.getElementById("editar-categoria");
      if (selectEditar) carregarCategoriasSelect(selectEditar);
      
      fetch("http://localhost:8000/categorias")
      .then(res => res.json())
      .then(categorias => {
        // Depois de carregar as categorias, seleciona a correta
        const options = selectEditar.options;
        for (let i = 0; i < options.length; i++) {
          if (options[i].value == id_categoria) {
            options[i].selected = true;
            break;
          }
        }
        document.getElementById("modal-editar").style.display = "flex";
      });
    }
    
    function fecharModal() {
      document.getElementById("modal-editar").style.display = "none";
    }
    
    document.getElementById("form-editar").addEventListener("submit", function (e) {
      e.preventDefault();
      
      const id = document.getElementById("editar-id").value;
      const nome = document.getElementById("editar-nome").value;
      const id_categoria = document.getElementById("editar-categoria").value;
      
      const formData = new FormData();
      formData.append("nome", nome);
      formData.append("id_categoria", id_categoria);
      
      fetch(`http://localhost:8000/produtos/${id}`, {
        method: "PUT",
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        showToast(data.mensagem || "Produto editado com sucesso!", "success");
        fecharModal();
        carregarProdutos();
      })
      .catch(err => {
        console.error("Erro ao editar produto:", err);
        showToast("Erro ao editar produto", "error");
      });
      
    });

    function excluirProduto(id) {
      confirmarExclusaoProduto(id);
      
      fetch(`http://localhost:8000/produtos/${id}`, {
        method: "DELETE"
      })
      .then(res => res.json())
      .then(data => {
        showToast(data.mensagem || "Produto excluído com sucesso!", "success");
        carregarProdutos();
      })
      .catch(err => {
        console.error("Erro ao excluir produto:", err);
        showToast("Erro ao excluir produto", "error");
      });
      
    }
    
    // Inicialização da página de estoque
    window.onload = function () {
      carregarCategorias();
      configurarOrdenacao();
      carregarProdutos();
  };
}

// --- CALENDÁRIO (FullCalendar) ---
if (document.getElementById("calendar")) {
  const calendarEl = document.getElementById('calendar');
  const dataAtualInput = document.getElementById('data-atual');
  const dataVisualEl = document.getElementById('data-visual');
  const filtroProduto = document.getElementById('filtroProduto');
  const filtroCategoria = document.getElementById('filtroCategoria');
  
  // Preenche os filtros
  if (filtroCategoria) {
    carregarCategoriasSelect(filtroCategoria, "Todas as Categorias");
  }
  if (filtroProduto) {
    carregarProdutosSelect(filtroProduto, "Todos os Produtos");
  }
  
  // Define data de hoje
  const hojeDate = new Date();
  const hoje = hojeDate.getFullYear() + '-' +
  String(hojeDate.getMonth() + 1).padStart(2, '0') + '-' +
  String(hojeDate.getDate()).padStart(2, '0');
  
  const eventosHoje = [{
    title: 'Hoje',
    date: hoje,
    display: 'background',
    backgroundColor: '#ffeaa7'
  }];
  
  // Busca eventos reais de relatorios com lembrete
  async function carregarEventosRelatorios() {
    const eventos = [...eventosHoje];
    
    try {
      const response = await fetch("http://localhost:8001/relatorios-com-lembrete");
      const relatorios = await response.json();
      
      relatorios.forEach(relatorio => {
        eventos.push({
          title: relatorio.titulo,
          date: relatorio.data_lembrete.split('T')[0], // ← Aqui o ajuste
          backgroundColor: '#fab1a0'
        });
      });
      
    } catch (error) {
      console.error("Erro ao buscar relatórios com lembrete:", error);
    }

    return eventos;
  }
  
  // Inicializa o calendário com os eventos reais
  carregarEventosRelatorios().then(eventosRelatorios => {
    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      locale: 'pt-br',
      events: eventosRelatorios,
      dateClick: function (info) {
        const selectedDate = info.dateStr;
        
        if (dataAtualInput) {
          dataAtualInput.value = selectedDate;
          console.log("🟢 Data selecionada no calendário:", selectedDate);
        }
        
        if (dataVisualEl) {
          const dataFormatada = info.date.toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric'
          });
          dataVisualEl.textContent = (selectedDate === hoje)
          ? 'Hoje: ' + dataFormatada
          : 'Data: ' + dataFormatada;
        }
        
        document.querySelectorAll('.fc-day').forEach(day => {
          day.classList.remove('fc-day-selected');
        });
        info.dayEl.classList.add('fc-day-selected');
        
        carregarMovimentacoes();
      }
    });
    
    calendar.render();
    
    // Atualiza eventos quando filtros mudam
    if (filtroProduto) {
      $(filtroProduto).on('change', async () => {
        calendar.removeAllEvents();
        const novosEventos = await carregarEventosRelatorios();
        calendar.addEventSource(novosEventos);
        carregarMovimentacoes();
      });
    }
    
    if (filtroCategoria) {
      filtroCategoria.addEventListener('change', async () => {
        calendar.removeAllEvents();
        const novosEventos = await carregarEventosRelatorios();
        calendar.addEventSource(novosEventos);
        carregarMovimentacoes();
      });
    }
  });
  
  // Inicializa input e visual com hoje
  if (dataAtualInput) dataAtualInput.value = hoje;
  if (dataVisualEl) {
    dataVisualEl.textContent = 'Hoje: ' + hojeDate.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }
  
  // Carrega movimentações inicialmente com data de hoje
  carregarMovimentacoes();
}




// --- MOVIMENTAÇÕES ---

function carregarMovimentacoes() {
  const container = document.querySelector(".movimentacao-list");
  if (!container) {
    console.log("Container não encontrado");
    return;
  }
  
  const filtroProduto = document.getElementById('filtroProduto');
  const filtroCategoria = document.getElementById('filtroCategoria');
  const dataAtualEl = document.getElementById('data-atual');
  const dataSelecionada = dataAtualEl ? dataAtualEl.value : "";
  
  const produtoSelecionado = filtroProduto ? $(filtroProduto).val() : "";
  const categoriaSelecionada = filtroCategoria ? filtroCategoria.value : "";
  
  let url = "http://localhost:8000/movimentacoes?";
  const params = [];
  
  if (produtoSelecionado) params.push(`produto_id=${encodeURIComponent(produtoSelecionado)}`);
  if (categoriaSelecionada) params.push(`categoria_id=${encodeURIComponent(categoriaSelecionada)}`);
  if (dataSelecionada) params.push(`data=${encodeURIComponent(dataSelecionada)}`);
  
  url += params.join("&");
  
  console.log("URL chamada:", url);
  
  fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log("Movimentações:", data);
    container.innerHTML = "";
    
    if (data.length === 0) {
      container.innerHTML = "<p>Nenhuma movimentação encontrada.</p>";
      return;
    }
    
    data.forEach(mov => {
      const div = document.createElement("div");
      div.classList.add("product-item");
      div.innerHTML = `
      <div class="product-icon">📦</div>
      <div>
      <strong>${mov.produto}</strong><br />
      <small>${mov.tipo} - ${mov.quantidade} unidades</small><br />
      <small>${new Date(mov.data_alteracao).toLocaleString('pt-BR')}</small><br />
      </div>
      `;
      container.appendChild(div);
    });
  })
  .catch(err => {
    console.error("Erro ao carregar movimentações:", err);
    });
  }
  
  
  
  // --- TOASTS ---
  
  function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    
    const toast = document.createElement("div");
    toast.classList.add("toast", type);
    toast.textContent = message;
    
    // Remove o toast ao clicar
    toast.addEventListener("click", () => {
      toast.style.animation = "fadeOut 0.5s forwards";
      setTimeout(() => toast.remove(), 500);
    });
    
    container.appendChild(toast);
    
    // Inicia animação fadeOut após 2.5 segundos e remove após 3 segundos
    setTimeout(() => {
      toast.style.animation = "fadeOut 0.5s forwards";
      setTimeout(() => toast.remove(), 500);
    }, 2500);
}



// --- CADASTRAR ENTRADAS ---
if (window.location.pathname.includes("cadastrarEntradas.html")) {
  const filtroProduto = document.getElementById("filtroProduto");
  const formEntrada = document.querySelector("form");
  const dataInput = document.getElementById("dataAlteracao");
  
  // <div id="mensagem" style="display:none; margin-top:10px; font-weight:bold;"></div>
  const mensagem = document.getElementById("mensagem");
  
  // Função para mostrar mensagens
  function mostrarMensagem(texto, tipo = "erro") {
    if (!mensagem) return;
    mensagem.textContent = texto;
    mensagem.className = tipo; // "erro" ou "sucesso"
    mensagem.style.display = "block";
    
    setTimeout(() => {
      mensagem.style.display = "none";
    }, 4000);
  }
  
  // Atualiza campo data/hora para horário atual formatado
  function atualizarDataAtual() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    if (dataInput) dataInput.value = `${ano}-${mes}-${dia}T${horas}:${minutos}`;
  }
  
  
  
  
  // Carrega os produtos no select com Select2
  if (filtroProduto) {
    carregarProdutosSelect(filtroProduto, "Selecione um produto");
  }
  
  if (dataInput) {
    atualizarDataAtual();
  }
  
  if (formEntrada) {
    formEntrada.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const id_produto = filtroProduto?.value;
      const quantidadeStr = document.getElementById("quantidadeEntrada")?.value;
      const data_alteracao = dataInput?.value;
      
      // Validações
      if (!id_produto) {
        mostrarMensagem("Por favor, selecione um produto.", "erro");
        return;
      }
      
      const quantidade = Number(quantidadeStr);
      if (!quantidade || quantidade <= 0 || !Number.isInteger(quantidade)) {
        mostrarMensagem("Informe uma quantidade válida (inteiro maior que zero).", "erro");
        return;
      }
      
      if (!data_alteracao) {
        mostrarMensagem("Informe a data da entrada.", "erro");
        return;
      }
      
      const formData = new FormData();
      formData.append("id_produto", id_produto);
      formData.append("quantidade", quantidade);
      formData.append("data_alteracao", data_alteracao);
      
      try {
        const response = await fetch("http://localhost:8000/entradas", {
          method: "POST",
          body: formData,
        });
        
        const result = await response.json();
        
        if (response.ok) {
          mostrarMensagem(result.mensagem || "Entrada registrada com sucesso.", "sucesso");
          formEntrada.reset();
          atualizarDataAtual();
        } else {
          mostrarMensagem(result.detail || "Erro ao registrar entrada.", "erro");
        }
      } catch (error) {
        console.error("Erro ao enviar entrada:", error);
        mostrarMensagem("Erro ao conectar com o servidor.", "erro");
      }
    });
  }
}







// --- CADASTRAR SAÍDAS ---
if (window.location.pathname.includes("cadastrarSaidas.html")) {
  const filtroProdutoSaida = document.getElementById("filtroProdutoSaida");
  const formSaida = document.querySelector("form");
  const dataInput = document.getElementById("dataSaida");
  
  // Crie um container para mensagens, ou adicione no HTML:
  // <div id="mensagem" style="display:none; margin-top:10px; font-weight:bold;"></div>
  const mensagem = document.getElementById("mensagem");
  
  // Função para mostrar mensagens
  function mostrarMensagem(texto, tipo = "erro") {
    if (!mensagem) return;
    mensagem.textContent = texto;
    mensagem.className = tipo; // "erro" ou "sucesso"
    mensagem.style.display = "block";
    
    setTimeout(() => {
      mensagem.style.display = "none";
    }, 4000);
  }
  
  // Atualiza campo data/hora para horário atual formatado
  function atualizarDataAtual() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    if (dataInput) dataInput.value = `${ano}-${mes}-${dia}T${horas}:${minutos}`;
  }
  
  
  
  // Carrega os produtos no select com Select2
  if (filtroProdutoSaida) {
    carregarProdutosSelect(filtroProdutoSaida, "Selecione um produto");
  }
  
  if (dataInput) {
    atualizarDataAtual();
  }
  
  if (formSaida) {
    formSaida.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const id_produto = filtroProdutoSaida?.value;
      const quantidadeStr = document.getElementById("quantidadeSaida")?.value;
      const data_alteracao = dataInput?.value;
      
      // Validações
      if (!id_produto) {
        mostrarMensagem("Por favor, selecione um produto.", "erro");
        return;
      }
      
      const quantidade = Number(quantidadeStr);
      if (!quantidade || quantidade <= 0 || !Number.isInteger(quantidade)) {
        mostrarMensagem("Informe uma quantidade válida (inteiro maior que zero).", "erro");
        return;
      }
      
      if (!data_alteracao) {
        mostrarMensagem("Informe a data da saída.", "erro");
        return;
      }
      
      const formData = new FormData();
      formData.append("id_produto", id_produto);
      formData.append("quantidade", quantidade);
      formData.append("data_alteracao", data_alteracao);
      
      try {
        const response = await fetch("http://localhost:8000/saidas", {
          method: "POST",
          body: formData,
        });
        
        const result = await response.json();
        
        if (response.ok) {
          mostrarMensagem(result.mensagem || "Saída registrada com sucesso.", "sucesso");
          formSaida.reset();
          atualizarDataAtual();
        } else {
          mostrarMensagem(result.detail || "Erro ao registrar saída.", "erro");
        }
      } catch (error) {
        console.error("Erro ao enviar saída:", error);
        mostrarMensagem("Erro ao conectar com o servidor.", "erro");
      }
    });
  }
}







// --- RELATÓRIOS ---
function abrirModalNovoRelatorio() {
  const modal = document.getElementById("modal-novo-relatorio");
  if (modal) modal.style.display = "flex";
}

function fecharModalNovoRelatorio() {
  const modal = document.getElementById("modal-novo-relatorio");
  if (modal) modal.style.display = "none";
}

const botaoNovoRelatorio = document.getElementById("btn-novo-relatorio");
if (botaoNovoRelatorio) {
  botaoNovoRelatorio.addEventListener("click", abrirModalNovoRelatorio);
}

const formNovoRelatorio = document.getElementById("form-novo-relatorio");
if (formNovoRelatorio) {
  formNovoRelatorio.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const titulo = document.getElementById("novo-titulo").value.trim();
    const descricao = document.getElementById("novo-descricao").value.trim();
    const lembrete = document.getElementById("novo-lembrete").value;
    
    if (!titulo || !descricao) {
      alert("Título e descrição são obrigatórios.");
      return;
    }
    
    const formData = new FormData();
    formData.append("titulo", titulo);
    formData.append("descricao", descricao);
    formData.append("lembrete", lembrete);
    
    try {
      const response = await fetch("http://localhost:8000/relatorios", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showToast(data.mensagem || "Relatório criado com sucesso!", "success");
        fecharModalNovoRelatorio();
        formNovoRelatorio.reset();
        carregarRelatorios();
      } else {
        showToast(data.detail || "Erro ao criar relatório.", "error");
      }
    } catch (error) {
      console.error("Erro ao criar relatório:", error);
        showToast("Erro na comunicação com o servidor.", "error");
      }
      
    });
  }
  
  
  
  
  
  
  

  function limitarTexto(texto, limite) {
    if (!texto) return "—";
    return texto.length > limite ? texto.slice(0, limite) + "..." : texto;
  }
  
  function carregarRelatorios() {
    fetch("http://localhost:8000/relatorios")
    .then((res) => res.json())
    .then((data) => {
      const tbody = document.querySelector("#tabela-relatorios tbody");
      tbody.innerHTML = "";
      
      data.forEach((rel) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
        <td>${rel.id}</td>
        <td title="${rel.titulo}">${limitarTexto(rel.titulo, 20)}</td>
          <td title="${rel.descricao}">${limitarTexto(rel.descricao, 70)}</td>
          <td>${rel.data_criacao ? new Date(rel.data_criacao).toLocaleDateString("pt-BR") : "—"}</td>
          <td>${rel.data_lembrete ? new Date(rel.data_lembrete).toLocaleDateString("pt-BR") : "—"}</td>
          <td>
          <button onclick="abrirEditarModalRelatorio(${rel.id}, '${rel.titulo.replace(/'/g, "\\'")}', '${rel.descricao.replace(/'/g, "\\'")}', '${rel.data_criacao}', '${(rel.data_lembrete || "").replace(/'/g, "\\'")}')">Editar</button>
          <button onclick="excluirRelatorio(${rel.id})">Excluir</button>
          </td>
          `;
          tbody.appendChild(tr);
        });
      })
      .catch((err) => {
        console.error("Erro ao carregar relatórios:", err);
      });
    }
    
    
    function abrirEditarModalRelatorio() {
      alert("Função de editar ainda não implementada.");
    }
    
    function excluirRelatorio(id) {
      alert("Função de excluir ainda não implementada.");
}

window.addEventListener("load", () => {
  carregarRelatorios();
});






let idProdutoParaExcluir = null;

function confirmarExclusaoProduto(id) {
  idProdutoParaExcluir = id;
  const modal = document.getElementById("modal-confirmar-exclusao");
  modal.style.display = "flex";
}

function fecharModalConfirmacao() {
  document.getElementById("modal-confirmar-exclusao").style.display = "none";
  idProdutoParaExcluir = null;
}

document.getElementById("btn-confirmar-exclusao").addEventListener("click", () => {
  if (idProdutoParaExcluir !== null) {
    excluirProduto(idProdutoParaExcluir);
    fecharModalConfirmacao();
  }
});






