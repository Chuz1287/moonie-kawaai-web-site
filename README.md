# Moonie Kawaai

Aplicación web construida con Next.js, React y TypeScript. El proyecto se puede
desarrollar en Windows, macOS y Linux usando Node.js y npm.

## Requisitos

- Node.js 20.9.0 o posterior.
- npm (incluido con Node.js).
- Credenciales de Supabase para usar las funciones conectadas al catálogo,
  ventas y eventos.

Comprueba las versiones instaladas:

```bash
node --version
npm --version
```

## Instalación

Clona el repositorio y ejecuta estos comandos desde la carpeta del proyecto en
PowerShell, Símbolo del sistema, Terminal de macOS o una terminal Linux:

```bash
npm ci
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Se usa `npm ci` para instalar las versiones exactas del `package-lock.json`.
No es necesario ejecutar comandos de Bash ni cambiar las rutas según el sistema
operativo. Usa npm en lugar de mezclar gestores de paquetes en el mismo checkout.

## Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto y configura las credenciales
del proyecto Supabase:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-clave-anon>
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tu-clave-de-servidor>
```

Solicita esos valores al administrador del proyecto. Mantén `.env.local` privado:
no lo subas a Git ni compartas la clave de servidor. Las funciones de carga de
imágenes y administración de medios requieren configurar Cloudinary:

```dotenv
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<nombre-del-cloud>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<preset-unsigned>
CLOUDINARY_CLOUD_NAME=<nombre-del-cloud>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
```

La administración de medios está disponible en `/media` y permite navegar por
las carpetas de productos, cargar imágenes, reemplazar archivos existentes,
renombrarlas y eliminarlas. El inventario, el POS y el catálogo usan la versión
vigente de cada portada de Cloudinary para evitar mostrar una copia anterior al
reemplazarla. Mientras no se integre el inicio de sesión global, estas
operaciones no tienen control de acceso por usuario; confirma los cambios con
cuidado. El API Secret debe permanecer solo en el servidor.

## Migraciones de Supabase

Antes de desplegar cambios de esquema, ejecuta en el SQL Editor de Supabase las
migraciones pendientes de `supabase/migrations/` en orden por fecha. La migración
`20261111_add_multiple_product_categories.sql` agrega la lista de categorías por
producto y conserva la columna `tipo` como categoría principal para las imágenes.

## Comandos

```bash
npm run dev    # servidor de desarrollo
npm run lint   # ESLint
npm run build  # compilación de producción
npm start      # sirve la compilación (después de npm run build)
```

## Solución de problemas

- Si `npm ci` informa de una versión de Node.js no compatible, instala Node.js
  20.9.0 o posterior y vuelve a abrir la terminal.
- Si la aplicación abre pero el catálogo, las ventas o los eventos no cargan,
  revisa que `.env.local` tenga las credenciales de Supabase correctas y reinicia
  `npm run dev`.
- Si el puerto 3000 está ocupado, detén la otra aplicación que lo usa o inicia
  el servidor en otro puerto con `npm run dev -- --port 3001`.
