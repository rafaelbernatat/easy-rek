# 🎯 Planejamento de Desenvolvimento - Easy Rek

*Versão 1.0 - 30/01/2026*

## 📋 Sumário

Este documento detalha todas as features e melhorias planejadas para o Easy Rek, organizadas por tela e divididas em fases de desenvolvimento com prioridade e dependências.

---

## 🏗️ Estrutura de Fases

| Fase | Foco | Complexidade | Estimativa | Prioridade |
|------|------|--------------|------------|-----------|
| Fase 0 | **Landing Page** | Média | 1 semana | 🔴 CRÍTICA |
| Fase 1 | **Core + Pagamentos** | Alta | 3-4 semanas | 🔴 CRÍTICA |
| Fase 2 | **Organização** | Média | 2 semanas | 🟡 ALTA |
| Fase 3 | **Editor Elements** | Alta | 3-4 semanas | 🟡 ALTA |
| Fase 4 | **Compartilhamento** | Alta | 2 semanas | 🟢 MÉDIA |
| Fase 5 | **AI Features** | Muito Alta | 4-5 semanas | 🟢 BAIXA |

---

## 🌐 TELA: LANDING PAGE

### FASE 0 - Landing Page

#### 0.1 Landing Page Pública
**Descrição:** Página de vendas para converter visitantes em usuários

**Funcionalidades:**
- [ ] Hero section com value proposition
  - Headline chamativo
  - Subheadline com benefícios
  - Botão CTA "Começar Grátis" (ou "Criar Conta")
  - Vídeo demo ou screenshot da interface
- [ ] Seção de Features
  - Gravação de tela + câmera
  - Editor rápido
  - Lower thirds personalizados
  - YouTube elements
  - Legendas automáticas
  - Compartilhamento
- [ ] Seção de Preços
  - Free: 0$/mês, 500MB, 7 dias lixeira
  - Pro: 19$/mês, 2GB, 30 dias lixeira, IA features
  - Enterprise: 49$/mês, 10GB, 90 dias lixeira, suporte premium
  - Toggle mensal/anual (20% off anual)
- [ ] Seção Social Proof
  - Logos de empresas que usam
  - Testimonials
  - Contador de usuários/vídeos criados
- [ ] FAQ com perguntas frequentes
- [ ] Footer com links, redes sociais, etc

**Dependências:**
- Design system (Shadcn/ui + Tailwind)
- Framer Motion para animações

**Complexidade:** Média
**Prioridade:** 🔴 CRÍTICA

**Arquivos:**
- `app/page.tsx` → mover para `app/(landing)/page.tsx` (ou criar landing separada)
- `app/(landing)/pricing/page.tsx` (página de preços detalhada)
- `app/(landing)/features/page.tsx` (página de features detalhada)

---

## 💳 SISTEMA DE PAGAMENTOS

### FASE 1D - Integração com Stripe

#### 1.10 Checkout Flow
**Descrição:** Sistema de assinaturas recorrentes com Stripe

**Funcionalidades:**
- [ ] Criar produtos e preços no Stripe Dashboard:
  - Free (price_id_free)
  - Pro Monthly (price_id_pro_monthly)
  - Pro Yearly (price_id_pro_yearly - 20% off)
  - Enterprise Monthly (price_id_ent_monthly)
  - Enterprise Yearly (price_id_ent_yearly - 20% off)
- [ ] Criar Checkout Session no backend:
  - Redirecionar para Stripe Checkout
  - Passar metadata (userId, email)
  - Suportar upgrade/downgrade de plano
- [ ] Webhook do Stripe:
  - `checkout.session.completed` → Atualizar plano do usuário
  - `customer.subscription.updated` → Atualizar plano no downgrade
  - `customer.subscription.deleted` → Voltar para Free
- [ ] Página de sucesso:
  - Redirecionar após pagamento
  - Mostrar mensagem de boas-vindas
  - Incentivar primeiro vídeo
- [ ] Página de falha/cancelamento:
  - Opção de tentar novamente
  - Suporte em caso de erro

**Dependências:**
- Stripe instalado
- Chaves do Stripe configuradas no `.env`
- Webhook configurado no Stripe Dashboard

