# NEW_TASKS.md — Tarefas do MVP

*Baseado em NEW_PLAN.md — 2026-03-11*
*Última atualização: 2026-03-11 — P1-P7 implementadas ✅*

**Legenda:** `[ ]` não iniciada · `[~]` em andamento · `[x]` concluída

---

## 🔴 PRIORIDADE 1 — Schema e Fundação (Zero Risco, Zero Downtime)

### Task 1.1: Atualizar schema Drizzle
- [x] Abrir `db/schema.ts`
- [x] Adicionar 8 colunas nullable à tabela `recordings`:
  - `transcode_status` (text, nullable)
  - `transcode_error` (text, nullable)
  - `mp4_key_720p` (text, nullable)
  - `mp4_key_1080p` (text, nullable)
  - `mp4_key_4k` (text, nullable)
  - `raw_key` (text, nullable)
  - `upload_status` (text, nullable)
  - `upload_id` (text, nullable)

### Task 1.2: Criar migration SQL
- [x] Criar arquivo `db/migrations/0002_add_transcode_fields.sql`
- [x] Escrever os `ALTER TABLE recordings ADD COLUMN IF NOT EXISTS ...` para cada campo
- [x] Adicionar `CREATE INDEX idx_recordings_transcode_status` com filtro parcial
- [x] Executar a migration contra o banco Neon

### Task 1.3: Atualizar `app/actions/recordings.ts`
- [x] Adicionar novos campos nos SELECTs de `getRecordingsAction` e `getFilteredVideosAction`
- [x] Atualizar os tipos de retorno para incluir `transcodeStatus`, `mp4Keys`, `uploadStatus`
- [x] Criar `createRecordingStubAction(params)` — insere row com `upload_status='uploading'`
- [x] Criar `updateTranscodeStatusAction(recordingId, status, keys?, error?)` — atualiza status e chaves MP4

---

## 🔴 PRIORIDADE 2 — API Routes de Multipart Upload (Novos Arquivos)

> Seguir o padrão de auth/client de `app/api/upload/presigned/route.ts`

### Task 2.1: Criar rota de inicialização
- [x] Criar `app/api/upload/multipart/init/route.ts`
- [x] Aceitar body: `{ fileName, contentType, fileType, recordingId? }`
- [x] Chamar `CreateMultipartUploadCommand` no R2
- [x] Criar DB stub via `createRecordingStubAction` se `recordingId` não fornecido
- [x] Retornar `{ uploadId, key, recordingId }`

### Task 2.2: Criar rota de geração de presigned URL por parte
- [x] Criar `app/api/upload/multipart/part/route.ts`
- [x] Aceitar body: `{ uploadId, key, partNumber }`
- [x] Chamar `getSignedUrl(UploadPartCommand, { expiresIn: 3600 })`
- [x] Retornar `{ presignedUrl }`

### Task 2.3: Criar rota de finalização
- [x] Criar `app/api/upload/multipart/complete/route.ts`
- [x] Aceitar body: `{ uploadId, key, recordingId, parts, duration, totalSize, streamType }`
- [x] Chamar `CompleteMultipartUploadCommand`
- [x] Atualizar DB: `upload_status='complete'`, `video_key`, `transcode_status='pending'`
- [x] Fire-and-forget para `/api/transcode/trigger`
- [x] Retornar `{ success, location }`

### Task 2.4: Criar rota de abort
- [x] Criar `app/api/upload/multipart/abort/route.ts`
- [x] Aceitar body: `{ uploadId, key, recordingId? }`
- [x] Chamar `AbortMultipartUploadCommand`
- [x] Atualizar DB: `upload_status='aborted'` (se recordingId fornecido)
- [x] Retornar `{ success }`

---

## 🔴 PRIORIDADE 3 — `lib/streamingUpload.ts` (Core Client-Side)

