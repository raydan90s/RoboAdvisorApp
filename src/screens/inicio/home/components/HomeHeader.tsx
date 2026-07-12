import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

import BotonTema from '@/components/shared/BotonTema';
import { useColores } from '@/context/ThemeContext';

interface HomeHeaderProps {
  title: string;
  subtitle?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction: () => void;
}

export default function HomeHeader({
  title,
  subtitle,
  actionIcon = 'settings-outline',
  onAction,
}: HomeHeaderProps) {
  const colores = useColores();

  return (
    <View className="flex-row items-center justify-between border-b border-surface-border bg-surface-background px-5 py-4">
      <View className="flex-1 pr-3">
        <Text className="text-heading font-bold text-text-primary" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-caption text-text-secondary">{subtitle}</Text>
        ) : null}
      </View>

      <View className="flex-row items-center gap-2">
        <BotonTema />

        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.85}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary"
        >
          <Ionicons name={actionIcon} size={20} color={colores.textoPrimario} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
