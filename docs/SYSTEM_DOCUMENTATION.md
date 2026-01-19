# Documentação Completa do Sistema Beniteca

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Base de Dados](#base-de-dados)
4. [Sistema de Permissões e Acessos](#sistema-de-permissões-e-acessos)
5. [Frontend - Interface do Utilizador](#frontend---interface-do-utilizador)
6. [Backend - API e Serviços](#backend---api-e-serviços)
7. [Fluxos de Dados Principais](#fluxos-de-dados-principais)
8. [Segurança e Autenticação](#segurança-e-autenticação)

---

## Visão Geral

**Beniteca** é um sistema de gestão de obras de construção com as seguintes características principais:

- **Gestão hierárquica de obras** (estrutura de árvore multinível)
- **Planeamento de equipas** (alocação diária com períodos manhã/tarde)
- **Controlo de presenças** (registo de presença, observações e horas extra)
- **Gestão de materiais** (tracking de entrega e montagem)
- **Gestão de documentos e fotografias** (organização por fase)
- **Relatórios e dashboard** (visualização de KPIs e progresso)
- **Sistema robusto de permissões** (controlo granular por obra e objeto)

### Tipos de Utilizadores

| Role | Código | Descrição | Acesso |
|------|--------|-----------|--------|
| **Administrador** | `A` | Acesso total | Todas as funcionalidades |
| **Cliente** | `C` | Cliente/dono da obra | Visualização de obras atribuídas |
| **Operário** | `O` | Trabalhador de obra | Obras onde está alocado |
| **Outros** | Outros | Utilizadores gerais | Baseado em permissões |

---

## Arquitetura do Sistema

### Stack Tecnológico

**Backend**
- Node.js + Express
- Azure SQL Database
- Azure Blob Storage (para ficheiros)
- JWT para autenticação

**Frontend**
- React 19
- Vite (build tool)
- React Router DOM v6
- CSS moderno (responsive design)

### Estrutura de Diretórios

```
beniteca/
├── src/                          # Backend
│   ├── config/
│   │   └── db.js                 # Configuração Azure SQL
│   ├── controllers/              # Handlers de rotas
│   │   ├── authController.js     # Login, password, criar users
│   │   ├── levelController.js    # CRUD obras/níveis
│   │   ├── levelUserController.js     # Associação user↔obra
│   │   ├── levelUserDayController.js  # Planeamento/presenças
│   │   ├── permissionController.js    # Permissões de acesso
│   │   ├── materialController.js      # Gestão de materiais
│   │   ├── photoController.js         # Upload/gestão fotos
│   │   ├── documentController.js      # Upload/gestão documentos
│   │   └── reportController.js        # Relatórios
│   ├── services/                 # Lógica de negócio
│   │   ├── authService.js
│   │   ├── levelService.js
│   │   ├── userService.js
│   │   ├── permissionService.js
│   │   ├── levelUserService.js
│   │   ├── levelUserDayService.js
│   │   └── ...
│   ├── middleware/
│   │   └── auth.js              # JWT verify + role check
│   └── routes/
│       ├── index.js             # Router central
│       ├── auth.js
│       ├── levels.js
│       ├── users.js
│       ├── permissions.js
│       └── ...
│
├── frontend/
│   ├── src/
│   │   ├── pages/               # Páginas React
│   │   │   ├── Login.jsx
│   │   │   ├── Home.jsx         # Lista obras
│   │   │   ├── Dashboard.jsx    # Visão geral
│   │   │   ├── PlaneamentoGlobal.jsx  # Planeamento múltiplas obras
│   │   │   ├── Planeamento.jsx        # Planeamento obra individual
│   │   │   ├── Presencas.jsx          # Registo presenças
│   │   │   ├── WorkerSchedule.jsx     # Calendário trabalhadores
│   │   │   ├── Permissions.jsx        # Gestão permissões
│   │   │   ├── Users.jsx              # Gestão utilizadores
│   │   │   ├── ManageLevels.jsx       # Estrutura hierárquica
│   │   │   ├── Equipa.jsx             # Equipa da obra
│   │   │   ├── Reports.jsx            # Relatórios detalhados
│   │   │   └── ...
│   │   ├── components/
│   │   │   └── Layout.jsx       # Layout com sidebar
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Context de autenticação
│   │   ├── hooks/
│   │   │   └── useAuthFetch.js  # Fetch com auto-logout
│   │   ├── services/
│   │   │   └── permissionService.js
│   │   └── App.jsx              # Router principal
│   └── dist/                    # Build de produção
│
├── migrations/                  # SQL migrations
│   ├── 001_*.sql
│   ├── 022_add_overtime_hours_to_leveluserday.sql
│   └── ...
│
└── docs/                        # Documentação
    ├── AUTH_SECURITY.md
    ├── HIERARCHY_IMPORT.md
    └── SYSTEM_DOCUMENTATION.md (este ficheiro)
```

---

## Base de Dados

### Esquema Principal

#### 1. **User** - Utilizadores do Sistema

```sql
CREATE TABLE [User] (
  id INT IDENTITY(1,1) PRIMARY KEY,
  email NVARCHAR(255) UNIQUE NOT NULL,
  name NVARCHAR(255) NOT NULL,
  status NVARCHAR(255) NOT NULL,  -- 'A', 'C', 'O', etc.
  Car NVARCHAR(255),               -- Viatura do utilizador
  active BIT NOT NULL DEFAULT 1,   -- 1=ativo, 0=desativado
  passwordHash NVARCHAR(MAX),      -- Bcrypt hash
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE()
);
```

**Campos Importantes:**
- `status`: Define o role do utilizador (A=Admin, C=Cliente, O=Operário)
- `active`: Utilizadores desativados não podem fazer login
- `Car`: Matrícula da viatura (usado em relatórios e planeamento)

#### 2. **Level** - Obras e Hierarquia

```sql
CREATE TABLE [Level] (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX),
  parentId INT,                        -- Nível pai (NULL = obra raiz)
  startDate DATETIME2,
  endDate DATETIME2,
  completedAt DATETIME2,               -- Data de conclusão
  status NVARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'completed'
  notes NVARCHAR(MAX),
  coverImage NVARCHAR(MAX),            -- URL da imagem de capa
  constructionManagerId INT,           -- Diretor de produção
  siteDirectorId INT,                  -- Diretor de obra
  [order] INT NOT NULL DEFAULT 0,      -- Ordem de exibição
  hidden BIT DEFAULT 0,                -- Ocultar sublevel
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (parentId) REFERENCES [Level](id),
  FOREIGN KEY (constructionManagerId) REFERENCES [User](id),
  FOREIGN KEY (siteDirectorId) REFERENCES [User](id)
);
```

**Hierarquia:**
- **Obra raiz** (`parentId IS NULL`): Obra principal (ex: "Edifício XYZ")
- **Subníveis**: Fases, andares, divisões (ex: "Piso 1" → "Apartamento A" → "Cozinha")
- Profundidade ilimitada de níveis

**Estados:**
- `active`: Em execução
- `paused`: Pausada (não aparece em listagens ativas)
- `completed`: Concluída (arquivo)

#### 3. **LevelUser** - Associação Utilizador ↔ Obra

```sql
CREATE TABLE LevelUser (
  id INT IDENTITY(1,1) PRIMARY KEY,
  levelId INT NOT NULL,
  userId INT NOT NULL,
  createdAt DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (levelId) REFERENCES [Level](id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES [User](id) ON DELETE CASCADE,
  UNIQUE (levelId, userId)
);
```

**Propósito:** Define quais utilizadores fazem parte da equipa de uma obra.

**Importante:**
- Apenas utilizadores associados podem ser planeados para trabalhar na obra
- Associação necessária antes de criar planeamento
- Usado para popular dropdowns de seleção de equipa

#### 4. **LevelUserDay** - Planeamento e Presenças

```sql
CREATE TABLE LevelUserDay (
  id INT IDENTITY(1,1) PRIMARY KEY,
  levelId INT NOT NULL,
  userId INT NOT NULL,
  day DATE NOT NULL,
  period CHAR(1) NOT NULL,           -- 'm' (manhã) ou 'a' (tarde)
  appeared NVARCHAR(3),              -- 'yes', 'no', ou NULL (não marcado)
  observations NVARCHAR(MAX),        -- Observações sobre a presença
  overtimeHours DECIMAL(5,2) DEFAULT 0, -- Horas extra
  createdAt DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (levelId) REFERENCES [Level](id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES [User](id),
  UNIQUE (levelId, userId, day, period),
  CHECK (period IN ('m', 'a')),
  CHECK (appeared IS NULL OR appeared IN ('yes', 'no'))
);
```

**Dupla Funcionalidade:**

**A) Planeamento** (criado em *Planeamento* ou *PlaneamentoGlobal*)
- Registo criado quando planeamos que alguém vai trabalhar
- `appeared = NULL` (ainda não marcado)
- Cada período (manhã/tarde) = registo separado

**B) Presença** (atualizado em *Presencas*)
- `appeared = 'yes'`: Trabalhador compareceu
- `appeared = 'no'`: Faltou
- `observations`: Ex: "Chegou atrasado", "Saiu mais cedo"
- `overtimeHours`: Horas extra realizadas

**Regra de Conflitos:**
- Um utilizador NÃO PODE estar em 2 obras no mesmo dia/período
- Sistema valida antes de inserir e impede duplicação

**Lógica de Horas Extra:**
```javascript
// Se só existe período manhã → overtime vai para manhã
// Se existem manhã E tarde → overtime vai para tarde
// Implementado em Presencas.jsx handleSavePresencas()
```

#### 5. **UserWorkPermission** - Permissões Granulares

```sql
CREATE TABLE UserWorkPermission (
  id INT IDENTITY(1,1) PRIMARY KEY,
  userId INT NOT NULL,
  levelId INT NOT NULL,
  objectType NVARCHAR(50) NOT NULL,  -- 'photos', 'materials', 'documents', 'team', 'notes'
  permissionLevel NVARCHAR(1) NOT NULL, -- 'R' (read), 'W' (write), 'N' (none)
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (userId) REFERENCES [User](id) ON DELETE CASCADE,
  FOREIGN KEY (levelId) REFERENCES [Level](id) ON DELETE CASCADE,
  UNIQUE (userId, levelId, objectType)
);
```

**Tipos de Objetos:**
- `photos`: Fotos da obra
- `materials`: Materiais
- `documents`: Documentos
- `team`: Equipa (adicionar/remover pessoas)
- `notes`: Notas da obra

**Níveis de Permissão:**
- `R`: Apenas leitura (pode ver)
- `W`: Escrita (pode criar/editar/apagar)
- `N`: Nenhum acesso (oculto)

#### 6. **Material** - Gestão de Materiais

```sql
CREATE TABLE Material (
  id INT IDENTITY(1,1) PRIMARY KEY,
  levelId INT NOT NULL,
  description NVARCHAR(MAX) NOT NULL,
  brand NVARCHAR(255),           -- Marca
  manufacturer NVARCHAR(255),     -- Fabricante
  type NVARCHAR(255),            -- Tipo/categoria
  quantity FLOAT NOT NULL,
  estimatedValue FLOAT NULL,      -- Valor orçamentado
  realValue FLOAT NULL,           -- Valor real
  deliveryStatus NVARCHAR(50),    -- 'pending', 'delivered', 'partial'
  assemblyStatus NVARCHAR(50),    -- 'pending', 'in-progress', 'completed'
  photoUrl NVARCHAR(MAX),         -- URL da foto do material
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (levelId) REFERENCES [Level](id) ON DELETE CASCADE
);
```

#### 7. **Photo** - Fotografias da Obra

```sql
CREATE TABLE Photo (
  id INT IDENTITY(1,1) PRIMARY KEY,
  levelId INT NOT NULL,
  type NVARCHAR(255) NOT NULL,     -- 'before', 'inprogress', 'completed', 'issue'
  role NVARCHAR(50),               -- Categoria/função da foto
  issueType NVARCHAR(50),          -- Tipo de problema (se type='issue')
  observations NVARCHAR(MAX),      -- Descrição/notas
  url NVARCHAR(MAX) NOT NULL,      -- Azure Blob URL
  createdAt DATETIME2 DEFAULT GETDATE(),
  updatedAt DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (levelId) REFERENCES [Level](id) ON DELETE CASCADE
);
```

**Tipos de Fotos:**
- `before`: Antes (estado inicial)
- `inprogress`: Durante (progresso)
- `completed`: Depois (obra concluída)
- `issue`: Problema/não conformidade

#### 8. **Document** - Documentos

```sql
CREATE TABLE Document (
  id INT IDENTITY(1,1) PRIMARY KEY,
  levelId INT NOT NULL,
  name NVARCHAR(255) NOT NULL,
  url NVARCHAR(MAX) NOT NULL,      -- Azure Blob URL
  type NVARCHAR(255),              -- PDF, Excel, Word, etc.
  size INT,                        -- Tamanho em bytes
  createdAt DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (levelId) REFERENCES [Level](id) ON DELETE CASCADE
);
```

---

## Sistema de Permissões e Acessos

### Níveis de Controlo

O sistema usa **3 camadas** de permissões:

#### 1. Role Global (tabela User.status)

```javascript
// Definido no perfil do utilizador
'A' → Administrador (acesso total, bypass de todas permissões)
'C' → Cliente (acesso apenas a obras específicas)
'O' → Operário (acesso baseado em alocação)
```

**Middleware de Verificação:**
```javascript
// src/middleware/auth.js
function authenticate(req, res, next) {
  const token = req.headers.authorization?.slice(7);
  const payload = jwt.verify(token, JWT_SECRET);
  req.user = { id: payload.sub, role: payload.role };
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role === 'A') return next();
  return res.status(403).json({ error: 'Acesso negado' });
}
```

#### 2. Permissões por Obra (UserWorkPermission)

Controla acesso granular a **objetos específicos** dentro de cada obra:

```javascript
// Exemplo: Utilizador #5 na Obra #10
{
  userId: 5,
  levelId: 10,
  objectType: 'photos',
  permissionLevel: 'W'  // Pode editar fotos
}

{
  userId: 5,
  levelId: 10,
  objectType: 'materials',
  permissionLevel: 'R'  // Apenas ver materiais
}
```

**Verificação no Backend:**
```javascript
// src/services/permissionService.js
async getUserWorkPermission(userId, levelId, objectType) {
  // Admin sempre tem 'W'
  const user = await userService.getById(userId);
  if (user.status === 'A') return { permissionLevel: 'W' };
  
  // Buscar permissão específica
  const perm = await db.query(`
    SELECT permissionLevel FROM UserWorkPermission
    WHERE userId = @userId AND levelId = @levelId AND objectType = @objectType
  `);
  
  return perm ? { permissionLevel: perm.permissionLevel } : { permissionLevel: 'N' };
}
```

#### 3. Associação à Equipa (LevelUser)

**Regra:** Para ser planeado numa obra, utilizador **DEVE** estar associado:

```javascript
// Validação em levelUserDayService.js setRange()
const allowedUserIds = await db.query(`
  SELECT userId FROM LevelUser WHERE levelId = @levelId
`);

// Só insere planeamento se user está na equipa
if (!allowedUserIds.includes(entry.userId)) {
  throw new Error('Utilizador não faz parte da equipa desta obra');
}
```

### Fluxo de Verificação de Acesso

```
Pedido API → authenticate() → req.user preenchido
               ↓
          É Admin?  → SIM → Acesso total ✅
               ↓ NÃO
          Tem UserWorkPermission?
               ↓
          permissionLevel === 'W'? → SIM → Pode editar ✅
          permissionLevel === 'R'? → SIM → Apenas ver 👁️
          permissionLevel === 'N'? → SIM → Acesso negado ❌
               ↓ NÃO (sem registo)
          Acesso negado por padrão ❌
```

### Frontend - Gestão de Permissões

**Página: Permissions.jsx**

**Funcionalidades:**
1. **Filtrar por Utilizador**: Busca todos users do sistema, filtra obras onde user tem acesso
2. **Ver Equipa da Obra**: Expandir obra mostra users com permissões
3. **Atribuir Permissões**: Checkboxes para cada objeto (photos, materials, etc.)
4. **Sincronização**: Guardar envia batch de permissões para API

**Estados Principais:**
```javascript
const [obras, setObras] = useState([]);           // Todas as obras
const [allUsers, setAllUsers] = useState([]);     // TODOS users do sistema
const [users, setUsers] = useState([]);           // Users da obra selecionada
const [obraUserIds, setObraUserIds] = useState({}); // { obraId: [userIds] }
const [selectedUsers, setSelectedUsers] = useState([]); // Filtro ativo
const [permissions, setPermissions] = useState({}); // Estado das checkboxes
```

**Fluxo:**
```
1. Load → Buscar obras + buscar todos users + buscar users por obra
2. User seleciona filtro → filteredObras calculado
3. User expande obra → Carrega permissões da obra
4. User altera checkboxes → Estado local atualizado
5. User clica "Guardar" → POST /api/permissions/assign (batch)
```

---

## Frontend - Interface do Utilizador

### Routing e Navegação

**Router Principal (App.jsx):**
```jsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={<Layout />}>
    <Route index element={<Navigate to={user?.role === 'C' ? '/cliente' : '/obras'} />} />
    <Route path="obras" element={<Home />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="planeamento-global" element={<PlaneamentoGlobal />} />
    <Route path="works/:id/levels" element={<ManageLevels />} />
    <Route path="works/:id/equipa" element={<Equipa />} />
    <Route path="presencas" element={<Presencas />} />
    <Route path="reports" element={<Reports />} />
    <Route path="permissions" element={<Permissions />} />
    <Route path="users" element={<Users />} />
    <Route path="account" element={<MyAccount />} />
    <Route path="cliente" element={<Cliente />} />
  </Route>
</Routes>
```

**Redirecionamento por Role:**
- **Admin/Operário**: `/obras` (lista de obras)
- **Cliente**: `/cliente` (página específica de cliente)

### Páginas Principais

#### 1. **Login.jsx** - Autenticação

**Funcionalidades:**
- Form com email + password
- POST `/api/auth/login`
- Armazena token JWT no localStorage
- Redirect automático após login

**Fluxo:**
```
User insere email/password
  ↓
POST /api/auth/login
  ↓
Backend verifica credenciais (bcrypt)
  ↓
Gera JWT (válido 7 dias)
  ↓
Frontend armazena token
  ↓
Inicia tracking de inatividade (4h)
  ↓
Redirect para /obras ou /cliente
```

#### 2. **Home.jsx** - Lista de Obras

**Funcionalidades:**
- Lista obras ativas/pausadas (exclui completed)
- Busca por nome
- Ações: Editar, Pausar, Retomar, Arquivar
- Tabs: "Lista" / "Calendário" (WorkerSchedule)

**Dados Carregados:**
```javascript
// Chama permissionService.getMyWorks()
// Admin: retorna todas obras
// Outros: apenas obras com UserWorkPermission
const obras = await fetch('/api/permissions/my-works', {
  headers: { Authorization: `Bearer ${token}` }
});
```

**Card de Obra:**
```jsx
<div className="work-card">
  <img src={obra.coverImage || 'default.jpg'} />
  <h3>{obra.name}</h3>
  <p>Início: {obra.startDate} | Fim: {obra.endDate}</p>
  <p>Diretor: {obra.constructionManagerName}</p>
  <div className="actions">
    <button onClick={() => navigate(`/works/${obra.id}/levels`)}>Ver Detalhes</button>
    <button onClick={() => handlePause(obra.id)}>Pausar</button>
  </div>
</div>
```

#### 3. **Dashboard.jsx** - Visão Geral

**Funcionalidades:**
- Cards com KPIs por obra
- Rácio (valor real / valor estimado materiais)
- Datas início/fim
- Gantt chart (timeline visual)
- Hierarquia navegável
- Integração com página de relatórios

**Modos de Visualização:**
- **Cards**: Grid de obras com KPIs
- **Reports**: Relatórios detalhados (componente Reports.jsx)

**Verificação de Acesso:**
```javascript
const checkAccess = async (levelId) => {
  if (user?.role === 'A') return true; // Admin
  
  const res = await fetch(`/api/permissions/work/${levelId}/permission?objectType=materials`);
  if (!res.ok) return false;
  const perm = await res.json();
  return perm.permissionLevel !== 'N';
};
```

#### 4. **PlaneamentoGlobal.jsx** - Planeamento Multi-Obra

**Propósito:** Alocar trabalhadores em **múltiplas obras** numa semana/período.

**Funcionalidades:**
- Seleção intervalo de datas (De/Até)
- Carregar equipas de todas obras ativas
- Grid: Obras × Utilizadores × Dias × Períodos (manhã/tarde)
- Click em célula para toggle alocação
- Detecção de conflitos (utilizador em 2 obras no mesmo dia/período)
- Aplicar planeamento (POST batch para cada obra)

**Estado Principal:**
```javascript
const [selected, setSelected] = useState(new Set());
// Set contém keys: "userId::obraId::day::period"
// Ex: "10::5::2026-01-20::m" = User 10, Obra 5, dia 20/01, manhã

const [conflictCounts, setConflictCounts] = useState({});
// Ex: { "10::2026-01-20::m": 2 } = User 10 alocado em 2 obras na manhã do dia 20
```

**Detecção de Conflitos:**
```javascript
// Contar quantas vezes user aparece no mesmo dia/período
const conflicts = {};
selected.forEach(key => {
  const [userId, obraId, day, period] = key.split('::');
  const conflictKey = `${userId}::${day}::${period}`;
  conflicts[conflictKey] = (conflicts[conflictKey] || 0) + 1;
});
setConflictCounts(conflicts);
```

**Aplicar Planeamento:**
```javascript
const handleApply = async () => {
  // Agrupar por obra
  const byObra = {};
  selected.forEach(key => {
    const [userId, obraId, day, period] = key.split('::');
    if (!byObra[obraId]) byObra[obraId] = [];
    byObra[obraId].push({ userId: parseInt(userId), day, period });
  });
  
  // POST para cada obra
  for (const [obraId, entries] of Object.entries(byObra)) {
    await fetch(`/api/level-user-days/level/${obraId}`, {
      method: 'POST',
      body: JSON.stringify({ from: fromDate, to: toDate, entries })
    });
  }
};
```

**Desktop vs Mobile:**
- **Desktop**: Tabela grande com scroll horizontal
- **Mobile**: Cards verticais (obra → users → dias)
  - Chips para manhã/tarde
  - Warning emoji (⚠️) em conflitos

#### 5. **Planeamento.jsx** - Planeamento Obra Individual

Igual ao PlaneamentoGlobal, mas **apenas para 1 obra**.

**Diferenças:**
- URL: `/planeamento/:id` (obra específica)
- Não deteta conflitos (não há outras obras)
- Mais simples: Users × Dias × Períodos

#### 6. **Presencas.jsx** - Registo de Presenças

**Funcionalidades:**
- Selecionar obra + data
- Carregar utilizadores planeados para esse dia
- Marcar presença: ✅ Sim / ❌ Não
- Observações por utilizador/período
- Horas extra por utilizador
- Guardar em batch

**Estrutura de Dados:**
```javascript
const [presencas, setPresencas] = useState({});
// Key: "userId-period" (ex: "10-m" = user 10, manhã)
// Value: { recordId, appeared, observations }

const [overtimeHours, setOvertimeHours] = useState({});
// Key: userId
// Value: número de horas extra (ex: 2.5)
```

**Carregar Presenças Existentes:**
```javascript
const res = await fetch(`/api/level-user-days/level/${selectedWork}?from=${date}&to=${date}`);
const data = await res.json();

const state = {};
data.forEach(record => {
  const key = `${record.userId}-${record.period}`;
  state[key] = {
    recordId: record.id,
    appeared: record.appeared,
    observations: record.observations
  };
  if (record.overtimeHours > 0) {
    overtimeHours[record.userId] = record.overtimeHours;
  }
});
setPresencas(state);
```

**Lógica de Horas Extra (Smart Allocation):**
```javascript
// Determinar onde guardar overtime
for (const [key, data] of Object.entries(presencas)) {
  const userId = key.split('-')[0];
  const period = key.split('-')[1];
  
  let periodOvertimeHours = 0;
  
  if (period === 'm') {
    // Se tarde NÃO existe, meter overtime na manhã
    const afternoonKey = `${userId}-a`;
    if (!presencas[afternoonKey]?.recordId && overtimeHours[userId] > 0) {
      periodOvertimeHours = overtimeHours[userId];
    }
  } else if (period === 'a') {
    // Se tarde existe, meter overtime aqui (normal)
    periodOvertimeHours = overtimeHours[userId] || 0;
  }
  
  // Guardar com overtimeHours no período correto
  await fetch(`/api/level-user-days/${data.recordId}`, {
    method: 'PUT',
    body: JSON.stringify({ appeared, observations, overtimeHours: periodOvertimeHours })
  });
}
```

**Resultado:** Se user só tem manhã planeada, overtime vai para manhã. Se tem manhã+tarde, vai para tarde.

#### 7. **WorkerSchedule.jsx** - Calendário de Trabalhadores

**Propósito:** Visualizar planeamento semanal de todos trabalhadores em todas obras.

**Funcionalidades:**
- Filtro de obras (dropdown - apenas ativas)
- Intervalo de datas (semana)
- Filtro manhã/tarde/ambos
- Vista Desktop: Tabela (Obras × Users × Dias)
- Vista Mobile: Cards verticais

**Pivot de Dados:**
```javascript
// Estrutura: [ { levelId, levelName, users: [ { userId, userName, slots: { "2026-01-20": { m: true, a: false } } } ] } ]

const pivot = [];
const groupedByLevel = {};

records.forEach(r => {
  if (!groupedByLevel[r.levelId]) {
    groupedByLevel[r.levelId] = { 
      levelId: r.levelId, 
      levelName: r.levelName, 
      users: {} 
    };
  }
  
  if (!groupedByLevel[r.levelId].users[r.userId]) {
    groupedByLevel[r.levelId].users[r.userId] = {
      userId: r.userId,
      userName: r.name,
      userCar: r.Car,
      slots: {}
    };
  }
  
  const day = r.day.split('T')[0];
  if (!groupedByLevel[r.levelId].users[r.userId].slots[day]) {
    groupedByLevel[r.levelId].users[r.userId].slots[day] = { m: false, a: false };
  }
  
  groupedByLevel[r.levelId].users[r.userId].slots[day][r.period] = true;
});
```

**Desktop Table:**
```jsx
<table>
  <thead>
    <tr>
      <th>Obra</th>
      <th>Utilizador</th>
      {days.map(d => <th colSpan={2}>{d}</th>)}
    </tr>
    <tr>
      <th></th><th></th>
      {days.map(d => <><th>M</th><th>T</th></>)}
    </tr>
  </thead>
  <tbody>
    {pivotData.map(level =>
      level.users.map(user => (
        <tr>
          <td>{level.levelName}</td>
          <td>{user.userName}</td>
          {days.map(d => (
            <>
              <td>{user.slots[d]?.m ? '✓' : ''}</td>
              <td>{user.slots[d]?.a ? '✓' : ''}</td>
            </>
          ))}
        </tr>
      ))
    )}
  </tbody>
</table>
```

**Mobile Cards:**
```jsx
{pivotData.map(level => (
  <div className="ws-card">
    <div className="ws-card-header">{level.levelName}</div>
    {level.users.map(user => (
      <div className="ws-card-user">
        <div className="ws-card-user-name">{user.userName}</div>
        {days.map(day => {
          const slot = user.slots[day] || { m: false, a: false };
          if (!slot.m && !slot.a) return null;
          return (
            <div className="ws-card-day">
              <div>{day}</div>
              <div>
                {slot.m && <span className="ws-chip active">🌅 Manhã</span>}
                {slot.a && <span className="ws-chip active">🌤️ Tarde</span>}
              </div>
            </div>
          );
        })}
      </div>
    ))}
  </div>
))}
```

#### 8. **ManageLevels.jsx** - Gestão de Hierarquia

**Funcionalidades:**
- Árvore navegável de níveis (obra → fases → andares → divisões)
- Criar subníveis
- Editar nível (nome, descrição, datas, responsáveis)
- Ocultar/mostrar subníveis
- Upload de fotos (Before/Durante/After)
- Upload de documentos
- Gestão de materiais (adicionar, editar status entrega/montagem)

**Estrutura de Dados:**
```javascript
const [tree, setTree] = useState(null); // Hierarquia completa
const [selectedNode, setSelectedNode] = useState(null); // Nível selecionado
const [materials, setMaterials] = useState([]);
const [photos, setPhotos] = useState([]);
const [documents, setDocuments] = useState([]);
```

**Árvore Recursiva:**
```jsx
function TreeNode({ node, level = 0 }) {
  return (
    <div style={{ marginLeft: `${level * 20}px` }}>
      <div onClick={() => setSelectedNode(node)}>
        {node.name} {node.hidden && '🙈'}
      </div>
      {node.children?.map(child => (
        <TreeNode key={child.id} node={child} level={level + 1} />
      ))}
    </div>
  );
}
```

**Painel de Detalhes:**
- Tab "Informações": Nome, descrição, datas, responsáveis
- Tab "Materiais": Lista + form para adicionar
- Tab "Fotos": Galeria com upload
- Tab "Documentos": Lista com download/delete

#### 9. **Equipa.jsx** - Gestão de Equipa da Obra

**Funcionalidades:**
- Ver utilizadores associados à obra
- Adicionar utilizador à equipa (LevelUser)
- Remover utilizador da equipa
- Validação: Apenas utilizadores ativos podem ser adicionados

**Fluxo:**
```
1. Load → GET /api/level-users/level/:id
2. Dropdown users disponíveis → GET /api/users?active=1
3. User seleciona + clica "Adicionar"
   ↓
   POST /api/level-users
   Body: { levelId, userId }
   ↓
   Backend valida user ativo + cria LevelUser
   ↓
   Refresh lista
```

#### 10. **Reports.jsx** - Relatórios Detalhados

**Funcionalidades:**
- Relatório de obra (PDF-ready)
- Planeamento vs Presenças
- Lista de materiais (orçamentado vs real)
- Total horas normais + horas extra
- Total custos materiais
- Timeline da obra

**Estrutura:**
```jsx
<div className="report-page">
  <header>
    <h1>{obra.name}</h1>
    <p>Período: {fromDate} a {toDate}</p>
  </header>
  
  <section>
    <h2>Resumo de Presenças</h2>
    <table>
      <tr><td>Utilizador</td><td>Dias Planeados</td><td>Compareceu</td><td>Faltou</td><td>Horas Extra</td></tr>
      {/* ... */}
    </table>
  </section>
  
  <section>
    <h2>Materiais</h2>
    <table>
      <tr><td>Material</td><td>Qtd</td><td>Valor Orçamentado</td><td>Valor Real</td><td>Status Entrega</td></tr>
      {/* ... */}
    </table>
  </section>
</div>
```

#### 11. **Permissions.jsx** - Gestão de Permissões

*Já documentado na secção "Sistema de Permissões"*

#### 12. **Users.jsx** - Gestão de Utilizadores

**Funcionalidades (apenas Admin):**
- Listar todos users
- Criar novo user (email, nome, role, password inicial)
- Ativar/desativar user
- Editar role
- Não permite apagar (apenas desativar)

**Validação:**
```javascript
// Frontend verifica se é admin
const { user } = useAuth();
if (user?.role !== 'A') {
  return <div>Acesso negado. Apenas administradores.</div>;
}
```

#### 13. **MyAccount.jsx** - Minha Conta

**Funcionalidades:**
- Ver dados do próprio user
- Alterar password
- Ver role atual

**Alterar Password:**
```javascript
const handleChangePassword = async () => {
  if (newPassword.length < 6) {
    alert('Password deve ter pelo menos 6 caracteres');
    return;
  }
  
  await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ newPassword })
  });
  
  alert('Password alterada com sucesso!');
};
```

#### 14. **Cliente.jsx** - Vista de Cliente

**Funcionalidades:**
- Lista obras do cliente (baseado em permissões)
- Ver relatórios das obras
- Ver fotos/documentos (se tiver permissão 'R' ou 'W')
- Não pode editar (apenas visualização)

### Design Responsivo

**Pattern Mobile (768px breakpoint):**
```javascript
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const mq = window.matchMedia('(max-width: 768px)');
  const update = () => setIsMobile(mq.matches);
  update();
  mq.addEventListener('change', update);
  return () => mq.removeEventListener('change', update);
}, []);
```

**Conditional Rendering:**
```jsx
{isMobile ? (
  <div className="mobile-cards">
    {/* Cards verticais com chips */}
  </div>
) : (
  <table className="desktop-table">
    {/* Tabela tradicional */}
  </table>
)}
```

**CSS Mobile:**
```css
@media (max-width: 768px) {
  .desktop-table { display: none; }
  .mobile-cards { display: block; }
  
  .card {
    margin-bottom: 16px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .chip {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 16px;
    background: #e0e0e0;
    margin: 4px;
  }
  
  .chip.active {
    background: #4caf50;
    color: white;
  }
}
```

---

## Backend - API e Serviços

### Estrutura de Rotas

**Router Central (routes/index.js):**
```javascript
const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use('/auth', require('./auth'));
router.use('/levels', authenticate, require('./levels'));
router.use('/users', authenticate, require('./users'));
router.use('/permissions', authenticate, require('./permissions'));
router.use('/level-users', authenticate, require('./levelUsers'));
router.use('/level-user-days', authenticate, require('./levelUserDays'));
router.use('/materials', authenticate, require('./materials'));
router.use('/photos', authenticate, require('./photos'));
router.use('/documents', authenticate, require('./documents'));
router.use('/reports', authenticate, require('./reports'));

module.exports = router;
```

### Endpoints Principais

#### Autenticação

**POST /api/auth/login**
- Body: `{ email, password }`
- Response: `{ token, user: { id, email, name, role } }`
- Gera JWT válido por 7 dias

**POST /api/auth/change-password**
- Headers: `Authorization: Bearer <token>`
- Body: `{ newPassword }`
- Atualiza passwordHash (bcrypt)

**POST /api/auth/create-user** (Admin only)
- Headers: `Authorization: Bearer <token>`
- Body: `{ email, name, status, password }`
- Cria user + hash password

#### Obras/Níveis

**GET /api/levels?parentId=**
- Query: `parentId` (NULL = obras raiz)
- Response: Array de levels

**GET /api/levels/:id**
- Response: Detalhes completos do level

**POST /api/levels** (Admin only)
- Body: `{ name, description, parentId, startDate, endDate, constructionManagerId }`
- Cria novo nível

**PUT /api/levels/:id**
- Body: Campos a atualizar
- Atualiza nível existente

**DELETE /api/levels/:id** (Admin only)
- Apaga nível (cascade apaga subníveis)

**GET /api/levels/:id/ratio**
- Calcula rácio: `SUM(realValue) / SUM(estimatedValue)` dos materiais
- Response: `{ ratio: "1.05" }` (string formatada)

#### Planeamento/Presenças

**GET /api/level-user-days/level/:levelId?from=&to=**
- Query: `from`, `to` (datas ISO)
- Response: Array de registos LevelUserDay

**POST /api/level-user-days/level/:levelId**
- Body: `{ from, to, entries: [{ userId, day, period }] }`
- Cria planeamento em batch
- Valida conflitos (user em 2 obras)
- Response: `{ saved: 10, conflicts: 2, conflictDetails: [...] }`

**POST /api/level-user-days** (single record)
- Body: `{ levelId, userId, day, period, appeared, observations, overtimeHours }`
- Cria registo único (usado em Presencas quando não existe record)

**PUT /api/level-user-days/:id**
- Body: `{ appeared, observations, overtimeHours }`
- Atualiza presença existente

**GET /api/level-user-days?from=&to=** (admin)
- Todas presenças de todas obras num período

#### Permissões

**GET /api/permissions/my-works**
- Headers: `Authorization: Bearer <token>`
- Response: Obras que user tem acesso (Admin vê todas)

**GET /api/permissions/work/:levelId/permission?objectType=**
- Query: `objectType` (photos, materials, etc.)
- Response: `{ permissionLevel: 'W' | 'R' | 'N' }`

**GET /api/permissions/level/:levelId/users**
- Response: Users com permissões nesta obra + seus níveis de acesso

**POST /api/permissions/assign**
- Body: `{ userId, levelId, objectType, permission }`
- Cria/atualiza permissão (MERGE/UPSERT)

**DELETE /api/permissions/remove**
- Body: `{ userId, levelId, objectType }`
- Remove permissão

#### Equipa

**GET /api/level-users/level/:levelId**
- Response: Users associados à obra

**POST /api/level-users**
- Body: `{ levelId, userId }`
- Associa user à obra (validação: user ativo)

**DELETE /api/level-users/:id**
- Remove associação user↔obra

#### Materiais

**GET /api/materials/level/:levelId**
- Response: Materiais do nível

**POST /api/materials**
- Body: `{ levelId, description, quantity, brand, type, estimatedValue }`
- Cria material

**PUT /api/materials/:id**
- Body: Campos a atualizar (realValue, deliveryStatus, assemblyStatus)
- Atualiza material

**DELETE /api/materials/:id**
- Apaga material

#### Fotos

**POST /api/photos/upload**
- Form-data: `file`, `levelId`, `type`, `role`, `observations`
- Upload para Azure Blob Storage
- Cria registo em Photo table
- Response: `{ id, url }`

**GET /api/photos/level/:levelId**
- Response: Fotos do nível

**DELETE /api/photos/:id**
- Apaga foto (blob + registo)

#### Documentos

**POST /api/documents/upload**
- Form-data: `file`, `levelId`, `name`
- Upload para Azure Blob
- Response: `{ id, url }`

**GET /api/documents/level/:levelId**
- Response: Documentos do nível

**DELETE /api/documents/:id**
- Apaga documento

#### Utilizadores

**GET /api/users?active=1**
- Query: `active` (filtro opcional)
- Response: Array de users

**GET /api/users/:id**
- Response: User específico

**PUT /api/users/:id** (Admin only)
- Body: `{ name, status, active, Car }`
- Atualiza user

#### Relatórios

**GET /api/reports/:levelId?from=&to=**
- Response: Dados agregados para relatório
  - Presenças
  - Materiais
  - Horas normais + extra
  - Custos

---

## Fluxos de Dados Principais

### 1. Criar Nova Obra

```
[Admin] → Clica "Criar Obra" → Form (nome, descrição, datas, responsável)
  ↓
POST /api/levels
  { name, description, startDate, endDate, constructionManagerId, parentId: null }
  ↓
levelService.create() → INSERT INTO Level
  ↓
Response: { id, name, ... }
  ↓
[Frontend] Redirect para /works/:id/levels (estrutura hierárquica)
```

### 2. Adicionar Equipa à Obra

```
[Admin] → Obra → Tab "Equipa" → Seleciona user + "Adicionar"
  ↓
POST /api/level-users
  { levelId: 10, userId: 5 }
  ↓
levelUserService.add()
  → Valida user ativo
  → INSERT INTO LevelUser (levelId, userId)
  ↓
Response: { id, levelId, userId }
  ↓
[Frontend] Atualiza lista de equipa
```

### 3. Planear Semana de Trabalho (PlaneamentoGlobal)

```
[User] → PlaneamentoGlobal → Seleciona 15/01 a 20/01
  ↓
Load equipas de todas obras ativas
  GET /api/level-users/level/:id (para cada obra)
  ↓
[User] Clica células para alocar users (manhã/tarde)
  selected.add("10::5::2026-01-15::m") // User 10, Obra 5, dia 15, manhã
  ↓
Sistema deteta conflitos (user em 2 obras mesmo período)
  conflictCounts["10::2026-01-15::m"] = 2 ⚠️
  ↓
[User] Clica "Aplicar"
  ↓
Agrupa por obra:
  Obra 5: [{ userId: 10, day: "2026-01-15", period: "m" }, ...]
  Obra 8: [{ userId: 12, day: "2026-01-16", period: "a" }, ...]
  ↓
POST /api/level-user-days/level/5
  { from: "2026-01-15", to: "2026-01-20", entries: [...] }
  ↓
levelUserDayService.setRange()
  → DELETE registos existentes no período
  → Para cada entry:
      → Valida user na equipa (LevelUser)
      → Verifica conflito com outras obras
      → Se OK: INSERT INTO LevelUserDay (levelId, userId, day, period)
  → Commit transaction
  ↓
Response: { saved: 25, conflicts: 2 }
  ↓
[Frontend] Mostra mensagem: "25 planeamentos guardados, 2 conflitos ignorados"
```

### 4. Marcar Presenças do Dia

```
[User] → Presencas → Seleciona Obra 5 + Data 2026-01-15
  ↓
GET /api/level-user-days/level/5?from=2026-01-15&to=2026-01-15
  ↓
Response: [
  { id: 100, userId: 10, period: "m", appeared: null },
  { id: 101, userId: 10, period: "a", appeared: null },
  { id: 102, userId: 12, period: "m", appeared: null }
]
  ↓
[Frontend] Renderiza form:
  User 10 - Manhã: [ ] Sim [ ] Não | Obs: ___
  User 10 - Tarde: [ ] Sim [ ] Não | Obs: ___
  User 12 - Manhã: [ ] Sim [ ] Não | Obs: ___
  Horas Extra (User 10): ___ (2.5)
  ↓
[User] Marca presenças + preenche horas extra + clica "Guardar"
  ↓
Frontend determina onde vai overtime:
  User 10: tem manhã + tarde → overtime vai para tarde (recordId 101)
  ↓
Para cada registo alterado:
  PUT /api/level-user-days/100
    { appeared: "yes", observations: "", overtimeHours: 0 }
  PUT /api/level-user-days/101
    { appeared: "yes", observations: "", overtimeHours: 2.5 }
  PUT /api/level-user-days/102
    { appeared: "no", observations: "Faltou sem avisar", overtimeHours: 0 }
  ↓
levelUserDayService.update()
  → UPDATE LevelUserDay SET appeared=@appeared, ...
  ↓
Response: { success: true }
  ↓
[Frontend] Mostra "Presenças guardadas com sucesso!"
```

### 5. Gerar Relatório de Obra

```
[User] → Dashboard → Seleciona Obra 5 → Tab "Reports" → Período 01/01 a 31/01
  ↓
GET /api/reports/5?from=2026-01-01&to=2026-01-31
  ↓
reportService.getObraReport(levelId, from, to)
  → SELECT presenças WHERE levelId=5 AND day BETWEEN from AND to
  → SELECT materiais WHERE levelId=5
  → Agrega:
      - Total dias planeados por user
      - Total dias presentes (appeared='yes')
      - Total dias faltou (appeared='no')
      - Total horas extra (SUM overtimeHours)
      - Total custos materiais (SUM realValue vs estimatedValue)
  ↓
Response: {
  presencas: [
    { userId: 10, userName: "João", diasPlaneados: 20, diasPresentes: 18, diasFaltou: 2, horasExtra: 5.5 }
  ],
  materiais: [
    { description: "Tijolo", qty: 1000, estimatedValue: 500, realValue: 520 }
  ],
  totals: {
    horasNormais: 160,
    horasExtra: 12.5,
    custoMateriais: 15230.50,
    ratioMateriais: 1.05
  }
}
  ↓
[Frontend] Renderiza página formatada (print-ready)
```

---

## Segurança e Autenticação

### JWT Token

**Geração (authService.js):**
```javascript
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = '7d';

const token = jwt.sign(
  { sub: user.id, role: user.status },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRES_IN }
);
```

**Verificação (middleware/auth.js):**
```javascript
function authenticate(req, res, next) {
  const token = req.headers.authorization?.slice(7); // Remove "Bearer "
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}
```

### Tracking de Inatividade (Frontend)

**AuthContext.jsx:**
```javascript
const INACTIVITY_TIMEOUT = 4 * 60 * 60 * 1000; // 4 horas

useEffect(() => {
  if (!token) return;
  
  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      logout('inactivity');
    }, INACTIVITY_TIMEOUT);
  };
  
  // Eventos que resetam timer
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  events.forEach(e => window.addEventListener(e, resetTimer));
  
  resetTimer(); // Iniciar
  
  return () => {
    events.forEach(e => window.removeEventListener(e, resetTimer));
    if (timerRef.current) clearTimeout(timerRef.current);
  };
}, [token]);
```

**Fluxo:**
1. User faz login → timer de 4h inicia
2. Cada ação (click, scroll, etc.) → timer reseta
3. 4h sem ação → `logout('inactivity')` → alerta + redirect /login
4. Token expira (7 dias) → próxima API call → 401 → `logout('expired')`

### Passwords

**Hash (bcrypt):**
```javascript
const bcrypt = require('bcryptjs');
const saltRounds = 10;

// Criar
const hash = await bcrypt.hash(plainPassword, saltRounds);
await db.query('UPDATE User SET passwordHash = @hash WHERE id = @id');

// Verificar
const match = await bcrypt.compare(plainPassword, user.passwordHash);
if (!match) throw new Error('Credenciais inválidas');
```

### HTTPS e Produção

**Recomendações:**
- Usar HTTPS em produção (Azure App Service tem SSL gratuito)
- JWT_SECRET forte (256-bit random string)
- CORS configurado para domínio específico
- Rate limiting em rotas de autenticação
- Logs de tentativas de login falhadas

---

## Resumo Técnico

### Conceitos-Chave

1. **Hierarquia Ilimitada**: Obras podem ter N níveis (fases → andares → divisões → tarefas)
2. **Planeamento Bidimensional**: Dia × Período (manhã/tarde) como unidade atómica
3. **Prevenção de Conflitos**: Utilizador não pode estar em 2 obras no mesmo momento
4. **Permissões Granulares**: Controlo por objeto (fotos, materiais, etc.) dentro de cada obra
5. **Tracking Inteligente**: Horas extra alocadas ao período correto automaticamente
6. **Responsividade Total**: Desktop (tabelas) e Mobile (cards) com UX otimizada
7. **Segurança Multi-Camada**: JWT + inatividade + permissões + roles

### Performance

- **Queries Otimizadas**: JOINs com índices em FK
- **Batch Operations**: Planeamento em lote (1 transação)
- **Caching**: Ratios calculados sob demanda e cached no frontend
- **Lazy Loading**: Hierarquias carregadas on-demand

### Escalabilidade

- **Azure SQL**: Escalável verticalmente (aumentar DTUs)
- **Azure Blob**: Ilimitado para ficheiros
- **Stateless Backend**: Pode adicionar instâncias (load balancer)
- **React SPA**: Client-side rendering reduz carga servidor

---

## Próximos Passos / Melhorias Futuras

1. **Notificações**: Email/SMS quando user falta sem avisar
2. **App Mobile**: React Native com sync offline
3. **Dashboard Avançado**: Gráficos de tendências (Chart.js/Recharts)
4. **Integração Contabilidade**: Export para software de faturação
5. **Geo-tracking**: Validar presença por GPS
6. **Assinaturas Digitais**: Relatórios assinados digitalmente
7. **Multi-idioma**: i18n (PT/EN/ES)
8. **Audit Log**: Tracking de todas alterações críticas

---

**Última atualização:** 19 de janeiro de 2026  
**Versão:** 1.0  
**Autor:** Documentação gerada automaticamente pelo sistema
