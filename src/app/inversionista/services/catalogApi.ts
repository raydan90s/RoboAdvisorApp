import http from '@/services/http';

import type { CatalogoTasas } from '../types/catalogo';

/**
 * Tasas del catálogo con la elegibilidad del perfil del usuario del token.
 * Con `monto`, Postgres devuelve además interés estimado y monto final por producto:
 * el simulador no multiplica nada en el cliente.
 */
export function getTasas(opciones?: {
  monto?: number;
  plazoDias?: number;
  /**
   * Apaga el filtro por plazo: vuelve TODO el catálogo, y `plazoDias` queda solo como
   * horizonte de los fondos (los depósitos se estiman con su propio plazo). Lo usa el
   * simulador, que necesita todas las opciones para poder cambiar de banco o de fondo;
   * el comparador no lo manda, porque ahí el plazo sí es un filtro.
   */
  todosLosPlazos?: boolean;
}): Promise<CatalogoTasas> {
  const query = new URLSearchParams();
  if (opciones?.monto != null) query.set('monto', String(opciones.monto));
  if (opciones?.plazoDias != null) query.set('plazo_dias', String(opciones.plazoDias));
  if (opciones?.todosLosPlazos) query.set('todos_los_plazos', 'true');
  const qs = query.toString();

  return http.get<CatalogoTasas>(`/api/catalog/rates${qs ? `?${qs}` : ''}`);
}
