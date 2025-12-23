import type { ConfigGetter, ConfigurationProvider } from '../../config/types';

import { createMockConfigGetter } from './createMockConfigGetter';

/**
 * Creates a mock ConfigurationProvider for testing code that accesses configuration.
 *
 * @param configGetter - Optional ConfigGetter to return from getConfiguration. Defaults to empty config.
 * @returns A mocked ConfigurationProvider with jest mock functions
 */
export const createMockConfigurationProvider = (
  configGetter: ConfigGetter = createMockConfigGetter(),
): jest.Mocked<ConfigurationProvider> => ({
  getConfiguration: jest.fn().mockReturnValue(configGetter),
});
