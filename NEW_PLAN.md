# NEW_PLAN.md — Easy-Rek MVP: Gravações Longas + Downloads Rápidos

## Contexto

O app atualmente usa uma arquitetura que **quebra para gravações longas** por três razões:

1. **Limite do IndexedDB (~50MB):** Chunks são bufferizados localmente no browser. A 1080p, isso equivale a ~10 minutos antes de crash por quota excedida.
2. **FFmpeg.wasm inviável para arquivos grandes:** O encoder client-side tem timeout em arquivos >500MB. Um vídeo de 3h pode ser 5-15GB — impossível converter no browser.
3. **Upload single-shot sem retry:** Um presigned URL único para o arquivo inteiro não suporta arquivos >5GB e não é retomável se a conexão cair.

**Solução:** Substituir o modelo "buffer tudo, depois faz upload" por um pipeline de **streaming durante a gravação**, com **transcodificação server-side** assíncrona e **downloads diretos do R2** sem conversão no browser.

---

## Arquitetura Alvo

```
GRAVANDO                     PÓS-GRAVAÇÃO                  DOWNLOAD
─────────────                ────────────                  ────────
MediaRecorder chunks    →    WebM no R2 (raw)         →    MP4 pré-transcodificado no R2
(5s slices)                  (multipart upload)             (720p / 1080p / 4K)
       ↓                            ↓                              ↓
  S3 Multipart Parts         DB: status=pending           Presigned GET URL direto
  (partes de 6MB)            job de transcode             (sem WASM, sem CPU do usuário)
       ↓
  IndexedDB = só fallback
  (máx 2 partes em RAM)
```

---

## Fase 1 — Schema do Banco (Sem Risco)

### Arquivo: `db/schema.ts`

Adicionar colunas nullable à tabela `recordings`:

```typescript
transcodeStatus: text('transcode_status'),  // 'pending' | 'processing' | 'done' | 'failed' | null
transcodeError: text('transcode_error'),
mp4Key720p: text('mp4_key_720p'),
mp4Key1080p: text('mp4_key_1080p'),
mp4Key4k: text('mp4_key_4k'),
rawKey: text('raw_key'),                    // chave R2 do WebM source original
uploadStatus: text('upload_status'),        // 'uploading' | 'complete' | 'aborted'
uploadId: text('upload_id'),               // ID do multipart upload ativo no R2
```

### Arquivo novo: `db/migrations/0002_add_transcode_fields.sql`

```sql
ALTER TABLE recordings
  ADD COLUMN IF NOT EXISTS transcode_status TEXT,
  ADD COLUMN IF NOT EXISTS transcode_error TEXT,
  ADD COLUMN IF NOT EXISTS mp4_key_720p TEXT,
  ADD COLUMN IF NOT EXISTS mp4_key_1080p TEXT,
  ADD COLUMN IF NOT EXISTS mp4_key_4k TEXT,
  ADD COLUMN IF NOT EXISTS raw_key TEXT,
  ADD COLUMN IF NOT EXISTS upload_status TEXT,
  ADD COLUMN IF NOT EXISTS upload_id TEXT;

CREATE INDEX IF NOT EXISTS idx_recordings_transcode_status
  ON recordings(transcode_status)
  WHERE transcode_status IN ('pending', 'processing');
```

### Atualizar `app/actions/recordings.ts`

- `getRecordingsAction` e `getFilteredVideosAction`: incluir os novos campos no SELECT e no tipo de retorno
- Adicionar `createRecordingStubAction(userId, streamType, key)` → cria row com `upload_status='uploading'`
- Adicionar `updateTranscodeStatusAction(recordingId, status, keys?, error?)`

---

## Fase 2 — API Routes de Multipart Upload (Novos Arquivos)

Padrão: seguir exatamente a estrutura de `app/api/upload/presigned/route.ts` para auth e client R2.

### `app/api/upload/multipart/init/route.ts`
**POST** — gera multipart upload no R2, cria stub no DB

```typescript
// Body: { fileName, contentType, fileType: 'video'|'camera'|'screen', recordingId? }
// Response: { uploadId, key, recordingId }
// Chama: CreateMultipartUploadCommand
// Cria: DB stub com upload_status='uploading', raw_key=key
```

