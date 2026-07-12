import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

import type { TasaInstrumento } from '@/app/inversionista/types/catalogo';
import { COLORES } from '@/constants/colores';
import { porcentaje } from '@/utils/formato';

interface Props {
  /** El catálogo (de GET /api/catalog/rates), con la elegibilidad ya marcada. */
  tasas: TasaInstrumento[];
  /** Códigos que ya están en la asignación: no se ofrecen dos veces. */
  excluir: string[];
  onAgregar: (tasa: TasaInstrumento) => void;
}

/**
 * La lista de productos que se pueden sumar a una asignación en edición.
 *
 * Los no elegibles para el perfil salen deshabilitados y en gris, con el candado —
 * la misma regla que pinta el comparador y que el servidor vuelve a aplicar al
 * guardar: esconder la fila enseñaría menos que mostrarla bloqueada.
 */
export default function SelectorInstrumento({ tasas, excluir, onAgregar }: Props) {
  const disponibles = tasas.filter((t) => !excluir.includes(t.code));

  if (disponibles.length === 0) {
    return (
      <Text className="text-body text-text-muted">
        Ya agregaste todos los productos del catálogo.
      </Text>
    );
  }

  return (
    <View className="overflow-hidden rounded-2xl border border-surface-border bg-surface-background">
      {disponibles.map((tasa, i) => {
        const bloqueada = tasa.elegible === false;
        return (
          <TouchableOpacity
            key={tasa.code}
            onPress={() => onAgregar(tasa)}
            disabled={bloqueada}
            activeOpacity={0.7}
            className={`flex-row items-center gap-3 p-4 ${
              i > 0 ? 'border-t border-surface-border' : ''
            } ${bloqueada ? 'opacity-50' : ''}`}
          >
            <Ionicons
              name={bloqueada ? 'lock-closed-outline' : 'add-circle-outline'}
              size={22}
              color={bloqueada ? COLORES.textoMuted : COLORES.primario}
            />
            <View className="flex-1">
              <Text className="text-body font-bold text-text-primary" numberOfLines={1}>
                {tasa.producto}
              </Text>
              <Text className="text-caption text-text-muted" numberOfLines={1}>
                {tasa.institucion} · {tasa.calificacion}
                {bloqueada ? ' · No disponible para tu perfil' : ''}
              </Text>
            </View>
            <Text
              className={`text-body font-bold ${
                bloqueada ? 'text-text-muted' : 'text-brand-primary'
              }`}
            >
              {porcentaje(tasa.tasa_anual)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
