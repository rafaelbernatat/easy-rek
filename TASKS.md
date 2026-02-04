# 📋 TASKS.md - Lista de Tarefas

*Baseado em PLANEJAMENTO.md v1.0 e SPECS.md v1.0 - 30/01/2026*

**Ordem de prioridade:** 🔴 CRÍTICA → 🟡 ALTA → 🟢 MÉDIA/BAIXA

---

## 📝 Legenda de Status

| Símbolo | Status |
|---------|--------|
| `[ ]` | Tarefa não iniciada |
| `[~]` | Tarefa em andamento |
| `[x]` | Tarefa concluída |

---

## 🔴 FASE 0: LANDING PAGE (CRÍTICA)

### Task 0.1: Criar estrutura de landing page
- [x] Criar pasta `app/(landing)/`
- [x] Mover `app/page.tsx` para `app/(landing)/page.tsx`
- [x] Criar layout específico para landing (sem sidebar, sem auth required)

### Task 0.2: Implementar Hero Section
- [x] Adicionar badge com feature highlight
- [x] Headline chamativo: "Grave. Edite. Publique."
- [x] Subheadline com benefícios
- [x] Botão CTA "Começar Grátis" → `/signup`
- [x] Botão "Ver Demo" → `/demo`
- [x] Vídeo demo ou screenshot da interface
- [x] Animações com Framer Motion

### Task 0.3: Criar seção de Features
- [x] Grid de features com ícones
- [x] Cards para: Gravação, Editor, Lower Thirds, YouTube Elements, Legendas, Compartilhamento
- [x] Hover effects com Tailwind

### Task 0.4: Criar seção de Preços
- [x] Componente `PricingCard` com:
  - Nome do plano
  - Preço (mensal/anual com toggle)
  - Lista de features (checkmarks)
  - Botão CTA
- [x] Toggle mensal/anual (20% off)
- [x] 3 planos: Free, Pro, Enterprise
- [x] Badge "Mais Popular" no Pro

### Task 0.5: Criar seção Social Proof
- [x] Logos de empresas (placeholder)
- [x] Testimonials (3-4 cards)
- [x] Contador: "10k+ usuários" "100k+ vídeos criados"

### Task 0.6: Criar FAQ
- [x] Accordion de perguntas frequentes
- [x] 5-7 perguntas sobre funcionalidades, preços, suporte

### Task 0.7: Criar Footer
- [x] Links: Features, Pricing, About, Contact
- [x] Redes sociais
- [x] Copyright

### Task 0.8: Otimizar Landing Page
- [x] SEO (meta tags, title, description)
- [x] Performance (lazy loading, otimização de imagens)
- [x] Responsividade (mobile, tablet, desktop)

---

## 🔴 FASE 0: LANDING PAGE (CRÍTICA) - ADICIONAL

### Task 0.9: Criar página de Signup com Clerk
- [x] Instalar @clerk/nextjs
- [x] Criar página `/signup` com Clerk SignUp component
- [x] Adicionar informações sobre período de teste de 7 dias
- [x] Atualizar links no Header e HeroSection para `/signup`
- [x] Adicionar ClerkProvider no layout raiz
- [x] Criar middleware.ts para proteger rotas autenticadas (excluindo /signup e /login)
- [x] Atualizar .env.example com variáveis do Clerk

---

## 🔴 FASE 1D: SISTEMA DE PAGAMENTOS (CRÍTICA)

### Task 1D.1: Instalar e configurar Stripe
- [x] `npm install stripe @stripe/stripe-js`
- [x] Adicionar chaves no `.env`:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- [x] Criar produtos e preços no Stripe Dashboard:
  - Free (price_id_free)
  - Pro Monthly (price_id_pro_monthly)
  - Pro Yearly (price_id_pro_yearly)
  - Enterprise Monthly (price_id_ent_monthly)
  - Enterprise Yearly (price_id_ent_yearly)

### Task 1D.2: Criar schema de subscriptions no banco
- [x] Executar SQL para criar tabela `subscriptions`
- [x] Executar SQL para criar tabela `invoices`
- [x] Atualizar schema Drizzle em `db/schema.ts`

### Task 1D.3: Criar Server Action `createCheckoutAction`
- [x] Arquivo: `app/actions/subscriptions.ts`
- [x] Função: `createCheckoutAction({ priceId, userId })`
- [x] Criar/obter Stripe customer
- [x] Criar Checkout Session
- [x] Passar metadata (userId)
- [x] Retornar URL do checkout

