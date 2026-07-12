import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

import { useColores } from '@/context/ThemeContext';

/**
 * El "Atrás" de todas las cabeceras. Es una flecha, no texto.
 *
 * El área táctil (`p-1 -m-1`) es más grande que el ícono a propósito: 24px de flecha
 * es un blanco chico para el pulgar, y el margen negativo la agranda sin correr el
 * título de al lado.
 */
export default function BotonAtras({ onPress }: { onPress: () => void }) {
  const colores = useColores();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Atrás"
      hitSlop={8}
      className="-m-1 p-1"
    >
      <Ionicons name="arrow-back" size={24} color={colores.primario} />
    </TouchableOpacity>
  );
}
