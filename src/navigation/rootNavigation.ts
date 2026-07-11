import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from '@/types/navigation';

// Navegar desde fuera de componentes (ej: logout por sesión expirada en AuthContext)
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