**Complexidade:** Alta
**Prioridade:** 🔴 CRÍTICA

#### 1.11 Gerenciamento de Assinatura
**Descrição:** Dashboard para usuário gerenciar seu plano

**Funcionalidades:**
- [ ] Página `/settings/subscription`
  - Mostrar plano atual
  - Data de renovação
  - Próximo cobrança
  - Histórico de faturas
  - Botão "Upgrade" ou "Downgrade"
  - Botão "Cancelar Assinatura"
  - Link para portal do Stripe (gerenciar pagamentos, cartões, etc)
- [ ] Validar limites de plano:
  - Tamanho de upload (por plano)
  - Retenção de lixeira (por plano)
  - IA features (apenas Pro+)
- [ ] Exibir upgrade prompts quando atingir limite
  - Modal ao tentar upload acima do limite
  - Badge "Pro" nas features premium

**Dependências:**
- Checkout Flow implementado
- Schema de `users` com `plan_type`

**Complexidade:** Média
**Prioridade:** 🔴 ALTA

**Arquivos:**
- `app/settings/subscription/page.tsx`
- `app/api/stripe/webhook/route.ts`
- `app/api/stripe/create-checkout/route.ts`

---

## 📱 TELA: HOME

---

### FASE 1A - Melhorias Core de Home

#### 1.1 Upload de Vídeo
**Descrição:** Permitir upload de vídeos já gravados via botão "Upload"

**Funcionalidades:**
- [ ] Botão "Upload" visível na home (topo ou header)
- [ ] Modal para selecionar arquivo de vídeo
- [ ] Validação de formato (mp4, webm, mov)
- [ ] Validação de tamanho (limite por plano)
- [ ] Upload direto para R2
- [ ] Salvamento de metadados no banco
- [ ] Geração automática de thumbnail
- [ ] Adicionar à lista de gravações

**Dependências:**
- R2 (já configurado)
- Banco de dados (já configurado)
- Componente de upload de arquivo

**Complexidade:** Média
**Prioridade:** Alta

---

#### 1.2 Sidebar com Clerk (User Management)
**Descrição:** Integrar Clerk na sidebar para gerenciar autenticação

**Funcionalidades:**
- [ ] Adicionar componente `<UserButton>` do Clerk na sidebar
- [ ] Mostrar avatar/nome do usuário
- [ ] Menu dropdown com:
  - Ver perfil
  - Configurações
  - Logout
- [ ] Proteger rotas que requer autenticação
- [ ] Redirecionar para login se não autenticado

**Dependências:**
- Clerk já configurado no `.env`
- `@clerk/nextjs` já instalado

**Complexidade:** Baixa
**Prioridade:** Alta

**Arquivos a modificar:**
- `app/components/home/HomePage.tsx` - adicionar UserButton na sidebar

---

#### 1.3 Melhorar Edição de Título do Vídeo
**Descrição:** Tornar edição de título mais intuitiva

**Funcionalidades:**
- [ ] Adicionar ícone de lápis que aparece ao dar hover no título
- [ ] Ao clicar, transformar título em campo de input editável
- [ ] Auto-save ao perder foco (blur) ou pressionar Enter
- [ ] Validação: título não pode ser vazio
- [ ] Feedback visual (ícone de salvamento)
- [ ] Atualizar no banco via `updateRecordingAction`

**Complexidade:** Baixa
**Prioridade:** Média

---

#### 1.4 Contador de "Última Modificação"
**Descrição:** Mostrar quanto tempo o vídeo foi editado pela última vez

**Funcionalidades:**
- [ ] Adicionar timestamp de última atualização no banco (coluna `updated_at`)
- [ ] Formatar relativo ao tempo atual ("há 5 minutos", "há 2 horas", etc)
- [ ] Mostrar abaixo do título do vídeo
- [ ] Atualizar a cada edição no editor

**Dependências:**
- Adicionar coluna `updated_at` na tabela `recordings`

**Complexidade:** Baixa
**Prioridade:** Baixa

---

### FASE 1B - Sistema de Organização

#### 1.5 Sistema de Playlists
**Descrição:** Organizar vídeos em playlists customizáveis

