#!/bin/bash
# Script de detecção automática para Heroku
# Detecta se deve fazer deploy do frontend ou backend baseado em variáveis de ambiente

echo "🚀 Iniciando deploy para Heroku..."

# Verificar qual app estamos deployando baseado na variável APP_TYPE
if [ "$APP_TYPE" = "backend" ]; then
    echo "📦 Detectado: BACKEND"
    echo "📂 Movendo arquivos do backend..."
    
    # Copiar arquivos do backend para root temporariamente
    cp -r backend/* .
    
    echo "✅ Backend pronto para deploy"
    
elif [ "$APP_TYPE" = "frontend" ]; then
    echo "🎨 Detectado: FRONTEND"
    echo "📂 Movendo arquivos do frontend..."
    
    # Copiar arquivos do frontend para root temporariamente
    cp -r frontend/* .
    
    echo "✅ Frontend pronto para deploy"
    
else
    echo "❌ Erro: APP_TYPE não definido!"
    echo "Configure com: heroku config:set APP_TYPE=backend ou APP_TYPE=frontend"
    exit 1
fi

echo "🎉 Setup completo!"
