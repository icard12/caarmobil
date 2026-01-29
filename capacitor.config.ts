import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.callmobile.caarmobil',
    appName: 'CAAR MOBIL MANAGEMENT',
    webDir: 'dist',
    bundledWebRuntime: false,
    server: {
        androidScheme: 'https',
        // In dev mode, we can point to the local server for rapid testing
        // cleartext: true,
        // url: 'http://192.168.1.xxx:5173' 
    },
    android: {
        allowMixedContent: true,
        captureInput: true
    },
    ios: {
        contentInset: 'always'
    }
};

export default config;