**Funcionalidades:**
- [ ] Criar schema de `playlists` no banco:
  ```sql
  CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE playlist_videos (
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
    recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (playlist_id, recording_id)
  );
  ```
- [ ] Botão "+" na thumb do vídeo (hover)
- [ ] Dropdown com playlists existentes + opção "Criar nova playlist"
- [ ] Modal para criar nova playlist:
  - Nome
  - Descrição (opcional)
  - Cor (color picker)
- [ ] Arrastar e soltar para reordenar vídeos na playlist
- [ ] Sidebar de playlists (filtrar por playlist)
- [ ] Badge indicando quantos vídeos na playlist

**Dependências:**
- Banco de dados atualizado
- Componente de drag-and-drop

**Complexidade:** Alta
**Prioridade:** Alta

---

#### 1.6 Sistema de Lixeira (Soft Delete)
**Descrição:** Vídeos excluídos ficam retidos por X dias antes de exclusão permanente

**Funcendências:**
- Adicionar coluna `deleted_at` na tabela `recordings` (nullable)
- Adicionar coluna `retention_days` na tabela `users` (default 7, 30, 90 conforme plano)

**Funcionalidades:**
- [ ] "Soft delete" em vez de delete permanente (marcar `deleted_at`)
- [ ] Mover vídeos para "Lixeira" (separador na home)
- [ ] Opção de restaurar da lixeira
- [ ] Exclusão permanente manual (botão "Excluir permanentemente")
- [ ] Cron job para limpar vídeos expirados (todos os dias às 3h da manhã)
- [ ] Retenção configurável pelo plano:
  - Free: 7 dias
  - Pro: 30 dias
  - Enterprise: 90 dias
- [ ] Notificação antes de excluir permanentemente

**Dependências:**
- Cron job (usar Vercel Cron ou similar)
- Sistema de planos implementado

**Complexidade:** Média
**Prioridade:** Média

---

### FASE 1C - Compartilhamento e Filtros

#### 1.7 Sistema de Compartilhamento (Página Pública)
**Descrição:** Compartilhar vídeos via link público com opções de acesso

**Dependências:**
- Adicionar coluna `sharing_enabled` (boolean)
- Adicionar coluna `sharing_access` (enum: 'public', 'password', 'embed')
- Adicionar coluna `sharing_password` (nullable, hash)
- Adicionar coluna `allow_download` (boolean)
- Adicionar coluna `sharing_slug` (string único para URL amigável)
- Criar tabela `video_views` (analytics)

**Funcionalidades:**
- [ ] Ícone/botão de compartilhar na thumb
- [ ] Modal de configurações de compartilhamento:
  - Tipos de acesso:
    - Qualquer pessoa com o link
    - Protegido por senha
    - Apenas embed
  - Permitir/não download
  - Copiar link de compartilhamento
  - Copiar código de embed
- [ ] Página pública `/watch/[slug]`
- [ ] Proteção por senha (input + verificação via cookie/session)
- [ ] Player de vídeo responsivo
- [ ] Analytics básico (views, data de acesso)
- [ ] Opção de desativar compartilhamento

**Dependências:**
- Página pública `/watch/[slug]`
- Sistema de autenticação básico para senha

**Complexidade:** Alta
**Prioridade:** Alta

---

#### 1.8 Filtros e Ordenação
**Descrição:** Melhorar UX com filtros avançados

**Funcionalidades:**
- [ ] Barra de filtros no topo da lista de vídeos
- [ ] Filtro por tipo:
  - Todos
  - Sem playlist
  - Por playlist específico
- [ ] Ordenação:
  - Mais recente primeiro
  - Mais antigo primeiro
  - Título (A-Z)
  - Título (Z-A)
  - Duração (maior primeiro)
  - Duração (menor primeiro)
  - Última modificação
- [ ] Busca por texto (título)
- [ ] Persisitência dos filtros (localStorage ou URL params)
- [ ] Contador de resultados (ex: "12 vídeos encontrados")

**Complexidade:** Média
**Prioridade:** Média

---

#### 1.9 Página de Configurações
**Descrição:** Criar página para configurações do app/usuário