### `app/api/upload/multipart/part/route.ts`
**POST** — gera presigned URL para uma parte específica

```typescript
// Body: { uploadId, key, partNumber }
// Response: { presignedUrl }  (expira em 1h)
// Chama: getSignedUrl(UploadPartCommand)
// O cliente faz PUT direto para a URL (sem passar pelo servidor)
```

### `app/api/upload/multipart/complete/route.ts`
**POST** — finaliza o upload, dispara transcodificação

```typescript
// Body: { uploadId, key, recordingId, parts: [{PartNumber, ETag}], duration, totalSize, streamType }
// Response: { success, location }
// Chama: CompleteMultipartUploadCommand
// Atualiza DB: upload_status='complete', video_key=key, transcode_status='pending'
// Fire-and-forget: fetch('/api/transcode/trigger', { method: 'POST', ... })
```

### `app/api/upload/multipart/abort/route.ts`
**POST** — cancela upload, limpa partes no R2

```typescript
// Body: { uploadId, key, recordingId? }
// Chama: AbortMultipartUploadCommand
// Atualiza DB: upload_status='aborted'
```

---

## Fase 3 — `lib/streamingUpload.ts` (Novo)

Gerencia o ciclo de vida de um multipart upload para um stream.

```typescript
const PART_SIZE_BYTES = 6 * 1024 * 1024; // 6MB (acima do mínimo de 5MB do S3)

export class StreamingUploader {
  // Estado persistido no localStorage para crash recovery
  private pendingBuffer: Uint8Array[] = [];
  private parts: PartETag[] = [];

  async initialize(streamType, mimeType): Promise<{uploadId, key, recordingId}>
  async appendChunk(data: Uint8Array): Promise<void>  // acumula, faz upload quando >= 6MB
  async flush(): Promise<void>                         // força upload da parte final (< 6MB)
  async complete(duration, totalSize): Promise<void>
  async abort(): Promise<void>
}
```

**Retry logic:** 3 tentativas com backoff exponencial (1s, 2s, 4s) por parte.

**Persistência:** Estado salvo em `localStorage` keyed por `recordingId`. Se browser recarregar, retoma do último part concluído.

**Concorrência:** Máximo 2 parts em upload simultâneo entre todos os streams.

---

## Fase 4 — Atualizar `hooks/useMultiRecorder.next.ts`

**Sem quebrar a API pública atual.** Mudanças internas apenas.

### O que muda no `startRecording()`:
1. Chama `StreamingUploader.initialize()` para cada stream ativo
2. Na `ondataavailable`: além de salvar no IndexedDB (fallback), chama `uploader.appendChunk()`
3. Quando `pendingBuffer >= 6MB`, parte é enviada automaticamente ao R2

### O que muda no `stopRecording()`:
1. Chama `uploader.flush()` para enviar bytes restantes
2. Chama `uploader.complete(duration, totalSize)` → dispara transcodificação
3. Continua montando os Blobs do IndexedDB (para editor e download legado)

### Novo campo no retorno:
```typescript
uploadState: {
  recordingId: string | null;
  isStreaming: boolean;
  completionStatus: 'idle' | 'completing' | 'done' | 'failed';
}
```

### Fallback automático:
Se `StreamingUploader` falhar durante a gravação (sem rede), loga o erro, continua gravando via IndexedDB. No `stopRecording`, detecta falha e cai no `useR2Upload` legado com o Blob completo.

---

## Fase 5 — Pipeline de Transcodificação Server-Side

### Dependências a adicionar em `package.json`:
```json
"fluent-ffmpeg": "^2.1.3"
```
```json
"@ffmpeg-installer/ffmpeg": "^1.1.0"  (devDependencies)
"@types/fluent-ffmpeg": "^2.1.27"     (devDependencies)
```

> **Nota sobre Vercel:** O binary FFmpeg (~20MB comprimido) cabe no bundle limit de 50MB. Verificar com `vercel build` após adicionar.

### `app/api/transcode/trigger/route.ts`
**POST** — protegido por `INTERNAL_API_SECRET` header

