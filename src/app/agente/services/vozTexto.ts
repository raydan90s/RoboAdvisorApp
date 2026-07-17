/**
 * El texto del agente, listo para que un TTS lo lea en voz alta.
 *
 * Es el análogo de `formatear()` del canal de WhatsApp (`services/whatsapp.py`): el mismo
 * problema, otra puerta de salida. El LLM redacta con markdown, y un `**` que en pantalla
 * es negrita, hablado son dos asteriscos pronunciados.
 *
 * REGLA QUE NO SE NEGOCIA: esto es presentación, no contenido. Quita marcas, nunca toca
 * un número. El guardarraíl del backend validó el texto EXACTO que devolvió; reescribir
 * "USD 12.000" a "doce mil dólares" sería mutar texto ya validado y romper justo la
 * garantía que hace que este proyecto valga. El TTS en español ya lee "12.000" como
 * "doce mil" solo.
 *
 * Idempotente y sin estado, como su gemelo de WhatsApp: pasar dos veces no hace daño.
 */

/** Un link markdown se lee como el texto, nunca como la URL: nadie quiere oír una URL. */
const LINK = /\[([^\]]+)\]\((?:[^)]+)\)/g;
/** `**negrita**` y `*cursiva*` (y sus gemelos con guion bajo). */
const ENFASIS = /(\*{1,3}|_{1,3})(\S(?:.*?\S)?)\1/g;
/** `código` entre backticks. */
const CODIGO = /`([^`]+)`/g;
/** Viñetas y encabezados: solo al principio de una línea, para no comerse un guion
 *  legítimo en medio de una frase ("largo-plazo"). */
const VINETA = /^[ \t]*[-*•]\s+/gm;
const ENCABEZADO = /^[ \t]*#{1,6}\s+/gm;
/** Una URL suelta, sin markdown alrededor. */
const URL_SUELTA = /\bhttps?:\/\/\S+/g;
/**
 * Emojis. Un TTS no los ignora: los NOMBRA. El 👋 del saludo de Broki se oye como "mano
 * saludando", así que la presentación empieza con ruido. En pantalla el emoji se queda; acá
 * se va, que es justo el reparto que hace este archivo.
 *
 * Se escribe con rangos de sustitutos y no con `\p{Emoji}` a propósito: la property escape
 * exige el flag `u` y depende del Unicode del motor, y esto corre sobre Hermes. Los rangos
 * son feos pero se comportan igual en todas partes. Cubre el plano astral (donde vive casi
 * todo emoji), los símbolos del BMP, y el selector de variación y el ZWJ que pegan las
 * familias y los tonos de piel —si se quedan sueltos, se leen como basura.
 */
const PICTOGRAMA = '(?:[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]|[\\u2190-\\u21FF\\u2300-\\u27BF\\u2B00-\\u2BFF])';
const EMOJI = new RegExp(`${PICTOGRAMA}[\\uFE0E\\uFE0F]?(?:\\u200D${PICTOGRAMA}[\\uFE0E\\uFE0F]?)*`, 'g');

export function textoParaVoz(texto: string): string {
  return (
    texto
      .replace(LINK, '$1')
      .replace(CODIGO, '$1')
      .replace(ENFASIS, '$2')
      .replace(ENCABEZADO, '')
      .replace(VINETA, '')
      .replace(URL_SUELTA, '')
      .replace(EMOJI, '')
      // Los saltos dobles se vuelven una pausa; sin esto el TTS lee todo de corrido.
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, '. ')
      // Una lista deja ". ." al quitar las viñetas: se colapsa a un solo punto.
      .replace(/\.\s*\.(\s*\.)*/g, '.')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}
