import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AgenteFab from '@/app/agente/components/AgenteFab';
import DisclaimerBanner from '@/components/shared/DisclaimerBanner';
import { Cargando, ErrorEstado } from '@/components/shared/Estados';
import { COLORES } from '@/constants/colores';
import { useAuth } from '@/context/AuthContext';
import HomeHeader from '@/screens/inicio/home/components/HomeHeader';
import { ApiError } from '@/services/http';
import type { InvestorStackParamList } from '@/types/navigation';
import { montoANumero, montoConSeparadores } from '@/utils/formato';

import BarraCapital from '../components/BarraCapital';
import MarketTicker from '../components/MarketTicker';
import TarjetaSubcuenta from '../components/TarjetaSubcuenta';
import { fijarCapital, getSubcuentas } from '../services/investorApi';
import type { ResumenCapital } from '../types/inversionista';

type Props = NativeStackScreenProps<InvestorStackParamList, 'MisSubcuentas'>;

/** Declarar el techo de capital. Es el número contra el que el servidor validará cada
 *  subcuenta nueva, así que se fija una vez y se puede corregir después. */
function EditorCapital({
  capitalActual,
  onGuardado,
}: {
  capitalActual: number | null;
  onGuardado: (resumen: ResumenCapital) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valor = montoANumero(texto);

  async function guardar() {
    if (valor <= 0 || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      onGuardado(await fijarCapital(valor));
      setAbierto(false);
      setTexto('');
    } catch (e) {
      // El 422 más común: el capital no puede quedar por debajo de lo ya asignado.
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar el capital.');
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) {
    return (
      <TouchableOpacity
        onPress={() => setAbierto(true)}
        activeOpacity={0.7}
        className="flex-row items-center gap-2 self-start"
      >
        <Ionicons name="create-outline" size={16} color="#1E3A8A" />
        <Text className="text-body font-bold text-brand-primary">
          {capitalActual == null ? 'Declarar mi capital total' : 'Cambiar capital total'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View className="gap-2">
      <TextInput
        value={texto}
        onChangeText={(nuevo) => setTexto(montoConSeparadores(nuevo))}
        placeholder="40.000"
        placeholderTextColor="#A1A1AA"
        keyboardType="numeric"
        inputMode="decimal"
        autoFocus
        className="rounded-2xl border border-surface-border bg-surface-elevated px-4 py-3 text-body-md font-bold text-text-primary"
      />

      {error ? <Text className="text-caption text-state-error">{error}</Text> : null}

      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={guardar}
          disabled={valor <= 0 || guardando}
          activeOpacity={0.85}
          className={`flex-1 items-center rounded-2xl py-3 ${
            valor > 0 ? 'bg-brand-primary' : 'bg-surface-secondary'
          }`}
        >
          {guardando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              className={`text-body font-bold ${
                valor > 0 ? 'text-text-onPrimary' : 'text-text-muted'
              }`}
            >
              Guardar
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setAbierto(false);
            setError(null);
          }}
          activeOpacity={0.7}
          className="items-center rounded-2xl border border-surface-border px-5 py-3"
        >
          <Text className="text-body text-text-secondary">Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Comparador y simulador se exploran **sin** haber abierto una cartera, así que su
 * entrada vive en el Home y no colgada de una subcuenta. Desde aquí van sin monto: el
 * monto solo existe dentro de una propuesta, y ahí es donde el comparador lo recibe.
 */
function AccesoHerramienta({
  icono,
  titulo,
  detalle,
  onPress,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  detalle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-1 gap-1 rounded-2xl border border-surface-border bg-surface-background p-4"
    >
      <Ionicons name={icono} size={20} color={COLORES.primario} />
      <Text className="text-body font-bold text-text-primary">{titulo}</Text>
      <Text className="text-caption leading-4 text-text-muted">{detalle}</Text>
    </TouchableOpacity>
  );
}

/**
 * El Home del inversionista: su capital y en qué está repartido.
 *
 * Una subcuenta es una sesión de perfilamiento con nombre, así que esta lista es la
 * historia completa del cliente: cada vez que se perfiló con un monto distinto, quedó
 * una cartera independiente con su propio perfil y su propia propuesta.
 *
 * Ningún número de esta pantalla se calcula acá. `capital_total`, `asignado` y
 * `sin_asignar` llegan sumados por SQL — y `sin_asignar` es justo el número contra el
 * que el servidor valida el monto de una subcuenta nueva, así que tener una segunda
 * versión de él en el front sería tener dos verdades.
 */
export default function MisSubcuentasPage({ navigation }: Props) {
  const { user, logout } = useAuth();

  const [resumen, setResumen] = useState<ResumenCapital | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!user) return;
    setCargando(true);
    setError(null);
    try {
      setResumen(await getSubcuentas(user.id));
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'No se pudieron cargar tus subcuentas.',
      );
    } finally {
      setCargando(false);
    }
  }, [user]);

  // Al volver de crear una subcuenta el reparto cambió: se relee, no se reusa.
  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <StatusBar style="dark" />
      <HomeHeader
        title={user ? `Hola, ${user.name}` : 'Inicio'}
        subtitle="Tus subcuentas"
        actionIcon="log-out-outline"
        onAction={logout}
      />

      {cargando ? (
        <Cargando />
      ) : error ? (
        <ErrorEstado mensaje={error} onReintentar={cargar} />
      ) : resumen ? (
        <>
          <ScrollView
            className="flex-1 bg-surface-canvas"
            contentContainerClassName="px-5 py-6 gap-4"
          >
            {/* -mx-5 cancela el padding del ScrollView: el ticker desliza de borde
                a borde de la pantalla, a diferencia de las demás secciones. */}
            <View className="-mx-5">
              <MarketTicker />
            </View>

            <View className="gap-4 rounded-2xl border border-surface-border bg-surface-background p-5">
              <BarraCapital
                capitalTotal={resumen.capital_total}
                asignado={resumen.asignado}
                sinAsignar={resumen.sin_asignar}
                subcuentas={resumen.subcuentas}
              />
              <EditorCapital
                capitalActual={resumen.capital_total}
                onGuardado={setResumen}
              />
            </View>

            <View className="flex-row gap-3">
              <AccesoHerramienta
                icono="swap-horizontal-outline"
                titulo="Comparador"
                detalle="Las tasas del catálogo, y cuáles admite tu perfil."
                onPress={() => navigation.navigate('Comparador')}
              />
              <AccesoHerramienta
                icono="calculator-outline"
                titulo="Simulador"
                detalle="Cuánto rendiría un monto a un plazo."
                onPress={() => navigation.navigate('Simulador')}
              />
            </View>

            {/* Mercados EXTERNOS (Alpha Vantage): fuera de la fila de arriba a propósito
                — no es catálogo del banco, es una simulación educativa aparte. Su
                propia fila (`flex-row`): `AccesoHerramienta` usa `flex-1`, que solo
                tiene sentido con hermanos en una fila horizontal. */}
            <View className="flex-row">
              <AccesoHerramienta
                icono="trending-up-outline"
                titulo="Mercados globales"
                detalle="Bitcoin, S&P 500, EUR/USD, oro — cotización, gráfico y análisis de IA."
                onPress={() => navigation.navigate('Mercados')}
              />
            </View>

            {resumen.subcuentas.length === 0 ? (
              <View className="gap-2 rounded-2xl border border-surface-border bg-surface-background p-5">
                <Text className="text-display font-bold text-text-primary">
                  Todavía no tienes subcuentas
                </Text>
                <Text className="text-body text-text-secondary">
                  Una subcuenta es una cartera con su propio objetivo y su propio monto:
                  contestas las cinco preguntas, y cada una recibe el perfil de riesgo y
                  la propuesta que le corresponden.
                </Text>
              </View>
            ) : (
              resumen.subcuentas.map((subcuenta) => (
                <TarjetaSubcuenta
                  key={subcuenta.session_id}
                  subcuenta={subcuenta}
                  onPress={() =>
                    navigation.navigate('SubcuentaDetalle', {
                      sessionId: subcuenta.session_id,
                      nombre: subcuenta.nombre,
                    })
                  }
                />
              ))
            )}

            <DisclaimerBanner />
          </ScrollView>

          {/* Sticky: la acción principal del Home no se pierde al hacer scroll. */}
          <View className="border-t border-surface-border bg-surface-background px-5 py-4">
            <TouchableOpacity
              onPress={() => navigation.navigate('NuevaSubcuenta')}
              activeOpacity={0.85}
              className="flex-row items-center justify-center gap-2 rounded-2xl bg-brand-primary py-4"
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text className="text-body-md font-bold text-text-onPrimary">
                Nueva subcuenta
              </Text>
            </TouchableOpacity>
          </View>

          {/* El asistente, elevado sobre la barra sticky. Sin sessionId conoce el
              capital y todas las subcuentas para responder del panorama completo. */}
          <AgenteFab bottom={96} />
        </>
      ) : null}
    </SafeAreaView>
  );
}
