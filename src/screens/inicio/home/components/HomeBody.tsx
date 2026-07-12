import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function HomeBody() {
  const [accepted, setAccepted] = useState(false);
  const isValid = accepted;

  return (
    <ScrollView
      className="flex-1 bg-surface-canvas"
      contentContainerClassName="px-5 py-6 gap-4"
    >
      <View className="rounded-2xl border border-surface-border bg-surface-background p-5">
        <Text className="text-display font-bold text-text-primary">
          Setup completo
        </Text>
        <Text className="mt-2 text-body text-text-secondary">
          Si ves esta tarjeta con bordes redondeados, colores del design system y
          tipografía escalada, NativeWind está renderizando estilos correctamente.
        </Text>
      </View>

      <View className="rounded-2xl bg-brandAlpha-primarySoft p-5">
        <Text className="text-title font-bold text-brand-primary">Design system</Text>
        <Text className="mt-1 text-body text-text-secondary">
          Los tokens anidados se concatenan con la utilidad: text-text-primary,
          bg-surface-canvas, border-surface-border.
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => setAccepted((prev) => !prev)}
        activeOpacity={0.85}
        className="flex-row items-center gap-3 py-2"
      >
        <View
          className={`h-6 w-6 items-center justify-center rounded-md border ${
            accepted ? 'border-brand-accent bg-brand-accent' : 'border-surface-divider'
          }`}
        >
          {accepted ? (
            <Text className="text-caption font-bold text-text-onAccent">✓</Text>
          ) : null}
        </View>
        <Text className="text-body text-text-secondary">
          Habilitar el botón de continuar
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={!isValid}
        activeOpacity={0.85}
        className={`items-center rounded-2xl py-4 ${
          isValid ? 'bg-brand-accent' : 'bg-surface-secondary'
        }`}
      >
        <Text
          className={`text-body-md font-bold ${
            isValid ? 'text-text-onAccent' : 'text-text-muted'
          }`}
        >
          Continuar
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
