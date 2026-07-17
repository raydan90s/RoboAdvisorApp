import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import AuditoriaPage from '@/app/asesor/pages/AuditoriaPage';
import ColaRevisionPage from '@/app/asesor/pages/ColaRevisionPage';
import DetallePropuestaPage from '@/app/asesor/pages/DetallePropuestaPage';
import LoginPage from '@/app/auth/pages/LoginPage';
import OlvideContrasenaPage from '@/app/auth/pages/OlvideContrasenaPage';
import RegistroPage from '@/app/auth/pages/RegistroPage';
import RestablecerContrasenaPage from '@/app/auth/pages/RestablecerContrasenaPage';
import VerificarCorreoPage from '@/app/auth/pages/VerificarCorreoPage';
import ComoSeCalculoPage from '@/app/inversionista/pages/ComoSeCalculoPage';
import ComparadorPage from '@/app/inversionista/pages/ComparadorPage';
import ComprobantePage from '@/app/inversionista/pages/ComprobantePage';
import ConveniosPage from '@/app/inversionista/pages/ConveniosPage';
import CuestionarioPage from '@/app/inversionista/pages/CuestionarioPage';
import InicioPage from '@/app/inversionista/pages/InicioPage';
import InvertirPage from '@/app/inversionista/pages/InvertirPage';
import MercadosSimuladorPage from '@/app/inversionista/pages/MercadosSimuladorPage';
import MisSubcuentasPage from '@/app/inversionista/pages/MisSubcuentasPage';
import NoticiasPage from '@/app/inversionista/pages/NoticiasPage';
import NuevaSubcuentaPage from '@/app/inversionista/pages/NuevaSubcuentaPage';
import PropuestaPage from '@/app/inversionista/pages/PropuestaPage';
import SimuladorPage from '@/app/inversionista/pages/SimuladorPage';
import SubcuentaDetallePage from '@/app/inversionista/pages/SubcuentaDetallePage';
import VincularWhatsAppPage from '@/app/whatsapp/pages/VincularWhatsAppPage';
import { useAuth } from '@/context/AuthContext';
import { useColores } from '@/context/ThemeContext';
import type {
  AdvisorStackParamList,
  AdvisorTabParamList,
  AuthStackParamList,
  InvestorStackParamList,
  InvestorTabParamList,
} from '@/types/navigation';

const Auth = createNativeStackNavigator<AuthStackParamList>();
const Investor = createNativeStackNavigator<InvestorStackParamList>();
const InvestorTab = createBottomTabNavigator<InvestorTabParamList>();
const Advisor = createNativeStackNavigator<AdvisorStackParamList>();
const AdvisorTab = createBottomTabNavigator<AdvisorTabParamList>();

const sinHeader = { headerShown: false } as const;

/**
 * Entrar, crear cuenta y recuperarla. Las tres pantallas de código (`VerificarCorreo`,
 * `RestablecerContrasena`) no navegan al terminar: al haber token, este componente vuelve
 * a decidir y monta el stack del rol. Por eso el AuthStack no conoce a los otros dos.
 */
function AuthStack() {
  return (
    <Auth.Navigator screenOptions={sinHeader}>
      <Auth.Screen name="Login" component={LoginPage} />
      <Auth.Screen name="Registro" component={RegistroPage} />
      <Auth.Screen name="VerificarCorreo" component={VerificarCorreoPage} />
      <Auth.Screen name="OlvideContrasena" component={OlvideContrasenaPage} />
      <Auth.Screen name="RestablecerContrasena" component={RestablecerContrasenaPage} />
    </Auth.Navigator>
  );
}

/**
 * El flujo del inversionista es lineal —ver sus carteras, abrir una, crear otra— así que
 * es un stack y no unos tabs. Los tabs son del asesor, que sí tiene dos listas
 * independientes (cola y auditoría).
 *
 * `Inicio` / `Cuestionario` / `Propuesta` son el flujo de una sola cartera, que sigue
 * registrado a propósito: si las subcuentas no llegan al domingo, volver a él es cambiar
 * `initialRouteName` a `Inicio` — no revertir pantallas a mano.
 */
