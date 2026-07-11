import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';

/**
 * Placeholder: confirma que el ruteo por rol funciona.
 * La cola real (GET /api/advisor/queue) llega en la Fase 2.
 */
export default function ColaRevisionPage() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between border-b border-surface-border px-5 py-4">
        <View>
          <Text className="text-heading font-bold text-text-primary">Cola de revisión</Text>
          <Text className="text-caption text-text-secondary">{user?.name} · Asesor</Text>
        </View>
        <TouchableOpacity onPress={logout} activeOpacity={0.85}>
          <Text className="text-body font-bold text-brand-primary">Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 bg-surface-canvas" contentContainerClassName="px-5 py-6">
        <View className="rounded-2xl border border-surface-border bg-surface-background p-5">
          <Text className="text-title font-bold text-text-primary">
            Entraste como asesor
          </Text>
          <Text className="mt-2 text-body text-text-secondary">
            El ruteo por rol funciona: este navegador solo se monta si el JWT trae
            role=&quot;advisor&quot;. Las propuestas de Juan y Andrea aparecerán aquí
            cuando exista GET /api/advisor/queue (Fase 2).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
