/**
 * Un navegador por rol. RootNavigator elige cuál montar según `role` del
 * AuthContext, así que las pantallas del asesor ni siquiera existen en el árbol
 * de un inversionista.
 */

export type AuthStackParamList = {
  Login: undefined;
};

/**
 * `ComoSeCalculoPage` se registra en los dos stacks: el cliente ve su propio desglose
 * (sin params) y el asesor abre el de su cliente. Por eso los params son los mismos en
 * ambos lados.
 *
 * - sin `investorId` → el usuario del token
 * - sin `sessionId`  → la última sesión completada. El asesor **sí** pasa la sesión que
 *   originó la propuesta que está revisando: si el cliente se volvió a perfilar, la
 *   última ya no es esa.
 */
export type ComoSeCalculoParams = { investorId?: string; sessionId?: string } | undefined;

export type InvestorStackParamList = {
  Inicio: undefined;
  Cuestionario: undefined;
  /** Lee la propuesta del usuario del token: no recibe un id que se pueda falsear. */
  Propuesta: undefined;
  ComoSeCalculo: ComoSeCalculoParams;
};

/** Las dos listas del asesor: independientes entre sí, por eso son tabs. */
export type AdvisorTabParamList = {
  ColaRevision: undefined;
  Auditoria: undefined;
};

/** El detalle se apila **encima** de los tabs: mientras decide, el asesor no navega. */
export type AdvisorStackParamList = {
  Tabs: undefined;
  DetallePropuesta: { proposalId: string };
  ComoSeCalculo: ComoSeCalculoParams;
};

/** Unión de todas las rutas: es lo que tipa el navigationRef global. */
export type RootStackParamList = AuthStackParamList &
  InvestorStackParamList &
  AdvisorTabParamList &
  AdvisorStackParamList;
