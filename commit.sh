#!/bin/bash

# Adicionar todos os arquivos modificados
git add .

# Fazer commit com mensagem descritiva
git commit -m "feat: implementar auto-save, URLs assinadas R2 e melhorias no histórico

- Implementado sistema de auto-save com debounce de 1.5s
- Criado endpoint /api/get-video-url para URLs assinadas do R2
- Resolvido erro 'Failed to fetch' usando presigned URLs
- Adicionado colunas camera_key e screen_key no schema
- Modificado upload para salvar câmera, tela e composite separadamente
- Criação automática de trilhas de áudio (AUDIO_MIC/AUDIO_SCREEN)
- Corrigido undo/redo para não registrar seleções simples
- Adicionado debounce de 500ms para alterações de propriedades (volume, etc)
- Histórico agora só registra mudanças reais (movimento >5px ou após 500ms)
- Melhorado fluxo de edição não-destrutiva com fontes separadas"

# Push para o repositório
git push origin main

echo "✅ Commit e push realizados com sucesso!"
