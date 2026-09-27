/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/pwa-assets" />

interface ImportMetaEnv {
  readonly VITE_DATA_PROVIDER?: 'mock' | 'espn'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __APP_VERSION__: string