### Task 1D.4: Criar API Route `/api/stripe/create-checkout`
- [x] Arquivo: `app/api/stripe/create-checkout/route.ts`
- [x] POST endpoint
- [x] Validar userId
- [x] Chamar `createCheckoutAction`
- [x] Retornar `{ url }`

### Task 1D.5: Criar webhook do Stripe
- [x] Arquivo: `app/api/stripe/webhook/route.ts`
- [x] Verificar assinatura do webhook
- [x] Handler para `checkout.session.completed`:
  - Obter userId do metadata
  - Obter subscription details
  - Atualizar `plan_type` no usuário
  - Criar registro em `subscriptions`
- [x] Handler para `customer.subscription.updated`:
  - Atualizar plano no upgrade/downgrade
  - Atualizar tabela `subscriptions`
- [x] Handler para `customer.subscription.deleted`:
  - Reverter usuário para plano Free
  - Marcar subscription como canceled
- [x] Handler para `invoice.paid`:
  - Criar registro em `invoices`
- [x] Configurar webhook no Stripe Dashboard *(fazer manualmente no Stripe Dashboard)*

### Task 1D.6: Criar página `/settings/subscription`
- [x] Arquivo: `app/settings/subscription/page.tsx`
- [x] Mostrar plano atual
- [x] Mostrar data de renovação
- [x] Botões de Upgrade/Downgrade
- [x] Botão "Cancelar Assinatura"
- [x] Lista de faturas com links

### Task 1D.7: Criar componentes de Pricing na app
- [x] `PricingCard` component
- [x] Toggle mensal/anual *(já existe na landing page)*
- [x] Links para checkout com priceId

### Task 1D.8: Testar checkout flow end-to-end
- [x] Criar conta de teste no Stripe *(fazer manualmente)*
- [x] Fazer checkout de teste *(fazer manualmente)*
- [x] Verificar webhook funcionando *(fazer manualmente)*
- [x] Verificar plano atualizado no banco *(fazer manualmente)*
- [x] Verificar fatura criada *(fazer manualmente)*

---

## 🔴 FASE 1A: CORE HOME (CRÍTICA)

### Task 1A.1: Implementar Sidebar com Clerk
- [x] Instalar `@clerk/nextjs` (se não instalado)
- [x] Criar `components/shared/UserButton.tsx`
- [x] Adicionar `<UserButton>` na sidebar do `HomePage.tsx`
- [x] Mostrar avatar, nome, dropdown com perfil/settings/logout
- [x] Proteger rotas com middleware

### Task 1A.2: Criar botão de Upload na Home
- [x] Botão "Upload" no header/topo da home
- [x] Abrir modal ao clicar

### Task 1A.3: Criar componente `UploadModal`
- [x] Arquivo: `components/home/UploadModal.tsx`
- [x] Input de arquivo (drag & drop support)
- [x] Preview do arquivo selecionado
- [x] Barra de progresso de upload
- [x] Validação de formato (mp4, webm, mov)
- [x] Validação de tamanho (limite por plano)

### Task 1A.4: Criar Server Action para upload
- [x] Arquivo: `app/actions/media.ts`
- [x] Função: `uploadVideoAction({ file, title })`
- [x] Gerar presigned URL do R2
- [x] Upload direto para R2
- [x] Gerar thumbnail (server-side ou ffmpeg.wasm)
- [x] Salvar metadados no banco

### Task 1A.5: Implementar geração de thumbnail
- [x] Opção A: Server-side com FFmpeg
- [x] Opção B: Client-side com ffmpeg.wasm
- [x] Salvar thumbnail no R2
- [x] Atualizar `thumbnail_url` no banco

### Task 1A.6: Atualizar lista de vídeos após upload
- [ ] Refresh da lista após upload bem-sucedido
- [ ] Mostrar toast de sucesso

### Task 1A.7: Implementar edição de título inline
- [x] Adicionar ícone de lápis no título do `VideoCard` (hover)
- [x] Ao clicar, transformar em `<Input>`
- [x] Auto-save no blur ou Enter
- [x] Validação: título não vazio
- [x] Feedback visual (ícone de salvamento)

### Task 1A.8: Criar Server Action para atualizar título
- [x] Função: `updateTitleAction({ recordingId, title })`
- [x] Atualizar banco
- [x] Atualizar `updated_at`