### Task 3.1: Criar classe `StreamingUploader`
- [~] Criar arquivo `lib/streamingUpload.ts`
- [ ] Definir constante `PART_SIZE_BYTES = 6 * 1024 * 1024` (6MB)
- [ ] Implementar método `initialize(streamType, mimeType)`:
  - Chama `POST /api/upload/multipart/init`
  - Armazena `uploadId`, `key`, `recordingId` em memória e `localStorage`
- [ ] Implementar método `appendChunk(data: Uint8Array)`:
  - Acumula em `pendingBuffer`
  - Quando tamanho total >= `PART_SIZE_BYTES`, chama `_uploadPart()` automaticamente
- [ ] Implementar método `flush()`:
  - Faz upload do buffer restante como parte final (pode ser < 6MB)
- [ ] Implementar método `complete(duration, totalSize)`:
  - Chama `POST /api/upload/multipart/complete` com todos os ETags coletados
  - Limpa `localStorage`
- [ ] Implementar método `abort()`:
  - Chama `POST /api/upload/multipart/abort`
  - Limpa estado em memória e `localStorage`

### Task 3.2: Implementar lógica de parte interna `_uploadPart()`
- [x] Chamar `POST /api/upload/multipart/part` para obter presigned URL
- [x] Fazer `PUT presignedUrl` com o buffer acumulado (binário direto)
- [x] Extrair `ETag` do header da resposta
- [x] Armazenar `{ PartNumber, ETag }` no array `parts`
- [x] Incrementar `partNumber`

### Task 3.3: Implementar retry com backoff exponencial
- [x] Envolver `_uploadPart()` com até 3 tentativas
- [x] Aguardar 1s, 2s, 4s entre tentativas (exponencial)
- [x] Após 3 falhas, propagar erro para o caller

### Task 3.4: Implementar persistência de estado no `localStorage`
- [x] Chave: `streaming-upload-{recordingId}`
- [x] Salvar: `{ uploadId, key, recordingId, parts, lastPartNumber, streamType, savedAt }`
- [x] Verificar estado existente no `initialize()` — retomar se < 24h e mesmo `recordingId`
- [x] Limpar no `complete()` e `abort()`

### Task 3.5: Controle de concorrência
- [x] Limitar a máximo 2 uploads de partes simultâneos entre todos os streams ativos
- [x] Usar semáforo simples (contador de uploads ativos + fila de espera)

---

## 🔴 PRIORIDADE 4 — Atualizar `hooks/useMultiRecorder.next.ts`

### Task 4.1: Instanciar `StreamingUploader` por stream
- [x] Criar refs: `compositeUploaderRef`, `cameraUploaderRef`, `screenUploaderRef`
- [x] No `startRecording()`, chamar `uploader.initialize()` para cada stream ativo
- [x] Tratar erros de inicialização sem bloquear a gravação (logar e continuar)

### Task 4.2: Integrar `appendChunk()` no `ondataavailable`
- [x] Após `saveChunk()` no IndexedDB (mantido como fallback), chamar `uploader.appendChunk(new Uint8Array(await e.data.arrayBuffer()))`
- [x] Executar de forma não-bloqueante (não aguardar — `void uploader.appendChunk(...)`)

### Task 4.3: Integrar `flush()` e `complete()` no `stopRecording()`
- [x] Após parar o `MediaRecorder`, chamar `uploader.flush()` para cada stream
- [x] Chamar `uploader.complete(duration, totalSize)` para cada stream
- [x] Em caso de falha, detectar e acionar fallback via `useR2Upload` com o Blob do IndexedDB

### Task 4.4: Adicionar `uploadState` ao retorno do hook
- [x] Expor `uploadState: { recordingId, isStreaming, completionStatus }`
- [x] Atualizar estados conforme progresso do upload
- [x] Garantir que a API pública existente não muda (campos adicionais são opcionais)

