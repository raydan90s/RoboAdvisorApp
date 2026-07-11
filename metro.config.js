// Expo SDK 56+ vendoriza React Navigation dentro de expo-router y bloquea los
// imports de `@react-navigation/*` desde código de app. Esta app no usa expo-router:
// navega con React Navigation standalone, así que no hay doble instancia y el check
// no aplica. Se desactiva aquí (y no vía env var suelta) para que dev, CI y EAS
// compartan la misma config.
process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './src/style/global.css' });
