import { Text, TextInput, View } from 'react-native';

import { COLORES } from '@/constants/colores';

interface CampoCodigoProps {
  valor: string;
  onCambiar: (codigo: string) => void;
  conError?: boolean;
  editable?: boolean;
  /** Se dispara al completar los 6 dígitos: el usuario no tiene que buscar el botón. */
  onCompleto?: (codigo: string) => void;
}

export const LARGO_CODIGO = 6;

/**
 * El campo de los 6 dígitos.
 *
 * Un solo `TextInput` grande y no seis cajitas: seis inputs con foco encadenado se pelean
 * con el autocompletado del SMS/correo y rompen el pegado (`Cmd+V` mete los 6 dígitos en
 * la primera). Este acepta pegar, filtra lo que no sea dígito y corta en 6.
 */
export default function CampoCodigo({
  valor,
  onCambiar,
  conError = false,
  editable = true,
  onCompleto,
}: CampoCodigoProps) {
  function alEscribir(texto: string) {
    // El teclado numérico de iOS igual deja meter espacios y guiones al pegar.
    const limpio = texto.replace(/\D/g, '').slice(0, LARGO_CODIGO);
    onCambiar(limpio);
    if (limpio.length === LARGO_CODIGO) onCompleto?.(limpio);
  }

  return (
    <View className="gap-2">
      <Text className="text-caption font-bold uppercase text-text-secondary">
        Código de 6 dígitos
      </Text>
      <TextInput
        value={valor}
        onChangeText={alEscribir}
        editable={editable}
        placeholder="––––––"
        placeholderTextColor={COLORES.borde}
        keyboardType="number-pad"
        // Rellena el código desde el correo/SMS sin que el usuario cambie de app.
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={LARGO_CODIGO}
        accessibilityLabel="Código de verificación"
        className={`rounded-2xl border py-4 text-center text-display font-bold tracking-[12px] text-text-primary ${
          conError
            ? 'border-state-error bg-surface-elevated'
            : 'border-surface-border bg-surface-elevated'
        }`}
      />
    </View>
  );
}
