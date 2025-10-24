# 🚀 Guia Completo de Deploy no Heroku - Humor Diário

## 📋 Pré-requisitos

1. **Conta no Heroku** - https://signup.heroku.com/
2. **Heroku CLI instalado** - https://devcenter.heroku.com/articles/heroku-cli
3. **Git instalado**
4. **Conta MongoDB Atlas** (gratuita) - https://www.mongodb.com/cloud/atlas/register

---

## 🗂️ Estrutura do Deploy

Você vai criar **2 aplicações Heroku**:
- `humor-diario-backend` (FastAPI)
- `humor-diario-frontend` (Expo Web)

---

## 📦 PARTE 1: Setup do MongoDB Atlas (Banco de Dados)

### 1.1 Criar Cluster MongoDB (GRÁTIS)

```bash
1. Acesse: https://www.mongodb.com/cloud/atlas/register
2. Crie uma conta
3. Crie um cluster gratuito (M0 Sandbox)
4. Região: Escolha a mais próxima (ex: São Paulo/AWS)
5. Cluster Name: humor-diario
```

### 1.2 Configurar Acesso

```bash
1. Database Access → Add New Database User
   - Username: admin
   - Password: [gere uma senha forte e SALVE]
   - Role: Read and write to any database

2. Network Access → Add IP Address
   - ⚠️ Para Heroku, adicione: 0.0.0.0/0 (permitir de qualquer lugar)
   - (Em produção real, você restringiria isso)
```

### 1.3 Obter Connection String

```bash
1. Clusters → Connect → Connect your application
2. Driver: Python / Version: 3.11 or later
3. Copie a connection string:
   mongodb+srv://admin:<password>@humor-diario.xxxxx.mongodb.net/?retryWrites=true&w=majority

4. ⚠️ SUBSTITUA <password> pela sua senha real
   Exemplo: mongodb+srv://admin:SuaSenhaAqui@humor-diario.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

---

## 🔧 PARTE 2: Deploy do Backend (FastAPI)

### 2.1 Preparar o repositório

```bash
# No seu computador local, clone o repositório
git clone https://github.com/adriano7monteiro/humor-diario.git
cd humor-diario
```

### 2.2 Criar App Heroku para o Backend

```bash
# Login no Heroku
heroku login

# Criar app para o backend
heroku create humor-diario-backend

# Ou se o nome já existe, use outro:
heroku create humor-diario-backend-[seu-nome]
```

### 2.3 Configurar Variáveis de Ambiente

```bash
# Substitua os valores entre < > pelos seus valores reais

# MongoDB (obtenha do Atlas - passo 1.3)
heroku config:set MONGO_URL="mongodb+srv://admin:SuaSenha@humor-diario.xxxxx.mongodb.net/?retryWrites=true&w=majority" -a humor-diario-backend

# Database name
heroku config:set DB_NAME="mental_health_app" -a humor-diario-backend

# JWT Secret (gere uma chave aleatória segura)
heroku config:set JWT_SECRET_KEY="$(openssl rand -base64 32)" -a humor-diario-backend

# Stripe API Key (obtenha em https://dashboard.stripe.com/apikeys)
heroku config:set STRIPE_API_KEY="sk_test_..." -a humor-diario-backend

# Emergent LLM Key (já configurada)
heroku config:set EMERGENT_LLM_KEY="sk-emergent-55869Ff778123962f1" -a humor-diario-backend
```

### 2.4 Deploy do Backend

```bash
# Adicionar o Heroku remote para o backend
cd backend
git init  # Se ainda não for um repositório git
heroku git:remote -a humor-diario-backend

# Fazer deploy
git add .
git commit -m "Deploy backend to Heroku"
git push heroku main  # ou master, dependendo da sua branch

# Verificar logs
heroku logs --tail -a humor-diario-backend
```

### 2.5 Testar o Backend

```bash
# Abrir no navegador
heroku open -a humor-diario-backend

# Ou testar via curl
curl https://humor-diario-backend.herokuapp.com/api/
# Deve retornar: {"message":"Mental Health App API"}
```

---

## 🎨 PARTE 3: Deploy do Frontend (Expo Web)

### 3.1 Criar App Heroku para o Frontend

```bash
# Voltar para a raiz do projeto
cd ..