```typescript
// Body: { recordingId, rawKey, targetResolutions: ['720p', '1080p', '4k'] }
// Atualiza DB: transcode_status='processing'
// Dispara: POST /api/transcode/worker (Background Function)
```

### `app/api/transcode/worker/route.ts`
**POST** — Vercel Background Function com `export const maxDuration = 300`

```typescript
// Para cada resolução:
// 1. Download do WebM do R2 como stream
// 2. Pipe pelo fluent-ffmpeg com settings por resolução:
//    720p:  -vf scale=1280:720  -c:v libx264 -preset fast   -crf 23 -c:a aac -b:a 128k
//    1080p: -vf scale=1920:1080 -c:v libx264 -preset medium -crf 22 -c:a aac -b:a 192k
//    4K:    -vf scale=3840:2160 -c:v libx264 -preset slow   -crf 20 -c:a aac -b:a 256k
//    Sempre: -movflags +faststart
// 3. Upload do MP4 resultante para R2 via multipart (outputs grandes)
// 4. Atualiza DB: mp4_key_720p/1080p/4k, transcode_status='done'
```

**Limitação de tempo:** Para vídeos >30min, 300s pode não ser suficiente. Solução intermediária para MVP: transcodificar apenas 720p e 1080p (mais rápido). 4K fica marcado como "disponível em breve" se a fonte suportar. Para produção final, usar serviço externo (AWS MediaConvert ou Fly.io worker dedicado via `TRANSCODE_BACKEND_URL`).

### `app/api/transcode/status/[recordingId]/route.ts`
**GET** — polling pelo cliente

```typescript
// Response: { status, mp4Keys: { '720p': string|null, '1080p': string|null, '4k': string|null } }
```

### `app/api/cron/cleanup-uploads/route.ts`
**POST** — cron job diário (adicionar ao `vercel.json`)

Busca recordings com `upload_status='uploading'` com mais de 24h → `AbortMultipartUploadCommand` + marca como `'aborted'`. Evita cobrança por partes órfãs no R2.

---

## Fase 6 — Atualizar `components/PreviewModal.tsx`

### Novos props:
```typescript
recordingId?: string;
transcodeStatus?: 'pending' | 'processing' | 'done' | 'failed' | null;
mp4Keys?: { '720p': string|null; '1080p': string|null; '4k': string|null }
```

### Três modos de download:

**Modo A — Download Direto (quando `recordingId` existe e transcode está `'done'`):**
1. Usuário seleciona resolução
2. `GET /api/get-video-url?key={mp4Keys[res]}` → presigned URL (24h)
3. Redireciona para URL → download nativo do browser (sem WASM, sem CPU)
4. Velocidade: limitada apenas pela banda do usuário + CDN do R2

**Modo B — Aguardando Transcode (status `'pending'` ou `'processing'`):**
1. Mostra spinner: "Preparando download... transcodificando em background"
2. Polling em `GET /api/transcode/status/{recordingId}` a cada 10s
3. Quando `done`, habilita botão de download

**Modo C — Fallback WASM (sem `recordingId` ou transcode `'failed'`):**
1. Comportamento atual preservado intacto
2. Mostra aviso se arquivo for grande

---

## Fase 7 — Variáveis de Ambiente Necessárias

```bash
# Existentes (não mudam)
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
NEXT_PUBLIC_R2_PUBLIC_URL, DATABASE_URL, CLERK_SECRET_KEY, CRON_SECRET

# Novas
INTERNAL_API_SECRET=<random-secret>         # protege /api/transcode/trigger
TRANSCODE_BACKEND_URL=                      # opcional: URL de worker externo para vídeos >30min
```

---

