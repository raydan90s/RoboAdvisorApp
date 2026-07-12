import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, type TextInputProps } from 'react-native';

import { COLORES } from '@/constants/colores';

interface CampoTextoProps extends TextInputProps {
  etiqueta: string;
  icono: keyof typeof Ionicons.glyphMap;
  /** Marca el borde en rojo. El texto del error lo pinta la pantalla, no el campo:
   *  un mismo mensaje suele aplicar a varios campos a la vez. */
  conError?: boolean;
  /** Añade el ojito para mostrar/ocultar. Implica `secureTextEntry`. */
  esPassword?: boolean;
  /** Nota bajo el campo (p. ej. "mínimo 8 caracteres"). Se oculta si hay error. */
  ayuda?: string;
}

/**
 * El campo de texto de las pantallas de auth.
 *
 * Existe porque el registro, el login, el código y el reseteo pintan el MISMO campo con
 * el mismo borde que se tiñe al enfocar: cinco copias del mismo bloque de markup se
 * desincronizan al primer cambio de diseño.
 */
export default function CampoTexto({
  etiqueta,
  icono,
  conError = false,
  esPassword = false,
  ayuda,
  editable = true,
  ...resto
}: CampoTextoProps) {
  const [enfocado, setEnfocado] = useState(false);
  const [verTexto, setVerTexto] = useState(false);

  const borde = conError
    ? 'border-state-error'
    : enfocado
      ? 'border-brand-primary bg-surface-background'
      : 'border-surface-border bg-surface-elevated';

  return (
    <View className="gap-2">
      <Text className="text-caption font-bold uppercase text-text-secondary">
        {etiqueta}
      </Text>

      <View className={`flex-row items-center gap-3 rounded-2xl border px-4 ${borde}`}>
        <Ionicons
          name={icono}
          size={20}
          color={enfocado ? COLORES.primario : COLORES.textoMuted}
        />
        <TextInput
          {...resto}
          editable={editable}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          secureTextEntry={esPassword && !verTexto}
          placeholderTextColor={COLORES.textoMuted}
          className="flex-1 py-4 text-body-md text-text-primary"
        />
        {esPassword ? (
          <TouchableOpacity
            onPress={() => setVerTexto((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={verTexto ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Ionicons
              name={verTexto ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={COLORES.textoSecundario}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {ayuda && !conError ? (
        <Text className="text-caption text-text-muted">{ayuda}</Text>
      ) : null}
    </View>
  );
}
