# Beniteca

Aplicação Node.js com estrutura MVC e integração com Azure SQL.

## Estrutura

- `index.js`: Entry point da aplicação
- `src/app.js`: Configuração do Express
- `src/controllers/`: Controladores (homeController.js, userController.js)
- `src/routes/`: Rotas (index.js, users.js)
- `src/config/db.js`: Configuração da conexão com Azure SQL

## Endpoints

### Home
- `GET /`: Mensagem de boas-vindas

### Users
- `GET /users`: Lista todos os usuários
- `GET /users/:id`: Retorna usuário por ID
- `POST /users`: Cria novo usuário (body: {name, email})
- `PUT /users/:id`: Atualiza usuário (body: {name, email})
- `DELETE /users/:id`: Deleta usuário

## Configuração

1. Instale as dependências: `npm install`
2. Configure as variáveis de ambiente no `.env` (veja `.env.example`)
3. Execute: `npm start` ou `npm run dev`

## Banco de Dados

Certifique-se de que a tabela `Users` existe no Azure SQL com colunas `id` (int, primary key), `name` (varchar), `email` (varchar).
