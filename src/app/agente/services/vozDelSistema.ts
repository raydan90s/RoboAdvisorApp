import { VoiceQuality, type Voice } from 'expo-speech';

/**
 * Cuál de las voces del teléfono lee la respuesta.
 *
 * `Speech.speak({ language: 'es-MX' })` a secas deja la elección al sistema, y el sistema
 * varía por marca, por motor de TTS y por qué idiomas descargó el dueño. En el mejor caso
 * suena distinto en cada equipo; en el peor no hay ninguna voz española instalada y el
 * motor lee el español con fonemas en inglés —"doce mil dólares" sale ininteligible—.
 *
 * EL CRITERIO ES LA CONSISTENCIA, NO LA CALIDAD. Suena contraintuitivo, así que vale
 * escribirlo: preferir la voz "mejor" es exactamente lo que hace que la app suene distinta
 * en cada teléfono, porque las voces buenas son las raras. Si un equipo tiene es-EC y otro
 * no, preferir es-EC los separa. Se prefiere la voz que está en TODOS.
 *
 * Por eso `es-US` va primero y no `es-MX`, que sería lo obvio para Ecuador: Google TTS
 * —el motor de facto en Android— ship ea `es-ES` y `es-US`, no `es-MX`. Pedir es-MX en un
 * Android hace que el sistema caiga a lo que le parezca, que es justo lo que se quiere
 * evitar. es-US es la voz latina neutra que sí está en todos lados.
 *
 * `null` es una respuesta válida: significa que este teléfono no tiene ninguna voz
 * española y el llamador debe avisar en vez de hablar basura.
 */

/**
 * De más a menos común, NO de mejor a peor. Cada entrada existe porque está presente en
 * casi todos los equipos de su plataforma:
 *   es-US  → Google TTS (Android). Latina neutra. La apuesta principal.
 *   es-MX  → Apple (Paulina). Es la latina de iOS; Android normalmente no la tiene.
 *   es-419 → tag macro de "español latinoamericano"; algunos motores lo usan.
 *   es-ES  → está en TODAS las plataformas. Se entiende perfecto aunque suene peninsular:
 *            es la red de seguridad, por eso va última y no fuera.
 *
 * Las variantes por país (es-EC, es-CO, es-PE…) están omitidas A PROPÓSITO: son raras, y
 * preferirlas haría que dos teléfonos suenen distinto. Ese es el bug que este archivo
 * existe para evitar.
 */
const PREFERENCIA = ['es-us', 'es-mx', 'es-419', 'es-es'];

/** Un español de un país que no está en la lista: mejor que nada, peor que la lista. */
const CASTELLANO_GENERICO = 90;
const NO_SIRVE = 999;

/**
 * Android puede devolver `es_MX`, `spa-MEX` o `es-mx` según el motor; iOS devuelve
 * `es-MX`. Se compara todo en minúsculas y con guiones.
 */
function normalizar(idioma: string): string {
  return idioma.trim().toLowerCase().replace(/_/g, '-');
}

/** `spa` es ISO 639-2: algunos motores de Android lo usan en vez de `es`. */
function esEspanol(idioma: string): boolean {
  return /^(es|spa)(-|$)/.test(idioma);
}

/** ISO 639-2 con región de tres letras (`spa-mex`) → el `es-mx` de la lista. */
const REGION_3A2: Record<string, string> = {
  usa: 'us',
  mex: 'mx',
  esp: 'es',
};

function puntaje(idioma: string): number {
  const l = normalizar(idioma);
  if (!esEspanol(l)) return NO_SIRVE;

  const directo = PREFERENCIA.indexOf(l);
  if (directo >= 0) return directo;

  if (l.startsWith('spa')) {
    const region = REGION_3A2[l.split('-')[1] ?? ''];
    const equivalente = region ? PREFERENCIA.indexOf(`es-${region}`) : -1;
    if (equivalente >= 0) return equivalente;
  }

  return CASTELLANO_GENERICO;
}

/**
 * La mejor voz española del teléfono según el criterio de arriba, o `null` si no hay.
 *
 * A igual idioma gana `Enhanced`. Es el único punto donde se prefiere calidad sobre
 * consistencia, y es aceptable porque solo aplica en iOS (las voces de alta calidad son
 * descargables) y porque un mismo idioma con dos calidades sigue siendo la MISMA voz,
 * solo mejor muestreada.
 */
export function elegirVozEspanol(voces: Voice[]): Voice | null {
  let mejor: Voice | null = null;
  let mejorPuntaje = NO_SIRVE;
  let mejorEsEnhanced = false;

  for (const voz of voces) {
    const p = puntaje(voz.language);
    if (p === NO_SIRVE) continue;

    const enhanced = voz.quality === VoiceQuality.Enhanced;
    const ganaPorIdioma = p < mejorPuntaje;
    const ganaPorCalidad = p === mejorPuntaje && enhanced && !mejorEsEnhanced;

    if (mejor === null || ganaPorIdioma || ganaPorCalidad) {
      mejor = voz;
      mejorPuntaje = p;
      mejorEsEnhanced = enhanced;
    }
  }

  return mejor;
}
