import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';

import { useColores } from '@/context/ThemeContext';

interface BotonProps {
  titulo: string;
  onPress: () => void;
  /** primario = azul marino sólido; secundario = tinte azul suave (tabs, filtros). */
  variante?: 'primario' | 'secundario';
  deshabilitado?: boolean;
  cargando?: boolean;
}

/** El botón de Brokeate: azul marino, esquinas 2xl, texto en negrita. */
export default function Boton({
  titulo,
  onPress,
  variante = 'primario',
  deshabilitado = false,
  cargando = false,
}: BotonProps) {
  const colores = useColores();
  const inactivo = deshabilitado || cargando;
  const fondo =
    variante === 'primario'
      ? inactivo
        ? 'bg-brandAlpha-primaryMedium'
        : 'bg-brand-primary'
      : 'bg-brandAlpha-primarySoft';
  const letra = variante === 'primario' ? 'text-text-onPrimary' : 'text-brand-mid';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactivo}
      activeOpacity={0.85}
      className={`items-center justify-center rounded-2xl px-6 py-3.5 ${fondo}`}
    >
      {cargando ? (
        <ActivityIndicator
          color={variante === 'primario' ? colores.textoSobrePrimario : colores.azulMedio}
        />
      ) : (
        <Text className={`text-body-md font-bold ${letra}`}>{titulo}</Text>
      )}
    </TouchableOpacity>
  );
}