### Task 4.5: Implementar `beforeunload` handler
- [x] Ao detectar fechamento da tab durante gravação ativa, usar `navigator.sendBeacon` para chamar `/api/upload/multipart/abort`
- [x] Mostrar diálogo de confirmação ao usuário

---

## 🟡 PRIORIDADE 5 — Pipeline de Transcodificação Server-Side

### Task 5.1: Instalar dependências FFmpeg server-side
- [x] Executar: `npm install fluent-ffmpeg`
- [x] Executar: `npm install -D @ffmpeg-installer/ffmpeg @types/fluent-ffmpeg`
- [ ] Verificar bundle size com `vercel build` (deve ficar < 50MB)

### Task 5.2: Criar rota de trigger de transcodificação
- [x] Criar `app/api/transcode/trigger/route.ts`
- [x] Verificar header `INTERNAL_API_SECRET` antes de processar
- [x] Aceitar body: `{ recordingId, rawKey, targetResolutions }`
- [x] Atualizar DB: `transcode_status='processing'`
- [x] Disparar `POST /api/transcode/worker` de forma assíncrona (fire-and-forget)
- [x] Retornar `{ success, jobId }` imediatamente

### Task 5.3: Criar rota worker de transcodificação (Background Function)
- [x] Criar `app/api/transcode/worker/route.ts`
- [x] Adicionar `export const maxDuration = 300` (Vercel Background Function)
- [x] Inicializar `fluent-ffmpeg` com path do `@ffmpeg-installer/ffmpeg`
- [x] Para cada resolução solicitada:
  - Download do WebM do R2 como readable stream
  - Pipe pelo `fluent-ffmpeg` com settings corretos:
    - 720p: `preset=fast, crf=23, aac 128k`
    - 1080p: `preset=medium, crf=22, aac 192k`
    - 4K: `preset=slow, crf=20, aac 256k`
    - Sempre: `-movflags +faststart`
  - Upload do MP4 resultante para R2 (multipart para arquivos grandes)
- [x] Atualizar DB com chaves MP4 e `transcode_status='done'`
- [x] Em caso de erro, gravar em `transcode_error` e setar `transcode_status='failed'`

### Task 5.4: Criar rota de status de transcodificação
- [x] Criar `app/api/transcode/status/[recordingId]/route.ts`
- [x] Buscar recording no DB
- [x] Retornar `{ status, mp4Keys: { '720p', '1080p', '4k' } }`

### Task 5.5: Criar cron de cleanup de uploads órfãos
- [x] Criar `app/api/cron/cleanup-uploads/route.ts`
- [x] Verificar `CRON_SECRET` no header (padrão existente)
- [x] Buscar recordings com `upload_status='uploading'` criados há mais de 24h
- [x] Para cada um, chamar `AbortMultipartUploadCommand` se `upload_id` existir
- [x] Atualizar DB: `upload_status='aborted'`

### Task 5.6: Atualizar `vercel.json` com novo cron
- [x] Abrir/criar `vercel.json`
- [x] Manter cron existente de `cleanup-trash`
- [x] Adicionar novo cron `cleanup-uploads` com schedule `"0 4 * * *"`

---

## 🟡 PRIORIDADE 6 — Atualizar `components/PreviewModal.tsx`

### Task 6.1: Adicionar novos props ao componente
- [x] Adicionar props opcionais: `recordingId?`, `transcodeStatus?`, `mp4Keys?`
- [x] Tipar corretamente sem quebrar chamadas existentes

### Task 6.2: Implementar Modo A — Download Direto
- [x] Quando `recordingId` existe e `transcodeStatus === 'done'`:
  - Botão de download chama `GET /api/get-video-url?key={mp4Keys[resolution]}`
  - Redireciona o browser para a presigned URL
  - Sem WASM, sem conversão local

