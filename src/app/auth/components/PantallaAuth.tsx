import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAtras from '@/components/shared/BotonAtras';

interface PantallaAuthProps {
  titulo: string;
  bajada: string;
  /** Sin `atras` la pantalla es la raíz del stack (el Login) y no pinta la flecha. */
  atras?: boolean;
  children: ReactNode;
}

/**
 * El chasis de las pantallas de auth: safe area, teclado que no tapa el campo enfocado y
 * el disclaimer al pie.
 *
 * El `KeyboardAvoidingView` no es cosmético: sin él, en iOS el teclado se come el campo
 * del código y el usuario escribe a ciegas.
 */
export default function PantallaAuth({
  titulo,
  bajada,
  atras = false,
  children,
}: PantallaAuthProps) {
  const navigation = useNavigation();

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="grow justify-center px-6 py-8 gap-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {atras ? (
            <View className="absolute left-6 top-2">
              <BotonAtras onPress={() => navigation.goBack()} />
            </View>
          ) : null}

          <View className="gap-5">
            <View className="gap-1">
              <Text className="text-display font-bold text-text-primary">{titulo}</Text>
              <Text className="text-body text-text-secondary">{bajada}</Text>
            </View>

            {children}
          </View>

          <Text className="text-center text-caption text-text-muted">
            Brokeate no ejecuta órdenes ni maneja tu dinero. Las propuestas son
            referenciales y las revisa un asesor.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
