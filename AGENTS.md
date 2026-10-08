---

## ⚡ 5. SKILL: GENERADOR AUTOMÁTICO DE MÓDULOS Y ESTRUCTURA BASE

Cuando el usuario te pida **"Ejecutar Skill de Inicialización"** o **"Generar Módulo [Nombre]"**, debes crear de forma autónoma la siguiente estructura y archivos sin omitting código ni dejar placeholders:

### Comandos de Ejecución Automática:
1. **Persistencia y backend**:
   - El POS existente usa Supabase mediante las rutas API del proyecto. No crear una base de datos cliente paralela ni duplicar el catálogo.
2. **Inicialización de Cliente Supabase**:
   - Crear `src/lib/supabase.ts` para la conexión y sincronización remota.
3. **Estructura Modular Estricta (Estilo Angular)**:
   Al solicitar un nuevo módulo (ej. `pos`, `catalog`, `erp`), debes generar dentro de `src/components/[modulo]/`:
   - `index.tsx`: Componente principal UI (JSX limpio).
   - `[modulo].logic.ts`: Hook o lógica de negocio conectado a los servicios y tipos existentes.
   - `[modulo].module.scss`: Estilos encapsulados con SASS.

---

### Ejemplo de Prompt para Activar el Skill:
`@copilot Ejecuta el Skill de Inicialización para conectar el módulo POS con el catálogo y las rutas API existentes`

## ⚡ 5. SKILL: GENERADOR AUTOMÁTICO DE MÓDULOS Y ESTRUCTURA BASE

Cuando el usuario te pida **"Ejecutar Skill de Inicialización"** o **"Generar Módulo [Nombre]"**, debes crear de forma autónoma la siguiente estructura y archivos sin omitting código ni dejar placeholders:

### Comandos de Ejecución Automática:
1. **Persistencia y backend**:
   - El POS existente usa Supabase mediante las rutas API del proyecto. No crear una base de datos cliente paralela ni duplicar el catálogo.
2. **Inicialización de Cliente Supabase**:
   - Crear `src/lib/supabase.ts` para la conexión y sincronización remota.
3. **Estructura Modular Estricta (Estilo Angular)**:
   Al solicitar un nuevo módulo (ej. `pos`, `catalog`, `erp`), debes generar dentro de `src/components/[modulo]/`:
   - `index.tsx`: Componente principal UI (JSX limpio).
   - `[modulo].logic.ts`: Hook o lógica de negocio conectado a los servicios y tipos existentes.
   - `[modulo].module.scss`: Estilos encapsulados con SASS.

---

### Ejemplo de Prompt para Activar el Skill:
`@copilot Ejecuta el Skill de Inicialización para conectar el módulo POS con el catálogo y las rutas API existentes`

## 📸 6. SKILL: CONFIGURACIÓN Y SERVICIO DE MEDIA (CLOUDINARY)

Cuando el usuario te pida **"Ejecutar Skill de Cloudinary"** o **"Configurar Upload de Cloudinary"**, debes implementar de forma autónoma los siguientes componentes sin dejar placeholders:

### Comandos de Ejecución Automática:
1. **Servicio de Carga (`src/lib/cloudinary.ts`)**:
   - Implementar función `uploadImage(file: File)` utilizando la API Unsigned Upload Presets para guardar imágenes en la carpeta `moonie-kawaii/products`.
   - Implementar helper `getOptimizedImageUrl(publicId: string, options)` para redimensionar fotos de figuras al vuelo.

2. **Componente de Carga UI (`src/components/common/ImageUploader/`)**:
   - `index.tsx`: Input con dropzone o captura por cámara.
   - `ImageUploader.logic.ts`: Manejo de estados de carga, preview local (Blob URL) y envío a Cloudinary.
   - `ImageUploader.module.scss`: Estilos encapsulados con respuesta visual para carga activa.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
