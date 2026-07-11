import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

interface HomeHeaderProps {
  title: string;
  onSettings: () => void;
}

export default function HomeHeader({ title, onSettings }: HomeHeaderProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-surface-border px-5 py-4">
      <Text className="text-heading font-bold text-text-primary">{title}</Text>

      <TouchableOpacity
        onPress={onSettings}
        activeOpacity={0.85}
        className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary"
      >
        <Ionicons name="settings-outline" size={20} color="#18181B" />
      </TouchableOpacity>
    </View>
  );
}
