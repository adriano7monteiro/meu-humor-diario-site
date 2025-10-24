# 📚 Índice - Guias de Deploy do Humor Diário

## 🎯 Escolha o Guia Certo para Você

---

### 🚀 [QUICK_START.md](QUICK_START.md)
**Para**: Iniciantes que querem deploy rápido  
**Tempo**: 30 minutos  
**Nível**: ⭐⭐☆☆☆ Fácil

```
✅ Comandos copy-paste prontos
✅ Método mais simples (Buildpack Subdir)
✅ Passo a passo visual
```

**Comece aqui se**: É sua primeira vez com Heroku

---

### 📖 [MONOREPO_DEPLOY_GUIDE.md](MONOREPO_DEPLOY_GUIDE.md)
**Para**: Quem quer entender todas as opções  
**Tempo**: 1 hora (leitura + deploy)  
**Nível**: ⭐⭐⭐☆☆ Intermediário

```
📦 3 métodos diferentes explicados
🎯 Comparação entre métodos
🔧 Troubleshooting detalhado
```

**Use este se**: Quer conhecer todas as alternativas de deploy

---

### 📘 [HEROKU_DEPLOY_GUIDE.md](HEROKU_DEPLOY_GUIDE.md)
**Para**: Guia completo e detalhado  
**Tempo**: 2 horas (setup completo)  
**Nível**: ⭐⭐⭐⭐☆ Avançado

```
📚 Tutorial completo passo a passo
🗄️ Configuração MongoDB Atlas
💳 Setup Stripe
🔐 Segurança e melhores práticas
```

**Use este se**: Quer um setup profissional completo

---

### ✅ [HEROKU_CHECKLIST.md](HEROKU_CHECKLIST.md)
**Para**: Acompanhar o progresso do deploy  
**Tempo**: N/A (use junto com outros guias)  
**Nível**: Todos

```
☑️ Checklist interativo
📋 Marque cada etapa concluída
🎯 Não esqueça nenhum passo
```

**Use este**: Durante o deploy para não perder o fio da meada

---

## 🎓 Recomendação por Experiência

### Primeira vez com Heroku?
1. ✅ [QUICK_START.md](QUICK_START.md)
2. ✅ [HEROKU_CHECKLIST.md](HEROKU_CHECKLIST.md) (para acompanhar)

### Já usou Heroku antes?
1. ✅ [MONOREPO_DEPLOY_GUIDE.md](MONOREPO_DEPLOY_GUIDE.md)
2. ✅ [HEROKU_CHECKLIST.md](HEROKU_CHECKLIST.md)

### Quer setup profissional completo?
1. ✅ [HEROKU_DEPLOY_GUIDE.md](HEROKU_DEPLOY_GUIDE.md)
2. ✅ [MONOREPO_DEPLOY_GUIDE.md](MONOREPO_DEPLOY_GUIDE.md) (para monorepo)
3. ✅ [HEROKU_CHECKLIST.md](HEROKU_CHECKLIST.md)

---

## 📂 Arquivos Técnicos

### Configurações de Deploy:
- `backend/Procfile` - Comando para rodar backend
- `backend/runtime.txt` - Versão do Python
- `frontend/Procfile` - Comando para rodar frontend
- `heroku-setup.sh` - Script auxiliar
- `heroku-backend.yml` - Config alternativa backend
- `heroku-frontend.yml` - Config alternativa frontend

### Documentação Original:
- `README.md` - README original do projeto
- `README_HEROKU.md` - Resumo do projeto para Heroku

---

## 🔍 Busca Rápida

### Precisa configurar MongoDB?
→ [HEROKU_DEPLOY_GUIDE.md - Parte 1](HEROKU_DEPLOY_GUIDE.md#parte-1-setup-do-mongodb-atlas-banco-de-dados)

### Problema com buildpacks?
→ [MONOREPO_DEPLOY_GUIDE.md - Troubleshooting](MONOREPO_DEPLOY_GUIDE.md#troubleshooting)

### Erro de CORS?
→ [HEROKU_DEPLOY_GUIDE.md - CORS](HEROKU_DEPLOY_GUIDE.md#cors---importante)

### Custos do Heroku?
→ [QUICK_START.md - Custos](QUICK_START.md#custos)

### Alternativas ao Heroku?
→ [QUICK_START.md - Alternativas](QUICK_START.md#alternativas-ao-heroku)

---

## 🎯 Fluxo Recomendado

```
1. Leia: QUICK_START.md (10 min)
   ↓
2. Prepare: MongoDB Atlas (5 min)
   ↓
3. Deploy: Siga os 3 passos (30 min)
   ↓
4. Acompanhe: Use HEROKU_CHECKLIST.md
   ↓
5. Problema? Consulte: MONOREPO_DEPLOY_GUIDE.md
   ↓
6. Setup avançado? Veja: HEROKU_DEPLOY_GUIDE.md
```

---

## ✨ Resumo dos Métodos

| Método | Dificuldade | Tempo | Recomendado |
|--------|-------------|-------|-------------|
| **Buildpack Subdir** | ⭐⭐☆☆☆ | 30 min | ✅ SIM |
| Git Subtree | ⭐⭐⭐☆☆ | 45 min | ⚠️ Se necessário |
| Script Automático | ⭐⭐⭐⭐☆ | 1 hora | ❌ Experimental |

---

## 💡 Dicas Rápidas

1. **Sempre use Buildpack Subdir** (método mais fácil)
2. **Configure MongoDB Atlas primeiro** (é grátis!)
3. **Use o HEROKU_CHECKLIST.md** para não esquecer nada
4. **Teste o backend primeiro**, depois o frontend
5. **Guarde suas variáveis de ambiente** em local seguro

---

## 🆘 Precisa de Ajuda?

1. **Erro de buildpack** → [MONOREPO_DEPLOY_GUIDE.md](MONOREPO_DEPLOY_GUIDE.md#troubleshooting)
2. **Backend não inicia** → [HEROKU_DEPLOY_GUIDE.md](HEROKU_DEPLOY_GUIDE.md#troubleshooting)
3. **Frontend não conecta** → [MONOREPO_DEPLOY_GUIDE.md](MONOREPO_DEPLOY_GUIDE.md#frontend-não-conecta-ao-backend)
4. **Erro do MongoDB** → [HEROKU_DEPLOY_GUIDE.md](HEROKU_DEPLOY_GUIDE.md#problema-backend-não-inicia)

---

## 📞 Recursos Adicionais

- **Heroku Docs**: https://devcenter.heroku.com/
- **MongoDB Atlas**: https://docs.atlas.mongodb.com/
- **Buildpack Subdir**: https://github.com/timanovsky/subdir-heroku-buildpack
- **Expo Docs**: https://docs.expo.dev/

---

**Pronto para começar?** 👉 Abra o [QUICK_START.md](QUICK_START.md) e comece agora! 🚀
