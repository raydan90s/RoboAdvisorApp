import { Text, View } from 'react-native';

import { fechaCorta } from '@/utils/formato';

interface CalificacionProps {
  institucion: string | null;
  calificacion: string | null;
  fuente: string | null;
  fecha: string | null;
}

/**
 * "Banco Pichincha · AAA" + el pie con la fuente y la fecha.
 *
 * **El pie no es opcional.** Una calificación sin calificadora ni fecha se lee como un
 * dato vigente que la app estaría afirmando; con ellas, es un dato citado. Esa línea de
 * texto es la diferencia entre citar y alucinar (criterio #3 del track), y por eso vive
 * en el mismo componente que el rating: no se puede mostrar uno sin el otro.
 */
export default function Calificacion({
  institucion,
  calificacion,
  fuente,
  fecha,
}: CalificacionProps) {
  if (!institucion) return null;

  return (
    <View className="gap-1">
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="text-body font-bold text-text-primary">{institucion}</Text>
        {calificacion ? (
          <View className="rounded-md bg-brandAlpha-primarySoft px-2 py-0.5">
            <Text className="text-caption font-bold text-brand-primary">
              {calificacion}
            </Text>
          </View>
        ) : null}
      </View>

      {calificacion ? (
        <Text className="text-caption text-text-muted">
          Fuente: {fuente ?? 'no declarada'} · {fechaCorta(fecha)} · referencial
        </Text>
      ) : null}
    </View>
  );
}
