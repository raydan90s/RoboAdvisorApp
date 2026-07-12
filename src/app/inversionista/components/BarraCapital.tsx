import { Text, View } from 'react-native';

import { useTema } from '@/context/ThemeContext';
import { usd } from '@/utils/formato';

import type { PerfilRiesgo, Subcuenta } from '../types/inversionista';

/**
 * Un color por perfil de riesgo. El mismo en la barra y en los badges.
 *
 * En oscuro son los mismos tonos subidos de luminosidad: un #1E3A8A sobre el lienzo
 * oscuro se leería como un hueco negro en la barra, no como un segmento.
 */
const PALETA_PERFIL: Record<'light' | 'dark', Record<PerfilRiesgo, string>> = {
  light: {
    conservador: '#0891B2',
    moderado: '#1E3A8A',
    agresivo: '#D97706',
  },
  dark: {
    conservador: '#38C6DE',
    moderado: '#5B9BE0',
    agresivo: '#E0A33C',
  },
};

/** El color del perfil en el tema activo. Lo usan la barra y las tarjetas de subcuenta. */
export function useColorPerfil(): Record<PerfilRiesgo, string> {
  return PALETA_PERFIL[useTema().tema];
}

interface Props {
  capitalTotal: number | null;
  asignado: number;
  sinAsignar: number | null;
  subcuentas: Subcuenta[];
}

function Cifra({
  etiqueta,
  valor,
  color,
}: {
  etiqueta: string;
  valor: number | null;
  color: string;
}) {
  return (
    <View className="flex-1 gap-1">
      <Text className="text-caption uppercase text-text-muted">{etiqueta}</Text>
      <Text className={`text-body-md font-bold ${color}`}>{usd(valor)}</Text>
    </View>
  );
}

/**
 * Cómo está repartido el capital del cliente: un segmento por subcuenta, coloreado por
 * perfil, y el hueco gris de lo que no está invertido.
 *
 * **La barra no se normaliza.** Los segmentos son proporcionales al capital total, no a
 * la suma de las subcuentas: si el cliente declaró USD 40.000 y solo asignó 30.000, la
 * barra se ve incompleta a propósito. Una barra que se autocompleta esconde justo el
 * dato accionable — que hay USD 10.000 quietos.
 *
 * Si nunca declaró su capital total no hay hueco que mostrar (no sabemos contra qué),
 * así que la barra reparte lo asignado y lo dice.
 */
export default function BarraCapital({
  capitalTotal,
  asignado,
  sinAsignar,
  subcuentas,
}: Props) {
  const colorPerfil = useColorPerfil();
  const hueco = sinAsignar != null && sinAsignar > 0 ? sinAsignar : 0;
  const conMonto = subcuentas.filter((s) => s.monto > 0);
  const vacia = conMonto.length === 0 && hueco === 0;

  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <Cifra
          etiqueta="Capital total"
          valor={capitalTotal}
          color="text-text-primary"
        />
        <Cifra etiqueta="Asignado" valor={asignado} color="text-brand-primary" />
        <Cifra
          etiqueta="Sin asignar"
          valor={sinAsignar}
          color={hueco > 0 ? 'text-state-warning' : 'text-text-secondary'}
        />
      </View>

      {vacia ? (
        <View className="h-3 rounded-full bg-surface-secondary" />
      ) : (
        <View className="h-3 flex-row overflow-hidden rounded-full bg-surface-secondary">
          {conMonto.map((s) => (
            <View
              key={s.session_id}
              style={{ flex: s.monto, backgroundColor: colorPerfil[s.perfil] }}
            />
          ))}
          {/* El hueco: lo que el cliente tiene declarado y no invertido. */}
          {hueco > 0 ? <View style={{ flex: hueco }} className="bg-surface-divider" /> : null}
        </View>
      )}

      {capitalTotal == null ? (
        <Text className="text-caption text-text-muted">
          Declara tu capital total para ver cuánto te queda sin asignar.
        </Text>
      ) : null}
    </View>
  );
}