# Criar app para o frontend
heroku create humor-diario-frontend
```

### 3.2 Configurar Variáveis de Ambiente do Frontend

```bash
# URL do backend que você acabou de criar
heroku config:set EXPO_PUBLIC_BACKEND_URL="https://humor-diario-backend.herokuapp.com" -a humor-diario-frontend

# Outras configs necessárias
heroku config:set NODE_ENV="production" -a humor-diario-frontend
```

### 3.3 Build e Deploy do Frontend

```bash
cd frontend

# Adicionar o Heroku remote para o frontend
git init  # Se ainda não for um repositório git
heroku git:remote -a humor-diario-frontend

# Fazer deploy
git add .
git commit -m "Deploy frontend to Heroku"
git push heroku main

# Verificar logs
heroku logs --tail -a humor-diario-frontend
```

### 3.4 Testar o Frontend

```bash
# Abrir no navegador
heroku open -a humor-diario-frontend

# Você deve ver a tela de boas-vindas do app!
```

---

## ✅ PARTE 4: Verificação Final

### 4.1 Testar Funcionalidades

1. **Acesse o frontend**: https://humor-diario-frontend.herokuapp.com
2. **Criar conta**: Clique em "Criar conta" e registre-se
3. **Login**: Faça login com suas credenciais
4. **Testar funcionalidades**:
   - Registro de Humor
   - Missões Diárias
   - Chat com IA
   - Progresso Pessoal

### 4.2 Comandos Úteis

```bash
# Ver logs do backend
heroku logs --tail -a humor-diario-backend

# Ver logs do frontend
heroku logs --tail -a humor-diario-frontend

# Reiniciar backend
heroku restart -a humor-diario-backend

# Reiniciar frontend
heroku restart -a humor-diario-frontend

# Ver variáveis de ambiente
heroku config -a humor-diario-backend
heroku config -a humor-diario-frontend

# Abrir dashboard do Heroku
heroku dashboard
```

---

## 💰 Custos do Heroku

### Planos Atuais (2024):

- **Eco Dynos**: $5/mês por app
  - 2 apps = $10/mês total
  - 1000 horas/mês
  
- **Basic Dynos**: $7/mês por app
  - 2 apps = $14/mês total
  - Sempre ligado

- **MongoDB Atlas**: GRATUITO (M0)
  - 512MB de armazenamento

### Total Mensal: $10-14 USD

---

## 🔒 CORS - Importante!

Se houver problemas de CORS, adicione o domínio do frontend no backend:

```python
# backend/server.py - já está configurado, mas verifique:

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://humor-diario-frontend.herokuapp.com",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🐛 Troubleshooting

### Problema: Backend não inicia

```bash
# Verificar logs
heroku logs --tail -a humor-diario-backend

# Comum: erro do MongoDB
# Solução: Verificar MONGO_URL e liberar IP 0.0.0.0/0 no Atlas
```

### Problema: Frontend não conecta ao backend

```bash
# Verificar variável de ambiente
heroku config -a humor-diario-frontend

# Deve ter: EXPO_PUBLIC_BACKEND_URL=https://humor-diario-backend.herokuapp.com
```

### Problema: Erro de Stripe

```bash
# Se não tiver Stripe ainda, use uma chave de teste
heroku config:set STRIPE_API_KEY="sk_test_dummy_key" -a humor-diario-backend
```

---

## 🎯 Próximos Passos (Opcional)

1. **Custom Domain**: Adicionar seu próprio domínio
2. **SSL/HTTPS**: Já incluso gratuitamente no Heroku
3. **CI/CD**: Conectar GitHub para deploy automático
4. **Monitoring**: Usar Heroku Metrics ou ferramentas externas

---

## 📞 Suporte

- Heroku Docs: https://devcenter.heroku.com/
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- Stripe Docs: https://stripe.com/docs

---

## ✨ Pronto!

Seu app **Humor Diário** agora está rodando no Heroku! 🎉

**URLs:**
- Frontend: https://humor-diario-frontend.herokuapp.com
- Backend: https://humor-diario-backend.herokuapp.com/api/
