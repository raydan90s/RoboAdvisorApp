import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { enviarMensaje } from '@/app/agente/services/agentApi';
import type { AgentChatResponse } from '@/app/agente/services/agentApi';
import SourceChips from '@/app/agente/components/SourceChips';
import { Cargando, ErrorEstado } from '@/components/shared/Estados';
import LineChart from '@/components/shared/LineChart';
import Tarjeta from '@/components/shared/Tarjeta';
import { COLORES } from '@/constants/colores';
import { ApiError } from '@/services/http';

import FeedNoticias from '../components/FeedNoticias';
import { getCotizaciones, getHistorico } from '../services/marketApi';
import type { HistoricalSeries, MarketQuote } from '../services/marketApi';

/**
 * Simulador de mercados GLOBALES — deliberadamente separado del simulador bancario
 * (`SimuladorPage`, que simula productos reales del catálogo con tasas de Postgres).
 * Acá todo viene de Alpha Vantage: son instrumentos de referencia, no ejecutables, y
 * nunca se mezclan con una propuesta real (por eso el disclaimer de esta pantalla es
 * permanente y distinto al de `DisclaimerBanner`).
 */

// 4 activos predefinidos — el mismo símbolo que usa el ticker del Home, así que las
// cotizaciones ya suelen estar tibias en el caché del backend.
const ACTIVOS: { symbol: string; etiqueta: string }[] = [
  { symbol: 'BTCUSD', etiqueta: 'Bitcoin' },
  { symbol: 'SPY', etiqueta: 'S&P 500' },
  { symbol: 'EURUSD', etiqueta: 'EUR/USD' },
  { symbol: 'XAUUSD', etiqueta: 'Oro' },
];

function formatearPrecio(precio: number): string {
  const decimales = precio < 10 ? 4 : precio > 1000 ? 0 : 2;
  const partes = precio.toFixed(decimales).split('.');
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `USD ${partes.join(',')}`;
}

