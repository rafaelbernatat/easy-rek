# 🗺️ Plano de Persistência: Edição Não-Destrutiva

## 🎯 Objetivo

Habilitar o salvamento automático (Auto-save) de todas as modificações feitas no editor, utilizando o banco de dados Neon para armazenar o estado atual sem alterar o arquivo original no R2.

## 🏗️ Estratégia Técnica

Em vez de redefinir as funções de edição, o sistema irá "observar" o objeto de estado do seu editor e sincronizá-lo periodicamente com o servidor.

### 1. Camada de Dados (Neon)

- **Persistência JSONB**: Utilização da coluna `editConfig` para salvar o objeto completo de estado do editor.
- **Integridade**: Garantir que cada alteração seja vinculada ao `ID` da gravação correta.

### 2. Sincronização (Auto-save)

- **Debounce de 1.5s**: O sistema aguarda o usuário parar de interagir antes de disparar a gravação, evitando excesso de requisições ao banco.
- **Feedback Visual**: Exibição discreta do status de sincronização (Salvando/Salvo).

### 3. Recuperação (Hydration)

- Ao abrir o editor, o componente deve priorizar o `editConfig` vindo do banco de dados para restaurar cortes e layouts salvos anteriormente.

---

## 📋 Fases de Implementação Detalhadas

### **FASE 1: Camada de Persistência (Backend)**

**Objetivo**: Criar a API para salvar e recuperar o `editConfig` no banco de dados.

#### 1.1 - Atualizar Schema do Banco (já existe ✅)

**Arquivo**: `db/schema.ts`

- Coluna `editConfig` já existe como `TEXT` com default `{"cuts":[]}`
- **Ação**: Nenhuma mudança necessária no schema

#### 1.2 - Criar Query de Atualização

**Arquivo**: `db/queries.ts`
**O que adicionar**:

```typescript
/**
 * Update recording edit configuration
 */
export async function updateRecordingEditConfig(
  recordingId: string,
  editConfig: string,
) {
  const [recording] = await db
    .update(schema.recordings)
    .set({ editConfig })
    .where(eq(schema.recordings.id, recordingId))
    .returning();

  return recording;
}
```

**Por quê**: Encapsula a lógica de atualização usando Drizzle ORM, mantendo consistência com o resto do código.

#### 1.3 - Criar Server Action

**Arquivo**: `app/actions/recordings.ts`
**O que adicionar**:

```typescript
/**
 * Update edit configuration for a recording
 */
export async function updateEditConfigAction(
  recordingId: string,
  editConfig: string,
) {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    await sql`
      UPDATE recordings 
      SET edit_config = ${editConfig}
      WHERE id = ${recordingId}
    `;

    return { success: true };
  } catch (error) {
    console.error("Failed to update edit config:", error);
    return {
      success: false,
      error: "Failed to save changes",
    };
  }
}
```

**Por quê**: Server Actions são o padrão Next.js 14+ para comunicação cliente-servidor segura.

#### 1.4 - Atualizar `getRecordingsAction`

**Arquivo**: `app/actions/recordings.ts`
**O que modificar**: Garantir que o `editConfig` seja retornado nas queries

```typescript
// Adicionar edit_config no SELECT
const recordings = await sql`
  SELECT id, user_id, title, video_key, thumbnail_url, 
         duration, size, edit_config, created_at
  FROM recordings 
  WHERE user_id = ${DEMO_USER_ID}
  ORDER BY created_at DESC
`;

// Incluir no retorno
editConfig: r.edit_config;
```

**Por quê**: Sem isso, o frontend nunca receberá os dados salvos.

---

### **FASE 2: Auto-save no Editor (Frontend)**

**Objetivo**: Observar mudanças de estado e sincronizar automaticamente com o banco.

#### 2.1 - Adicionar `recordingId` como prop do Editor

**Arquivo**: `components/Editor.tsx`
**O que modificar**:

```typescript
interface EditorProps {
  recordings: RecordedFiles;
  initialLayoutConfig: LayoutConfig;
  recordingId?: string; // NOVO
  initialActions?: TimelineAction[]; // NOVO (para Fase 3)
  initialMetadata?: ProjectMetadata; // NOVO (para Fase 3)
  initialVolumes?: { mic: number; screen: number }; // NOVO (para Fase 3)
  onClose: () => void;
}
```

**Por quê**: O Editor precisa saber qual gravação está sendo editada para salvar no lugar certo.

#### 2.2 - Adicionar Estado de Sincronização

