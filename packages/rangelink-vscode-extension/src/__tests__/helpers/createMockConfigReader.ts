import type { ConfigReader } from '../../config/ConfigReader';

export interface MockConfigReaderOverrides {
  getPaddingMode?: jest.Mock;
  getWithDefault?: jest.Mock;
  get?: jest.Mock;
  inspect?: jest.Mock;
}

export const createMockConfigReader = (
  overrides?: MockConfigReaderOverrides,
): jest.Mocked<ConfigReader> => {
  const baseConfigReader = {
    getPaddingMode: jest.fn((_key: string, defaultValue: string) => defaultValue),
    getWithDefault: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
    get: jest.fn(),
    inspect: jest.fn(),
  };

  return {
    ...baseConfigReader,
    ...overrides,
  } as unknown as jest.Mocked<ConfigReader>;
};
