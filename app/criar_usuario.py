import bcrypt
import mysql.connector

# Dados do novo usuário
nome = "admin"
senha = "admin123"

# Criptografar a senha
senha_hash = bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()

# Conectar ao banco e inserir
conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="1234",
    database="almoxarifado1"
)
cursor = conn.cursor()
cursor.execute("INSERT INTO usuarios (nome, senha_hash) VALUES (%s, %s)", (nome, senha_hash))
conn.commit()
cursor.close()
conn.close()

print("Usuário criado com sucesso.")