**Estrutura:** `/settings`

**Funcionalidades (inicial):**
- [ ] Sidebar de navegação:
  - Perfil
  - Account
  - Subscription/Plan
  - Notifications
  - Preferences
- [ ] Seção "Perfil":
  - Nome
  - Email (read-only se via Clerk)
  - Avatar (upload)
- [ ] Seção "Preferences":
  - Tema (light/dark)
  - Idioma
  - Qualidade de exportação padrão
- [ ] Placeholder para features futuras

**Dependências:**
- Navegação via Next.js App Router

**Complexidade:** Média
**Prioridade:** Baixa

---

---

## 🎬 TELA DE EDIÇÃO

---

### FASE 2A - Melhorias UI/UX

#### 2.1 Melhorar Navegação (Botões de Voltar)
**Descrição:** Simplificar botões de navegação

**Mudanças:**
- [ ] Remover botão "Back to Recording"
- [ ] Manter apenas "Back to Home" (ou "← Back")
- [ ] Adicionar breadcrumbs: `Home > Video Title`
- [ ] Salvar automaticamente ao sair (se houver alterações não salvas)
- [ ] Confirmação se houver alterações não salvas

**Complexidade:** Baixa
**Prioridade:** Média

---

#### 2.2 Remover Faixa "Settings"
**Descrição:** Remover elemento visual redundante

**Mudanças:**
- [ ] Remover seção de texto "Settings" (se existir no layout)
- [ ] Garantir que as abas de navegação do editor estejam claras

**Complexidade:** Baixa
**Prioridade:** Baixa

---

### FASE 2B - Sistema de Elements

#### 2.3 Aba "Elements" (Recursos Visuais)
**Descrição:** Sistema completo de elementos adicionais para vídeos

**Estrutura:** Nova aba no editor, ao lado de "Timeline", "Layout", etc

**Funcionalidades Gerais:**
- [ ] Sidebar de biblioteca de elementos
- [ ] Categorias:
  - Uploads (vídeos, imagens, áudio)
  - Lower Thirds
  - YouTube Elements
  - Textos
  - Formas
- [ ] Drag-and-drop para timeline
- [ ] Preview no canvas do editor
- [ ] Controles de transformação (posicionar, redimensionar, rotacionar)
- [ ] Timeline layer com trim (in/out points)
- [ ] Volume/opacity controls
- [ ] Propriedades editáveis (sidebar de inspetor)

---

#### 2.3.1 Upload de Vídeos/Imagens/Áudio
**Descrição:** Carregar mídia externa para usar na timeline

**Funcionalidades:**
- [ ] Botão "Upload Media" na aba Elements
- [ ] Upload de: vídeos (.mp4, .webm), imagens (.png, .jpg, .svg), áudio (.mp3, .wav)
- [ ] Validação de tamanho (limite por plano)
- [ ] Upload para R2 (pasta específica: `media/{userId}/{timestamp}-{filename}`)
- [ ] Salvamento de metadados no banco (tabela `media_library`)
- [ ] Organização em pastas (opcional)
- [ ] Preview thumbnails
- [ ] Drag-and-drop para timeline
- [ ] Suporte a layers múltiplos