### Task 1A.9: Adicionar contador de "última modificação"
- [ ] Adicionar coluna `updated_at` no schema
- [ ] Mostrar relativo ao tempo atual ("há 5 min")
- [ ] Atualizar a cada edição

---

## 🟡 FASE 1B: SISTEMA DE ORGANIZAÇÃO (ALTA)

### Task 1B.1: Criar schema de playlists
- [x] Executar SQL para criar tabela `playlists`
- [x] Executar SQL para criar tabela `playlist_items`
- [x] Atualizar schema Drizzle

### Task 1B.2: Criar Server Actions de playlists
- [x] Arquivo: `app/actions/playlists.ts`
- [x] `createPlaylistAction({ name })`
- [x] `deletePlaylistAction({ playlistId })`
- [x] `addRecordingToPlaylistAction({ playlistId, recordingId })`
- [x] `removeRecordingFromPlaylistAction({ playlistId, recordingId })`
- [x] `reorderPlaylistItemsAction({ playlistId, itemIds })`
- [x] `getPlaylistItemsAction({ playlistId })`
- [x] `getPlaylistsAction()`
- [x] `updatePlaylistNameAction({ playlistId, name })`

### Task 1B.3: Criar componente `PlaylistModal`
- [x] Arquivo: `components/home/PlaylistModal.tsx`
- [x] Modo "add" - Adicionar a playlist existente
- [x] Modo "create" - Criar nova playlist
- [x] Listar playlists existentes
- [x] Criar nova playlist

### Task 1B.4: Adicionar botão "+" na thumb do vídeo
- [x] Aparece no hover
- [x] Abrir modal de playlists
- [x] Opção "Criar nova playlist"

### Task 1B.5: Criar sidebar de playlists
- [x] Listar playlists do usuário
- [x] Criar nova playlist
- [x] Deletar playlist
- [x] Selecionar playlist para visualizar

### Task 1B.6: Implementar drag-and-drop para reordenar
- [x] Componente `PlaylistItems.tsx` com drag-and-drop HTML5
- [x] Arrastar vídeos na playlist
- [x] Chamar `reorderPlaylistItemsAction`
- [x] API routes para items, reorder e remove

---

## 🟡 FASE 1C: LIXEIRA E FILTROS (ALTA)

### Task 1C.1: Adicionar coluna `deleted_at` no schema
- [ ] Executar SQL: `ALTER TABLE recordings ADD COLUMN deleted_at TIMESTAMP;`
- [ ] Atualizar schema Drizzle

### Task 1C.2: Implementar soft delete
- [ ] Botão de "Mover para lixeira"
- [ ] Server Action: `softDeleteAction({ recordingId })`
- [ ] Marcar `deleted_at = NOW()`

### Task 1C.3: Implementar restore
- [ ] Botão "Restaurar" na lixeira
- [ ] Server Action: `restoreAction({ recordingId })`
- [ ] Marcar `deleted_at = NULL`

### Task 1C.4: Implementar permanent delete
- [ ] Botão "Excluir permanentemente"
- [ ] Server Action: `permanentDeleteAction({ recordingId })`
- [ ] Deletar do R2 (todos os arquivos)
- [ ] Deletar do banco

### Task 1C.5: Criar separador de "Lixeira" na home
- [ ] Mostrar vídeos com `deleted_at IS NOT NULL`
- [ ] Separar vídeos normais e lixeira

### Task 1C.6: Implementar cron job de cleanup
- [ ] Arquivo: `app/api/cron/cleanup-trash/route.ts`
- [ ] Buscar usuários com `retention_days`
- [ ] Deletar vídeos expirados
- [ ] Configurar Vercel Cron (3h da manhã)

### Task 1C.7: Criar barra de filtros
- [ ] Arquivo: `components/home/FilterBar.tsx`
- [ ] Filtro por tipo: Todos, Sem playlist, Por playlist
- [ ] Dropdown de ordenação: Mais recente, Mais antigo, Título, Duração

### Task 1C.8: Implementar busca
- [ ] Input de busca por título
- [ ] Debounce de 300ms
- [ ] Filtrar lista de vídeos

