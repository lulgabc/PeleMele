import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pelemele.app',
  appName: 'PeleMele',
  webDir: 'dist',
  backgroundColor: '#FFF5E9',
  ios: {
    contentInset: 'always',
    backgroundColor: '#FFF5E9',
  },
  android: {
    backgroundColor: '#FFF5E9',
  },
};

export default config;