**Dependências:**
- Schema de `media_library`:
  ```sql
  CREATE TABLE media_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'video', 'image', 'audio'
    filename TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    duration INTEGER, -- para vídeos/áudio
    size INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

**Complexidade:** Alta
**Prioridade:** Alta

---

#### 2.3.2 Sistema de Lower Thirds
**Descrição:** Templates animados de lower thirds totalmente personalizáveis

**Funcionalidades:**
- [ ] 5+ templates de lower thirds:
  1. Simple Bar (barra colorida com texto)
  2. Animated Fade (fade in/out com movimento)
  3. Slide In (slide lateral)
  4. Box Design (caixa com borda e sombra)
  5. Modern Gradient (gradiente com efeito glassmorphism)
- [ ] Edição de propriedades:
  - Título e subtexto
  - Cores (fundo, texto, borda)
  - Fonte (família, tamanho, peso)
  - Posição (top-left, top-center, top-right, etc)
  - Duração da animação (in/out)
  - Opacidade
  - Sombra/Blur
- [ ] Preview em tempo real
- [ ] Salvamento como "Custom Lower Third" na biblioteca
- [ ] Reuso em outros vídeos
- [ ] Animação suave (Framer Motion)

**Dependências:**
- Sistema de renderização de overlays
- Framer Motion (já instalado)

**Complexidade:** Alta
**Prioridade:** Alta

---

#### 2.3.3 YouTube Elements (CTA)
**Descrição:** Templates de call-to-action estilo YouTube

**Funcionalidades:**
- [ ] 5+ templates de elementos YouTube:
  1. Subscribe Button (botão "Inscreva-se" com ícone)
  2. Like Bell (ícone de like + sino)
  3. Comment Box (caixa "Deixe seu comentário")
  4. Link in Bio (botão "Link na descrição")
  5. Social Icons (ícones de redes sociais)
- [ ] Edição de propriedades:
  - Texto
  - Cores (botão, texto, ícone)
  - Tamanho
  - Posição fixa ou animada (entrar por tal lado)
  - Duração na tela
  - Link (opcional para embed)
- [ ] Animações de entrada/saída
- [ ] Salvamento como template customizado

**Complexidade:** Média
**Prioridade:** Média

---

#### 2.4 Biblioteca de Músicas
**Descrição:** Sistema de trilha sonora com opções diversas

**Funcionalidades:**
- [ ] Biblioteca de músicas sem direitos autorais (royalty-free)
  - Categorias: Lo-fi, Corporate, Cinematic, Upbeat, Ambient, etc
  - Preview antes de adicionar
- [ ] Upload de músicas próprias
- [ ] Geração de música com IA (integrar com API tipo Suno AI ou similar)
  - Prompt de texto para gerar música
  - Parâmetros: duração, mood, estilo
  - Download e adição à biblioteca
- [ ] Drag-and-drop para timeline (audio track)
- [ ] Controles: fade in/out, volume, crossfade
- [ ] Trim de áudio
- [ ] Loop de segmentos

**Dependências:**
- API de geração de música com IA (Suno AI, MusicLM, etc)
- Schema de `music_library` ou usar `media_library` com tipo `audio`

**Complexidade:** Alta
**Prioridade:** Média

---

### FASE 2C - Legendas e IA

#### 2.5 Sistema de Legendas
**Descrição:** Transcrição e edição de legendas avançadas

**Funcionalidades:**
- [ ] Transcrição automática do áudio (integrar com Whisper da OpenAI ou similar)
  - Detecção automática de língua
  - Suporte a português e múltiplas línguas
- [ ] Editor de legendas:
  - Visualização em tempo sincronizado com vídeo
  - Edição de texto (corrigir transcrição)
  - Ajuste de timestamps (start/end)
  - Divisão/mesclagem de linhas
- [ ] Personalização visual:
  - Fonte (família, tamanho, peso)
  - Cores (texto, fundo, borda)
  - Posição (topo, centro, base)
  - Opacidade de fundo
  - Sombra/Blur
  - Animações de entrada/saída (fade, slide, typewriter)
- [ ] **Editar vídeo pelo texto:**
  - Excluir trecho de texto → cortar automaticamente o vídeo
  - Rearranjar linhas → cortar/reordenar cliques
  - Adicionar pausas via texto
- [ ] Exportar como arquivo SRT/VTT
- [ ] Múltiplas línguas (adicionar legendas em outras línguas)

**Dependências:**
- API de transcrição (OpenAI Whisper API ou local via transformers.js)
- Sistema de sincronização com timeline

**Complexidade:** Muito Alta
**Prioridade:** Alta

---

#### 2.6 IA para Resumir Vídeo
**Descrição:** Criar resumo automático do conteúdo do vídeo

**Funcionalidades:**
- [ ] Análise do áudio e transcrição
- [ ] Envio para LLM (GPT-4, Claude, etc) com prompt:
  ```
  "Resuma este vídeo em 3-5 bullets dos principais pontos abordados.
   Formato: Título + bullets + call-to-action sugerido."
  ```
- [ ] Exibir resumo no modal de propriedades do vídeo
- [ ] Permitir editar manualmente
- [ ] Usar resumo como:
  - Descrição ao compartilhar
  - Timestamps no vídeo (chapters)
  - Notas para o usuário

**Dependências:**
- Transcrição (feature 2.5)
- API de LLM (OpenAI, Anthropic, etc)

**Complexidade:** Alta
**Prioridade:** Média

---

#### 2.7 IA para Cortes Automáticos (Remove Silences)
**Descrição:** Detectar e remover respirações, pausas e momentos de silêncio

**Funcionalidades:**
- [ ] Análise do áudio para detectar:
  - Silêncios (threshold de volume)
  - Respirações (padrões de áudio)
  - Pausas longas
  - "Ums" e "Ahs" (opcional)
- [ ] Marcadores automáticos na timeline (sugestões de corte)
- [ ] Configurações:
  - Threshold de volume (dB)
  - Duração mínima de silêncio (ex: 0.5s)
  - Duração mínima para cortar (ex: 1.5s)
- [ ] Botão "Apply All Cuts" → executa todos os cortes sugeridos
- [ ] Preview do resultado antes de aplicar
- [ ] Opção de "Jump cut" (cortes rápidos para conteúdo mais dinâmico)

**Dependências:**
- Web Audio API para análise de volume
- Detecção de padrões de respiração (IA opcional)

**Complexidade:** Alta
**Prioridade:** Alta

---

---

## 📅 Cronograma de Desenvolvimento (ORDENADO POR PRIORIDADE)

### 🚀 Mês 1: Fase 0 + Fase 1A + 1D (CRÍTICO - Fundação do SaaS)
- **Semana 1: Landing Page** - Página de vendas para converter visitantes
- **Semana 2-3: Stripe Integration** - Checkout flow + Webhooks
- **Semana 3-4: Sidebar Clerk + Upload de Vídeo** - Autenticação + funcionalidade core

### 🎯 Mês 2: Fase 1A + 1B (Core UX)
- **Semana 1-2: Editar Título + Contador de Atualização** - Melhorias na home
- **Semana 3-4: Sistema de Playlists** - Organização de vídeos

### 📊 Mês 3: Fase 1C + 1D (Gestão)
- **Semana 1-2: Filtros e Ordenação** - Melhorar experiência de busca
- **Semana 3: Lixeira** - Soft delete + retenção por plano
- **Semana 4: Gerenciamento de Assinatura** - `/settings/subscription`

### 🎬 Mês 4-5: Fase 2A + 2B (Editor)
- **Semana 1-2: Melhorias Editor** - Navegação + Remover "Settings"
- **Semana 3-4: Upload de Mídia (vídeos/imagens/áudio)** - Biblioteca de assets
- **Semana 5-6: Lower Thirds + YouTube Elements** - Templates customizáveis

### 🎵 Mês 6: Fase 2B + 2C (Features Premium)
- **Semana 1-2: Biblioteca de Músicas** - Trilha sonora
- **Semana 3-4: Sistema de Legendas** - Transcrição + edição
- **Semana 5: IA para Resumo** - GPT-4
- **Semana 6: IA para Cortes Automáticos** - Detectar silêncios

### 🔗 Mês 7: Fase 1C + 5 (Compartilhamento + Polish)
- **Semana 1-2: Sistema de Compartilhamento** - Página pública `/watch/[slug]`
- **Semana 3: Página de Configurações** - `/settings` completo
- **Semana 4: Testes E2E + Bug fixes**

### 🚀 Mês 8: Fase 5 (Launch)
- **Semana 1: Performance otimization + SEO**
- **Semana 2: Documentation + Deploy**

---

## 🔧 Dependências Técnicas

### Novos Pacotes NPM a instalar:
```bash
# Stripe (Pagamentos)
npm install stripe
npm install @stripe/stripe-js

