import http from '@/services/http';

import type { CatalogoConvenios, Orden } from '../types/orden';

/**
 * «Invertir ahora»: convierte la propuesta firmada en N instrucciones bancarias.
 *
 * La orden nace `sent` y sin referencias — el cliente decidió, el banco todavía no acusó.
 * Confirmarla es el segundo paso (`confirmarOrden`), y entre los dos está el momento en
 * que al asesor le entra el aviso.
 *
 * El servidor rechaza con 409 si la propuesta no está firmada, si ya se invirtió o si no
 * tiene monto; con 403 si no es tuya. Ninguna de esas reglas se chequea acá: se muestran
 * los mensajes que devuelve, que son los que traen el porqué.
 */
export function invertir(proposalId: string): Promise<Orden> {
  return http.post<Orden>(`/api/investor/proposals/${proposalId}/invest`, {});
}

/**
 * El acuse del banco: cada línea recibe su referencia.
 *
 * Lo llama la app cuando termina de mostrar la conexión con cada institución. Es
 * idempotente: si la red se cae a mitad y se reintenta, devuelve el mismo comprobante en
 * vez de fallar.
 */
export function confirmarOrden(orderId: string): Promise<Orden> {
  return http.post<Orden>(`/api/investor/orders/${orderId}/confirm`, {});
}

export function getOrden(orderId: string): Promise<Orden> {
  return http.get<Orden>(`/api/investor/orders/${orderId}`);
}

/**
 * La orden de una propuesta, o `null` si todavía no se ha invertido.
 *
 * `null` no es un error: es lo que decide si la pantalla de la propuesta pinta el botón
 * «Invertir ahora» o el comprobante. Por eso el backend responde 200 con null y no un 404.
 */
export function getOrdenDePropuesta(proposalId: string): Promise<Orden | null> {
  return http.get<Orden | null>(`/api/investor/proposals/${proposalId}/order`);
}

/**
 * Con qué instituciones hay convenio y cuánto cobra Brokeate por intermediar.
 *
 * Es la pantalla que contesta «¿me recomiendas al que más te paga?» sin pedir que nadie
 * confíe: una sola tasa, la misma para todas, y la lista de con quiénes trabajamos.
 */
export function getConvenios(): Promise<CatalogoConvenios> {
  return http.get<CatalogoConvenios>('/api/catalog/convenios');
}
