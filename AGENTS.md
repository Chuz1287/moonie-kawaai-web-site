---

## ⚡ 5. SKILL: GENERADOR AUTOMÁTICO DE MÓDULOS Y ESTRUCTURA BASE

Cuando el usuario te pida **"Ejecutar Skill de Inicialización"** o **"Generar Módulo [Nombre]"**, debes crear de forma autónoma la siguiente estructura y archivos sin omitting código ni dejar placeholders:

### Comandos de Ejecución Automática:
1. **Inicialización de Base de Datos Offline (Dexie.js)**:
   - Crear `src/lib/db.ts` con el esquema para `products` y `sales`.
2. **Inicialización de Cliente Supabase**:
   - Crear `src/lib/supabase.ts` para la conexión y sincronización remota.
3. **Estructura Modular Estricta (Estilo Angular)**:
   Al solicitar un nuevo módulo (ej. `pos`, `catalog`, `erp`), debes generar dentro de `src/components/[modulo]/`:
   - `index.tsx`: Componente principal UI (JSX limpio).
   - `[modulo].logic.ts`: Hook o lógica de negocio (Dexie/Supabase, estados).
   - `[modulo].module.scss`: Estilos encapsulados con SASS.

---

### Ejemplo de Prompt para Activar el Skill:
`@copilot Ejecuta el Skill de Inicialización para crear la base de datos Dexie en src/lib/db.ts y el primer módulo del POS en src/components/pos`

## ⚡ 5. SKILL: GENERADOR AUTOMÁTICO DE MÓDULOS Y ESTRUCTURA BASE

Cuando el usuario te pida **"Ejecutar Skill de Inicialización"** o **"Generar Módulo [Nombre]"**, debes crear de forma autónoma la siguiente estructura y archivos sin omitting código ni dejar placeholders:

### Comandos de Ejecución Automática:
1. **Inicialización de Base de Datos Offline (Dexie.js)**:
   - Crear `src/lib/db.ts` con el esquema para `products` y `sales`.
2. **Inicialización de Cliente Supabase**:
   - Crear `src/lib/supabase.ts` para la conexión y sincronización remota.
3. **Estructura Modular Estricta (Estilo Angular)**:
   Al solicitar un nuevo módulo (ej. `pos`, `catalog`, `erp`), debes generar dentro de `src/components/[modulo]/`:
   - `index.tsx`: Componente principal UI (JSX limpio).
   - `[modulo].logic.ts`: Hook o lógica de negocio (Dexie/Supabase, estados).
   - `[modulo].module.scss`: Estilos encapsulados con SASS.

---

### Ejemplo de Prompt para Activar el Skill:
`@copilot Ejecuta el Skill de Inicialización para crear la base de datos Dexie en src/lib/db.ts y el primer módulo del POS en src/components/pos`

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