# Drag-and-drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Transcrição
npm install openai # ou @xenova/transformers para local

# LLM para resumo
# Usar OpenAI API já instalada (se tiver) ou Anthropic SDK

# Editor de rich text (para legendas)
npm install @tiptap/react @tiptap/starter-kit

# Color picker
npm install react-colorful
```

### Schema do Banco de Dados (Adicional):

```sql
-- Subscriptions (Stripe)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT NOT NULL, -- 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'BRL',
  status TEXT NOT NULL, -- 'draft', 'open', 'paid', 'void', 'uncollectible'
  invoice_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_user ON invoices(user_id);

-- Playlists
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE playlist_videos (
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (playlist_id, recording_id)
);

-- Media Library
CREATE TABLE media_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'video', 'image', 'audio', 'lower_third', 'youtube_element'
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  duration INTEGER, -- para vídeos/áudio
  size INTEGER NOT NULL,
  config JSONB, -- para custom elements (lower thirds, youtube elements)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sharing
ALTER TABLE recordings ADD COLUMN sharing_enabled BOOLEAN DEFAULT false;
ALTER TABLE recordings ADD COLUMN sharing_access TEXT DEFAULT 'public'; -- 'public', 'password', 'embed'
ALTER TABLE recordings ADD COLUMN sharing_password TEXT; -- hash
ALTER TABLE recordings ADD COLUMN allow_download BOOLEAN DEFAULT true;
ALTER TABLE recordings ADD COLUMN sharing_slug TEXT UNIQUE;
ALTER TABLE recordings ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- Views/Analytics
CREATE TABLE video_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
  viewer_ip TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMP DEFAULT NOW()
);

