# 🚀 Plano de Migração: Screen Recorder ➔ Next.js SaaS

Este documento serve como o "Single Source of Truth" para o processo de migração e evolução do projeto Screen-Recorder para uma plataforma SaaS.

## 📌 Stack Tecnológica Definida

- **Framework:** Next.js 14+ (App Router)
- **Database:** Neon (Postgres Serverless)
- **ORM:** Drizzle ORM
- **Storage:** Cloudflare R2 (S3 Compatible)
- **Auth:** Clerk (Recomendado para MVP)
- **UI:** Tailwind CSS + Shadcn/ui

---

## 🛠 Fase 1: Setup do Ambiente e Infraestrutura

- [ ] Inicializar projeto Next.js: `npx create-next-app@latest .` (Use TS, Tailwind, App Router).
- [ ] Instalar dependências de infra:
  - `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
  - `npm install drizzle-orm @neondatabase/serverless`
  - `npm install lucide-react clsx tailwind-merge`
- [ ] Configurar `.env.local` com as credenciais do Neon e Cloudflare R2.
- [ ] Configurar o Shadcn/ui: `npx shadcn-ui@latest init`.

---

## 🏗 Fase 2: Migração do Core (Vite ➔ Next.js)

- [x] **Componente de Gravação:** Migrar `src/App.tsx` (ou lógica principal) para `components/recorder/ScreenRecorder.tsx`.
  - Adicionar `'use client';` no topo.
  - Isolar o acesso ao `MediaRecorder` dentro de `useEffect` para evitar erros de SSR.
- [x] **State Management:** Adaptar hooks de gravação para gerenciar o estado do `Blob` de vídeo.
- [x] **Layout:** Configurar `app/layout.tsx` para suporte a fontes e temas.

---

## 🗄 Fase 3: Camada de Dados (Neon + Drizzle)

- [ ] Criar arquivo `db/schema.ts` com as tabelas:
  - `users`: ID, name, email, plan_type.
  - `recordings`: ID, userId, title, r2_key, duration, size, createdAt.
- [ ] Executar migração inicial do Drizzle para o Neon.
- [ ] Criar Server Actions para salvar o registro do vídeo após o upload bem-sucedido.

---

## ☁️ Fase 4: Integração Cloudflare R2 (Storage)

- [ ] Criar API Route `app/api/upload/route.ts` para gerar **Presigned URLs**.
- [ ] Implementar a lógica de upload no frontend:
  1. Gravação finalizada -> Gerar Blob.
  2. Chamar `/api/upload` para pegar a URL segura do R2.
  3. `PUT` direto do Blob para o R2.
  4. Salvar metadados no Neon via Server Action.

---

## 💎 Fase 5: Dashboard e SaaS Features

- [ ] **Página de Listagem:** `app/dashboard/page.tsx` para visualizar gravações anteriores.
- [ ] **Página de Visualização:** `app/v/[id]/page.tsx` (Página pública para compartilhamento).
- [ ] **Player de Vídeo:** Componente customizado para reproduzir arquivos do R2.
- [ ] **Auth:** Integrar Clerk para proteção de rotas e gestão de usuários.
