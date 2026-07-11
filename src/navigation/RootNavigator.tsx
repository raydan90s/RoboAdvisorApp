import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import AuditoriaPage from '@/app/asesor/pages/AuditoriaPage';
import ColaRevisionPage from '@/app/asesor/pages/ColaRevisionPage';
import DetallePropuestaPage from '@/app/asesor/pages/DetallePropuestaPage';
import LoginPage from '@/app/auth/pages/LoginPage';
import ComoSeCalculoPage from '@/app/inversionista/pages/ComoSeCalculoPage';
import CuestionarioPage from '@/app/inversionista/pages/CuestionarioPage';
import InicioPage from '@/app/inversionista/pages/InicioPage';
import PropuestaPage from '@/app/inversionista/pages/PropuestaPage';
import { useAuth } from '@/context/AuthContext';
import type {
  AdvisorStackParamList,
  AdvisorTabParamList,
  AuthStackParamList,
  InvestorStackParamList,
} from '@/types/navigation';

const Auth = createNativeStackNavigator<AuthStackParamList>();
const Investor = createNativeStackNavigator<InvestorStackParamList>();
const Advisor = createNativeStackNavigator<AdvisorStackParamList>();
const AdvisorTab = createBottomTabNavigator<AdvisorTabParamList>();

const sinHeader = { headerShown: false } as const;

function AuthStack() {
  return (
    <Auth.Navigator screenOptions={sinHeader}>
      <Auth.Screen name="Login" component={LoginPage} />
    </Auth.Navigator>
  );
}

/**
 * El flujo del inversionista es lineal —perfilarse, ver la propuesta, entender el
 * puntaje— así que es un stack y no unos tabs: una pestaña "Propuesta" para alguien
 * que todavía no se perfiló solo podría mostrar un 404. Los tabs son del asesor, que
 * sí tiene dos listas independientes (cola y auditoría).
 */
function InvestorStack() {
  return (
    <Investor.Navigator screenOptions={sinHeader}>
      <Investor.Screen name="Inicio" component={InicioPage} />
      <Investor.Screen name="Cuestionario" component={CuestionarioPage} />
      <Investor.Screen name="Propuesta" component={PropuestaPage} />
      <Investor.Screen name="ComoSeCalculo" component={ComoSeCalculoPage} />
    </Investor.Navigator>
  );
}

/** Cola y auditoría son dos listas independientes: el asesor salta entre ellas, no
 *  las recorre en orden. Eso son tabs. */
function AdvisorTabs() {
  return (
    <AdvisorTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1E3A8A',
        tabBarInactiveTintColor: '#A1A1AA',
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

  // Mientras se lee la sesión guardada: sin esto se vería un parpadeo del login
  // antes de restaurar al usuario ya logueado.
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-background">
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  if (!token || !role) return <AuthStack />;

  return role === 'advisor' ? <AdvisorStack /> : <InvestorStack />;
}
