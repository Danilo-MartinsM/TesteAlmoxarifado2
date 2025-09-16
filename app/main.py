from fastapi import FastAPI, Form, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import mysql.connector
from datetime import datetime, date
import bcrypt

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="1234",
        database="almoxarifado1",
        charset='utf8mb4'
    )

# ==========================
# Login
# ==========================
@app.post("/login")
def login(username: str = Form(...), senha: str = Form(...)):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM usuarios WHERE username = %s", (username,))
        user = cursor.fetchone()
        if not user or not bcrypt.checkpw(senha.encode(), user['senha_hash'].encode()):
            raise HTTPException(status_code=401, detail="Credenciais inválidas")
        return {"mensagem": "Login realizado com sucesso!"}
    finally:
        cursor.close()
        db.close()

# ==========================
# Categorias
# ==========================
@app.get("/categorias")
def listar_categorias():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, nome FROM categorias ORDER BY nome ASC")
        return cursor.fetchall()
    finally:
        cursor.close()
        db.close()

# ==========================
# Produtos
# ==========================
@app.post("/produtos")
def criar_produto(
    nome: str = Form(...),
    id_categoria: int = Form(...),
    quantidade_inicial: int = Form(...),
    ultima_alteracao: Optional[str] = Form(None)
):
    db = get_db_connection()
    cursor = db.cursor()
    try:
        data_alt = datetime.now() if not ultima_alteracao else datetime.strptime(ultima_alteracao, "%Y-%m-%dT%H:%M")
        cursor.execute(
            "INSERT INTO produtos (nome, quantidade_inicial, id_categoria, ultima_alteracao) VALUES (UPPER(%s), %s, %s, %s)",
            (nome.strip(), quantidade_inicial, id_categoria, data_alt.strftime("%Y-%m-%d %H:%M:%S"))
        )
        produto_id = cursor.lastrowid
        cursor.execute(
            "INSERT INTO movimentacoes (tipo, quantidade, data_alteracao, id_produto) VALUES ('Entrada', %s, %s, %s)",
            (quantidade_inicial, data_alt.strftime("%Y-%m-%d %H:%M:%S"), produto_id)
        )
        db.commit()
        return {"mensagem": "Produto inserido com sucesso!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()

@app.put("/produtos/{produto_id}")
def atualizar_produto(
    produto_id: int,
    nome: str = Form(...),
    id_categoria: int = Form(...),
    ultima_alteracao: Optional[str] = Form(None)
):
    db = get_db_connection()
    cursor = db.cursor()
    try:
        data_alt = datetime.now() if not ultima_alteracao else datetime.strptime(ultima_alteracao, "%Y-%m-%dT%H:%M")
        cursor.execute(
            "UPDATE produtos SET nome=UPPER(%s), id_categoria=%s, ultima_alteracao=%s WHERE id=%s",
            (nome.strip(), id_categoria, data_alt.strftime("%Y-%m-%d %H:%M:%S"), produto_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        db.commit()
        return {"mensagem": "Produto atualizado com sucesso!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()

@app.delete("/produtos/{produto_id}")
def excluir_produto(produto_id: int):
    db = get_db_connection()
    cursor = db.cursor()
    try:
        cursor.execute("DELETE FROM movimentacoes WHERE id_produto = %s", (produto_id,))
        cursor.execute("DELETE FROM produtos WHERE id = %s", (produto_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        db.commit()
        return {"mensagem": "Produto e movimentações excluídos com sucesso!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()

@app.get("/produtos")
def listar_produtos(
    busca: Optional[str] = None,
    categoria_id: Optional[int] = Query(None)
):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        sql = "SELECT p.id, p.nome, c.nome AS categoria, p.quantidade_inicial, p.ultima_alteracao, p.id_categoria FROM produtos p LEFT JOIN categorias c ON p.id_categoria=c.id WHERE 1=1"
        params = []
        if busca:
            sql += " AND p.nome LIKE %s"
            params.append(f"%{busca}%")
        if categoria_id:
            sql += " AND p.id_categoria=%s"
            params.append(categoria_id)
        cursor.execute(sql, params)
        return cursor.fetchall()
    finally:
        cursor.close()
        db.close()

# ==========================
# Movimentações
# ==========================
@app.get("/movimentacoes")
def listar_movimentacoes(
    produto_id: Optional[int] = Query(None),
    categoria_id: Optional[int] = Query(None),
    data: Optional[str] = Query(None)
):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        sql = "SELECT m.id, m.tipo, m.quantidade, m.data_alteracao, p.nome AS produto, p.id_categoria FROM movimentacoes m JOIN produtos p ON m.id_produto=p.id WHERE 1=1"
        params = []
        if produto_id: sql += " AND p.id=%s"; params.append(produto_id)
        if categoria_id: sql += " AND p.id_categoria=%s"; params.append(categoria_id)
        if data: sql += " AND DATE(m.data_alteracao)=%s"; params.append(data)
        sql += " ORDER BY m.data_alteracao DESC"
        cursor.execute(sql, params)
        return cursor.fetchall()
    finally:
        cursor.close()
        db.close()

# ==========================
# Entradas
# ==========================
@app.post("/entradas")
def registrar_entrada(
    id_produto: int = Form(...),
    quantidade: int = Form(...),
    data_alteracao: str = Form(...)
):
    db = get_db_connection()
    cursor = db.cursor()
    try:
        if quantidade <= 0:
            raise HTTPException(status_code=400, detail="Quantidade deve ser maior que zero")
        cursor.execute(
            "UPDATE produtos SET quantidade_inicial = quantidade_inicial + %s, ultima_alteracao=%s WHERE id=%s",
            (quantidade, data_alteracao, id_produto)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        cursor.execute(
            "INSERT INTO movimentacoes (tipo, quantidade, data_alteracao, id_produto) VALUES ('Entrada', %s, %s, %s)",
            (quantidade, data_alteracao, id_produto)
        )
        db.commit()
        return {"mensagem": "Entrada registrada com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()

# ==========================
# Saídas
# ==========================
@app.post("/saidas")
def registrar_saida(
    id_produto: int = Form(...),
    quantidade: int = Form(...),
    data_alteracao: str = Form(...)
):
    db = get_db_connection()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT quantidade_inicial FROM produtos WHERE id=%s", (id_produto,))
        resultado = cursor.fetchone()
        if not resultado:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        if quantidade > resultado[0]:
            raise HTTPException(status_code=400, detail="Quantidade insuficiente no estoque")
        cursor.execute("UPDATE produtos SET quantidade_inicial = quantidade_inicial - %s WHERE id=%s", (quantidade, id_produto))
        cursor.execute("INSERT INTO movimentacoes (tipo, quantidade, data_alteracao, id_produto) VALUES ('Saída', %s, %s, %s)", (quantidade, data_alteracao, id_produto))
        db.commit()
        return {"mensagem": "Saída registrada com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()

# ==========================
# Relatórios
# ==========================
@app.post("/relatorios")
def criar_relatorio(
    titulo: str = Form(...),
    descricao: str = Form(...),
    lembrete: Optional[str] = Form(None)
):
    db = get_db_connection()
    cursor = db.cursor()
    try:
        data_lembrete = None
        if lembrete:
            data_lembrete = datetime.strptime(lembrete, "%Y-%m-%d").date()
        cursor.execute(
            "INSERT INTO relatorios (titulo, descricao, data_criacao, data_lembrete) VALUES (UPPER(%s), UPPER(%s), %s, %s)",
            (titulo, descricao, date.today(), data_lembrete)
        )
        db.commit()
        return {"mensagem": "Relatório criado com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()

@app.get("/relatorios")
def listar_relatorios():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, titulo, descricao, data_criacao, data_lembrete FROM relatorios ORDER BY id ASC")
        return cursor.fetchall()
    finally:
        cursor.close()
        db.close()

@app.delete("/relatorios/{relatorio_id}")
def excluir_relatorio(relatorio_id: int):
    db = get_db_connection()
    cursor = db.cursor()
    try:
        cursor.execute("DELETE FROM relatorios WHERE id=%s", (relatorio_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Relatório não encontrado")
        db.commit()
        return {"mensagem": "Relatório excluído com sucesso"}
    finally:
        cursor.close()
        db.close()
