import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';

import HomeBody from '../components/HomeBody';
import HomeHeader from '../components/HomeHeader';

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <HomeHeader
        title={user ? `Hola, ${user.name}` : 'Inicio'}
        subtitle="Inversionista"
        actionIcon="log-out-outline"
        onAction={logout}
      />
      <HomeBody />
    </SafeAreaView>
  );
}
