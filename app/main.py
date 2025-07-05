from fastapi import FastAPI, Form, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import mysql.connector
from datetime import datetime
import bcrypt


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ajuste para domínio do frontend em produção
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="1234",
        database="almoxarifado1"
    )

@app.post("/produtos")
def criar_produto(
    nome: str = Form(...),
    id_categoria: int = Form(...),
    quantidade_inicial: int = Form(...),
    ultima_alteracao: Optional[str] = Form(None)  # receber como string opcional
):
    db = get_db_connection()
    cursor = db.cursor()

    # Converter string para datetime ou usar data atual
    if ultima_alteracao:
        try:
            data_alt = datetime.strptime(ultima_alteracao, "%Y-%m-%dT%H:%M")  # formato do input datetime-local HTML
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido")
    else:
        data_alt = datetime.now()

    # Inserir produto
    sql = "INSERT INTO produtos (nome, quantidade_inicial, id_categoria, ultima_alteracao) VALUES (UPPER(%s), %s, %s, %s)"
    valores = (nome, quantidade_inicial, id_categoria, data_alt.strftime("%Y-%m-%d %H:%M:%S"))
    cursor.execute(sql, valores)

    # Obter ID do produto inserido para movimentação
    produto_id = cursor.lastrowid

    # Registrar movimentação (Entrada)
    sql_mov = """
    INSERT INTO movimentacoes (tipo, quantidade, data_alteracao, relatorio, id_produto) 
    VALUES ('Entrada', %s, %s, %s, %s)
    """
    relatorio_texto = f"Entrada inicial do produto {nome}"
    valores_mov = (quantidade_inicial, data_alt.strftime("%Y-%m-%d %H:%M:%S"), relatorio_texto, produto_id)
    cursor.execute(sql_mov, valores_mov)

    db.commit()
    cursor.close()
    db.close()
    return {"mensagem": "Produto inserido com sucesso!"}


@app.put("/produtos/{produto_id}")
def atualizar_produto(
    produto_id: int,
    nome: str = Form(...),
    id_categoria: int = Form(...),
    ultima_alteracao: Optional[str] = Form(None)
):
    db = get_db_connection()
    cursor = db.cursor()

    if ultima_alteracao:
        try:
            data_alt = datetime.strptime(ultima_alteracao, "%Y-%m-%dT%H:%M")
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido")
    else:
        data_alt = datetime.now()

    sql = """
    UPDATE produtos 
    SET nome = UPPER(%s), id_categoria = %s, ultima_alteracao = %s
    WHERE id = %s
    """
    valores = (nome, id_categoria, data_alt.strftime("%Y-%m-%d %H:%M:%S"), produto_id)
    cursor.execute(sql, valores)

    db.commit()
    cursor.close()
    db.close()
    return {"mensagem": "Produto atualizado com sucesso!"}


@app.get("/produtos")
def listar_produtos(
    order_by: str = Query("id", regex="^(id|nome|categoria|quantidade_inicial)$"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
    busca: Optional[str] = None,
    categoria_id: Optional[int] = Query(None),
    data: Optional[str] = Query(None)  # novo parâmetro data
):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    coluna_map = {
        "id": "p.id",
        "nome": "p.nome",
        "categoria": "c.nome",
        "quantidade_inicial": "p.quantidade_inicial",
        "ultima_alteracao": "p.ultima_alteracao"
    }
    coluna = coluna_map[order_by]

    sql = """
        SELECT 
            p.id, p.nome, c.nome AS categoria, p.quantidade_inicial, p.ultima_alteracao
        FROM 
            produtos p
        LEFT JOIN 
            categorias c ON p.id_categoria = c.id
        WHERE 1=1
    """
    params = []

    if busca:
        sql += " AND p.nome LIKE %s"
        params.append(f"%{busca}%")

    if categoria_id:
        sql += " AND p.id_categoria = %s"
        params.append(categoria_id)

    if data:
        sql += " AND DATE(p.ultima_alteracao) = %s"
        params.append(data)

    sql += f" ORDER BY {coluna} {order_dir.upper()}"

    cursor.execute(sql, params)
    produtos = cursor.fetchall()
    cursor.close()
    db.close()
    return produtos

@app.get("/categorias")
def listar_categorias():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id, nome FROM categorias")
    categorias = cursor.fetchall()
    cursor.close()
    db.close()
    return categorias



@app.put("/produtos/{produto_id}")
def atualizar_produto(
    produto_id: int,
    nome: str = Form(...),
    id_categoria: int = Form(...)
):
    db = get_db_connection()
    cursor = db.cursor()
    sql = """
    UPDATE produtos 
    SET nome = Upper(%s), id_categoria = %s
    WHERE id = %s
    """
    valores = (nome, id_categoria, produto_id)
    cursor.execute(sql, valores)

    db.commit()
    cursor.close()
    db.close()
    return {"mensagem": "Produto atualizado com sucesso!"}



@app.delete("/produtos/{produto_id}")
def excluir_produto(produto_id: int):
    db = get_db_connection()
    cursor = db.cursor()
    cursor.execute("DELETE FROM produtos WHERE id = %s", (produto_id,))
    db.commit()
    cursor.close()
    db.close()
    return {"mensagem": "Produto excluído com sucesso!"}


@app.post("/login")
def login(username: str = Form(...), senha: str = Form(...)):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM usuarios WHERE username = %s", (username,))
    user = cursor.fetchone()
    cursor.close()
    db.close()

    if not user or not bcrypt.checkpw(senha.encode(), user['senha_hash'].encode()):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    return {"mensagem": "Login realizado com sucesso!"}