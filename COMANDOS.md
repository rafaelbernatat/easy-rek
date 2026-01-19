# ⚡ Comandos Rápidos - Easy Rek

## 🚀 Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Build de produção
npm run build

# Executar build de produção
npm start

# Lint do código
npm run lint
```

---

## 🎨 Adicionar Componentes Shadcn/ui

```bash
# Componente Button
npx shadcn@latest add button

# Componente Card
npx shadcn@latest add card

# Componente Dialog
npx shadcn@latest add dialog

# Componente Input
npx shadcn@latest add input

# Componente Select
npx shadcn@latest add select

# Componente Dropdown Menu
npx shadcn@latest add dropdown-menu

# Componente Tabs
npx shadcn@latest add tabs

# Componente Toast
npx shadcn@latest add toast

# Lista completa: https://ui.shadcn.com/docs/components
```

---

## 🔍 Depuração

```bash
# Ver erros do TypeScript
npx tsc --noEmit

# Verificar formatação
npm run lint

# Limpar cache do Next.js
rm -rf .next

# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

---

## 📦 Gerenciamento de Pacotes

```bash
# Verificar versões desatualizadas
npm outdated

# Atualizar pacotes (cuidado)
npm update

# Adicionar pacote
npm install nome-do-pacote

# Adicionar pacote como dev dependency
npm install -D nome-do-pacote

# Remover pacote
npm uninstall nome-do-pacote
```

---

## 🌐 Deploy

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy para produção
vercel --prod
```

### Build Manual

```bash
# Gerar build estático
npm run build

# A pasta .next contém o build
# Use "npm start" para servir
```

---

## 🗄️ Banco de Dados (Fase 3)

```bash
# Instalar Drizzle ORM
npm install drizzle-orm @neondatabase/serverless

# Instalar Drizzle Kit (para migrações)
npm install -D drizzle-kit

# Gerar migration
npx drizzle-kit generate:pg

# Executar migration
npx drizzle-kit push:pg

# Abrir Drizzle Studio
npx drizzle-kit studio
```

---

## ☁️ Cloudflare R2 (Fase 4)

```bash
# Instalar AWS SDK (compatível com R2)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## 🔐 Autenticação Clerk (Fase 5)

```bash
# Instalar Clerk
npm install @clerk/nextjs

# Configurar variáveis de ambiente
# Adicione ao .env.local:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
# CLERK_SECRET_KEY=
```

---

## 🧪 Testes (Opcional)

```bash
# Instalar Jest + React Testing Library
npm install -D jest @testing-library/react @testing-library/jest-dom

# Instalar Playwright (E2E)
npm install -D @playwright/test
npx playwright install

# Executar testes
npm test

# Executar testes E2E
npx playwright test
```

---

## 📊 Análise de Bundle

```bash
# Instalar analyzer
npm install -D @next/bundle-analyzer

# Analisar bundle
ANALYZE=true npm run build
```

---

## 🔧 Utilitários

```bash
# Prettier (formatação)
npm install -D prettier
npx prettier --write .

# TypeScript Check
npx tsc --watch

# Ver porta em uso
lsof -i :3000

# Matar processo na porta 3000
kill -9 $(lsof -ti:3000)
```

---

## 📝 Git

```bash
# Status
git status

# Adicionar todos os arquivos
git add .

# Commit
git commit -m "feat: descrição da mudança"

# Push
git push origin main

# Criar branch
git checkout -b nome-da-branch

# Ver branches
git branch -a
```

---

## 🎯 Comandos Úteis Next.js

```bash
# Info do projeto
npx next info

# Limpar cache
npx next clean

# Telemetria (desabilitar)
npx next telemetry disable
```

---

## 📱 Mobile/PWA (Futuro)

```bash
# Instalar next-pwa
npm install next-pwa

# Testar em dispositivo móvel
# Use ngrok ou similar para expor localhost
npx ngrok http 3000
```

---

## 🎨 Tailwind

```bash
# Gerar arquivo de configuração completo
npx tailwindcss init --full

# Build CSS
npx tailwindcss -i ./app/globals.css -o ./output.css --watch
```

---

## 📚 Documentação Rápida

- Next.js: https://nextjs.org/docs
- Shadcn/ui: https://ui.shadcn.com
- Tailwind: https://tailwindcss.com/docs
- TypeScript: https://www.typescriptlang.org/docs
- React: https://react.dev

---

## ⚠️ Troubleshooting Comum

### Erro: "Module not found"

```bash
rm -rf node_modules package-lock.json .next
npm install
```

### Erro: "Port 3000 already in use"

```bash
kill -9 $(lsof -ti:3000)
npm run dev
```

### Erro de TypeScript

```bash
rm -rf .next
npx tsc --noEmit
npm run dev
```

### Erro de cache do Next.js

```bash
rm -rf .next
npm run dev
```

---

**Última atualização:** 16/01/2026