-- Subtitles
CREATE TABLE subtitles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'pt-BR',
  content JSONB NOT NULL, -- array de {start, end, text}
  style JSONB, -- {font, size, color, position, etc}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User retention
ALTER TABLE users ADD COLUMN retention_days INTEGER DEFAULT 7;

-- Soft delete
ALTER TABLE recordings ADD COLUMN deleted_at TIMESTAMP;
```

---

## 📊 Estimativa de Custos (Opcional)

### APIs e Serviços:
- **OpenAI API** (Whisper + GPT-4):
  - Transcrição: $0.006/min
  - GPT-4 (resumo): $0.03/1K tokens
- **Suno AI** (geração de música):
  - Preços variados (check planos)
- **Total estimado:** $50-100/mês para 100 usuários ativos

---

## ✅ Critérios de Sucesso

### MVP (Minimum Viable Product) - Fase 1A + 2A
- [ ] Upload de vídeo funcional
- [ ] Sidebar com Clerk
- [ ] Edição de título intuitiva
- [ ] Navegação simplificada no editor

### V1.0 - Fases 1A, 1B, 2A, 2B.1
- [ ] Playlists funcionando
- [ ] Upload de mídia externa
- [ ] Lower Thirds customizáveis
- [ ] YouTube Elements

### V2.0 - Todas as fases
- [ ] Sistema completo de legendas
- [ ] IA para resumo e cortes automáticos
- [ ] Biblioteca de músicas
- [ ] Compartilhamento público
- [ ] Lixeira com retenção por plano

---

## 🎓 Notas e Considerações

### Prioridade de Desenvolvimento
1. **Primeiro:** Features core que melhoram UX imediatamente (Upload, Sidebar, Editar Título)
2. **Depois:** Sistema de organização (Playlists, Lixeira)
3. **Em seguida:** Compartilhamento (valor alto para usuários)
4. **Por último:** Features complexas de IA (requerem APIs e custos)

### Design System
- Manter consistência com Shadcn/ui
- Usar Tailwind para estilização
- Framer Motion para animações
- Ícones do Lucide React

### Performance
- Lazy loading de componentes pesados
- Virtual scrolling para listas grandes
- Debounce para auto-save
- Otimização de imagens (WebP)

### Acessibilidade
- Suporte a teclado (shortcuts)
- Labels ARIA
- Alto contraste em modo dark
- Legendas acessíveis

---

## 🚀 Próximos Passos

1. **Validação:** Revisar este planejamento com stakeholders
2. **Refinamento:** Ajustar prioridades e escopo conforme necessário
3. **Setup:** Instalar dependências e atualizar schema do banco
4. **Execução:** Começar pela Fase 1A (Upload de Vídeo)

---

**Documento atualizado em:** 30/01/2026
**Versão:** 1.0
**Autor:** Rafael Bernatat + Clawdbot AI Assistant