**Arquivo**: `components/Editor.tsx` (próximo aos outros `useState`)
**O que adicionar**:

```typescript
// Save status
const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
  "idle",
);
const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

**Por quê**: Controla o feedback visual e o timer do debounce.

#### 2.3 - Implementar Hook de Auto-save

**Arquivo**: `components/Editor.tsx` (após os outros `useEffect`)
**O que adicionar**:

```typescript
// Auto-save effect
useEffect(() => {
  // Não salvar se não tiver recordingId (modo preview sem salvar)
  if (!recordingId) return;

  // Limpar timer anterior se houver
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }

  // Indicar que está esperando para salvar
  setSaveStatus("saving");

  // Debounce de 1.5 segundos
  saveTimeoutRef.current = setTimeout(async () => {
    try {
      // Montar objeto completo de configuração
      const editConfig = {
        actions,
        layoutConfig: baseLayoutConfig,
        metadata,
        volumes: {
          mic: globalMicVolume,
          screen: globalScreenVolume,
        },
        version: "1.0", // Para versionamento futuro
      };

      // Serializar para JSON
      const configJson = JSON.stringify(editConfig);

      // Chamar server action
      const result = await updateEditConfigAction(recordingId, configJson);

      if (result.success) {
        setSaveStatus("saved");

        // Voltar para idle após 2 segundos
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        console.error("Failed to save:", result.error);
        setSaveStatus("idle");
      }
    } catch (error) {
      console.error("Auto-save error:", error);
      setSaveStatus("idle");
    }
  }, 1500);

  // Cleanup
  return () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  };
}, [
  actions,
  baseLayoutConfig,
  metadata,
  globalMicVolume,
  globalScreenVolume,
  recordingId,
]);
```

**Por quê**:

- Observa todas as mudanças relevantes do editor
- Debounce evita centenas de requisições ao banco
- Serializa todo o estado em um único JSON
- Trata erros graciosamente

#### 2.4 - Adicionar Indicador Visual de Salvamento

**Arquivo**: `components/Editor.tsx` (na seção superior, próximo ao botão de voltar)
**O que adicionar**:

```typescript
{/* Save Status Indicator */}
{recordingId && saveStatus !== 'idle' && (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium">
    {saveStatus === 'saving' && (
      <>
        <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
        <span className="text-slate-600">Salvando...</span>
      </>
    )}
    {saveStatus === 'saved' && (
      <>
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-slate-600">Salvo</span>
      </>
    )}
  </div>
)}
```

**Por quê**: Feedback visual discreto mostra ao usuário que o trabalho está sendo preservado.

---

### **FASE 3: Hydration - Carregamento do Estado Salvo**

**Objetivo**: Restaurar o estado do editor quando o usuário reabre uma gravação.

#### 3.1 - Modificar Fluxo de Edição

**Arquivo**: `app/edit/[id]/page.tsx`
**O que modificar**:

```typescript
const loadRecording = async () => {
  const result = await getRecordingsAction();
  if (result.success) {
    const found = result.recordings.find((r: any) => r.id === recordingId);
    if (found) {
      setRecording(found);

      // Parse editConfig se existir
      let editConfig = null;
      if (found.editConfig) {
        try {
          editConfig = JSON.parse(found.editConfig);
        } catch (e) {
          console.warn("Failed to parse editConfig:", e);
        }
      }

      // Store recording data in sessionStorage for ScreenRecorder
      const videoUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${found.videoKey}`;
      sessionStorage.setItem(
        "editingRecording",
        JSON.stringify({
          id: found.id,
          title: found.title,
          videoUrl: videoUrl,
          duration: found.duration,
          editConfig: editConfig, // NOVO: passar config salvo
        }),
      );

      // Navigate to record page in edit mode
      router.push("/record?edit=true");
    }
  }
};
```

**Por quê**: Carrega o `editConfig` salvo e passa para a próxima tela via sessionStorage.

#### 3.2 - Processar Dados no ScreenRecorder

**Arquivo**: `components/recorder/ScreenRecorder.tsx`
**O que modificar** (no `useEffect` que lê o sessionStorage):

```typescript
useEffect(() => {
  const isEditMode = searchParams.get("edit") === "true";
  if (isEditMode) {
    const storedData = sessionStorage.getItem("editingRecording");
    if (storedData) {
      const recording = JSON.parse(storedData);

      // Load video para criar o recording mock
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.src = recording.videoUrl;

      video.onloadeddata = async () => {
        const blob = await fetch(recording.videoUrl).then((r) => r.blob());

        const mockRecordings: RecordedFiles = {
          composite: blob,
          duration: recording.duration,
        };

        setRecordings(mockRecordings);
        setIsEditing(true);
        setMetadata({ name: recording.title || "Untitled Video" });

        // NOVO: Armazenar editConfig e recordingId para passar ao Editor
        if (recording.editConfig) {
          sessionStorage.setItem(
            "editorInitialState",
            JSON.stringify({
              recordingId: recording.id,
              editConfig: recording.editConfig,
            }),
          );
        }

        sessionStorage.removeItem("editingRecording");
      };
    }
  }
}, [isEditMode]);
```

**Por quê**: Prepara os dados salvos para serem passados ao Editor.

#### 3.3 - Passar Estado Inicial ao Editor

**Arquivo**: `components/recorder/ScreenRecorder.tsx`
**O que modificar** (no render do Editor):

```typescript
if (isEditing && recordings) {
  // Recuperar estado inicial se existir
  const storedState = sessionStorage.getItem('editorInitialState');
  let initialState = null;

  if (storedState) {
    try {
      initialState = JSON.parse(storedState);
      sessionStorage.removeItem('editorInitialState'); // Limpar após usar
    } catch (e) {
      console.warn('Failed to parse editor initial state:', e);
    }
  }

  return (
    <Editor
      recordings={recordings}
      initialLayoutConfig={
        initialState?.editConfig?.layoutConfig || layoutConfig
      }
      recordingId={initialState?.recordingId}
      initialActions={initialState?.editConfig?.actions || []}
      initialMetadata={
        initialState?.editConfig?.metadata || { name: metadata.name }
      }
      initialVolumes={initialState?.editConfig?.volumes}
      onClose={closeEditor}
    />
  );
}
```

**Por quê**: Passa todos os dados salvos para o Editor reconstruir o estado exato.

#### 3.4 - Consumir Props Iniciais no Editor

**Arquivo**: `components/Editor.tsx`
**O que modificar** (substituir inicializações dos estados):

```typescript
export const Editor: React.FC<EditorProps> = ({
  recordings,
  initialLayoutConfig,
  recordingId,
  initialActions = [],
  initialMetadata,
  initialVolumes,
  onClose,
}) => {
  // Usar valores iniciais das props ou defaults
  const [actions, setActions] = useState<TimelineAction[]>(initialActions);

  const [baseLayoutConfig, setBaseLayoutConfig] =
    useState<LayoutConfig>(initialLayoutConfig);

  const [metadata, setMetadata] = useState<ProjectMetadata>(
    initialMetadata || { name: "Edited Video" }
  );

  const [globalMicVolume, setGlobalMicVolume] = useState(
    initialVolumes?.mic ?? 1
  );

  const [globalScreenVolume, setGlobalScreenVolume] = useState(
    initialVolumes?.screen ?? 1
  );

  // ... resto do código
```

**Por quê**: Restaura o estado exato do editor com todos os cortes, zooms, layouts e configurações que o usuário tinha.

---

## 🔄 Fluxo Completo

### Salvamento:

1. Usuário edita vídeo (adiciona corte, muda layout, etc.)
2. `useEffect` detecta mudança após 1.5s de inatividade
3. Mostra "Salvando..." na UI
4. Serializa todo o estado em JSON
5. Chama `updateEditConfigAction(recordingId, json)`
6. Server Action atualiza coluna `edit_config` no Neon
7. Mostra "Salvo" por 2 segundos

### Carregamento:

1. Usuário clica em "Editar" na home
2. `edit/[id]/page.tsx` carrega gravação com `editConfig`
3. Dados são passados via sessionStorage
4. `ScreenRecorder` prepara estado inicial
5. `Editor` recebe props com estado salvo
6. Todos os cortes, layouts e configurações são restaurados
7. Edições continuam sendo auto-salvas

---

## ✅ Critérios de Sucesso

- [ ] **Fase 1**: Chamada à API de update funciona sem erros
- [ ] **Fase 2**: JSON aparece no banco após editar no Editor
- [ ] **Fase 3**: Ao reabrir, todos os cortes e configurações voltam exatamente como estavam
- [ ] O arquivo original no R2 permanece intacto
- [ ] Feedback visual de "Salvando/Salvo" aparece corretamente
- [ ] Performance: debounce funciona (não mais que 1 save a cada 1.5s)
