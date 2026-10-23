# 🎨 Moonie Kawaai - Design System

Sistema de diseño propio para Moonie Kawaai. Una librería de estilos escalable con soporte para temas **oscuro (Dark Mode)** y **claro (Light Mode)**.

## 📁 Estructura

```
src/design-system/
├── _mixins.scss                 # Utilidades SCSS reutilizables
├── components/
│   ├── button.module.scss       # Componente Button
│   ├── card.module.scss         # Componente Card
│   ├── input.module.scss        # Componentes de entrada (input, select, etc)
│   └── ... (agregar más conforme se desarrolle)
└── README.md                    # Este archivo

_variables.scss                  # Variables globales (soporta Dark/Light)
```

## 🎯 Características

✅ **Temas múltiples** - Dark mode (default) + Light mode  
✅ **Componentes reutilizables** - Button, Card, Input, etc.  
✅ **Responsive** - Breakpoints predefinidos  
✅ **Accesibilidad** - Focus rings, contraste, etc.  
✅ **Transiciones suaves** - Animaciones consistentes  
✅ **Sin dependencias** - SCSS puro, compatible con Tailwind  

## 🚀 Uso

### Variables

```scss
@import "@/_variables.scss";

// Acceso a colores, espaciado, tipografía, etc.
color: $color-primary;
padding: $spacing-lg;
font-size: $text-xl;
```

### Mixins

```scss
@import "@/design-system/_mixins.scss";

.my-component {
  @include flex-center;           // Flexbox centrado
  @include tablet { ... }         // Media query
  @include shadow-lg;             // Sombra
  @include transition-all;        // Transición
  @include text-truncate(2);      // Truncar texto
}
```

### Componentes

#### Button

```tsx
import styles from "@/design-system/components/button.module.scss";

<button className={`${styles.btn} ${styles["btn--primary"]}`}>
  Click me
</button>
```

**Variantes:**
- `btn--primary` - Primario (violet)
- `btn--secondary` - Secundario (cyan)
- `btn--success` - Éxito (emerald)
- `btn--error` - Error (red)
- `btn--outline` - Contorno
- `btn--ghost` - Transparente

**Tamaños:**
- `btn--sm` - Pequeño
- `btn` - Normal
- `btn--lg` - Grande
- `btn--block` - Ancho completo

#### Card

```tsx
import styles from "@/design-system/components/card.module.scss";

<div className={styles.card}>
  <div className={styles["card__header"]}>
    <h2>Card Title</h2>
  </div>
  <div className={styles["card__body"]}>
    Content here
  </div>
  <div className={styles["card__footer"]}>
    Footer
  </div>
</div>
```

**Variantes:**
- `card--elevated` - Sombra grande
- `card--flat` - Mínima sombra
- `card--outlined` - Solo borde
- `card--interactive` - Con hover

#### Input

```tsx
import styles from "@/design-system/components/input.module.scss";

<div className={styles["input-group"]}>
  <label>Nombre</label>
  <input 
    type="text" 
    className={styles.input}
    placeholder="Ingresa tu nombre"
  />
  <p className={styles["input-help"]}>Máx 50 caracteres</p>
</div>
```

## 🎭 Temas (Dark/Light Mode)

Por defecto, usa **Dark Mode**. Para activar Light Mode:

```html
<!-- En el HTML -->
<html data-theme="light">
```

O con CSS:

```scss
[data-theme="light"] {
  @import "@/_variables.scss";
  // Las variables se adaptan automáticamente
}
```

## 📐 Escala de Espaciado

```scss
$spacing-xs    0.25rem  // 4px
$spacing-sm    0.5rem   // 8px
$spacing-md    1rem     // 16px
$spacing-lg    1.5rem   // 24px
$spacing-xl    2rem     // 32px
$spacing-2xl   3rem     // 48px
$spacing-3xl   4rem     // 64px
```

## 🎨 Paleta de Colores

### Primarios
- `$color-primary` - Violet 400 (Principal)
- `$color-secondary` - Cyan 500 (Secundario)

### Estados
- `$color-success` - Emerald 500
- `$color-warning` - Amber 500
- `$color-error` - Red 500
- `$color-info` - Blue 500

### Neutros (Dark Mode)
- `$color-bg-primary` - Slate 950 (Fondo principal)
- `$color-bg-secondary` - Slate 900
- `$color-text-primary` - White
- `$color-text-secondary` - Slate 300

## 📱 Breakpoints

```scss
$mobile: 0px          // Mobile-first
$tablet: 768px        // Tablets
$desktop: 1024px      // Desktop
$largeDesktop: 1280px // Large screens
```

Uso:

```scss
@include mobile { ... }       // Siempre aplica
@include tablet { ... }       // A partir de 768px
@include desktop { ... }      // A partir de 1024px
@include largeDesktop { ... } // A partir de 1280px
```

## 🔤 Tipografía

```scss
$text-xs   0.75em   // 12px
$text-sm   0.875em  // 14px
$text-base 1em      // 16px
$text-md   1.125em  // 18px
$text-lg   1.25em   // 20px
$text-xl   1.5em    // 24px
$text-2xl  1.875em  // 30px
// ... hasta $text-6xl
```

**Pesos:**
```scss
$font-weight-light      300
$font-weight-normal     400
$font-weight-semibold   600
$font-weight-bold       700
$font-weight-black      900
```

## ✨ Próximas Adiciones

- [ ] Badge component
- [ ] Modal/Dialog
- [ ] Accordion
- [ ] Tabs
- [ ] Tooltip
- [ ] Toast/Snackbar
- [ ] Pagination
- [ ] Breadcrumb
- [ ] Dropdown menu

## 📝 Contribuir

Cuando agregues nuevos componentes:

1. Crear archivo en `src/design-system/components/`
2. Importar `_variables.scss` y `_mixins.scss`
3. Usar `--` para modificadores (ej: `btn--primary`)
4. Agregar documentación aquí
5. Considerar Dark/Light mode

---

**Última actualización:** 2026-10-20  
**Versión:** 1.0.0-beta
