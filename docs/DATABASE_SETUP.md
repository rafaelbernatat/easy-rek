# Database Setup Guide

## Pré-requisitos

1. Criar uma conta no [Neon](https://neon.tech)
2. Criar um novo projeto Neon
3. Copiar a connection string

## Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
DATABASE_URL=postgresql://user:password@hostname/database?sslmode=require
```

Substitua pela sua connection string do Neon.

### 3. Sincronizar o Schema

Execute o comando para aplicar o schema no banco de dados:

```bash
npm run db:push
```

Este comando irá:

- Ler o schema definido em `db/schema.ts`
- Criar as tabelas `users` e `recordings` no Neon
- Aplicar todas as constraints e relações

### 4. (Opcional) Abrir o Drizzle Studio

Para visualizar e gerenciar os dados:

```bash
npm run db:studio
```

Isso abrirá uma interface web em `https://local.drizzle.studio`

## Schema Overview

### Tabela: `users`

- `id` (uuid) - Primary key
- `email` (text) - Único, obrigatório
- `name` (text) - Opcional
- `planType` (text) - Default: "free" (free, pro, enterprise)
- `createdAt` (timestamp) - Auto-gerado

### Tabela: `recordings`

- `id` (uuid) - Primary key
- `userId` (uuid) - Foreign key → users.id (cascade delete)
- `title` (text) - Obrigatório
- `videoKey` (text) - Chave do arquivo no R2
- `duration` (integer) - Duração em segundos
- `size` (bigint) - Tamanho em bytes
- `createdAt` (timestamp) - Auto-gerado

## Comandos Úteis

- `npm run db:generate` - Gerar migrações SQL
- `npm run db:push` - Aplicar schema no banco (sem migrações)
- `npm run db:studio` - Abrir Drizzle Studio

## Próximos Passos

Após configurar o banco de dados:

1. **Fase 4**: Integrar com Cloudflare R2 para storage
2. **Fase 5**: Implementar autenticação e features SaaS
