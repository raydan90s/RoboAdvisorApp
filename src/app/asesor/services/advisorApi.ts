import http from '@/services/http';

import type {
  ColaItem,
  EventoAuditoria,
  PropuestaDetalle,
  RevisionRequest,
  RevisionResultado,
} from '../types/asesor';

/** Todo esto exige `role='advisor'` en el JWT: un inversionista recibe 403. */

export function getCola(): Promise<ColaItem[]> {
  return http.get<ColaItem[]>('/api/advisor/queue');
}

export function getPropuesta(proposalId: string): Promise<PropuestaDetalle> {
  return http.get<PropuestaDetalle>(`/api/advisor/proposals/${proposalId}`);
}

/**
 * Una propuesta se decide **una sola vez**: si ya tiene decisión, el backend responde
 * 409 y no sobrescribe nada. El front no debe reintentar ese 409 — debe mostrarlo.
 */
export function revisarPropuesta(
  proposalId: string,
  body: RevisionRequest,
): Promise<RevisionResultado> {
  return http.post<RevisionResultado>(
    `/api/advisor/proposals/${proposalId}/review`,
    body,
  );
}

export function getAuditoria(limite = 100): Promise<EventoAuditoria[]> {
  return http.get<EventoAuditoria[]>(`/api/audit?limite=${limite}`);
}
