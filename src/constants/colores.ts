/**
 * Tokens de Brokeate para props que NO aceptan className
 * (color de Ionicons, ActivityIndicator, stroke de SVG, velo de un Modal…).
 *
 * Para layout usa las clases de Tailwind (`bg-brand-primary`); este archivo existe
 * solo porque esas props exigen un string de color.
 *
 * IMPORTANTE: estos valores son la copia en JS de src/style/global.css. Si cambias
 * uno, cambia el otro — son la misma paleta vista desde dos lenguajes.
 *
 * No importes PALETA directamente en una pantalla: usa `useColores()` de
 * @/context/ThemeContext, que devuelve la paleta del tema activo y repinta al cambiarlo.
 */
export interface Paleta {
  /** Superficie oscura de marca (portada de noticia sin imagen). */
  navy: string;
  primario: string;
  azulMedio: string;
  azulPalido: string;
  acento: string;
  exito: string;
  advertencia: string;
  error: string;
  info: string;
  oro: string;
  textoPrimario: string;
  textoSecundario: string;
  textoMuted: string;
  /** Etiqueta/icono encima de una superficie llena (botón primario, éxito, error). */
  textoSobrePrimario: string;
  textoSobreAcento: string;
  /** Tarjetas. */
  superficie: string;
  superficieSecundaria: string;
  superficieElevada: string;
  borde: string;
  /** Fondo de pantalla. */
  fondo: string;
  /** Velo detrás de modales y hojas. */
  velo: string;
  /** Serie de los gráficos (donut, línea). */
  grafico: readonly [string, string, string, string, string];
  perfil: Record<'conservador' | 'moderado' | 'agresivo', string>;
}

const CLARA: Paleta = {
  navy: '#0A2540',
  primario: '#14375E',
  azulMedio: '#1E5C9B',
  azulPalido: '#3A85C9',
  acento: '#1B8A5A',
  exito: '#1B8A5A',
  advertencia: '#C77700',
  error: '#C0362C',
  info: '#1E5C9B',
  oro: '#B7921A',
  textoPrimario: '#0A2540',
  textoSecundario: '#3A3F47',
  textoMuted: '#6B7280',
  textoSobrePrimario: '#FFFFFF',
  textoSobreAcento: '#FFFFFF',
  superficie: '#FFFFFF',
  superficieSecundaria: '#F7F8FA',
  superficieElevada: '#F8FAFE',
  borde: '#E8EBF0',
  fondo: '#F2F5F9',
  velo: 'rgba(0,0,0,0.45)',
  grafico: ['#0A2540', '#1E5C9B', '#3A85C9', '#9BB8D4', '#1B8A5A'],
  perfil: {
    conservador: '#14375E',
    moderado: '#C77700',
    agresivo: '#C0362C',
  },
};

const OSCURA: Paleta = {
  navy: '#16233A',
  primario: '#5B9BE0',
  azulMedio: '#7CB2E8',
  azulPalido: '#9FC8EE',
  acento: '#35C58A',
  exito: '#35C58A',
  advertencia: '#E0A33C',
  error: '#F1685C',
  info: '#7CB2E8',
  oro: '#D8B23F',
  textoPrimario: '#E8EEF7',
  textoSecundario: '#B6C0CF',
  textoMuted: '#8A97A8',
  // En oscuro el botón se aclara, así que su etiqueta se oscurece.
  textoSobrePrimario: '#0A1220',
  textoSobreAcento: '#06231A',
  superficie: '#121B2B',
  superficieSecundaria: '#1B2537',
  superficieElevada: '#1E293D',
  borde: '#2A3547',
  fondo: '#0A111D',
  velo: 'rgba(0,0,0,0.65)',
  grafico: ['#7CB2E8', '#5B9BE0', '#9FC8EE', '#6C829E', '#35C58A'],
  perfil: {
    conservador: '#6BA6E0',
    moderado: '#E0A33C',
    agresivo: '#F1685C',
  },
};

export const PALETA = { light: CLARA, dark: OSCURA } as const;
