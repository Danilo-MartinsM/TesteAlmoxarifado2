from fastapi import FastAPI, Form, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import mysql.connector
from datetime import datetime
import bcrypt

app = FastAPI()

# CORS middleware para permitir requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, restringir os domínios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="1234",
        database="almoxarifado1",
        charset='utf8mb4'  # para evitar problemas com acentuação
    )

# --- ROTAS PRODUTOS ---

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
        # Converter string para datetime ou usar data atual
        if ultima_alteracao:
            try:
                data_alt = datetime.strptime(ultima_alteracao, "%Y-%m-%dT%H:%M")
            except ValueError:
                raise HTTPException(status_code=400, detail="Formato de data inválido")
        else:
            data_alt = datetime.now()

        # Inserir produto (nome em maiúsculas)
        sql = """
            INSERT INTO produtos (nome, quantidade_inicial, id_categoria, ultima_alteracao)
            VALUES (UPPER(%s), %s, %s, %s)
        """
        valores = (nome.strip(), quantidade_inicial, id_categoria, data_alt.strftime("%Y-%m-%d %H:%M:%S"))
        cursor.execute(sql, valores)
        produto_id = cursor.lastrowid

        # Registrar movimentação (Entrada)
        sql_mov = """
            INSERT INTO movimentacoes (tipo, quantidade, data_alteracao, id_produto)
            VALUES ('Entrada', %s, %s, %s)
        """
        valores_mov = (quantidade_inicial, data_alt.strftime("%Y-%m-%d %H:%M:%S"), produto_id)
        cursor.execute(sql_mov, valores_mov)

        db.commit()
        return {"mensagem": "Produto inserido com sucesso!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao inserir produto: " + str(e))
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
        valores = (nome.strip(), id_categoria, data_alt.strftime("%Y-%m-%d %H:%M:%S"), produto_id)
        cursor.execute(sql, valores)

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Produto não encontrado")

        db.commit()
        return {"mensagem": "Produto atualizado com sucesso!"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao atualizar produto: " + str(e))
    finally:
        cursor.close()
        db.close()

@app.delete("/produtos/{produto_id}")
def excluir_produto(produto_id: int):
    db = get_db_connection()
    cursor = db.cursor()

    try:
        cursor.execute("DELETE FROM produtos WHERE id = %s", (produto_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Produto não encontrado")

        db.commit()
        return {"mensagem": "Produto excluído com sucesso!"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao excluir produto: " + str(e))
    finally:
        cursor.close()
        db.close()

@app.get("/produtos")
def listar_produtos(
    order_by: str = Query("id", regex="^(id|nome|categoria|quantidade_inicial|ultima_alteracao)$"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
    busca: Optional[str] = None,
    categoria_id: Optional[int] = Query(None),
    data: Optional[str] = Query(None)
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
            p.id, p.nome, c.nome AS categoria, p.quantidade_inicial, p.ultima_alteracao, p.id_categoria
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
        # Validar formato da data (yyyy-mm-dd)
        try:
            datetime.strptime(data, "%Y-%m-%d")
            sql += " AND DATE(p.ultima_alteracao) = %s"
            params.append(data)
        except ValueError:
            cursor.close()
            db.close()
            raise HTTPException(status_code=400, detail="Formato de data inválido, use yyyy-mm-dd")

    sql += f" ORDER BY {coluna} {order_dir.upper()}"

    cursor.execute(sql, params)
    produtos = cursor.fetchall()
    cursor.close()
    db.close()
    return produtos

# --- ROTAS CATEGORIAS ---

@app.get("/categorias")
def listar_categorias():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, nome FROM categorias ORDER BY nome ASC")
        categorias = cursor.fetchall()
        return categorias
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro ao buscar categorias: " + str(e))
    finally:
        cursor.close()
        db.close()

# --- ROTAS LOGIN ---

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
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro no login: " + str(e))
    finally:
        cursor.close()
        db.close()

# --- ROTAS MOVIMENTAÇÕES ---

@app.get("/movimentacoes")
def listar_movimentacoes(
    produto_id: Optional[int] = Query(None),
    categoria_id: Optional[int] = Query(None)
):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        sql = """
            SELECT m.id, m.tipo, m.quantidade, m.data_alteracao, p.nome AS produto, p.id_categoria
            FROM movimentacoes m
            JOIN produtos p ON m.id_produto = p.id
            WHERE 1=1
        """
        params = []

        if produto_id:
            sql += " AND p.id = %s"
            params.append(produto_id)
        if categoria_id:
            sql += " AND p.id_categoria = %s"
            params.append(categoria_id)

        sql += " ORDER BY m.data_alteracao DESC"

        cursor.execute(sql, params)
        movimentacoes = cursor.fetchall()
        return movimentacoes
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro ao listar movimentações: " + str(e))
    finally:
        cursor.close()
        db.close()

# --- ROTA PARA REGISTRAR ENTRADA ---

@app.post("/entradas")
def registrar_entrada(
    id_produto: int = Form(...),
    quantidade: int = Form(...),
    data_alteracao: str = Form(...)
):
    db = get_db_connection()
    cursor = db.cursor()

    try:
        # Validações básicas no backend (ex: quantidade > 0)
        if quantidade <= 0:
            raise HTTPException(status_code=400, detail="Quantidade deve ser maior que zero")

        # Atualiza quantidade do produto somando a entrada
        cursor.execute(
            "UPDATE produtos SET quantidade_inicial = quantidade_inicial + %s, ultima_alteracao = %s WHERE id = %s",
            (quantidade, data_alteracao, id_produto)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Produto não encontrado")

        # Registra movimentação de entrada
        cursor.execute(
            """
            INSERT INTO movimentacoes (tipo, quantidade, data_alteracao, id_produto)
            VALUES (%s, %s, %s, %s)
            """,
            ("Entrada", quantidade, data_alteracao, id_produto)
        )

        db.commit()
        return {"mensagem": "Entrada registrada com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao registrar entrada: " + str(e))
    finally:
        cursor.close()
        db.close()


# --- ROTA PARA REGISTRAR SAIDA ---

@app.post("/saidas")
def registrar_saida(
    id_produto: int = Form(...),
    quantidade: int = Form(...),
    data_alteracao: str = Form(...)
):
    db = get_db_connection()
    cursor = db.cursor()

    try:
        # Verifica se o produto tem quantidade suficiente para saída
        cursor.execute("SELECT quantidade_inicial FROM produtos WHERE id = %s", (id_produto,))
        resultado = cursor.fetchone()
        if not resultado:
            raise HTTPException(status_code=404, detail="Produto não encontrado")

        quantidade_atual = resultado[0]
        if quantidade > quantidade_atual:
            raise HTTPException(status_code=400, detail="Quantidade insuficiente no estoque")

        # Atualiza estoque subtraindo a quantidade
        cursor.execute(
            "UPDATE produtos SET quantidade_inicial = quantidade_inicial - %s WHERE id = %s",
            (quantidade, id_produto)
        )

        # Registra movimentação de saída
        cursor.execute(
            """
            INSERT INTO movimentacoes (tipo, quantidade, data_alteracao, id_produto)
            VALUES (%s, %s, %s, %s)
            """,
            ("Saída", quantidade, data_alteracao, id_produto)
        )

        db.commit()
        return {"mensagem": "Saída registrada com sucesso"}
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()
