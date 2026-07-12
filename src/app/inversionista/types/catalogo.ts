/** Contrato de GET /api/catalog/rates (comparador y simulador). */

export interface TasaInstrumento {
  code: string;
  producto: string;
  product_type: 'deposito_plazo' | 'fondo_inversion' | null;
  institucion: string;
  calificacion: string;
  rating_tier: number;
  fuente_calificacion: string | null;
  fecha_calificacion: string | null;
  /** Referencial. La calcula el catálogo, el front solo la pinta. */
  tasa_anual: number;
  plazo_dias: number | null;
  monto_minimo: number | null;

  /** null si el usuario aún no tiene perfil: no hay regla que aplicar. */
  elegible: boolean | null;
  /** El `rationale` versionado de la regla de elegibilidad, no un texto del front. */
  motivo_no_elegible: string | null;

  /** Solo cuando el request llevó ?monto=. Los calcula Postgres (regla 4 del equipo). */
  cumple_monto_minimo: boolean | null;
  interes_estimado: number | null;
  monto_final: number | null;

  /**
   * La opción que el MOTOR recomienda para ese monto (mayor tasa entre lo elegible que
   * cubre el mínimo). La elige el backend, no el front ni el LLM: así la tarjeta
   * destacada y lo que explica la IA son siempre la misma fila.
   */
  recomendado: boolean;
}

export interface CatalogoTasas {
  perfil: string | null;
  monto: number | null;
  plazo_dias: number | null;
  tasas: TasaInstrumento[];
}
