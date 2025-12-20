# Beniteca - User Management UI

Uma interface web simples para testar operações CRUD na tabela de usuários.

## Como usar

1. Inicie o servidor:
   ```bash
   npm start
   ```

2. Abra o navegador em `http://localhost:3000`

3. Use os formulários para:
   - **Criar usuário**: Preencha email, nome e status
   - **Atualizar usuário**: Digite o ID e os campos a atualizar
   - **Ver usuários**: A lista é carregada automaticamente
   - **Deletar usuário**: Clique no botão "Delete" na tabela

## Funcionalidades

- ✅ **Create**: Criar novos usuários
- ✅ **Read**: Listar todos os usuários
- ✅ **Update**: Atualizar dados de usuários existentes
- ✅ **Delete**: Remover usuários

## API Endpoints

- `GET /users` - Listar usuários
- `POST /users` - Criar usuário
- `PUT /users/:id` - Atualizar usuário
- `DELETE /users/:id` - Deletar usuário

## Tecnologias

- Express.js
- MSSQL
- HTML/CSS/JavaScript (Vanilla)