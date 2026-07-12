import http from '@/services/http';

/** Espejo de `src/models/feed.py`. Cada noticia llega citada: fuente + fecha + link. */

export type TemaFeed = 'mercados' | 'cripto' | 'materias' | 'ecuador';

export interface NoticiaFeed {
  titulo: string;
  descripcion: string | null;
  url: string;
  /** URL de la imagen del artículo. Null en el respaldo: se pinta el visual del tema. */
  imagen: string | null;
  fuente: string;
  /** ISO 8601. Null en el respaldo (una noticia de referencia no finge ser de hoy). */
  fecha: string | null;
  tema: string;
}

export interface FeedResponse {
  tema: string;
  /** "gnews" = en vivo · "respaldo" = titulares de referencia (API caída o sin key). */
  fuente_datos: 'gnews' | 'respaldo';
  actualizado_en: string;
  noticias: NoticiaFeed[];
}

/** Noticias por tema. El backend cachea 1h y degrada al respaldo: nunca lanza 500. */
export function getFeed(tema: TemaFeed): Promise<FeedResponse> {
  return http.get<FeedResponse>(`/api/feed?tema=${tema}`);
}
