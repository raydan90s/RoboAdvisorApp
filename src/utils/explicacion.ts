/**
 * Le da forma al único texto libre de la app: la explicación que redacta Gemini (o, si el
 * guardarraíl la rechaza, la plantilla determinista del backend).
 *
 * El backend la entrega como **un solo párrafo** —el prompt lo pide así, y la plantilla de
 * respaldo encima encadena toda la cartera con punto y coma—, así que en pantalla llegaba
 * como un muro de texto. Acá no se reescribe nada: se parte en frases, se separa la lista
 * de productos y se decide qué se ve sin expandir. El texto que se muestra siempre es un
 * subconjunto literal del que validó el guardarraíl — no se resume con otras palabras,
 * porque eso sería volver a escribir números que la base ya calculó.
 */

/**
 * Los USD van en formato ecuatoriano ("USD 12.000"), así que el punto no siempre cierra
 * frase. Mientras se parte, los puntos que están entre dígitos se cambian por NUL —que no
 * aparece en ningún texto real— y al final vuelven a su lugar.
 */
const SENTINELA = String.fromCharCode(0);

/** "40% (USD 4.000) en …": así empieza cada línea de cartera de la plantilla determinista. */
const ITEM = /^\d+([.,]\d+)?\s*%/;

/** Si la primera frase no llega a este largo, el resumen se lleva también la segunda. */
const RESUMEN_MIN = 90;

export type BloqueExplicacion =
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'lista'; items: string[] };

export interface ExplicacionFormateada {
  /** Lo que se lee sin expandir: las primeras frases, tal cual las escribió el modelo. */
  resumen: string;
  /** El resto, ya formateado. Vacío = el texto entraba entero en el resumen. */
  detalle: BloqueExplicacion[];
}

/**
 * El backend **siempre** anexa el disclaimer al texto (`ai_agent.DISCLAIMER`), y la pantalla
 * ya lo muestra fijo arriba en su propio banner. Repetirlo dentro del párrafo no agrega una
 * advertencia: agrega ruido. Se quita del texto, no de la pantalla.
 */
function esDisclaimer(frase: string): boolean {
  return /no constituye una orden/i.test(frase);
}

/** Parte en frases sin romper "USD 12.000" ni "1.5%". Sin lookbehind: Hermes es tacaño. */
function frases(texto: string): string[] {
  const protegido = texto.replace(/(\d)\.(\d)/g, `$1${SENTINELA}$2`);
  return (protegido.match(/[^.!?]+[.!?]*/g) ?? [])
    .map((f) => f.split(SENTINELA).join('.').trim())
    .filter(Boolean);
}

/**
 * Una frase del tipo "te proponemos una cartera de riesgo medio: 40% en X; 30% en Y" es la
 * lista de productos disfrazada de prosa. Si todos los segmentos empiezan con un porcentaje,
 * se pinta como lista; si no, se deja el párrafo intacto (Gemini no siempre escribe así).
 */
function bloques(frase: string): BloqueExplicacion[] {
  const corte = frase.indexOf(':');
  if (corte > 0) {
    const items = frase
      .slice(corte + 1)
      .split(';')
      .map((p) => p.trim().replace(/[.;]+$/, ''))
      .filter(Boolean);

    if (items.length >= 2 && items.every((p) => ITEM.test(p))) {
      return [
        { tipo: 'parrafo', texto: frase.slice(0, corte).trim() },
        { tipo: 'lista', items },
      ];
    }
  }
  return [{ tipo: 'parrafo', texto: frase }];
}

export interface OpcionesExplicacion {
  /**
   * Dejar el disclaimer dentro del texto. Lo usa el asesor: su pantalla no tiene el banner
   * y es de auditoría, así que al expandir tiene que leer **exactamente** lo que leyó el
   * cliente, disclaimer incluido. El inversionista sí tiene el banner arriba, y ahí la
   * frase repetida sobra.
   */
  conservarDisclaimer?: boolean;
}

export function formatearExplicacion(
  texto: string | null | undefined,
  { conservarDisclaimer = false }: OpcionesExplicacion = {}
): ExplicacionFormateada {
  const partes = frases((texto ?? '').replace(/\s+/g, ' ').trim()).filter(
    (f) => conservarDisclaimer || !esDisclaimer(f)
  );

  if (partes.length === 0) return { resumen: '', detalle: [] };

  // El resumen es la primera frase; si es un saludo corto ("Hola Ana:"), se lleva también
  // la segunda para no dejar una tarjeta que no dice nada.
  const cuantas = partes[0].length < RESUMEN_MIN && partes.length > 1 ? 2 : 1;

  return {
    resumen: partes.slice(0, cuantas).join(' '),
    detalle: partes.slice(cuantas).flatMap(bloques),
  };
}
