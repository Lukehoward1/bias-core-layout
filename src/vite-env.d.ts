/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOCK_CANDLES: string;
  readonly VITE_DATA_PROVIDER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
