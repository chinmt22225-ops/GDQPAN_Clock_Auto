// Capacitor Web Runtime Stub
// When running inside Android / iOS WebView, this is intercepted by Capacitor's native bridge.
// When running in local browser or automated test, this prevents ERR_FILE_NOT_FOUND.
if (typeof window !== 'undefined' && !window.Capacitor) {
  window.Capacitor = {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
    isPluginAvailable: () => false,
    Plugins: {}
  };
}
