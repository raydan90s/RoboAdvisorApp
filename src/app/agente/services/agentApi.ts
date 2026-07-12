import http from '@/services/http';

/**
 * Cliente del agente conversacional. Espejo de `src/models/agent.py` del backend.
 *
 * Regla del proyecto: el front no interpreta ni recalcula nada de lo que dice el
 * agente. El texto y las fuentes vienen ya validados por el guardarraíl del backend;
 * acá solo se transportan y se pintan.
 */

export interface SourceChip {
  table: string;
  record_id: string;
  /** Ya viene listo para mostrar: "Depósito a Plazo Fijo 360 días · 60% · USD 12.000". */
  label: string;
}

export interface AgentChatResponse {
  texto: string;
  sources: SourceChip[];
  /** Evidencia anti-alucinación: el texto mostrado pasó el validador del banco. */
  guardrail_passed: boolean;
  /** El modelo de Gemini, la plantilla determinista o el rechazo por alcance. */
  modelo: string;
  en_alcance: boolean;
}

export interface AgentChatRequest {
  /** Sin sesión, el backend usa la última sesión completada del usuario del token. */
  session_id?: string;
  mensaje: string;
  /** Proveedor de IA elegido en el header ("google"|"openai"|"anthropic"). */
  provider?: string;
}

/** Un proveedor del catálogo. El backend NUNCA manda las API keys, solo si existen. */
export interface ProviderInfo {
  id: string;
  modelo: string;
  disponible: boolean;
  es_default: boolean;
}

/** Un turno de conversación. `provider` cambia el modelo en tiempo real. */
export function enviarMensaje(
  mensaje: string,
  sessionId?: string,
  provider?: string,
): Promise<AgentChatResponse> {
  const body: AgentChatRequest = { mensaje };
  if (sessionId) body.session_id = sessionId;
  if (provider) body.provider = provider;
  return http.post<AgentChatResponse>('/api/agent/chat', body);
}

/** Catálogo de proveedores para el selector del header. */
export function getProviders(): Promise<ProviderInfo[]> {
  return http.get<ProviderInfo[]>('/api/agent/providers');
}

/** La simulación sobre la que se pide consejo. Los números los recalcula el backend. */
export interface SimuladorRequest {
  monto: number;
  /** Horizonte de la simulación (el plazo de los depósitos es el suyo propio). */
  plazo_dias?: number;
  /** El producto que el usuario eligió al cambiar de banco o de fondo. */
  seleccion_code?: string;
  provider?: string;
}

export interface SimuladorResponse {
  /** El `code` que eligió el MOTOR (no el LLM): es el que el simulador destaca. */
  recomendado_code: string | null;
  texto: string;
  sources: SourceChip[];
  guardrail_passed: boolean;
  modelo: string;
}

/**
 * Recomendación de IA sobre la simulación en pantalla.
 *
 * El backend vuelve a pedir las tasas con el mismo `monto` y `plazo_dias` y se las pasa
 * al modelo ya calculadas: la IA cita exactamente las cifras que el usuario está viendo.
 * Por eso el front no manda ni un número calculado por él, solo lo que el usuario eligió.
 */
export function recomendarSimulacion(
  simulacion: SimuladorRequest,
): Promise<SimuladorResponse> {
  return http.post<SimuladorResponse>('/api/agent/simulador', simulacion);
}
