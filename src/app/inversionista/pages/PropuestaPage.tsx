import VistaPropuesta from '../components/VistaPropuesta';

/**
 * La propuesta de la cartera única: sin `sessionId`, el backend devuelve la sesión más
 * reciente del usuario del token.
 *
 * Es la pantalla del flujo sin subcuentas, y sigue en pie a propósito: si las subcuentas
 * se caen el domingo, esta ruta y `CuestionarioPage` son la app que igual cumple las tres
 * HU (el botón de pánico del reparto).
 */
export default function PropuestaPage() {
  return <VistaPropuesta />;
}
