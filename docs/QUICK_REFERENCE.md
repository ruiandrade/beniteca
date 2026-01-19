# Guia Rápido de Referência - Beniteca

## 🚀 Quick Start

### Login
```
URL: /login
Credenciais: Admin → email + password
Token: Válido 7 dias, auto-logout após 4h inatividade
```

### Estrutura de URLs

| URL | Página | Descrição |
|-----|--------|-----------|
| `/obras` | Home | Lista obras ativas |
| `/dashboard` | Dashboard | KPIs e visão geral |
| `/planeamento-global` | PlaneamentoGlobal | Planear múltiplas obras |
| `/works/:id/levels` | ManageLevels | Estrutura hierárquica |
| `/works/:id/equipa` | Equipa | Gestão equipa da obra |
| `/presencas` | Presencas | Marcar presenças diárias |
| `/reports` | Reports | Relatórios detalhados |
| `/permissions` | Permissions | Gestão de acessos |
| `/users` | Users | Gestão utilizadores (Admin) |
| `/account` | MyAccount | Alterar password |

---

## 📊 Base de Dados - Cheat Sheet

### Tabelas Principais

```sql
User          → Utilizadores (A/C/O roles)
Level         → Obras e hierarquia (parentId = pai)
LevelUser     → User ↔ Obra (associação equipa)
LevelUserDay  → Planeamento + Presenças (day + period 'm'/'a')
UserWorkPermission → Permissões por objeto (R/W/N)
Material      → Materiais da obra
Photo         → Fotos (before/inprogress/completed/issue)
Document      → Documentos
```

### Relações Críticas

```
User.id ←→ LevelUser.userId ←→ Level.id
User.id + Level.id + day + period → LevelUserDay (UNIQUE)
User.id + Level.id + objectType → UserWorkPermission (UNIQUE)
```

---

## 🔐 Sistema de Permissões

### Níveis de Controlo

**1. Role Global (User.status)**
- `A` = Admin → Acesso total, bypass permissões
- `C` = Cliente → Apenas obras atribuídas
- `O` = Operário → Baseado em alocação

**2. Permissões de Obra (UserWorkPermission)**
```javascript
objectType: 'photos' | 'materials' | 'documents' | 'team' | 'notes'
permissionLevel: 'R' (read) | 'W' (write) | 'N' (none)
```

**3. Associação Equipa (LevelUser)**
- User DEVE estar associado para ser planeado
- Validação: `user.active = 1`

### Verificação de Acesso

```javascript
// Frontend
const canEdit = async (levelId, objectType) => {
  if (user.role === 'A') return true; // Admin
  
  const res = await fetch(`/api/permissions/work/${levelId}/permission?objectType=${objectType}`);
  const perm = await res.json();
  return perm.permissionLevel === 'W';
};
```

---

## 📅 Planeamento vs Presenças

### Como Funciona

**Planeamento** (PlaneamentoGlobal/Planeamento):
1. Criar registos `LevelUserDay` com `appeared = NULL`
2. Cada período (manhã/tarde) = registo separado
3. Validação: Sem conflitos (user em 2 obras)

**Presenças** (Presencas):
1. Carregar registos existentes do dia
2. Atualizar `appeared = 'yes'/'no'`
3. Adicionar `observations` e `overtimeHours`

### Regra de Horas Extra

```javascript
// Se só manhã planeada → overtime vai para manhã
if (period === 'm' && !hasAfternoon && overtime > 0) {
  morningRecord.overtimeHours = overtime;
}

// Se manhã + tarde → overtime vai para tarde
if (period === 'a' && overtime > 0) {
  afternoonRecord.overtimeHours = overtime;
}
```

---

## 🎨 UI Patterns

### Desktop vs Mobile

```javascript
// Breakpoint: 768px
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const mq = window.matchMedia('(max-width: 768px)');
  setIsMobile(mq.matches);
  mq.addEventListener('change', () => setIsMobile(mq.matches));
}, []);

// Render
{isMobile ? <MobileCards /> : <DesktopTable />}
```

