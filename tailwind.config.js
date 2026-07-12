/** @type {import('tailwindcss').Config} */

// ── Tokens de Brokeate (Prototype/src/app/App.tsx · const C) ─────────────────
// Azul marino dominante sobre blanco; verde/ámbar/rojo SOLO semánticos.
//
// Los valores viven en src/style/global.css como tripletes RGB (`:root` y
// `.dark:root`). Aquí solo se les pone nombre. Consecuencia: una clase como
// `bg-surface-background` cambia de color al alternar el tema sin tocar la pantalla,
// y NO hace falta escribir variantes `dark:` en el código.
//
// Si necesitas el color como string (color de un Ionicon, stroke de un SVG,
// ActivityIndicator…), no lo hardcodees: usa `useColores()` de @/context/ThemeContext.
const token = (nombre) => `rgb(var(--${nombre}) / <alpha-value>)`;

module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class' hace que el tema lo mande la app (el botón del header), no el SO.
  darkMode: 'class',
  theme: {
    extend: {
      fontSize: {
        caption: ['12px', { lineHeight: '16px' }],
        body: ['14px', { lineHeight: '20px' }],
        'body-md': ['16px', { lineHeight: '24px' }],
        title: ['18px', { lineHeight: '26px' }],
        heading: ['20px', { lineHeight: '28px' }],
        display: ['24px', { lineHeight: '32px' }],
        hero: ['26px', { lineHeight: '34px' }],
      },
      colors: {
        brand: {
          // Botones, tabs activos y todo lo interactivo.
          primary: token('brand-primary'),
          // Superficie oscura de marca (portada de noticia sin imagen).
          ink: token('brand-ink'),
          // Azules intermedios: chips informativos, segmentos de gráficos.
          mid: token('brand-mid'),
          pale: token('brand-pale'),
          // El acento no es lima: verde institucional, solo para "aprobado"/éxito.
          accent: token('brand-accent'),
          // Oro: reservado al segmento "Oro" de los donuts (no es semántico).
          gold: token('brand-gold'),
        },
        // Color por perfil de riesgo (PROFILE_COLORS del prototipo).
        perfil: {
          conservador: token('perfil-conservador'),
          moderado: token('perfil-moderado'),
          agresivo: token('perfil-agresivo'),
        },
        brandAlpha: {
          primarySoft: token('brand-soft'),
          primaryMedium: 'rgb(var(--brand-primary) / 0.18)',
          accentSoft: token('accent-soft'),
          accentMedium: 'rgb(var(--brand-accent) / 0.18)',
        },
        whiteAlpha: {
          ghost: 'rgba(255, 255, 255, 0.10)',
          soft: 'rgba(255, 255, 255, 0.14)',
          medium: 'rgba(255, 255, 255, 0.22)',
        },
        blackAlpha: {
          ghost: 'rgb(var(--overlay) / 0.05)',
        },
        stateAlpha: {
          successSoft: token('success-soft'),
          errorSoft: token('error-soft'),
          warningSoft: token('warning-soft'),
        },
        text: {
          primary: token('text-primary'),
          secondary: token('text-secondary'),
          muted: token('text-muted'),
          // Etiqueta sobre superficie llena: blanca en claro, tinta en oscuro.
          onPrimary: token('text-on-primary'),
          onAccent: token('text-on-accent'),
        },
        surface: {
          background: token('surface-background'),
          secondary: token('surface-secondary'),
          elevated: token('surface-elevated'),
          border: token('surface-border'),
          divider: token('surface-divider'),
          canvas: token('surface-canvas'),
        },
        state: {
          success: token('state-success'),
          warning: token('state-warning'),
          error: token('state-error'),
          info: token('state-info'),
        },
        avatars: {
          1: token('chart-1'),
          2: token('chart-2'),
          3: token('chart-3'),
          4: token('chart-4'),
          5: token('chart-5'),
          6: token('brand-gold'),
        },
      },
    },
  },
  plugins: [],
};
