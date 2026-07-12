import { View } from 'react-native';

import AgenteFab from '@/app/agente/components/AgenteFab';

import VistaPropuesta from '../components/VistaPropuesta';

/**
 * La propuesta de la cartera única: sin `sessionId`, el backend devuelve la sesión más
 * reciente del usuario del token.
 *
 * Es la pantalla del flujo sin subcuentas, y sigue en pie a propósito: si las subcuentas
 * se caen el domingo, esta ruta y `CuestionarioPage` son la app que igual cumple las tres
 * HU (el botón de pánico del reparto).
 *
 * El asistente flota encima: sin `sessionId` conversa sobre la sesión más reciente, que
 * es justo la que muestra esta pantalla.
 */
export default function PropuestaPage() {
  return (
    <View className="flex-1">
      <VistaPropuesta />
      <AgenteFab />
    </View>
  );
}
