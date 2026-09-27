/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_PROVIDER?: 'mock' | 'espn'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __APP_VERSION__: string
