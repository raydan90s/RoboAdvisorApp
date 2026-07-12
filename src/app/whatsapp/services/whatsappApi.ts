import http from '@/services/http';

/**
 * Cliente del canal de WhatsApp. Espejo de `src/models/whatsapp.py` del backend.
 *
 * El código de vinculación lo genera el SERVIDOR, no el front: es la credencial que
 * convierte un número de teléfono (que no prueba nada) en el dueño de una cartera.
 * Fabricarlo acá sería fabricar la llave del lado de la puerta que se quiere proteger.
 */

export interface LinkCode {
  code: string;
  expira_en_segundos: number;
  /** El mensaje ya armado: "VINCULAR 123456". */
  instruccion: string;
}

export interface WhatsAppStatus {
  vinculado: boolean;
  /** Enmascarado por el backend: "+593•••9999". El número completo no vuelve nunca. */
  telefono: string | null;
  linked_at: string | null;
}

/** Un código de un solo uso, válido diez minutos. Pedir uno nuevo invalida el anterior. */
export function pedirCodigo(): Promise<LinkCode> {
  return http.post<LinkCode>('/api/whatsapp/link-code', {});
}

export function getEstado(): Promise<WhatsAppStatus> {
  return http.get<WhatsAppStatus>('/api/whatsapp/status');
}

export function desvincular(): Promise<WhatsAppStatus> {
  return http.delete<WhatsAppStatus>('/api/whatsapp/link');
}
