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
  /** Bautiza la subcuenta. Sin él, el flujo de una sola cartera sigue funcionando. */
  nombre_subcuenta?: string;
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
  /** El denominador del "12 / 15". Lo sirve la BD: si cambian los puntos de una opción,
   *  un 15 escrito acá pasaría a mentir. */
  puntaje_max: number | null;
  perfil_riesgo: PerfilRiesgo;
  respuestas: RespuestaDetalle[];
  monto: number | null;
  created_at: string | null;
}

// --- Subcuentas (GET /api/investor/{id}/subaccounts) ----------------------

/**
 * Una subcuenta es una sesión de perfilamiento con nombre: mismo dueño, su propio
 * monto, su propio perfil y su propia propuesta.
 */
export interface Subcuenta {
  session_id: string;
  proposal_id: string | null;
  nombre: string;
  monto: number;
  perfil: PerfilRiesgo;
  puntaje: number;
  puntaje_max: number | null;
  /** Null hasta que el cliente abre su propuesta: ahí es donde se materializa. */
  estado: EstadoPropuesta | null;
  /** El instrumento de mayor % — lo elige Postgres, no el front. */
  instrumento_principal: string | null;
  retorno_esperado_anual: number | null;
}

/**
 * `sin_asignar` viene del servidor y no se recalcula acá: es el número contra el que
 * el backend valida el monto de una subcuenta nueva, y dos versiones del mismo número
 * son una discrepancia esperando ocurrir.
 *
 * `capital_total` en null = el cliente nunca declaró su capital. No es lo mismo que
 * cero, y la pantalla lo dibuja distinto.
 */
export interface ResumenCapital {
  capital_total: number | null;
  asignado: number;
  sin_asignar: number | null;
  subcuentas: Subcuenta[];
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

/** Una línea del PUT /api/investor/proposals/{id}/allocation. */
export interface LineaAsignacion {
  instrumento_code: string;
  porcentaje: number;
}

export interface PortfolioProposal {
  proposal_id: string;
  investor_id: string;
  session_id: string;
  perfil_riesgo: PerfilRiesgo;
  puntaje: number;
  puntaje_max: number | null;
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
