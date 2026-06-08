import type { ConfigReader } from '../../config/ConfigReader';
import type { PaddingMode } from '../../utils/applySmartPadding';

export interface MockConfigReaderOverrides {
  getPaddingMode?: jest.Mock;
  getWithDefault?: jest.Mock;
  getBoolean?: jest.Mock;
  get?: jest.Mock;
  inspect?: jest.Mock;
}

export const createMockConfigReader = (
  overrides?: MockConfigReaderOverrides,
): jest.Mocked<ConfigReader> => {
  const baseConfigReader = {
    getPaddingMode: jest.fn((_key: string, defaultValue: PaddingMode) => defaultValue),
    getWithDefault: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
    getBoolean: jest.fn((_key: string, defaultValue: boolean) => defaultValue),
    get: jest.fn(),
    inspect: jest.fn(),
  };

  return {
    ...baseConfigReader,
    ...overrides,
  } as unknown as jest.Mocked<ConfigReader>;
};
