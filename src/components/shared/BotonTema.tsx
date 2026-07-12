import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

import { useTema } from '@/context/ThemeContext';

/**
 * Alterna claro/oscuro. Vive junto al de cerrar sesión, en el header de cada home.
 *
 * El icono muestra el tema al que se VA (una luna en claro, un sol en oscuro): es la
 * convención que la gente ya reconoce de iOS y Android.
 */
export default function BotonTema() {
  const { esOscuro, alternar, colores } = useTema();

  return (
    <TouchableOpacity
      onPress={alternar}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={esOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
      className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary"
    >
      <Ionicons
        name={esOscuro ? 'sunny-outline' : 'moon-outline'}
        size={20}
        color={colores.textoPrimario}
      />
    </TouchableOpacity>
  );
}
