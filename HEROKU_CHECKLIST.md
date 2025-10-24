# ✅ Checklist de Deploy no Heroku

## 📋 Pré-Deploy (Preparação)

- [ ] Conta criada no Heroku (https://signup.heroku.com/)
- [ ] Heroku CLI instalado (https://devcenter.heroku.com/articles/heroku-cli)
- [ ] Conta MongoDB Atlas criada (https://www.mongodb.com/cloud/atlas/register)
- [ ] Cluster MongoDB Atlas configurado (M0 - Gratuito)
- [ ] Connection String do MongoDB copiada
- [ ] Conta Stripe criada (opcional, mas recomendado)
- [ ] API Key do Stripe obtida (sk_test_... ou sk_live_...)

---

## 🗄️ Configuração do MongoDB Atlas

- [ ] Cluster criado (M0 Sandbox)
- [ ] Database User criado (username + password)
- [ ] Network Access configurado (0.0.0.0/0 para Heroku)
- [ ] Connection string obtida e testada
- [ ] Senha substituída na connection string

---

## 🔧 Backend Deploy

### Setup
- [ ] Login no Heroku: `heroku login`
- [ ] App criado: `heroku create humor-diario-backend`
- [ ] Git inicializado na pasta backend

### Variáveis de Ambiente
- [ ] `MONGO_URL` configurada
- [ ] `DB_NAME` configurada
- [ ] `JWT_SECRET_KEY` configurada
- [ ] `STRIPE_API_KEY` configurada
- [ ] `EMERGENT_LLM_KEY` configurada

### Deploy
- [ ] Arquivos adicionados: `git add .`
- [ ] Commit feito: `git commit -m "Deploy backend"`
- [ ] Push para Heroku: `git push heroku main`
- [ ] Logs verificados: `heroku logs --tail -a humor-diario-backend`

### Testes
- [ ] Backend acessível via navegador
- [ ] Endpoint `/api/` retorna: `{"message":"Mental Health App API"}`
- [ ] Sem erros nos logs

---

## 🎨 Frontend Deploy

### Setup
- [ ] App criado: `heroku create humor-diario-frontend`
- [ ] Git inicializado na pasta frontend

### Variáveis de Ambiente
- [ ] `EXPO_PUBLIC_BACKEND_URL` configurada (URL do backend Heroku)
- [ ] `NODE_ENV=production` configurada

### Deploy
- [ ] Arquivos adicionados: `git add .`
- [ ] Commit feito: `git commit -m "Deploy frontend"`
- [ ] Push para Heroku: `git push heroku main`
- [ ] Logs verificados: `heroku logs --tail -a humor-diario-frontend`

### Testes
- [ ] Frontend acessível via navegador
- [ ] Tela de boas-vindas carrega
- [ ] Sem erros de CORS
- [ ] Sem erros nos logs

---

## 🧪 Testes Finais

### Funcionalidades Básicas
- [ ] Criar conta funciona
- [ ] Login funciona
- [ ] Logout funciona

### Funcionalidades do App
- [ ] Registro de Humor funciona
- [ ] Missões Diárias carregam
- [ ] Chat com IA responde
- [ ] Progresso Pessoal mostra dados
- [ ] Sistema de lembretes funciona

### Performance
- [ ] App carrega em menos de 5 segundos
- [ ] Navegação é fluida
- [ ] Sem erros no console do navegador

---

## 📱 URLs Finais

Anote suas URLs aqui:

- **Backend**: https://__________________.herokuapp.com
- **Frontend**: https://__________________.herokuapp.com

---

## 💡 Comandos Úteis

```bash
# Ver logs em tempo real
heroku logs --tail -a humor-diario-backend
heroku logs --tail -a humor-diario-frontend

# Reiniciar apps
heroku restart -a humor-diario-backend
heroku restart -a humor-diario-frontend

# Ver variáveis de ambiente
heroku config -a humor-diario-backend
heroku config -a humor-diario-frontend

# Abrir apps no navegador
heroku open -a humor-diario-backend
heroku open -a humor-diario-frontend

# Dashboard do Heroku
heroku dashboard
```

---

## 🎯 Próximos Passos (Opcional)

- [ ] Configurar domínio customizado
- [ ] Conectar GitHub para deploy automático
- [ ] Configurar monitoramento (Heroku Metrics)
- [ ] Configurar backups do MongoDB
- [ ] Implementar CI/CD com GitHub Actions

---

## 🆘 Problemas Comuns

### Backend não inicia
- ✅ Verificar `MONGO_URL` está correta
- ✅ Verificar IP liberado no MongoDB Atlas (0.0.0.0/0)
- ✅ Verificar logs: `heroku logs --tail -a humor-diario-backend`

### Frontend não conecta ao backend
- ✅ Verificar `EXPO_PUBLIC_BACKEND_URL` está correta
- ✅ Verificar CORS no backend
- ✅ Testar backend diretamente no navegador

### Erro de Stripe
- ✅ Usar chave de teste válida
- ✅ Verificar formato: sk_test_... ou sk_live_...
- ✅ Temporário: usar `sk_test_dummy_key`

---

## ✨ Conclusão

Quando todos os checkboxes estiverem marcados, seu app está 100% funcional no Heroku! 🎉

**Custos mensais**: ~$10-14 USD (2 Eco/Basic Dynos)
**MongoDB**: Gratuito (M0)
**Total**: $10-14/mês

---

**Última atualização**: $(date)
**Status**: [ ] Em progresso  [ ] Concluído
