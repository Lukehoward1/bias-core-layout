/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOCK_CANDLES: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
