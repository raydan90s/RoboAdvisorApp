import http from '@/services/http';

import type {
  Investor,
  InvestorProfileCreate,
  PortfolioProposal,
  Pregunta,
  ProfilingBreakdown,
} from '../types/inversionista';

/** El cuestionario lo sirve la BD: cambiar una opción no exige tocar el front. */
export function getPreguntas(): Promise<Pregunta[]> {
  return http.get<Pregunta[]>('/api/investor/questions');
}

/** Autenticado: el perfilamiento se le adjunta al usuario del token. */
export function crearPerfil(payload: InvestorProfileCreate): Promise<Investor> {
  return http.post<Investor>('/api/investor/profile', payload);
}

/** La primera llamada genera la propuesta (y con ella el texto de Gemini). */
export function getPropuesta(investorId: string): Promise<PortfolioProposal> {
  return http.get<PortfolioProposal>(`/api/investor/${investorId}/portfolio`);
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
