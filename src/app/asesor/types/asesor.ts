/**
 * Espejo de `src/models/advisor.py`.
 *
 * La HU3 exige que cada decisión quede con **fecha**, **versión de reglas** y
 * **responsable**. Esos tres campos viajan en `RevisionResultado` y en cada
 * `RevisionPrevia`: no son metadatos opcionales, son el criterio de aceptación.
 */

import type {
  EstadoPropuesta,
  NivelRiesgo,
} from '@/app/inversionista/types/inversionista';

export type Decision = 'approved' | 'edited' | 'rejected';

// --- Cola (GET /api/advisor/queue) ---------------------------------------

/** Solo trae propuestas en `pending_review`: decidir una la saca de la cola. */
export interface ColaItem {
  proposal_id: string;
  session_id: string;
  investor_id: string;

  investor_nombre: string;
  cedula_ruc: string | null;

  puntaje: number | null;
  perfil_riesgo: string | null;
  riesgo_esperado: NivelRiesgo;
  estado: EstadoPropuesta;

  monto_total: number | null;
  explicacion: string | null;
  creada_en: string;
}

// --- Detalle (GET /api/advisor/proposals/{id}) ---------------------------

export interface LineaPropuesta {
  instrumento_code: string;
  nombre: string;
  tipo_producto: string | null;
  riesgo: NivelRiesgo;
  porcentaje: number;
  monto_asignado: number | null;
  retorno_esperado: number | null;
  plazo_dias: number | null;

  institucion: string;
  calificacion: string;
  calificacion_fuente: string | null;
  calificacion_fecha: string | null;

  /** Mínimo de acceso del producto. Si el monto asignado no llega, sale una bandera. */
  monto_minimo: number | null;
}

export interface RevisionPrevia {
  review_id: string;
  decision: Decision;
  comments: string | null;
  advisor_id: string;
  advisor_nombre: string | null;
  rules_version: string | null;
  decided_at: string;
}

/** Una refutación del inversionista: por qué devolvió a la cola una decisión firmada. */
export interface RefutacionPrevia {
  comments: string | null;
  /** Qué decisión estaba contestando ('approved' o 'edited'). */
  estado_refutado: string | null;
  investor_nombre: string | null;
  refutada_en: string;
}

export interface PropuestaDetalle {
  proposal_id: string;
  session_id: string;
  investor_id: string;

  investor_nombre: string;
  investor_email: string | null;
  cedula_ruc: string | null;

  puntaje: number | null;
  perfil_riesgo: string | null;
  riesgo_esperado: NivelRiesgo;
  estado: EstadoPropuesta;

  monto_total: number | null;
  explicacion: string | null;
  creada_en: string;

  allocations: LineaPropuesta[];

  /** Comparaciones contra la base, sin IA: es el "resumen al asesor" de la HU3. */
  banderas: string[];

  revisiones: RevisionPrevia[];
  /** Las veces que el cliente devolvió una decisión firmada, con su motivo. */
  refutaciones: RefutacionPrevia[];
}

// --- Decisión (POST /api/advisor/proposals/{id}/review) ------------------

export interface LineaEditada {
  instrumento_code: string;
  porcentaje: number;
}

export interface RevisionRequest {
  decision: Decision;
  comments?: string;
  /** Solo con `decision: 'edited'`. Debe sumar exactamente 100 (lo revalida el backend). */
  edited_allocation?: LineaEditada[];
}

export interface RevisionResultado {
  review_id: string;
  proposal_id: string;
  decision: Decision;
  estado: EstadoPropuesta;

  advisor_id: string;
  advisor_nombre: string;
  rules_version: string;
  decided_at: string;

  comments: string | null;
  allocations: LineaPropuesta[];
}

// --- Auditoría (GET /api/audit) ------------------------------------------

export interface EventoAuditoria {
  id: string;
  created_at: string;
  entity_type: string;
  entity_id: string;
  action: string;
  platform: string;
  metadata: Record<string, unknown> | null;
  actor_nombre: string | null;
  actor_rol: string | null;
}