### Mobile Pattern

```jsx
<div className="card">
  <div className="card-header">Título</div>
  <div className="card-body">
    {items.map(item => (
      <div className="card-item">
        <span className="chip active">🌅 Manhã</span>
        <span className="chip">🌤️ Tarde</span>
      </div>
    ))}
  </div>
</div>
```

**CSS:**
```css
.chip {
  padding: 4px 12px;
  border-radius: 16px;
  background: #e0e0e0;
}
.chip.active {
  background: #4caf50;
  color: white;
}
```

---

## 🔌 API Endpoints - Referência Rápida

### Autenticação
```
POST /api/auth/login                    { email, password }
POST /api/auth/change-password          { newPassword }
POST /api/auth/create-user (Admin)      { email, name, status, password }
```

### Obras
```
GET  /api/levels?parentId=              Lista níveis (NULL = raiz)
GET  /api/levels/:id                    Detalhes obra
POST /api/levels                        Criar nível
PUT  /api/levels/:id                    Atualizar nível
GET  /api/levels/:id/ratio              Rácio materiais
```

### Planeamento/Presenças
```
GET  /api/level-user-days/level/:id?from=&to=    Planeamento/presenças
POST /api/level-user-days/level/:id              Criar planeamento batch
POST /api/level-user-days                        Criar registo único
PUT  /api/level-user-days/:id                    Atualizar presença
```

### Permissões
```
GET  /api/permissions/my-works                          Obras com acesso
GET  /api/permissions/work/:id/permission?objectType=   Nível de acesso
GET  /api/permissions/level/:id/users                   Users da obra
POST /api/permissions/assign                            Atribuir permissão
```

### Equipa
```
GET    /api/level-users/level/:id       Users da obra
POST   /api/level-users                 Associar user
DELETE /api/level-users/:id             Remover associação
```

### Materiais
```
GET    /api/materials/level/:id         Materiais do nível
POST   /api/materials                   Criar material
PUT    /api/materials/:id               Atualizar material
DELETE /api/materials/:id               Apagar material
```

### Fotos/Documentos
```
POST   /api/photos/upload               Upload foto (form-data)
GET    /api/photos/level/:id            Fotos do nível
DELETE /api/photos/:id                  Apagar foto

POST   /api/documents/upload            Upload documento
GET    /api/documents/level/:id         Documentos do nível
DELETE /api/documents/:id               Apagar documento
```

---

## 🛠️ Fluxos Comuns

### 1. Criar Obra + Planear Equipa

```javascript
// 1. Criar obra raiz
const obra = await fetch('/api/levels', {
  method: 'POST',
  body: JSON.stringify({
    name: "Edifício XYZ",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    constructionManagerId: 5
  })
});

// 2. Adicionar users à equipa
await fetch('/api/level-users', {
  method: 'POST',
  body: JSON.stringify({ levelId: obra.id, userId: 10 })
});

// 3. Planear semana
await fetch(`/api/level-user-days/level/${obra.id}`, {
  method: 'POST',
  body: JSON.stringify({
    from: "2026-01-15",
    to: "2026-01-20",
    entries: [
      { userId: 10, day: "2026-01-15", period: "m" },
      { userId: 10, day: "2026-01-15", period: "a" }
    ]
  })
});
```

### 2. Marcar Presença + Horas Extra

```javascript
// 1. Carregar planeamento do dia
const records = await fetch(`/api/level-user-days/level/5?from=2026-01-15&to=2026-01-15`);

// 2. Atualizar cada período
await fetch(`/api/level-user-days/${morningRecordId}`, {
  method: 'PUT',
  body: JSON.stringify({
    appeared: 'yes',
    observations: '',
    overtimeHours: 0
  })
});

await fetch(`/api/level-user-days/${afternoonRecordId}`, {
  method: 'PUT',
  body: JSON.stringify({
    appeared: 'yes',
    observations: 'Saiu 1h mais tarde',
    overtimeHours: 1.0
  })
});
```

