import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { InvestorStackParamList } from '@/types/navigation';

import VistaPropuesta from '../components/VistaPropuesta';

type Props = NativeStackScreenProps<InvestorStackParamList, 'SubcuentaDetalle'>;

/**
 * El detalle de una subcuenta **es** su propuesta: mismo donut, mismos productos, misma
 * explicación. Lo único que cambia es de qué sesión se lee.
 *
 * Por eso acá no hay pantalla nueva sino la misma vista con un `sessionId` — si esto
 * fuera una copia de `PropuestaPage`, cualquier arreglo habría que hacerlo dos veces.
 */
export default function SubcuentaDetallePage({ route }: Props) {
  const { sessionId, nombre } = route.params;
  return <VistaPropuesta sessionId={sessionId} titulo={nombre ?? 'Tu subcuenta'} />;
}
