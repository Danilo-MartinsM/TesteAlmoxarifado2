import bcrypt
import mysql.connector

# Dados do novo usuário
username = "Ana Paula"
senha = "AnaPaula12"

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
cursor.execute("INSERT INTO usuarios (username, senha_hash) VALUES (%s, %s)", (username, senha_hash))
conn.commit()
cursor.close()
conn.close()

print("Usuário criado com sucesso.")
