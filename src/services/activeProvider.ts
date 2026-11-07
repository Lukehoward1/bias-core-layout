import type { DataProvider } from './dataProvider';
import { TwelveDataAdapter } from './adapters/twelvedata';
import { FmpAdapter } from './adapters/fmp';

const providerName = (import.meta.env.VITE_DATA_PROVIDER as string | undefined) ?? 'twelvedata';

export const activeProvider: DataProvider =
  providerName === 'fmp' ? new FmpAdapter() : new TwelveDataAdapter();
