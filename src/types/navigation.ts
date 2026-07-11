/**
 * Un navegador por rol. RootNavigator elige cuál montar según `role` del
 * AuthContext, así que las pantallas del asesor ni siquiera existen en el árbol
 * de un inversionista.
 */

export type AuthStackParamList = {
  Login: undefined;
};

export type InvestorStackParamList = {
  Inicio: undefined;
  Cuestionario: undefined;
  /** Lee la propuesta del usuario del token: no recibe un id que se pueda falsear. */
  Propuesta: undefined;
  /** Sin `sessionId` el backend usa la última sesión completada. */
  ComoSeCalculo: { sessionId?: string } | undefined;
};

export type AdvisorStackParamList = {
  ColaRevision: undefined;
  // Fase 4: DetallePropuesta, Auditoria
};

/** Unión de todas las rutas: es lo que tipa el navigationRef global. */
export type RootStackParamList = AuthStackParamList &
  InvestorStackParamList &
  AdvisorStackParamList;
