import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { recomendarSimulacion } from '@/app/agente/services/agentApi';
import type { SimuladorResponse } from '@/app/agente/services/agentApi';
import { Cargando, ErrorEstado } from '@/components/shared/Estados';
import Tarjeta from '@/components/shared/Tarjeta';
import { COLORES } from '@/constants/colores';
import { ApiError } from '@/services/http';
import { montoANumero, montoConSeparadores, porcentaje, usd } from '@/utils/formato';

import RecomendacionIA from '../components/RecomendacionIA';
import { getTasas } from '../services/catalogApi';
import type { CatalogoTasas, TasaInstrumento } from '../types/catalogo';

const MONTOS_RAPIDOS = [1000, 5000, 10000, 20000, 50000];

/** El horizonte de la simulación: estima los fondos (cada depósito rinde a su propio plazo). */
const PLAZOS = [
  { etiqueta: '180 días', dias: 180 },
  { etiqueta: '360 días', dias: 360 },
  { etiqueta: '720 días', dias: 720 },
];

const TIPOS: { etiqueta: string; valor: TasaInstrumento['product_type'] }[] = [
  { etiqueta: 'Todo', valor: null },
  { etiqueta: 'Depósitos', valor: 'deposito_plazo' },
  { etiqueta: 'Fondos', valor: 'fondo_inversion' },
];

/**
 * Prueba montos y plazos, cámbiate de banco o de fondo, y mira cómo cambia el resultado.
 *
 * **Ningún USD se calcula aquí**: cada cambio pide de nuevo GET /api/catalog/rates y
 * Postgres devuelve interés y monto final por producto (regla 4 del equipo). Se pide con
 * `todos_los_plazos`, así que vuelve el catálogo COMPLETO —también los depósitos de otros
 * plazos y los que el perfil no admite— y el plazo elegido queda solo como horizonte de
 * los fondos. Ver todas las opciones, incluidas las bloqueadas con su motivo, es lo que
 * convierte al simulador en una herramienta y no en un escaparate.
 *
 * Quién es la "mejor" tampoco lo decide el front: la fila viene marcada con `recomendado`
 * desde el backend, y es la MISMA que explica la IA.
 */