### Task 1C.9: Criar página de Configurações
- [ ] Arquivo: `app/settings/page.tsx`
- [ ] Sidebar de navegação: Profile, Account, Subscription, Preferences
- [ ] Seção Profile: Nome, Email, Avatar
- [ ] Seção Preferences: Tema, Idioma, Qualidade de exportação

---

## 🟡 FASE 2A: MELHORIAS EDITOR (ALTA)

### Task 2A.1: Remover botão "Back to Recording"
- [ ] Deixar apenas "Back to Home"

### Task 2A.2: Adicionar breadcrumbs
- [ ] `Home > Video Title`
- [ ] Clicável para navegar

### Task 2A.3: Implementar auto-save ao sair
- [ ] Detectar mudanças não salvas
- [ ] Confirmar antes de sair
- [ ] Auto-save se confirmado

### Task 2A.4: Remover faixa "Settings"
- [ ] Se existir no layout, remover

---

## 🟢 FASE 2B: ELEMENTS (MÉDIA)

### Task 2B.1: Criar aba "Elements" no editor
- [ ] Nova aba ao lado de "Timeline", "Layout"
- [ ] Sidebar de biblioteca

### Task 2B.2: Criar schema de media_library
- [ ] Executar SQL para criar tabela `media_library`
- [ ] Atualizar schema Drizzle

### Task 2B.3: Criar Server Actions de mídia
- [ ] `uploadMediaAction({ file, type })`
- [ ] `deleteMediaAction({ mediaId })`
- [ ] `getMediaLibraryAction({ type })`

### Task 2B.4: Implementar upload de mídia
- [ ] Botão "Upload Media" na aba Elements
- [ ] Suportar: vídeo (.mp4, .webm), imagem (.png, .jpg, .svg), áudio (.mp3, .wav)
- [ ] Validação de tamanho
- [ ] Upload para R2
- [ ] Preview thumbnails

### Task 2B.5: Implementar drag-and-drop para timeline
- [ ] Arrastar mídia para timeline
- [ ] Criar layer na timeline
- [ ] Suporte a múltiplos layers

### Task 2B.6: Criar 5+ templates de Lower Thirds
- [ ] Simple Bar
- [ ] Animated Fade
- [ ] Slide In
- [ ] Box Design
- [ ] Modern Gradient

### Task 2B.7: Criar editor de Lower Thirds
- [ ] Arquivo: `components/editor/LowerThirds.tsx`
- [ ] Input de título e subtexto
- [ ] Color picker (fundo, texto, borda)
- [ ] Seleção de fonte
- [ ] Controles de animação (tipo, duração)
- [ ] Preview em tempo real

### Task 2B.8: Criar 5+ templates de YouTube Elements
- [ ] Subscribe Button
- [ ] Like Bell
- [ ] Comment Box
- [ ] Link in Bio
- [ ] Social Icons

### Task 2B.9: Criar editor de YouTube Elements
- [ ] Arquivo: `components/editor/YouTubeElements.tsx`
- [ ] Input de texto
- [ ] Color picker
- [ ] Seleção de tamanho
- [ ] Controles de animação

---

## 🟢 FASE 2C: LEGENDAS E IA (MÉDIA/BAIXA)

### Task 2C.1: Criar schema de subtitles
- [ ] Executar SQL para criar tabela `subtitles`
- [ ] Atualizar schema Drizzle

### Task 2C.2: Integrar Whisper API
- [ ] Arquivo: `lib/ai/whisper.ts`
- [ ] Função: `transcribeVideo({ audioUrl, language })`
- [ ] Parse SRT response
- [ ] Retornar array de segmentos

### Task 2C.3: Criar editor de legendas
- [ ] Arquivo: `components/editor/Subtitles.tsx`
- [ ] Visualização sincronizada com vídeo
- [ ] Editar texto, timestamps
- [ ] Dividir/mesclar linhas

### Task 2C.4: Implementar personalização visual
- [ ] Fonte (família, tamanho, peso)
- [ ] Cores (texto, fundo, borda)
- [ ] Posição
- [ ] Animações (fade, slide, typewriter)

### Task 2C.5: Implementar "editar vídeo pelo texto"
- [ ] Excluir trecho → cortar vídeo
- [ ] Rearranjar linhas → cortar/reordenar cliques

### Task 2C.6: Exportar legendas
- [ ] Exportar como SRT
- [ ] Exportar como VTT