### Task 6.3: Implementar Modo B — Aguardando Transcode
- [x] Quando `transcodeStatus === 'pending' | 'processing'`:
  - Mostrar spinner com mensagem "Preparando seu download..."
  - Iniciar polling: `GET /api/transcode/status/{recordingId}` a cada 10s
  - Quando `done`, atualizar estado e habilitar botão

### Task 6.4: Preservar Modo C — Fallback WASM
- [x] Quando não há `recordingId` ou `transcodeStatus === 'failed'` ou `null`:
  - Manter comportamento atual intacto (`convertToMp4` via FFmpeg.wasm)
  - Adicionar aviso visual se o arquivo for grande (> 500MB)

### Task 6.5: Limpar polling ao fechar modal
- [x] Cancelar o intervalo de polling no `useEffect` cleanup
- [x] Evitar memory leak e chamadas desnecessárias após modal fechado

---

## 🟡 PRIORIDADE 7 — Variáveis de Ambiente e Configuração

### Task 7.1: Adicionar novas env vars ao projeto
- [x] Gerar valor aleatório para `INTERNAL_API_SECRET` (ex: `openssl rand -hex 32`)
- [x] Adicionar ao `.env.local` (desenvolvimento)
- [ ] Adicionar ao Vercel Dashboard (produção)
- [x] Adicionar `TRANSCODE_BACKEND_URL=` (vazio por ora — usa Vercel Background Function)
- [x] Atualizar `.env.example` com as novas variáveis documentadas

---

## 🟢 PRIORIDADE 8 — Verificação e Testes

### Task 8.1: Testar gravação curta (5 minutos)
- [ ] Verificar partes chegando ao R2 durante a gravação (R2 Dashboard → "Multipart Uploads")
- [ ] Verificar que `transcode_status='done'` no banco após finalizar
- [ ] Verificar que MP4s 720p e 1080p existem no R2

### Task 8.2: Testar gravação longa (30 minutos)
- [ ] Confirmar ausência de crash por quota do IndexedDB
- [ ] Confirmar que o upload streaming completa sem erros
- [ ] Confirmar que a transcodificação conclui dentro do limite de 300s

### Task 8.3: Testar download
- [ ] Selecionar 720p → download deve iniciar imediatamente, sem conversão
- [ ] Selecionar 1080p → idem
- [ ] Verificar que o arquivo MP4 baixado é válido e reproduzível

### Task 8.4: Testar fallback de rede
- [ ] Simular perda de rede durante gravação (desligar Wi-Fi)
- [ ] Confirmar que o IndexedDB mantém os chunks
- [ ] Após reconectar, confirmar que `useR2Upload` legado completa o upload
- [ ] Confirmar que o vídeo aparece na home normalmente

### Task 8.5: Testar fechamento de tab durante gravação
- [ ] Iniciar gravação, fechar a aba
- [ ] Verificar que o cleanup cron no dia seguinte remove o multipart upload órfão
- [ ] Verificar que o DB marca o recording como `upload_status='aborted'`

### Task 8.6: Verificar bundle size no Vercel
- [ ] Executar `vercel build` localmente
- [ ] Confirmar que nenhuma função excede o limite de 50MB com `@ffmpeg-installer/ffmpeg`

---

## 📊 Resumo

| Prioridade | Tasks | Impacto |
|-----------|-------|---------|
| 🔴 P1 — Schema | 3 tasks | Fundação, zero risco |
| 🔴 P2 — API Multipart | 4 tasks | Habilita gravações longas |
| 🔴 P3 — StreamingUploader | 5 tasks | Core do streaming |
| 🔴 P4 — useMultiRecorder | 5 tasks | Integração com gravação |
| 🟡 P5 — Transcodificação | 6 tasks | Downloads em MP4 |
| 🟡 P6 — PreviewModal | 5 tasks | UI de download |
| 🟡 P7 — Env Vars | 1 task | Configuração |
| 🟢 P8 — Testes | 6 tasks | Verificação |

**Total: 35 tasks**

---

*Gerado em: 2026-03-11*
