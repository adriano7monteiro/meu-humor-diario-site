#!/bin/bash
# Script para configurar arquivos do Heroku
# Execute: bash setup_heroku.sh

echo "🚀 Configurando arquivos para deploy no Heroku..."

# Frontend Procfile
cat > frontend/Procfile << 'EOF'
web: npx serve dist -s -l $PORT
EOF
echo "✅ frontend/Procfile criado"

# Backend Procfile
cat > backend/Procfile << 'EOF'
web: uvicorn server:app --host 0.0.0.0 --port $PORT
EOF
echo "✅ backend/Procfile criado"

# Backend runtime
cat > backend/runtime.txt << 'EOF'
python-3.11.9
EOF
echo "✅ backend/runtime.txt criado"

# Buildpacks
cat > .buildpacks << 'EOF'
https://github.com/timanovsky/subdir-heroku-buildpack
https://github.com/heroku/heroku-buildpack-python
EOF
echo "✅ .buildpacks criado"

# Adicionar script no package.json se não existir
if ! grep -q "heroku-postbuild" frontend/package.json; then
    echo "⚠️  Adicione manualmente no frontend/package.json:"
    echo '    "heroku-postbuild": "expo export:web"'
else
    echo "✅ heroku-postbuild já existe no package.json"
fi

# Adicionar dependência serve se não existir
if ! grep -q "\"serve\"" frontend/package.json; then
    echo "📦 Instalando serve..."
    cd frontend && yarn add serve && cd ..
    echo "✅ serve instalado"
else
    echo "✅ serve já está instalado"
fi

echo ""
echo "🎉 Configuração concluída!"
echo ""
echo "📝 Próximos passos:"
echo "1. git add ."
echo "2. git commit -m 'Configure Heroku deployment'"
echo "3. git push origin main"
echo ""
echo "Depois vá no Heroku Dashboard e faça o deploy!"
