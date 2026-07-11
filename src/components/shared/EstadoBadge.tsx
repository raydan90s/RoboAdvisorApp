import { Text, View } from 'react-native';

import type { EstadoPropuesta } from '@/app/inversionista/types/inversionista';

/** `proposal_status` de Postgres, en palabras que el cliente entiende. */
const ESTADOS: Record<EstadoPropuesta, { texto: string; fondo: string; letra: string }> = {
  pending_review: {
    texto: 'En revisión',
    fondo: 'bg-stateAlpha-warningSoft',
    letra: 'text-state-warning',
  },
  approved: {
    texto: 'Aprobada',
    fondo: 'bg-brandAlpha-accentSoft',
    letra: 'text-text-primary',
  },
  edited: {
    texto: 'Editada por el asesor',
    fondo: 'bg-brandAlpha-primarySoft',
    letra: 'text-brand-primary',
  },
  rejected: {
    texto: 'Rechazada',
    fondo: 'bg-stateAlpha-errorSoft',
    letra: 'text-state-error',
  },
};

export default function EstadoBadge({ estado }: { estado: EstadoPropuesta }) {
  const { texto, fondo, letra } = ESTADOS[estado];

  return (
    <View className={`self-start rounded-full px-3 py-1 ${fondo}`}>
      <Text className={`text-caption font-bold ${letra}`}>{texto}</Text>
    </View>
  );
}
