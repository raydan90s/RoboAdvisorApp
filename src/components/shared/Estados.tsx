import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { useColores } from '@/context/ThemeContext';

/** Los tres estados que toda pantalla con datos remotos necesita. */

export function Cargando({ mensaje = 'Cargando…' }: { mensaje?: string }) {
  const colores = useColores();

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-surface-canvas p-8">
      <ActivityIndicator size="large" color={colores.primario} />
      <Text className="text-body text-text-secondary">{mensaje}</Text>
    </View>
  );
}

export function ErrorEstado({
  mensaje,
  onReintentar,
}: {
  mensaje: string;
  onReintentar?: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-surface-canvas p-8">
      <View className="w-full rounded-2xl bg-stateAlpha-errorSoft px-4 py-3">
        <Text className="text-body text-state-error">{mensaje}</Text>
      </View>
      {onReintentar ? (
        <TouchableOpacity
          onPress={onReintentar}
          activeOpacity={0.85}
          className="rounded-2xl bg-brand-primary px-6 py-3"
        >
          <Text className="text-body-md font-bold text-text-onPrimary">Reintentar</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Vacio({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-surface-canvas p-8">
      <Text className="text-title font-bold text-text-primary">{titulo}</Text>
      {detalle ? (
        <Text className="text-center text-body text-text-secondary">{detalle}</Text>
      ) : null}
    </View>
  );
}