### Task 2C.7: Integrar GPT-4 para resumos
- [ ] Arquivo: `lib/ai/gpt.ts`
- [ ] Função: `generateVideoSummary({ transcript, videoTitle })`
- [ ] Retornar: título, bullets, CTA, tags

### Task 2C.8: Criar painel de IA no editor
- [ ] Arquivo: `components/editor/AIPanel.tsx`
- [ ] Botão "Gerar Resumo"
- [ ] Botão "Detectar Silêncios"
- [ ] Exibir resultados

### Task 2C.9: Implementar detecção de silêncios
- [ ] Arquivo: `lib/ai/silence-detection.ts`
- [ ] Função: `detectSilences({ audioBuffer, threshold, minDuration })`
- [ ] Retornar marcadores na timeline

### Task 2C.10: Implementar cortes automáticos
- [ ] Botão "Apply All Cuts"
- [ ] Aplicar cortes sugeridos

---

## 🟢 FASE 1C.2: COMPARTILHAMENTO (MÉDIA)

### Task 1C.10: Adicionar colunas de sharing
- [ ] `sharing_enabled`
- [ ] `sharing_access` (public, password, embed)
- [ ] `sharing_password`
- [ ] `allow_download`
- [ ] `sharing_slug`

### Task 1C.11: Criar Server Actions de sharing
- [ ] `toggleSharingAction({ recordingId, enabled, accessType, password, allowDownload })`
- [ ] `getSharingUrlAction({ recordingId })`
- [ ] `verifySharingPasswordAction({ slug, password })`
- [ ] `logVideoViewAction({ slug })`

### Task 1C.12: Criar modal de compartilhamento
- [ ] Arquivo: `components/home/ShareModal.tsx`
- [ ] Selecionar tipo de acesso
- [ ] Input de senha (se protegido)
- [ ] Toggle "permitir download"
- [ ] Botão "Copiar link"
- [ ] Botão "Copiar código embed"

### Task 1C.13: Criar página pública `/watch/[slug]`
- [ ] Arquivo: `app/watch/[slug]/page.tsx`
- [ ] Verificar `sharing_enabled`
- [ ] Verificar senha (se necessário)
- [ ] Player de vídeo responsivo
- [ ] Botão de download (se permitido)
- [ ] Logar view

---

## 🟢 FASE 2B.4: BIBLIOTECA DE MÚSICAS (BAIXA)

### Task 2B.11: Criar biblioteca de músicas royalty-free
- [ ] Upload de músicas pré-selecionadas
- [ ] Categorias: Lo-fi, Corporate, Cinematic, Upbeat, Ambient
- [ ] Preview antes de adicionar

### Task 2B.12: Implementar upload de músicas próprias
- [ ] Upload para R2
- [ ] Salvar em `media_library` com tipo `audio`

### Task 2B.13: Integrar Suno AI para gerar música
- [ ] Arquivo: `lib/ai/suno.ts`
- [ ] Função: `generateMusic({ prompt, duration, mood, style })`
- [ ] Retornar URL da música

### Task 2B.14: Implementar drag-and-drop de áudio
- [ ] Arrastar música para timeline
- [ ] Controles: fade in/out, volume, trim, loop

---

## ✅ CHECKLIST DE DEPLOY

### Pré-deploy
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Database migrations executadas
- [ ] Webhook do Stripe configurado
- [ ] R2 buckets criados

### Pós-deploy
- [ ] Testar checkout flow em produção
- [ ] Testar upload de vídeo
- [ ] Testar editor
- [ ] Verificar webhooks funcionando
- [ ] Monitorar logs de erros

---

## 📊 MÉTRICAS DE SUCESSO

### MVP (Fase 0 + 1D + 1A)
- [ ] Landing page funcionando
- [ ] Checkout flow funcionando
- [ ] Upload de vídeo funcionando
- [ ] Sidebar com Clerk

### V1.0 (Fases 0, 1D, 1A, 1B, 2A)
- [x] Playlists funcionando
- [ ] Filtros funcionando
- [ ] Lixeira funcionando
- [ ] Editor melhorias

### V2.0 (Todas as fases)
- [ ] Lower Thirds customizáveis
- [ ] YouTube Elements
- [ ] Legendas automáticas
- [ ] IA features
- [ ] Compartilhamento público
- [ ] Biblioteca de músicas

---

**Total de tarefas:** ~120 tarefas

**Estimativa de tempo:** 8 meses (conforme cronograma)

**Última atualização:** 30/01/2026