function InvestorStack() {
  return (
    <Investor.Navigator screenOptions={sinHeader} initialRouteName="MisSubcuentas">
      <Investor.Screen name="MisSubcuentas" component={MisSubcuentasPage} />
      <Investor.Screen name="NuevaSubcuenta" component={NuevaSubcuentaPage} />
      <Investor.Screen name="SubcuentaDetalle" component={SubcuentaDetallePage} />

      <Investor.Screen name="Inicio" component={InicioPage} />
      <Investor.Screen name="Cuestionario" component={CuestionarioPage} />
      <Investor.Screen name="Propuesta" component={PropuestaPage} />

      {/* Cursar la propuesta firmada. `gestureEnabled: false` en Invertir: la orden ya
          salió hacia los bancos, y deslizar hacia atrás a media conexión dejaría al
          usuario sin saber si pasó o no. Se sale por el comprobante. */}
      <Investor.Screen
        name="Invertir"
        component={InvertirPage}
        options={{ gestureEnabled: false }}
      />
      <Investor.Screen name="Comprobante" component={ComprobantePage} />
      <Investor.Screen name="Convenios" component={ConveniosPage} />

      <Investor.Screen name="ComoSeCalculo" component={ComoSeCalculoPage} />
      <Investor.Screen name="Comparador" component={ComparadorPage} />
      <Investor.Screen name="Simulador" component={SimuladorPage} />
      <Investor.Screen name="Mercados" component={MercadosSimuladorPage} />
      <Investor.Screen name="VincularWhatsApp" component={VincularWhatsAppPage} />
    </Investor.Navigator>
  );
}

/**
 * El layout del inversionista: su operación en un tab y las noticias en el otro.
 * El stack completo vive DENTRO del primer tab, así el feed queda a un toque desde
 * cualquier pantalla — que era el punto de la sugerencia del jurado.
 *
 * La voz NO es un tab: vive dentro del `AgentSheet`, que ya tiene el hilo, los chips y
 * el selector de modelo. Un tab aparte sería la misma conversación en dos lugares.
 */
function InvestorTabs() {
  const colores = useColores();

  return (
    <InvestorTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoMuted,
      }}
    >
      <InvestorTab.Screen
        name="InicioTab"
        component={InvestorStack}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" color={color} size={size} />
          ),
        }}
      />
      <InvestorTab.Screen
        name="NoticiasTab"
        component={NoticiasPage}
        options={{
          title: 'Noticias',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper-outline" color={color} size={size} />
          ),
        }}
      />
    </InvestorTab.Navigator>
  );
}

/** Cola y auditoría son dos listas independientes: el asesor salta entre ellas, no
 *  las recorre en orden. Eso son tabs. */
function AdvisorTabs() {
  const colores = useColores();

  return (
    <AdvisorTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoMuted,
      }}
    >
      <AdvisorTab.Screen
        name="ColaRevision"
        component={ColaRevisionPage}
        options={{
          title: 'Cola',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" color={color} size={size} />
          ),
        }}
      />
      <AdvisorTab.Screen
        name="Auditoria"
        component={AuditoriaPage}
        options={{
          title: 'Auditoría',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" color={color} size={size} />
          ),
        }}
      />
    </AdvisorTab.Navigator>
  );
}

/** El detalle va apilado encima de los tabs: mientras el asesor decide, la barra de
 *  navegación no está ahí para que se distraiga y deje la decisión a medias. */
function AdvisorStack() {
  return (
    <Advisor.Navigator screenOptions={sinHeader}>
      <Advisor.Screen name="Tabs" component={AdvisorTabs} />
      <Advisor.Screen name="DetallePropuesta" component={DetallePropuestaPage} />
      <Advisor.Screen name="ComoSeCalculo" component={ComoSeCalculoPage} />
    </Advisor.Navigator>
  );
}

/**
 * Único punto donde se decide qué ve el usuario. Al cambiar `token`/`role` el
 * árbol se remonta: por eso `logout()` no necesita navegar a ningún lado.
 */
export default function RootNavigator() {
  const { token, role, isLoading } = useAuth();
  const colores = useColores();

  // Mientras se lee la sesión guardada: sin esto se vería un parpadeo del login
  // antes de restaurar al usuario ya logueado.
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-background">
        <ActivityIndicator size="large" color={colores.primario} />
      </View>
    );
  }

  if (!token || !role) return <AuthStack />;

  return role === 'advisor' ? <AdvisorStack /> : <InvestorTabs />;
}
