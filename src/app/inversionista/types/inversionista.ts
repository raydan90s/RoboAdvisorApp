/**
 * Espejo de `src/models/investor.py`. Si un campo cambia allá, cambia acá.
 *
 * Regla del proyecto: **el front no calcula nada**. Ni puntajes, ni porcentajes, ni
 * los USD de cada línea. Todo lo que se pinta viene ya calculado por Postgres; estos
 * tipos existen para transportarlo, no para derivarlo.
 */

export type PerfilRiesgo = 'conservador' | 'moderado' | 'agresivo';
export type NivelRiesgo = 'bajo' | 'medio' | 'alto';
export type EstadoPropuesta = 'pending_review' | 'approved' | 'edited' | 'rejected';

// --- Cuestionario (GET /api/investor/questions) ---------------------------

export interface OpcionPregunta {
  code: string;
  label: string;
}

export interface Pregunta {
  code: string;
  text: string;
  opciones: OpcionPregunta[];
}

// --- Perfilamiento (POST /api/investor/profile) ---------------------------

/** El nombre y el email NO viajan: los pone el token (ver Fase 5B del PLAN). */
export interface InvestorProfileCreate {
  monto: number;
  cedula_ruc?: string;
  /** { question_code: option_code } */
  respuestas: Record<string, string>;
}

export interface RespuestaDetalle {
  pregunta_code: string;
  pregunta_text: string;
  opcion_code: string;
  opcion_label: string;
  puntos: number;
}

export interface Investor {
  investor_id: string;
  session_id: string;
  nombre: string;
  email: string | null;
  cedula_ruc: string | null;
  puntaje: number;
  perfil_riesgo: PerfilRiesgo;
  respuestas: RespuestaDetalle[];
  monto: number | null;
  created_at: string | null;
}

// --- Propuesta (GET /api/investor/{id}/portfolio) -------------------------

export interface AssetAllocation {
  instrumento_code: string;
  nombre: string;
  clase_activo: string;
  riesgo: NivelRiesgo;
  porcentaje: number;
  retorno_esperado: number | null;

  monto_asignado: number | null;
  plazo_dias: number | null;

  institucion: string | null;
  /** Referencial. Nunca se muestra sin `calificacion_fuente` y `calificacion_fecha`. */
  calificacion: string | null;
  calificacion_fuente: string | null;
  calificacion_fecha: string | null;
}

export interface PortfolioProposal {
  proposal_id: string;
  investor_id: string;
  session_id: string;
  perfil_riesgo: PerfilRiesgo;
  puntaje: number;
  riesgo_esperado: NivelRiesgo;
  estado: EstadoPropuesta;
  monto_total: number | null;
  allocations: AssetAllocation[];
  retorno_esperado_anual: number | null;
  /** Lo único que redacta el LLM, y solo después de pasar el guardarraíl. */
  explicacion: string | null;
}

// --- "¿Cómo se calculó?" (GET /api/investor/{id}/breakdown) ---------------

export interface BreakdownRespuesta {
  question_code: string;
  question_text: string;
  option_code: string;
  option_label: string;
  puntos: number;
}

export interface ProfilingBreakdown {
  session_id: string;
  investor_id: string;
  puntaje: number;
  monto: number | null;
  rules_version: string;
  perfil_code: PerfilRiesgo | null;
  perfil_nombre: string | null;
  umbral_min: number | null;
  umbral_max: number | null;
  /** "Tu perfil admite instituciones hasta AA", en las palabras de la BD. */
  regla_institucion: string | null;
  max_rating_tier: number | null;
  respuestas: BreakdownRespuesta[];
}
