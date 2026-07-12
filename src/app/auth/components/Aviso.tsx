import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { COLORES } from '@/constants/colores';

interface AvisoProps {
  texto: string;
  tipo?: 'error' | 'info';
}

/** La franja de feedback de las pantallas de auth: el error del backend o el "código enviado". */
export default function Aviso({ texto, tipo = 'error' }: AvisoProps) {
  const esError = tipo === 'error';

  return (
    <View
      className={`flex-row items-center gap-2 rounded-2xl px-4 py-3 ${
        esError ? 'bg-stateAlpha-errorSoft' : 'bg-brandAlpha-primarySoft'
      }`}
    >
      <Ionicons
        name={esError ? 'alert-circle' : 'checkmark-circle'}
        size={18}
        color={esError ? COLORES.error : COLORES.azulMedio}
      />
      <Text
        className={`flex-1 text-body ${esError ? 'text-state-error' : 'text-brand-mid'}`}
      >
        {texto}
      </Text>
    </View>
  );
}
