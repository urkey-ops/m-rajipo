// config.js - Application configuration
export const config = {
  // Environment
  env: 'production', // 'development' or 'production'
  
  // Debug mode
  debug: false,
  
  // Feature flags
  features: {
    enablePlaylists: true,
    enableRecent: true,
    enableQuizMode: true,
    enableNetworkRetry: true,
    enableMediaSession: true,
    enableAutoSave: true
  },
  
  // API endpoints (if needed in future)
  api: {
    baseUrl: 'https://ia601703.us.archive.org/35/items/satsang_diksha',
    timeout: 30000 // 30 seconds
  },
  
  // Storage configuration
  storage: {
    prefix: 'mission_rajipo_',
    maxPlaylistSize: 1000,
    maxHistorySize: 5,
    quotaWarningThreshold: 0.9 // Warn when 90% full
  },
  
  // Audio configuration
  audio: {
    preloadStrategy: 'metadata', // 'none', 'metadata', 'auto'
    defaultSpeed: 1.0,
    minSpeed: 0.5,
    maxSpeed: 2.0,
    speedStep: 0.1
  },
  
  // Quiz configuration
  quiz: {
    defaultTime: 20,
    minTime: 5,
    maxTime: 60,
    defaultDelay: 3,
    minDelay: 1,
    maxDelay: 10,
    defaultAutoPlay: false
  },
  
  // UI configuration
  ui: {
    toastDuration: 3000,
    errorToastDuration: 5000,
    debounceDelay: 300,
    enableAnimations: true,
    darkMode: false // Can be 'auto', true, or false
  },
  
  // Network configuration
  network: {
    maxRetries: 3,
    retryDelay: 2000,
    retryBackoffMultiplier: 2,
    checkConnectivityInterval: 10000 // Check every 10 seconds
  },
  
  // Analytics (disabled for now)
  analytics: {
    enabled: false,
    trackingId: null
  },
  
  // PWA configuration
  pwa: {
    enabled: true,
    updateCheckInterval: 60000 // Check for updates every minute
  },
  
  // Browser compatibility
  compatibility: {
    minChromeVersion: 80,
    minFirefoxVersion: 75,
    minSafariVersion: 13,
    minEdgeVersion: 80
  },
  
  // Logging
  logging: {
    level: 'info', // 'debug', 'info', 'warn', 'error'
    enableConsole: true,
    enableRemote: false
  }
};

// Development overrides
if (config.env === 'development') {
  config.debug = true;
  config.logging.level = 'debug';
  config.features.enableAutoSave = false; // Disable auto-save in dev
}

// Freeze config to prevent modifications
Object.freeze(config);

export default config;
