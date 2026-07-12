/**
 * Formateo para pantalla. No hace aritmética de negocio: los USD de cada línea los
 * calcula Postgres (`round(total_amount * percentage / 100, 2)`), acá solo se pintan.
 *
 * Se agrupa a mano en vez de con `Intl` porque el mismo bundle corre en Hermes (móvil)
 * y en el navegador, y el ICU de Hermes no garantiza el mismo resultado en ambos.
 */

const MESES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/** 12000 → "USD 12.000" · 8500.5 → "USD 8.500,50" (formato ecuatoriano). */
export function usd(monto: number | null | undefined): string {
  if (monto == null || Number.isNaN(monto)) return '—';

  const negativo = monto < 0;
  const [entero, decimales] = Math.abs(monto).toFixed(2).split('.');
  const agrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cola = decimales === '00' ? '' : `,${decimales}`;

  return `${negativo ? '-' : ''}USD ${agrupado}${cola}`;
}

/** 60 → "60%" · 12.5 → "12,5%" */
export function porcentaje(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return '—';
  const redondeado = Math.round(valor * 100) / 100;
  return `${String(redondeado).replace('.', ',')}%`;
}

/** "2026-06-30" → "30-jun-2026". Fecha de la calificación: siempre visible. */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, '0')}-${MESES[m - 1]}-${y}`;
}

/** "2026-07-11T14:03:00Z" → "11-jul-2026 · 14:03" (auditoría y revisiones). */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const hh = String(fecha.getHours()).padStart(2, '0');
  const mm = String(fecha.getMinutes()).padStart(2, '0');
  return `${String(fecha.getDate()).padStart(2, '0')}-${
    MESES[fecha.getMonth()]
  }-${fecha.getFullYear()} · ${hh}:${mm}`;
}

/**
 * "2026-07-11T14:03:22Z" → "11-jul-2026 · 14:03:22". Con segundos: en el detalle de un
 * evento auditado, dos decisiones del mismo minuto tienen que poder distinguirse.
 */
export function fechaHoraLarga(iso: string | null | undefined): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const ss = String(fecha.getSeconds()).padStart(2, '0');
  return `${fechaHora(iso)}:${ss}`;
}

/** 360 → "360 días" · null → "Sin plazo fijo" (los fondos no tienen plazo). */
export function plazo(dias: number | null | undefined): string {
  return dias == null ? 'Sin plazo fijo' : `${dias} días`;
}

/**
 * 12 y 15 → "12 / 15 puntos". El máximo lo sirve la BD (es el mayor `max_score` de la
 * versión de reglas con la que se puntuó esa sesión), así que si un día cambian los
 * puntajes esta cifra cambia sola. Si no viene, se muestra el puntaje solo: es mejor no
 * decir el denominador que inventarlo.
 */
export function puntos(puntaje: number, maximo: number | null | undefined): string {
  return maximo == null ? `${puntaje} puntos` : `${puntaje} / ${maximo} puntos`;
}

/**
 * Lo que se pinta de vuelta en un input de monto mientras el usuario teclea:
 * "10000" → "10.000" · "1234,5" → "1.234,5".
 *
 * El punto es **solo** separador de miles y la coma es el decimal (igual que en
 * `montoANumero`, que es quien lee esto de vuelta), así que los puntos que ya venían del
 * formateo anterior se descartan y se reagrupa desde cero en cada tecla. Se conserva la
 * coma aunque todavía no tenga decimales detrás — si no, no habría forma de escribirlos.
 */
export function montoConSeparadores(texto: string): string {
  const [entero = '', ...resto] = texto.replace(/[^\d,]/g, '').split(',');

  const agrupado = entero
    .replace(/^0+(?=\d)/, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (resto.length === 0) return agrupado;
  return `${agrupado || '0'},${resto.join('').slice(0, 2)}`;
}

/**
 * "20.000" o "20000" → 20000. El usuario escribe con separadores ecuatorianos y la API
 * espera un número; esto es lectura de un input, no aritmética de negocio.
 */
export function montoANumero(texto: string): number {
  const limpio = texto
    .replace(/[^\d,.]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : 0;
}
