import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.midwicket.app',
  appName: 'Midwicket',
  webDir: 'dist',
  server: {
    // During development, use the Vite dev server
    // Uncomment the line below and run `pnpm dev` first
    // url: 'http://192.168.x.x:5173',
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#0c0c0d',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0c0c0d',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
}

export default config