## Atualizar `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/cleanup-trash",   "schedule": "0 3 * * *" },
    { "path": "/api/cron/cleanup-uploads", "schedule": "0 4 * * *" }
  ]
}
```

---

## Mapa de Arquivos

| Arquivo | Tipo de Mudança |
|---------|----------------|
| `db/schema.ts` | Modificar — adicionar colunas |
| `db/migrations/0002_add_transcode_fields.sql` | Novo |
| `app/actions/recordings.ts` | Modificar — novos campos/actions |
| `hooks/useMultiRecorder.next.ts` | Modificar — adicionar streaming, manter IndexedDB fallback |
| `lib/streamingUpload.ts` | Novo — uploader de streaming |
| `app/api/upload/multipart/init/route.ts` | Novo |
| `app/api/upload/multipart/part/route.ts` | Novo |
| `app/api/upload/multipart/complete/route.ts` | Novo |
| `app/api/upload/multipart/abort/route.ts` | Novo |
| `app/api/transcode/trigger/route.ts` | Novo |
| `app/api/transcode/worker/route.ts` | Novo (Background Function) |
| `app/api/transcode/status/[recordingId]/route.ts` | Novo |
| `app/api/cron/cleanup-uploads/route.ts` | Novo |
| `components/PreviewModal.tsx` | Modificar — modos A/B/C de download |
| `vercel.json` | Modificar — adicionar novo cron |

### Arquivos que NÃO mudam:
`middleware.ts`, `lib/r2.ts`, `lib/chunkStorage.ts` (continua como fallback), `app/editor/[id]/page.tsx`, todas as actions de playlists/stripe/sharing, `hooks/useR2Upload.ts` (mantido para fallback).

---

## Fluxo de Dados Completo

```
INÍCIO DA GRAVAÇÃO
       ↓
useMultiRecorder.startRecording()
  ├── POST /api/upload/multipart/init  ×3 streams
  │         ↓
  │    CreateMultipartUploadCommand → R2
  │    Returns: uploadId, key, recordingId
  │
  └── DB stub criado: upload_status='uploading'

A CADA 5 SEGUNDOS (chunk do MediaRecorder)
       ↓
  IndexedDB.saveChunk()  ← fallback preservado
  StreamingUploader.appendChunk()
       ↓ (quando acumula ≥ 6MB)
  POST /api/upload/multipart/part → presignedUrl
  PUT presignedUrl ← browser → R2 direto
  Armazena ETag

GRAVAÇÃO PARA
       ↓
  StreamingUploader.flush()  ← parte final (< 6MB)
  POST /api/upload/multipart/complete
       ↓
  CompleteMultipartUploadCommand → R2
  DB: upload_status='complete', transcode_status='pending'
       ↓ (fire-and-forget)
  POST /api/transcode/trigger
       ↓
  POST /api/transcode/worker (Background Function, 300s)
       ↓
  fluent-ffmpeg: WebM → 720p.mp4, 1080p.mp4, (4k.mp4)
  Upload cada MP4 → R2
  DB: mp4_key_720p=..., transcode_status='done'

USUÁRIO CLICA DOWNLOAD
       ↓
  PreviewModal: polling GET /api/transcode/status/{id}
       ↓ (quando done)
  GET /api/get-video-url?key={mp4Key}
       ↓
  presignedUrl (24h) → browser download direto do R2
  Velocidade máxima, sem conversão no browser
```

---

## Como Verificar

1. **Gravar 5 minutos** → confirmar chunks chegando ao R2 durante a gravação (R2 dashboard, seção "Multipart Uploads")
2. **Gravar 30 minutos** → sem crash de IndexedDB; após parar, `transcode_status='done'` no DB
3. **Download 720p** → instantâneo (sem WASM), MP4 válido e reproduzível
4. **Download 1080p** → idem, verificar qualidade
5. **Simular queda de rede** → IndexedDB fallback completa o upload via `useR2Upload` legado
6. **Fechar tab durante gravação** → cleanup cron aborta multipart órfão no dia seguinte
7. **Bundle size** → `vercel build` sem exceder 50MB com `@ffmpeg-installer/ffmpeg`

---

## Ordem de Implementação

1. Schema + migration (sem risco, zero downtime)
2. Atualizar `app/actions/recordings.ts` (additive, retrocompatível)
3. Novas rotas de multipart upload (novos arquivos, sem tocar em nada existente)
4. `lib/streamingUpload.ts`
5. Rotas de transcode + instalar `fluent-ffmpeg`
6. Modificar `hooks/useMultiRecorder.next.ts` (fase mais arriscada — testar exaustivamente)
7. Modificar `components/PreviewModal.tsx`
8. Atualizar `vercel.json`
9. Deploy + verificação end-to-end

---

*Gerado em: 2026-03-11*
