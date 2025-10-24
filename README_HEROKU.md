# 🌟 Humor Diário - App de Saúde Mental

App móvel/web para registro de humor, missões diárias, chat com IA, e acompanhamento de progresso emocional.

## 🚀 Deploy no Heroku

**Guia completo:** Ver arquivo `HEROKU_DEPLOY_GUIDE.md`

### Resumo Rápido:

1. **Backend**: FastAPI + MongoDB Atlas
2. **Frontend**: Expo Web (React Native Web)
3. **Custo**: ~$10-14/mês (Heroku Eco/Basic Dynos)

### Comandos Básicos:

```bash
# Backend
heroku create humor-diario-backend
heroku config:set MONGO_URL="..." -a humor-diario-backend
cd backend && git push heroku main

# Frontend  
heroku create humor-diario-frontend
heroku config:set EXPO_PUBLIC_BACKEND_URL="..." -a humor-diario-frontend
cd frontend && git push heroku main
```

## 📱 Funcionalidades

- ✅ Registro e Login de usuários
- ✅ Registro diário de humor
- ✅ Missões diárias personalizadas
- ✅ Chat com IA para suporte emocional
- ✅ Acompanhamento de progresso
- ✅ Sistema de lembretes
- ✅ Exercícios de respiração
- ✅ Diário de gratidão
- ✅ Sistema de assinaturas (Stripe)

## 🛠️ Tech Stack

- **Frontend**: Expo (React Native), React Navigation, Axios
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB Atlas
- **AI**: Emergent LLM (Gemini 2.0 Flash)
- **Payments**: Stripe

## 🔑 Variáveis de Ambiente

### Backend (.env):
```
MONGO_URL=mongodb+srv://...
DB_NAME=mental_health_app
STRIPE_API_KEY=sk_test_...
JWT_SECRET_KEY=...
EMERGENT_LLM_KEY=sk-emergent-...
```

### Frontend (.env):
```
EXPO_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

## 📖 Documentação

- [Guia Completo de Deploy no Heroku](HEROKU_DEPLOY_GUIDE.md)
- [Repositório Original](https://github.com/adriano7monteiro/humor-diario)

## 👨‍💻 Desenvolvimento Local

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend
cd frontend
yarn install
yarn start
```

## 📄 Licença

MIT License

---

**Desenvolvido com ❤️ para saúde mental**
