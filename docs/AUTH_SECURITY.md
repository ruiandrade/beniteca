# Segurança de Autenticação - Beniteca

## Configurações Implementadas

### 🔐 Token JWT - Expiração
- **Duração**: 7 dias
- **Localização**: `src/services/authService.js`
- **Comportamento**: 
  - Token criado no login expira após 7 dias
  - Se tentar usar token expirado → 401 → logout automático
  - Utilizador redirecionado para página de login

### ⏱️ Auto-Logout por Inatividade
- **Timeout**: 4 horas sem atividade
- **Localização**: `frontend/src/context/AuthContext.jsx`
- **Eventos Monitorizados**:
  - `mousedown` - clique do rato
  - `keydown` - tecla pressionada
  - `scroll` - scroll da página
  - `touchstart` - toque no ecrã (mobile)
  - `click` - clique geral

**Comportamento**:
1. Cada ação do utilizador reseta o timer de 4 horas
2. Se 4 horas sem ação → logout automático + alerta
3. Timer limpo ao fazer logout manual

### 🔄 Como Funciona

```
Login → Token (7 dias) + Timer Inatividade (4h)
  ↓
Utilizador ativo (clicks, scroll, etc.)
  ↓
Timer resetado a cada ação
  ↓
Sem ação por 4h → Logout automático
OU
7 dias passam → Token expira → 401 em API call → Logout
```

## Para Desenvolvedores

### Usar Hook `useAuthFetch` (Opcional)

Para APIs que precisam de tratamento automático de token expirado:

```javascript
import { useAuthFetch } from '../hooks/useAuthFetch';

function MyComponent() {
  const authFetch = useAuthFetch();

  const loadData = async () => {
    try {
      const res = await authFetch('/api/endpoint', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      // ...
    } catch (err) {
      // Se 401, já fez logout automático
      console.error(err);
    }
  };
}
```

### Continuar com Fetch Normal (Atual)

O código atual continua a funcionar! O AuthContext já trata 401:

```javascript
// Exemplo existente em Permissions.jsx
const res = await fetch('/api/permissions/level/' + levelId + '/users', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Se res.status === 401:
// → logout('expired') chamado automaticamente no próximo interaction
// → User vê alerta "Token expirado"
```

## Testar Localmente

### Teste 1: Token Expirado
```javascript
// No authService.js, mudar temporariamente para:
const JWT_EXPIRES_IN = '10s'; // 10 segundos

// Fazer login → aguardar 10s → tentar qualquer ação
// Esperado: Alert "Token expirado" + redirect para login
```

### Teste 2: Inatividade
```javascript
// No AuthContext.jsx, mudar temporariamente para:
const INACTIVITY_TIMEOUT = 10 * 1000; // 10 segundos

// Fazer login → não tocar em nada por 10s
// Esperado: Alert "Sessão terminada por inatividade" + redirect
```

### Teste 3: Atividade Normal
```javascript
// Fazer login → usar normalmente (clicks, scroll, etc.)
// Timer deve resetar constantemente
// Esperado: Sessão nunca expira por inatividade enquanto ativo
```

## Configuração em Produção

### Variáveis de Ambiente (Opcional)

Se quiser tornar configurável via `.env`:

```bash
# .env
JWT_EXPIRES_IN=7d
INACTIVITY_TIMEOUT_HOURS=4
```

```javascript
// authService.js
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// AuthContext.jsx
const INACTIVITY_TIMEOUT = (process.env.INACTIVITY_TIMEOUT_HOURS || 4) * 60 * 60 * 1000;
```

## Segurança vs UX

| Configuração | Segurança | UX | Caso de Uso |
|--------------|-----------|-----|-------------|
| Token 7d + Inativo 4h | ⭐⭐⭐⭐ Boa | ⭐⭐⭐⭐ Boa | **Implementado** - Balanceado |
| Token 24h + Inativo 2h | ⭐⭐⭐⭐⭐ Máxima | ⭐⭐ Pobre | Banking, alta segurança |
| Token 30d + Inativo 8h | ⭐⭐⭐ OK | ⭐⭐⭐⭐⭐ Excelente | Apps pessoais |

## Troubleshooting

### "Sou desligado muito cedo"
- Verificar se eventos (scroll, click) estão a funcionar
- Browser Developer Tools → Console → ver se há erros
- Verificar se `resetInactivityTimer()` é chamado

### "Token expirado mas não devia"
- Verificar data/hora do servidor (Azure SQL)
- JWT usa timestamp UTC
- Verificar se `JWT_EXPIRES_IN` correto no backend

### "Não consigo fazer logout manual"
- Botão logout deve chamar `logout()` ou `logout('manual')`
- Timer é limpo automaticamente

## Melhorias Futuras (Opcional)

1. **Refresh Token**: Token curto + refresh token longo
2. **Remember Me**: Checkbox no login para extender para 30 dias
3. **Activity Monitor UI**: Mostrar "Sessão expira em X minutos" na UI
4. **Logout Warning**: Aviso 5 minutos antes de logout por inatividade
