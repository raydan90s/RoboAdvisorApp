import http from '@/services/http';

import type {
  Investor,
  InvestorProfileCreate,
  LineaAsignacion,
  PortfolioProposal,
  Pregunta,
  ProfilingBreakdown,
  ResumenCapital,
} from '../types/inversionista';

/** El cuestionario lo sirve la BD: cambiar una opción no exige tocar el front. */
export function getPreguntas(): Promise<Pregunta[]> {
  return http.get<Pregunta[]>('/api/investor/questions');
}

/** Autenticado: el perfilamiento se le adjunta al usuario del token. */
export function crearPerfil(payload: InvestorProfileCreate): Promise<Investor> {
  return http.post<Investor>('/api/investor/profile', payload);
}

/**
 * La primera llamada genera la propuesta (y con ella el texto de Gemini).
 *
 * Sin `sessionId` devuelve la sesión más reciente — así la pantalla de una sola cartera
 * sigue funcionando sin cambios mientras existen las subcuentas.
 */
export function getPropuesta(
  investorId: string,
  sessionId?: string,
): Promise<PortfolioProposal> {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
  return http.get<PortfolioProposal>(`/api/investor/${investorId}/portfolio${query}`);
}

/** Las subcuentas del cliente y el reparto de su capital. Las tres cifras las suma SQL. */
export function getSubcuentas(investorId: string): Promise<ResumenCapital> {
  return http.get<ResumenCapital>(`/api/investor/${investorId}/subaccounts`);
}

/** Fija el techo de capital. Devuelve el reparto ya recalculado por el servidor. */
export function fijarCapital(capitalTotal: number): Promise<ResumenCapital> {
  return http.post<ResumenCapital>('/api/investor/capital', {
    capital_total: capitalTotal,
  });
}

/**
 * El cliente arma su mezcla: agrega, quita o repondera fondos. El servidor exige
 * suma 100, catálogo cerrado y elegibilidad del perfil; devuelve la propuesta ya
 * reescrita (sigue `pending_review`: el asesor conserva la última palabra).
 */
export function editarAsignacion(
  proposalId: string,
  allocations: LineaAsignacion[],
): Promise<PortfolioProposal> {
  return http.put<PortfolioProposal>(
    `/api/investor/proposals/${proposalId}/allocation`,
    { allocations },
  );
}

/**
 * El cliente corrige las respuestas de un perfilamiento que ya hizo.
 *
 * El servidor vuelve a puntuar contra las reglas activas, regenera la propuesta con la
 * plantilla del perfil nuevo y la deja en `pending_review`: reaparece en la cola del
 * asesor. Por eso se permite incluso si ya la había decidido —esa decisión se tomó con
 * un insumo que el cliente acaba de corregir— y por eso la decisión previa no se borra:
 * queda en el historial de la propuesta.
 *
 * Responde con el desglose ya recalculado: el mismo que pinta esta pantalla.
 */
export function editarPerfil(
  sessionId: string,
  respuestas: Record<string, string>,
): Promise<ProfilingBreakdown> {
  return http.put<ProfilingBreakdown>(
    `/api/investor/sessions/${encodeURIComponent(sessionId)}/profile`,
    { respuestas },
  );
}

export function getBreakdown(
  investorId: string,
  sessionId?: string,
): Promise<ProfilingBreakdown> {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
  return http.get<ProfilingBreakdown>(`/api/investor/${investorId}/breakdown${query}`);
}

export function getInvestor(investorId: string): Promise<Investor> {
  return http.get<Investor>(`/api/investor/${investorId}`);
}
