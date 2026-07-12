import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { COLORES } from '@/constants/colores';

import { getCotizaciones, type MarketQuote } from '../services/marketApi';

/**
 * Ticker de mercados externos (BTCUSD, XAUUSD, JPN225, SPY, EURUSD) para el dashboard
 * del inversionista. Datos de `GET /api/market/quotes` — Alpha Vantage cacheado 1h en
 * el backend, con respaldo simulado si la cuota gratuita se agota (`market_data.py`).
 *
 * Deliberadamente fuera de las tarjetas de subcuentas: estos instrumentos NO están en
 * el catálogo del banco, son solo referencia de mercado.
 */

// Nombre corto para la tarjeta: el símbolo crudo (BTCUSD) no siempre dice qué es.
const ETIQUETA: Record<string, string> = {
  BTCUSD: 'Bitcoin',
  XAUUSD: 'Oro',
  JPN225: 'Nikkei 225',
  SPY: 'S&P 500 (SPY)',
  EURUSD: 'EUR/USD',
};

/** Bitcoin y el Nikkei no llevan decimales legibles con 2 cifras; forex sí necesita 4. */
function formatearPrecio(q: MarketQuote): string {
  const decimales = q.price < 10 ? 4 : q.price > 1000 ? 0 : 2;
  const partes = q.price.toFixed(decimales).split('.');
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `USD ${partes.join(',')}`;
}

function Tarjeta({ cotizacion }: { cotizacion: MarketQuote }) {
  const sube = cotizacion.change_percent > 0;
  const baja = cotizacion.change_percent < 0;
  const color = sube ? COLORES.exito : baja ? COLORES.error : COLORES.textoMuted;

  return (
    <View className="w-36 gap-1.5 rounded-2xl border border-surface-border bg-surface-background p-3.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-caption font-bold uppercase text-text-secondary">
          {cotizacion.symbol}
        </Text>
        {cotizacion.source === 'mock' ? (
          <Ionicons name="ellipse" size={6} color={COLORES.textoMuted} />
        ) : (
          <Ionicons name="ellipse" size={6} color={COLORES.exito} />
        )}
      </View>

      <Text className="text-caption text-text-muted" numberOfLines={1}>
        {ETIQUETA[cotizacion.symbol] ?? cotizacion.symbol}
      </Text>

      <Text className="text-body-md font-bold text-text-primary" numberOfLines={1}>
        {formatearPrecio(cotizacion)}
      </Text>

      {cotizacion.change_percent !== 0 ? (
        <View className="flex-row items-center gap-1">
          <Ionicons
            name={sube ? 'caret-up' : 'caret-down'}
            size={11}
            color={color}
          />
          <Text className="text-caption font-semibold" style={{ color }}>
            {Math.abs(cotizacion.change_percent).toFixed(2)}%
          </Text>
        </View>
      ) : (
        <Text className="text-caption text-text-muted">—</Text>
      )}
    </View>
  );
}

function TarjetaEsqueleto() {
  return (
    <View className="w-36 gap-2 rounded-2xl border border-surface-border bg-surface-secondary p-3.5 opacity-60">
      <View className="h-3 w-12 rounded bg-surface-divider" />
      <View className="h-3 w-20 rounded bg-surface-divider" />
      <View className="h-4 w-24 rounded bg-surface-divider" />
    </View>
  );
}

// Refresco periódico: el caché del backend dura 1h, así que esto no gasta cuota extra
// de Alpha Vantage — solo relee lo que el backend ya tiene en memoria.
const INTERVALO_MS = 45_000;

export default function MarketTicker() {
  const [cotizaciones, setCotizaciones] = useState<MarketQuote[] | null>(null);

  useEffect(() => {
    let vivo = true;

    async function cargar() {
      try {
        const datos = await getCotizaciones();
        if (vivo) setCotizaciones(datos);
      } catch {
        // El ticker es informativo, no crítico: si falla, se deja el último dato
        // (o el esqueleto, si todavía no hay ninguno) en vez de romper el dashboard.
      }
    }

    void cargar();
    const id = setInterval(cargar, INTERVALO_MS);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, []);

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between px-5">
        <Text className="text-caption font-bold uppercase text-text-secondary">
          Mercados externos
        </Text>
        <Text className="text-caption text-text-muted">Alpha Vantage · referencial</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2.5 px-5"
      >
        {cotizaciones
          ? cotizaciones.map((c) => <Tarjeta key={c.symbol} cotizacion={c} />)
          : Array.from({ length: 5 }).map((_, i) => <TarjetaEsqueleto key={i} />)}
      </ScrollView>
    </View>
  );
}
