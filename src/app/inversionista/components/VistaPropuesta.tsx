import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAtras from '@/components/shared/BotonAtras';
import Calificacion from '@/components/shared/Calificacion';
import DisclaimerBanner from '@/components/shared/DisclaimerBanner';
import EstadoBadge from '@/components/shared/EstadoBadge';
import { Cargando, ErrorEstado } from '@/components/shared/Estados';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/http';
import type { InvestorStackParamList } from '@/types/navigation';
import { plazo, porcentaje, puntos, usd } from '@/utils/formato';

import DonutPortafolio, { COLORES } from './DonutPortafolio';
import { getPropuesta } from '../services/investorApi';
import type { AssetAllocation, PortfolioProposal } from '../types/inversionista';

const RIESGO: Record<string, string> = {
  bajo: 'Riesgo bajo',
  medio: 'Riesgo medio',
  alto: 'Riesgo alto',
};

function TarjetaProducto({ linea, color }: { linea: AssetAllocation; color: string }) {
  return (
    <View className="gap-3 rounded-2xl border border-surface-border bg-surface-background p-5">
      <View className="flex-row items-start gap-3">
        <View className="mt-1.5 h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <View className="flex-1 gap-1">
          <Text className="text-body-md font-bold text-text-primary">{linea.nombre}</Text>
          <Text className="text-caption text-text-muted">
            {RIESGO[linea.riesgo] ?? linea.riesgo} · {plazo(linea.plazo_dias)}
          </Text>
        </View>
      </View>

      {/* El % y los USD, juntos. Los USD los calculó Postgres, no el LLM ni el front. */}
      <View className="flex-row items-baseline gap-2 rounded-2xl bg-surface-canvas px-4 py-3">
        <Text className="text-display font-bold text-text-primary">
          {porcentaje(linea.porcentaje)}
        </Text>
        <Text className="text-body-md text-text-secondary">· {usd(linea.monto_asignado)}</Text>
      </View>

      <Calificacion
        institucion={linea.institucion}
        calificacion={linea.calificacion}
        fuente={linea.calificacion_fuente}
        fecha={linea.calificacion_fecha}
      />

      {linea.retorno_esperado != null ? (
        <Text className="text-caption text-text-muted">
          Retorno estimado referencial: {porcentaje(linea.retorno_esperado)} anual. No es un
          rendimiento garantizado.
        </Text>
      ) : null}
    </View>
  );
}

interface Props {
  /** La subcuenta a mostrar. Sin él, la propuesta de la sesión más reciente. */
  sessionId?: string;
  titulo?: string;
}

/**
 * HU2: la propuesta. Donut + una tarjeta por producto con emisor, calificación (con su
 * fuente), el % y los USD, y el texto que redactó Gemini.
 *
 * La primera visita **genera** la propuesta en el backend: ahí es donde corre el LLM y su
 * guardarraíl, así que la espera puede ser de varios segundos. Si Gemini falla, el backend
 * igual devuelve la explicación determinista — esta pantalla nunca se queda sin texto, y
 * nunca muestra un número que el LLM haya inventado.
 *
 * Es un componente y no una pantalla porque la usan dos rutas: `Propuesta` (la cartera
 * única, sin `sessionId`) y `SubcuentaDetalle` (una subcuenta concreta). Son la misma
 * pantalla mirando distintas sesiones.
 */
export default function VistaPropuesta({ sessionId, titulo = 'Tu propuesta' }: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<InvestorStackParamList>>();
  const { user } = useAuth();
  const [propuesta, setPropuesta] = useState<PortfolioProposal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!user) return;
    setError(null);
    setPropuesta(null);
    try {
      setPropuesta(await getPropuesta(user.id, sessionId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar tu propuesta.');
    }
  }, [user, sessionId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <ErrorEstado mensaje={error} onReintentar={cargar} />
      </SafeAreaView>
    );
  }

  if (!propuesta) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <Cargando mensaje="Armando tu propuesta…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <StatusBar style="dark" />

      <View className="flex-row items-center gap-3 border-b border-surface-border px-5 py-4">
        {navigation.canGoBack() ? <BotonAtras onPress={navigation.goBack} /> : null}
        <Text className="flex-1 text-heading font-bold text-text-primary" numberOfLines={1}>
          {titulo}
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-surface-canvas"
        contentContainerClassName="px-5 py-6 gap-4"
      >
        {/* HU2-3: fijo, no descartable. */}
        <DisclaimerBanner />

        <View className="gap-4 rounded-2xl border border-surface-border bg-surface-background p-5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="gap-1">
              <Text className="text-caption font-bold uppercase text-text-secondary">
                Perfil {propuesta.perfil_riesgo}
              </Text>
              <Text className="text-caption text-text-muted">
                {puntos(propuesta.puntaje, propuesta.puntaje_max)} ·{' '}
                {RIESGO[propuesta.riesgo_esperado] ?? propuesta.riesgo_esperado}
              </Text>
            </View>
            <EstadoBadge estado={propuesta.estado} />
          </View>

          <DonutPortafolio
            allocations={propuesta.allocations}
            centro={usd(propuesta.monto_total)}
            etiquetaCentro="Total"
          />

          {propuesta.retorno_esperado_anual != null ? (
            <Text className="text-center text-caption text-text-muted">
              Retorno estimado del portafolio: {porcentaje(propuesta.retorno_esperado_anual)}{' '}
              anual (referencial).
            </Text>
          ) : null}
        </View>

        {/* El único texto del LLM en toda la pantalla; los números que cita salieron del
            prompt, ya calculados, y el guardarraíl verificó que no inventara otros. */}
        {propuesta.explicacion ? (
          <View className="gap-2 rounded-2xl bg-brandAlpha-primarySoft p-5">
            <View className="flex-row items-center gap-2">
              <Ionicons name="sparkles" size={16} color="#1E3A8A" />
              <Text className="text-caption font-bold uppercase text-brand-primary">
                Por qué esta propuesta
              </Text>
            </View>
            <Text className="text-body leading-5 text-text-primary">
              {propuesta.explicacion}
            </Text>
          </View>
        ) : null}

        <Text className="mt-2 text-caption font-bold uppercase text-text-secondary">
          Productos
        </Text>

        {propuesta.allocations.map((linea, i) => (
          <TarjetaProducto
            key={linea.instrumento_code}
            linea={linea}
            color={COLORES[i % COLORES.length]}
          />
        ))}

        {/* HU1-3: el usuario tiene que poder ver cómo se llegó a su perfil. */}
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('ComoSeCalculo', { sessionId: propuesta.session_id })
          }
          activeOpacity={0.85}
          className="mt-2 flex-row items-center justify-between rounded-2xl border border-brand-primary bg-surface-background px-5 py-4"
        >
          <View className="flex-1 pr-3">
            <Text className="text-body-md font-bold text-brand-primary">
              ¿Cómo se calculó mi perfil?
            </Text>
            <Text className="text-caption text-text-secondary">
              Respuesta por respuesta, con las reglas a la vista.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#1E3A8A" />
        </TouchableOpacity>

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
