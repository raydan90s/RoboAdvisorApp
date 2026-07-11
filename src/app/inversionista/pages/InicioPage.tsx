import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DisclaimerBanner from '@/components/shared/DisclaimerBanner';
import { Cargando, ErrorEstado } from '@/components/shared/Estados';
import { useAuth } from '@/context/AuthContext';
import HomeHeader from '@/screens/inicio/home/components/HomeHeader';
import { ApiError } from '@/services/http';
import type { InvestorStackParamList } from '@/types/navigation';
import { usd } from '@/utils/formato';

import { getInvestor } from '../services/investorApi';
import type { Investor } from '../types/inversionista';

type Props = NativeStackScreenProps<InvestorStackParamList, 'Inicio'>;

/**
 * La bifurcación del inversionista: ¿ya se perfiló o no?
 *
 * El backend responde **404** a `GET /api/investor/{id}` cuando el usuario no tiene una
 * sesión de perfilamiento completa. Ese 404 no es un error que reportar: es la respuesta
 * "todavía no te has perfilado", y es el estado con el que arranca `inversionista@demo.ec`
 * para poder grabar el flujo en vivo.
 */
export default function InicioPage({ navigation }: Props) {
  const { user, logout } = useAuth();

  const [perfil, setPerfil] = useState<Investor | null>(null);
  const [sinPerfilar, setSinPerfilar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!user) return;
    setCargando(true);
    setError(null);
    try {
      setPerfil(await getInvestor(user.id));
      setSinPerfilar(false);
    } catch (e) {
      if (e instanceof ApiError && e.statusCode === 404) {
        setPerfil(null);
        setSinPerfilar(true);
      } else {
        setError(e instanceof ApiError ? e.message : 'No se pudo cargar tu perfil.');
      }
    } finally {
      setCargando(false);
    }
  }, [user]);

  // Al volver del cuestionario el estado cambió: hay que releerlo, no reusar el de antes.
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
        subtitle="Inversionista"
        actionIcon="log-out-outline"
        onAction={logout}
      />

      {cargando ? (
        <Cargando />
      ) : error ? (
        <ErrorEstado mensaje={error} onReintentar={cargar} />
      ) : (
        <ScrollView
          className="flex-1 bg-surface-canvas"
          contentContainerClassName="px-5 py-6 gap-4"
        >
          {sinPerfilar ? (
            <>
              <View className="gap-2 rounded-2xl border border-surface-border bg-surface-background p-5">
                <Text className="text-display font-bold text-text-primary">
                  Aún no conocemos tu perfil
                </Text>
                <Text className="text-body text-text-secondary">
                  Contesta cinco preguntas y dinos cuánto quieres invertir. Con eso
                  calculamos tu perfil de riesgo con reglas publicadas y te armamos una
                  propuesta con productos de nuestro catálogo aprobado.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('Cuestionario')}
                activeOpacity={0.85}
                className="items-center rounded-2xl bg-brand-primary py-4"
              >
                <Text className="text-body-md font-bold text-text-onPrimary">
                  Empezar el cuestionario
                </Text>
              </TouchableOpacity>
            </>
          ) : perfil ? (
            <>
              <View className="gap-3 rounded-2xl border border-surface-border bg-surface-background p-5">
                <Text className="text-caption font-bold uppercase text-text-secondary">
                  Tu perfil de riesgo
                </Text>
                <Text className="text-hero font-bold capitalize text-text-primary">
                  {perfil.perfil_riesgo}
                </Text>
                <Text className="text-body text-text-secondary">
                  {perfil.puntaje} / 15 puntos
                  {perfil.monto != null ? ` · ${usd(perfil.monto)} a invertir` : ''}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('Propuesta')}
                activeOpacity={0.85}
                className="flex-row items-center justify-between rounded-2xl bg-brand-primary px-5 py-4"
              >
                <Text className="text-body-md font-bold text-text-onPrimary">
                  Ver mi propuesta
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('ComoSeCalculo', {})}
                activeOpacity={0.85}
                className="flex-row items-center justify-between rounded-2xl border border-surface-border bg-surface-background px-5 py-4"
              >
                <Text className="text-body-md font-bold text-brand-primary">
                  ¿Cómo se calculó mi perfil?
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#1E3A8A" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Cuestionario')}
                activeOpacity={0.7}
                className="items-center py-2"
              >
                <Text className="text-body text-text-secondary">
                  Volver a contestar el cuestionario
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          <DisclaimerBanner />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