### 3. Atribuir Permissões

```javascript
// Dar permissão de escrita em fotos
await fetch('/api/permissions/assign', {
  method: 'POST',
  body: JSON.stringify({
    userId: 10,
    levelId: 5,
    objectType: 'photos',
    permission: 'W'
  })
});

// Dar permissão de leitura em materiais
await fetch('/api/permissions/assign', {
  method: 'POST',
  body: JSON.stringify({
    userId: 10,
    levelId: 5,
    objectType: 'materials',
    permission: 'R'
  })
});
```

---

## 🐛 Troubleshooting

### User não aparece em planeamento

**Causa:** Não está associado à obra (LevelUser)  
**Solução:**
```sql
INSERT INTO LevelUser (levelId, userId) VALUES (5, 10);
```

### Conflito ao planear

**Causa:** User já alocado em outra obra no mesmo dia/período  
**Solução:**
```javascript
// Remover planeamento conflituoso
DELETE FROM LevelUserDay 
WHERE userId = 10 AND day = '2026-01-15' AND period = 'm' AND levelId != 5;
```

### Token expirado

**Causa:** Passou 7 dias ou 4h inatividade  
**Solução:** Fazer login novamente

### Permissão negada

**Causa:** UserWorkPermission não existe ou é 'N'  
**Solução:**
```sql
INSERT INTO UserWorkPermission (userId, levelId, objectType, permissionLevel)
VALUES (10, 5, 'photos', 'W');
```

### Horas extra perdidas

**Causa:** Apenas manhã planeada mas overtime foi para tarde (bug antigo)  
**Solução:** Bug corrigido! Overtime vai automaticamente para período correto:
- Só manhã → overtime na manhã
- Manhã + tarde → overtime na tarde

---

## 📝 Convenções de Código

### Backend

**Services:** Lógica de negócio + queries SQL
```javascript
class LevelService {
  async getById(id) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Level WHERE id = @id');
    return result.recordset[0];
  }
}
```

**Controllers:** Handlers de rotas
```javascript
class LevelController {
  async getById(req, res) {
    try {
      const level = await levelService.getById(req.params.id);
      if (!level) return res.status(404).json({ error: 'Not found' });
      res.json(level);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}
```

### Frontend

**Fetch com Auth:**
```javascript
const { token } = useAuth();

const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data)
});

if (response.status === 401) {
  logout('expired');
  return;
}
```

**Estado de Loading:**
```javascript
const [loading, setLoading] = useState(false);

const loadData = async () => {
  setLoading(true);
  try {
    const data = await fetch('/api/endpoint');
    setData(data);
  } catch (err) {
    alert('Erro: ' + err.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 🎯 Conceitos-Chave

1. **Obra Raiz**: `parentId IS NULL`, pode receber planeamento
2. **Subníveis**: `parentId NOT NULL`, não podem ter planeamento direto
3. **Período**: `'m'` manhã ou `'a'` tarde, unidade atómica de tempo
4. **Conflito**: User em 2 obras no mesmo dia+período (impedido)
5. **Permissão**: R (ver), W (editar), N (sem acesso)
6. **Appeared**: `'yes'` presente, `'no'` faltou, `NULL` não marcado
7. **Overtime**: Horas extra, sempre >= 0, alocado ao período correto

---

## 📚 Documentação Relacionada

- **[SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md)**: Documentação completa e detalhada
- **[AUTH_SECURITY.md](AUTH_SECURITY.md)**: Segurança e autenticação (JWT, inatividade)
- **[HIERARCHY_IMPORT.md](HIERARCHY_IMPORT.md)**: Importar hierarquia de Excel
- **[DEPLOYMENT.md](../DEPLOYMENT.md)**: Deploy para Azure
- **[README.md](../README.md)**: Overview do projeto

---

**Última atualização:** 19 de janeiro de 2026
