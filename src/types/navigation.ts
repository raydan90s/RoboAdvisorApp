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
  /** El Home: el capital del cliente y en qué subcuentas lo repartió. */
  MisSubcuentas: undefined;
  NuevaSubcuenta: undefined;
  /**
   * Una subcuenta concreta. El `sessionId` no es un permiso: el backend igual verifica
   * que la sesión sea del usuario del token. `nombre` es solo el título de la pantalla,
   * para no esperar al fetch para pintarlo.
   */
  SubcuentaDetalle: { sessionId: string; nombre?: string };

  /** Flujo de una sola cartera. Sigue vivo: es a lo que se revierte si las subcuentas
   *  no llegan (el botón de pánico del reparto). Volver a él = cambiar el
   *  `initialRouteName` del stack a `Inicio`. */
  Inicio: undefined;
  Cuestionario: undefined;
  /** Lee la propuesta del usuario del token: no recibe un id que se pueda falsear. */
  Propuesta: undefined;

  ComoSeCalculo: ComoSeCalculoParams;
  /** Con `monto` (p. ej. desde una propuesta) las tasas llegan con interés calculado. */
  Comparador: { monto?: number } | undefined;
  Simulador: undefined;
  /** Mercados EXTERNOS (Alpha Vantage): acciones, forex, cripto. Separado a propósito
   *  de `Simulador` (catálogo del banco) — no son el mismo dato ni la misma promesa. */
  Mercados: undefined;
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
