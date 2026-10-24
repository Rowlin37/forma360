import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.forma360.app',
  appName: 'Forma360',
  webDir: 'out',
  android: {
    allowMixedContent: false,
    backgroundColor: '#0F172A',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: '#0F172A',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidInclusiveRotation: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F172A',
      overlaysWebView: false,
    },
  },
};

export default config;
