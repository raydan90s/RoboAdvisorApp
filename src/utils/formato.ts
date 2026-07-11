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

/** 360 → "360 días" · null → "Sin plazo fijo" (los fondos no tienen plazo). */
export function plazo(dias: number | null | undefined): string {
  return dias == null ? 'Sin plazo fijo' : `${dias} días`;
}
