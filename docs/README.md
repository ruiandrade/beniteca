# 📚 Documentação Beniteca - Índice

Este diretório contém toda a documentação técnica do sistema Beniteca.

## 📖 Documentos Disponíveis

### 🎯 Para Novos Utilizadores

**[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Guia Rápido  
Comece aqui! Referência rápida com:
- URLs principais
- Cheat sheet de API endpoints
- Padrões de código
- Troubleshooting comum
- Fluxos práticos

---

### 📘 Documentação Técnica Completa

**[SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md)** - Documentação do Sistema  
Guia completo e detalhado:
- Arquitetura completa do sistema
- Esquema de base de dados (todas as tabelas)
- Sistema de permissões e acessos
- Todas as páginas do frontend (como funcionam)
- Todos os endpoints do backend
- Fluxos de dados principais
- Segurança e autenticação

**Quando usar:**
- Onboarding de novos developers
- Entender como funciona uma funcionalidade
- Ver relações entre tabelas
- Compreender fluxos de dados complexos

---

### 🔐 Segurança

**[AUTH_SECURITY.md](AUTH_SECURITY.md)** - Autenticação e Segurança  
Tudo sobre autenticação:
- JWT token (7 dias de validade)
- Auto-logout por inatividade (4 horas)
- Como funciona o tracking de atividade
- Configuração de segurança
- Testes e troubleshooting

**Quando usar:**
- Entender sistema de login
- Configurar timeout de sessão
- Debug de problemas de autenticação

---

### 📊 Importação de Dados

**[HIERARCHY_IMPORT.md](HIERARCHY_IMPORT.md)** - Importar Hierarquia  
Como importar estrutura de obras desde Excel:
- Formato do ficheiro Excel
- Validações e regras
- Processo de importação
- Tratamento de erros

**Quando usar:**
- Migrar obras existentes de Excel
- Criar estrutura complexa rapidamente

---

## 🗺️ Navegação por Tópico

### Quero entender...

**...como funciona o planeamento:**
1. [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) → Secção "Fluxos de Dados" → "Planear Semana"
2. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) → "Planeamento vs Presenças"

**...o sistema de permissões:**
1. [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) → Secção "Sistema de Permissões"
2. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) → "Sistema de Permissões"

**...a base de dados:**
1. [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) → Secção "Base de Dados"
2. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) → "Base de Dados - Cheat Sheet"

**...as páginas do frontend:**
1. [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) → Secção "Frontend - Interface do Utilizador"

**...os endpoints da API:**
1. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) → "API Endpoints - Referência Rápida"
2. [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) → Secção "Backend - API e Serviços"

**...segurança e autenticação:**
1. [AUTH_SECURITY.md](AUTH_SECURITY.md) → Guia completo
2. [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) → Secção "Segurança e Autenticação"

---

## 🚀 Quick Links por Tarefa

### Sou developer novo no projeto
1. Ler [README.md](../README.md) (visão geral)
2. Ler [QUICK_REFERENCE.md](QUICK_REFERENCE.md) (referência rápida)
3. Consultar [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) conforme necessário

### Preciso fazer deploy
1. [../DEPLOYMENT.md](../DEPLOYMENT.md) - Guia de deployment Azure
2. [../AZURE_CHECKLIST.md](../AZURE_CHECKLIST.md) - Checklist passo-a-passo

### Preciso adicionar funcionalidade nova
1. [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) → Ver arquitetura
2. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) → Ver padrões de código
3. Seguir convenções existentes

### Tenho um bug
1. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) → "Troubleshooting"
2. [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) → Entender fluxo específico
3. Verificar logs do servidor

### Preciso configurar permissões
1. [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) → "Sistema de Permissões"
2. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) → "Fluxos Comuns" → "Atribuir Permissões"

---

## 📝 Estrutura dos Documentos

### SYSTEM_DOCUMENTATION.md (Completo)
```
1. Visão Geral
2. Arquitetura do Sistema
3. Base de Dados (schema completo)
4. Sistema de Permissões
5. Frontend (todas as páginas)
6. Backend (API completa)
7. Fluxos de Dados
8. Segurança
```

### QUICK_REFERENCE.md (Prático)
```
- Quick Start
- Cheat Sheets (DB, API)
- Padrões UI
- Fluxos Comuns
- Troubleshooting
- Convenções de Código
```

### AUTH_SECURITY.md (Específico)
```
- Configurações JWT
- Auto-logout
- Como funciona
- Testes
- Troubleshooting
```

---

## 🎓 Sugestões de Leitura

**Primeiro dia:**
- [README.md](../README.md) (10 min)
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) (20 min)

**Primeira semana:**
- [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) → Secções relevantes (1-2h)
- [AUTH_SECURITY.md](AUTH_SECURITY.md) (15 min)

**Quando necessário:**
- [HIERARCHY_IMPORT.md](HIERARCHY_IMPORT.md) → Se precisar importar dados
- [DEPLOYMENT.md](../DEPLOYMENT.md) → Antes de fazer deploy

---

## 🔄 Manutenção da Documentação

**Última atualização:** 19 de janeiro de 2026

**Quando atualizar:**
- Nova funcionalidade → Atualizar SYSTEM_DOCUMENTATION + QUICK_REFERENCE
- Mudança na API → Atualizar QUICK_REFERENCE (endpoints)
- Nova tabela → Atualizar SYSTEM_DOCUMENTATION (Base de Dados)
- Mudança de segurança → Atualizar AUTH_SECURITY
- Novo padrão → Atualizar QUICK_REFERENCE (Convenções)

**Como contribuir:**
1. Editar ficheiro relevante
2. Manter formato consistente
3. Adicionar exemplos práticos
4. Atualizar data "Última atualização"
5. Commit: `docs: Update documentation for [feature]`

---

## 💡 Dicas

- **Use Ctrl+F**: Todos os docs são searchable
- **Links internos**: Clique nos links para navegar
- **Exemplos de código**: Copy-paste ready
- **Markdown viewer**: Use preview para melhor leitura

---

**Precisa de ajuda?**  
Contacte a equipa de desenvolvimento ou abra issue no repositório.
