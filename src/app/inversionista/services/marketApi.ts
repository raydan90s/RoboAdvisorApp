import http from '@/services/http';

/**
 * Cotizaciones de mercados externos. Espejo de `src/models/market.py` del backend.
 *
 * Deliberadamente separado de `investorApi.ts`: estos instrumentos NO están en el
 * catálogo del banco y nunca deben mezclarse con una propuesta real.
 */
export interface MarketQuote {
  symbol: string;
  price: number;
  change_percent: number;
  /** "alpha_vantage" (en vivo) o "mock" (respaldo simulado, ver market_data.py). */
  source: 'alpha_vantage' | 'mock';
  as_of: string;
}

interface MarketQuotesResponse {
  quotes: MarketQuote[];
}

/** Sin `symbols`, el backend devuelve los 5 del ticker (BTCUSD, XAUUSD, JPN225, SPY, EURUSD). */
export function getCotizaciones(symbols?: string[]): Promise<MarketQuote[]> {
  const query = symbols?.length ? `?symbols=${encodeURIComponent(symbols.join(','))}` : '';
  return http
    .get<MarketQuotesResponse>(`/api/market/quotes${query}`)
    .then((r) => r.quotes);
}

export interface HistoricalPoint {
  /** "YYYY-MM-DD" */
  date: string;
  close: number;
}

export interface HistoricalSeries {
  symbol: string;
  /** "alpha_vantage" (en vivo) o "mock" (respaldo simulado si se agotó la cuota). */
  source: 'alpha_vantage' | 'mock';
  points: HistoricalPoint[];
}

/** La serie diaria de un símbolo, para el gráfico del simulador de mercados. */
export function getHistorico(symbol: string, days = 30): Promise<HistoricalSeries> {
  return http.get<HistoricalSeries>(
    `/api/market/history?symbol=${encodeURIComponent(symbol)}&days=${days}`,
  );
}
