import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './src/style/global.css';

import { AuthProvider } from '@/context/AuthContext';
import RootNavigator from '@/navigation/RootNavigator';
import { navigationRef } from '@/navigation/rootNavigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