export default function SimuladorPage() {
  const navigation = useNavigation();

  const [montoTexto, setMontoTexto] = useState('10.000');
  const [plazo, setPlazo] = useState(360);
  const [datos, setDatos] = useState<CatalogoTasas | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Los filtros de la lista y el producto al que el usuario se cambió (su `code`).
  const [tipo, setTipo] = useState<TasaInstrumento['product_type']>(null);
  const [banco, setBanco] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);

  const [recomendacion, setRecomendacion] = useState<SimuladorResponse | null>(null);
  const [cargandoIA, setCargandoIA] = useState(false);
  const [errorIA, setErrorIA] = useState<string | null>(null);

  const monto = montoANumero(montoTexto);

  const cargar = useCallback(async () => {
    if (monto <= 0) return;
    setError(null);
    try {
      setDatos(await getTasas({ monto, plazoDias: plazo, todosLosPlazos: true }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo simular.');
    }
  }, [monto, plazo]);

  // Debounce: se simula 400 ms después de la última tecla, no en cada una.
  useEffect(() => {
    const timer = setTimeout(() => void cargar(), 400);
    return () => clearTimeout(timer);
  }, [cargar]);

  // Una recomendación habla de un monto, un plazo y una opción concretos. En cuanto uno de
  // los tres cambia, ese texto pasa a describir una simulación que ya no está en pantalla,
  // así que se borra. Un consejo viejo junto a números nuevos es la forma más fácil de
  // mentir sin haber inventado nada.
  useEffect(() => {
    setRecomendacion(null);
    setErrorIA(null);
  }, [monto, plazo, seleccion]);

  const opciones = datos?.tasas ?? [];
  const recomendada = opciones.find((t) => t.recomendado) ?? null;
  const seleccionada = opciones.find((t) => t.code === seleccion) ?? null;
  const destacada = seleccionada ?? recomendada;

  const bancos = useMemo(
    () => [...new Set(opciones.map((t) => t.institucion))].sort(),
    [opciones],
  );
  const visibles = opciones.filter(
    (t) =>
      (tipo === null || t.product_type === tipo) &&
      (banco === null || t.institucion === banco),
  );

  const pedirRecomendacion = useCallback(async (provider?: string) => {
    setCargandoIA(true);
    setErrorIA(null);
    try {
      setRecomendacion(
        await recomendarSimulacion({
          monto,
          plazo_dias: plazo,
          // El mismo flag con el que se pidieron las filas de arriba: la IA ve las que
          // el usuario está viendo, ni una más.
          todos_los_plazos: true,
          ...(seleccion ? { seleccion_code: seleccion } : {}),
          ...(provider ? { provider } : {}),
        }),
      );
    } catch (e) {
      setErrorIA(
        e instanceof ApiError
          ? e.message
          : 'El asistente no pudo responder. Intenta otra vez.',
      );
    } finally {
      setCargandoIA(false);
    }
  }, [monto, plazo, seleccion]);

  return (
    <SafeAreaView className="flex-1 bg-surface-canvas">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center gap-3 border-b border-surface-border bg-surface-background px-4 py-3">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="h-8 w-8 items-center justify-center rounded-xl"
        >
          <Ionicons name="chevron-back" size={22} color={COLORES.primario} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-title font-bold text-text-primary">Simulador</Text>
          <Text className="text-caption text-text-muted">
            Cambia el monto, el plazo o el emisor; las tasas vienen del catálogo
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-3 py-4">
        {/* Monto */}
        <Tarjeta className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-body font-bold text-text-primary">Monto</Text>
            <Text className="text-heading font-bold text-brand-primary">{usd(monto)}</Text>
          </View>
          <TextInput
            value={montoTexto}
            onChangeText={(texto) => setMontoTexto(montoConSeparadores(texto))}
            keyboardType="number-pad"
            placeholder="Ej. 10.000"
            placeholderTextColor={COLORES.textoMuted}
            className="rounded-xl border border-surface-border bg-surface-secondary px-4 py-3 text-body-md text-text-primary"
          />
          <View className="flex-row flex-wrap gap-2">
            {MONTOS_RAPIDOS.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMontoTexto(montoConSeparadores(String(m)))}
                className={`rounded-xl px-3 py-2 ${monto === m ? 'bg-brand-primary' : 'bg-brandAlpha-primarySoft'
                  }`}
              >
                <Text
                  className={`text-caption font-bold ${monto === m ? 'text-text-onPrimary' : 'text-brand-mid'
                    }`}
                >
                  {usd(m)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Tarjeta>

        {/* Plazo: horizonte, no filtro. Cada depósito rinde a su propio plazo. */}
        <Tarjeta className="gap-3">
          <Text className="text-body font-bold text-text-primary">Horizonte</Text>
          <View className="flex-row gap-2">
            {PLAZOS.map((p) => (
              <TouchableOpacity
                key={p.dias}
                onPress={() => setPlazo(p.dias)}
                className={`flex-1 items-center rounded-xl py-2.5 ${plazo === p.dias ? 'bg-brand-primary' : 'bg-brandAlpha-primarySoft'
                  }`}
              >
                <Text
                  className={`text-body font-semibold ${plazo === p.dias ? 'text-text-onPrimary' : 'text-brand-mid'
                    }`}
                >
                  {p.etiqueta}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-caption text-text-muted">
            Estima los fondos, que no tienen plazo fijo. Los depósitos rinden a su propio
            plazo, por eso siguen apareciendo todos.
          </Text>
        </Tarjeta>

        {/* Resultado */}
        {error ? (
          <ErrorEstado mensaje={error} onReintentar={cargar} />
        ) : monto <= 0 ? (
          <Text className="py-4 text-center text-body text-text-muted">
            Escribe un monto para simular.
          </Text>
        ) : !datos ? (
          <Cargando mensaje="Simulando…" />
        ) : (
          <>
            {destacada ? (
              <OpcionDestacada
                tasa={destacada}
                monto={monto}
                esSeleccion={seleccionada != null}
                onQuitarSeleccion={() => setSeleccion(null)}
              />
            ) : (
              <Tarjeta>
                <Text className="text-body text-text-secondary">
                  Ninguna opción elegible para tu perfil con ese monto. Toca cualquiera de
                  la lista para ver qué pasaría, o prueba con un monto mayor.
                </Text>
              </Tarjeta>
            )}

            <RecomendacionIA
              recomendacion={recomendacion}
              cargando={cargandoIA}
              error={errorIA}
              habilitado={opciones.length > 0}
              onPedir={(provider) => void pedirRecomendacion(provider)}
            />

            {/* Cambiar de banco o de fondo: todas las opciones, con filtros. */}
            <Tarjeta className="gap-0 p-0">
              <View className="gap-3 p-4 pb-3">
                <Text className="text-caption font-bold tracking-wider text-text-muted">
                  TODAS LAS OPCIONES ({visibles.length})
                </Text>

                <View className="flex-row gap-2">
                  {TIPOS.map((t) => (
                    <Chip
                      key={t.etiqueta}
                      etiqueta={t.etiqueta}
                      activo={tipo === t.valor}
                      onPress={() => setTipo(t.valor)}
                    />
                  ))}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2 pr-4"
                >
                  <Chip
                    etiqueta="Todos los bancos"
                    activo={banco === null}
                    onPress={() => setBanco(null)}
                  />
                  {bancos.map((b) => (
                    <Chip
                      key={b}
                      etiqueta={b}
                      activo={banco === b}
                      onPress={() => setBanco(b)}
                    />
                  ))}
                </ScrollView>
              </View>

              {visibles.length === 0 ? (
                <Text className="border-t border-surface-border p-4 text-body text-text-muted">
                  Ningún producto con esos filtros.
                </Text>
              ) : (
                visibles.map((t) => (
                  <FilaSimulada
                    key={t.code}
                    tasa={t}
                    elegida={t.code === seleccion}
                    onPress={() => setSeleccion(t.code === seleccion ? null : t.code)}
                  />
                ))
              )}
            </Tarjeta>

            <Text className="pb-2 text-center text-caption text-text-muted">
              Datos referenciales · no garantiza rentabilidad · el asesor aprueba antes de
              ejecutar
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  etiqueta,
  activo,
  onPress,
}: {
  etiqueta: string;
  activo: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      className={`rounded-xl px-3 py-2 ${activo ? 'bg-brand-primary' : 'bg-brandAlpha-primarySoft'
        }`}
    >
      <Text
        className={`text-caption font-bold ${activo ? 'text-text-onPrimary' : 'text-brand-mid'
          }`}
      >
        {etiqueta}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * La tarjeta grande: lo que el motor recomienda o, si el usuario se cambió, lo que él
 * eligió. Cuando lo elegido es algo que su perfil no admite o cuyo mínimo no alcanza, los
 * números se muestran igual —para eso existe un simulador— pero con la regla que lo
 * bloquea encima. Enseñar la regla trabajando vale más que esconder la fila.
 */
function OpcionDestacada({
  tasa,
  monto,
  esSeleccion,
  onQuitarSeleccion,
}: {
  tasa: TasaInstrumento;
  monto: number;
  esSeleccion: boolean;
  onQuitarSeleccion: () => void;
}) {
  const bloqueada = tasa.elegible === false || tasa.cumple_monto_minimo === false;

  return (
    <View
      className={`overflow-hidden rounded-2xl border-2 ${bloqueada ? 'border-state-warning' : 'border-brand-primary'
        }`}
    >
      <View
        className={`flex-row items-center gap-2 px-4 py-2.5 ${bloqueada ? 'bg-state-warning' : 'bg-brand-primary'
          }`}
      >
        <Text className="flex-1 text-caption font-bold tracking-widest text-white">
          {esSeleccion ? 'TU SELECCIÓN' : 'RECOMENDADA POR EL MOTOR'} ·{' '}
          {tasa.producto.toUpperCase()}
        </Text>
        {esSeleccion ? (
          <TouchableOpacity
            onPress={onQuitarSeleccion}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text className="text-caption font-bold text-white">Ver la recomendada</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="gap-4 bg-surface-background p-4">
        <View className="flex-row justify-between">
          <View>
            <Text className="text-caption font-bold tracking-wider text-text-muted">
              MONTO FINAL
            </Text>
            <Text className="text-hero font-bold text-text-primary">
              {usd(tasa.monto_final)}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-caption font-bold tracking-wider text-text-muted">
              TASA ANUAL
            </Text>
            <Text className="text-display font-bold text-state-success">
              {porcentaje(tasa.tasa_anual)}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 items-center rounded-xl bg-brandAlpha-primarySoft p-3">
            <Text className="text-caption font-bold tracking-wider text-text-muted">
              CAPITAL
            </Text>
            <Text className="text-body-md font-bold text-text-primary">{usd(monto)}</Text>
          </View>
          <View className="flex-1 items-center rounded-xl bg-stateAlpha-successSoft p-3">
            <Text className="text-caption font-bold tracking-wider text-state-success">
              INTERESES
            </Text>
            <Text className="text-body-md font-bold text-state-success">
              +{usd(tasa.interes_estimado)}
            </Text>
          </View>
        </View>

        {/* La regla versionada del backend, no una excusa del front. */}
        {tasa.elegible === false && tasa.motivo_no_elegible ? (
          <View className="flex-row gap-2 rounded-xl bg-stateAlpha-warningSoft p-3">
            <Ionicons name="lock-closed-outline" size={14} color={COLORES.advertencia} />
            <Text className="flex-1 text-caption leading-4 text-text-secondary">
              <Text className="font-bold">Tu perfil no admite este emisor. </Text>
              {tasa.motivo_no_elegible}
            </Text>
          </View>
        ) : null}

        {tasa.cumple_monto_minimo === false ? (
          <View className="flex-row gap-2 rounded-xl bg-stateAlpha-warningSoft p-3">
            <Ionicons name="alert-circle-outline" size={14} color={COLORES.advertencia} />
            <Text className="flex-1 text-caption leading-4 text-text-secondary">
              <Text className="font-bold">El monto no alcanza. </Text>
              Este producto pide un mínimo de {usd(tasa.monto_minimo)}.
            </Text>
          </View>
        ) : null}

        <Text className="text-caption text-text-muted">
          {tasa.institucion} · {tasa.calificacion} · Fuente:{' '}
          {tasa.fuente_calificacion ?? 'no declarada'}
        </Text>
      </View>
    </View>
  );
}

function FilaSimulada({
  tasa,
  elegida,
  onPress,
}: {
  tasa: TasaInstrumento;
  elegida: boolean;
  onPress: () => void;
}) {
  const bloqueada = tasa.elegible === false || tasa.cumple_monto_minimo === false;
  const motivo =
    tasa.elegible === false
      ? 'No disponible para tu perfil'
      : tasa.cumple_monto_minimo === false
        ? `Mínimo ${usd(tasa.monto_minimo)}`
        : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: elegida }}
      className={`flex-row items-center gap-3 border-t border-surface-border p-4 ${elegida ? 'bg-brandAlpha-primarySoft' : ''
        }`}
    >
      <Ionicons
        name={elegida ? 'radio-button-on' : 'radio-button-off'}
        size={18}
        color={elegida ? COLORES.primario : COLORES.borde}
      />

      <View className={`flex-1 ${bloqueada && !elegida ? 'opacity-60' : ''}`}>
        <View className="flex-row items-center gap-1.5">
          <Text
            className="shrink text-body font-bold text-text-primary"
            numberOfLines={1}
          >
            {tasa.producto}
          </Text>
          {tasa.recomendado ? (
            <View className="rounded-md bg-stateAlpha-successSoft px-1.5 py-0.5">
              <Text className="text-caption font-bold text-state-success">
                Recomendada
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-caption text-text-muted" numberOfLines={1}>
          {tasa.institucion} · {tasa.calificacion}
          {motivo ? ` · ${motivo}` : ''}
        </Text>
      </View>

      <View className={`items-end ${bloqueada && !elegida ? 'opacity-60' : ''}`}>
        <Text
          className={`text-body-md font-bold ${bloqueada ? 'text-text-muted' : 'text-brand-primary'
            }`}
        >
          {usd(tasa.monto_final)}
        </Text>
        <Text className="text-caption text-text-muted">
          {porcentaje(tasa.tasa_anual)}
          {tasa.plazo_dias != null ? ` · ${tasa.plazo_dias} d` : ' · sin plazo'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
