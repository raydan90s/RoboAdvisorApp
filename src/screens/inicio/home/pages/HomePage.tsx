import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import HomeBody from '../components/HomeBody';
import HomeHeader from '../components/HomeHeader';

export default function HomePage() {
  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <StatusBar style="dark" />
      <HomeHeader title="Inicio" onSettings={() => {}} />
      <HomeBody />
    </SafeAreaView>
  );
}