/** "2026-06-30" → "30-jun" (el eje X del gráfico no necesita el año). */
function fechaEje(iso: string): string {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const [, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}-${meses[m - 1]}`;
}

/** La respuesta de la Ruta C, con el mismo lenguaje visual ámbar que las burbujas del chat. */
function TarjetaRecomendacion({ respuesta }: { respuesta: AgentChatResponse }) {
  return (
    <View className="gap-2 rounded-2xl border border-state-warning bg-stateAlpha-warningSoft p-4">
      <View className="flex-row items-center gap-1.5">
        <Ionicons name="alert-circle" size={13} color="#C77700" />
        <Text className="text-caption font-bold uppercase text-state-warning">
          Simulación educativa · fuera del banco
        </Text>
      </View>
      <Text className="text-body text-text-primary">{respuesta.texto}</Text>
      {respuesta.sources.length ? <SourceChips sources={respuesta.sources} /> : null}
    </View>
  );
}

export default function MercadosSimuladorPage() {
  const navigation = useNavigation();

  const [activo, setActivo] = useState(ACTIVOS[0].symbol);
  const [cotizacion, setCotizacion] = useState<MarketQuote | null>(null);
  const [historico, setHistorico] = useState<HistoricalSeries | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recomendacion, setRecomendacion] = useState<AgentChatResponse | null>(null);
  const [cargandoIA, setCargandoIA] = useState(false);
  const [errorIA, setErrorIA] = useState<string | null>(null);

  const cargar = useCallback(async (symbol: string) => {
    setCargando(true);
    setError(null);
    try {
      const [cotizaciones, serie] = await Promise.all([
        getCotizaciones([symbol]),
        getHistorico(symbol, 30),
      ]);
      setCotizacion(cotizaciones[0] ?? null);
      setHistorico(serie);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el mercado.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar(activo);
    // Un análisis de IA habla de un activo concreto: al cambiar de activo, el texto
    // viejo pasa a describir otra cosa — se borra, no se deja ahí confundiendo.
    setRecomendacion(null);
    setErrorIA(null);
  }, [activo, cargar]);

  const pedirRecomendacion = useCallback(async () => {
    setCargandoIA(true);
    setErrorIA(null);
    try {
      // `symbols` fuerza la Ruta C en el backend (100% Alpha Vantage, cero contexto
      // del banco) sin depender de que el mensaje contenga las palabras que el
      // router reconoce — es la señal explícita del botón.
      setRecomendacion(
        await enviarMensaje(
          `Analiza brevemente la cotización y la tendencia reciente de ${activo}.`,
          undefined,
          undefined,
          [activo],
        ),
      );
    } catch (e) {
      setErrorIA(
        e instanceof ApiError ? e.message : 'El asistente no pudo responder. Intenta otra vez.',
      );
    } finally {
      setCargandoIA(false);
    }
  }, [activo]);

  const activoActual = ACTIVOS.find((a) => a.symbol === activo)!;
  const sube = (cotizacion?.change_percent ?? 0) > 0;
  const baja = (cotizacion?.change_percent ?? 0) < 0;

  return (
    <SafeAreaView className="flex-1 bg-surface-canvas">
      <StatusBar style="dark" />

      <View className="flex-row items-center gap-3 border-b border-surface-border bg-surface-background px-4 py-3">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="h-8 w-8 items-center justify-center rounded-xl"
        >
          <Ionicons name="chevron-back" size={22} color={COLORES.primario} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-title font-bold text-text-primary">Mercados globales</Text>
          <Text className="text-caption text-text-muted">
            Acciones, forex, cripto — fuera del catálogo del banco
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-3 py-4">
        {/* Aviso permanente: a diferencia de DisclaimerBanner (que es de la propuesta
            bancaria), este es el de la simulación de mercados externos — texto distinto
            a propósito, y sin botón de cerrar por la misma razón que el otro. */}
        <View className="flex-row gap-3 rounded-2xl bg-stateAlpha-warningSoft p-4">
          <Ionicons name="warning" size={20} color="#C77700" />
          <Text className="flex-1 text-caption leading-4 text-text-primary">
            <Text className="font-bold">Simulación educativa.</Text> Estos activos
            globales no forman parte del catálogo institucional ni son ejecutables.
          </Text>
        </View>

        {/* Selector de activo */}
        <View className="flex-row flex-wrap gap-2">
          {ACTIVOS.map((a) => (
            <TouchableOpacity
              key={a.symbol}
              onPress={() => setActivo(a.symbol)}
              activeOpacity={0.85}
              className={`rounded-xl px-3.5 py-2 ${
                activo === a.symbol ? 'bg-brand-primary' : 'bg-brandAlpha-primarySoft'
              }`}
            >
              <Text
                className={`text-caption font-bold ${
                  activo === a.symbol ? 'text-text-onPrimary' : 'text-brand-mid'
                }`}
              >
                {a.etiqueta}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {cargando ? (
          <Cargando />
        ) : error ? (
          <ErrorEstado mensaje={error} onReintentar={() => cargar(activo)} />
        ) : (
          <>
            <Tarjeta className="gap-3">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-caption font-bold uppercase text-text-secondary">
                    {activoActual.symbol}
                  </Text>
                  <Text className="text-heading font-bold text-text-primary">
                    {cotizacion ? formatearPrecio(cotizacion.price) : '—'}
                  </Text>
                </View>
                {cotizacion && cotizacion.change_percent !== 0 ? (
                  <View className="flex-row items-center gap-1">
                    <Ionicons
                      name={sube ? 'caret-up' : 'caret-down'}
                      size={14}
                      color={sube ? COLORES.exito : COLORES.error}
                    />
                    <Text
                      className="text-body-md font-bold"
                      style={{ color: sube ? COLORES.exito : baja ? COLORES.error : COLORES.textoMuted }}
                    >
                      {Math.abs(cotizacion.change_percent).toFixed(2)}%
                    </Text>
                  </View>
                ) : null}
              </View>

              {historico ? (
                <LineChart
                  points={historico.points.map((p) => ({
                    label: fechaEje(p.date),
                    value: p.close,
                  }))}
                  color={COLORES.primario}
                  formatValue={formatearPrecio}
                />
              ) : null}

              {cotizacion?.source === 'mock' || historico?.source === 'mock' ? (
                <Text className="text-caption text-text-muted">
                  Cotización de referencia simulada (cuota de Alpha Vantage agotada o
                  símbolo sin datos en vivo).
                </Text>
              ) : (
                <Text className="text-caption text-text-muted">
                  Datos en vivo de Alpha Vantage · 30 días.
                </Text>
              )}
            </Tarjeta>

            {/* Botón de recomendación IA — dispara la Ruta C del agente forzada por
                `symbols`, sin depender del texto del mensaje. */}
            <TouchableOpacity
              onPress={pedirRecomendacion}
              disabled={cargandoIA}
              activeOpacity={0.85}
              className={`flex-row items-center justify-center gap-2 rounded-2xl py-3.5 ${
                cargandoIA ? 'bg-surface-divider' : 'bg-brand-primary'
              }`}
            >
              {cargandoIA ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                  <Text className="text-body-md font-bold text-text-onPrimary">
                    Recomendación de Mercados (IA)
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {errorIA ? (
              <Text className="text-caption text-state-error">{errorIA}</Text>
            ) : null}

            {recomendacion ? <TarjetaRecomendacion respuesta={recomendacion} /> : null}
          </>
        )}

        {/* El feed de noticias (sugerencia del jurado): se carga aparte del ticker,
            así una cosa no bloquea a la otra. */}
        <FeedNoticias />
      </ScrollView>
    </SafeAreaView>
  );
}
