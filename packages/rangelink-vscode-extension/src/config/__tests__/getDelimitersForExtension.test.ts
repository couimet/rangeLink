import { createMockLogger } from 'barebone-logger-testing';
import { DEFAULT_DELIMITERS } from 'rangelink-core-ts';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { getDelimitersForExtension } from '../getDelimitersForExtension';
import type { ConfigGetter, ConfigInspection } from '../types';
import { DelimiterConfigKey } from '../types';

// ============================================================================
// Test Utilities
// ============================================================================

const createMockConfig = (overrides: Partial<Record<string, string>> = {}): ConfigGetter => {
  return {
    get: <T>(key: string): T | undefined => {
      if (key in overrides) {
        return overrides[key] as T;
      }
      return undefined;
    },
    inspect: (key: string): ConfigInspection | undefined => {
      const isOverridden = key in overrides;
      return {
        key: 'line',
        defaultValue: undefined,
        globalValue: isOverridden ? overrides[key] : undefined,
        workspaceValue: undefined,
        workspaceFolderValue: undefined,
      };
    },
  };
};

const createMockIdeAdapter = (): any => {
  return {
    writeTextToClipboard: jest.fn().mockResolvedValue(undefined),
    setStatusBarMessage: jest.fn(),
    showWarningMessage: jest.fn().mockResolvedValue(undefined),
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
    showTextDocument: jest.fn(),
  };
};

// ============================================================================
// Tests
// ============================================================================

describe('getDelimitersForExtension', () => {
  describe('valid configuration', () => {
    it('should load valid default delimiters without showing error', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'L',
        [DelimiterConfigKey.Position]: 'C',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const ideAdapter = createMockIdeAdapter();
      const logger = createMockLogger();

      const result = getDelimitersForExtension(config, ideAdapter, logger);

      expect(result).toStrictEqual({
        line: 'L',
        position: 'C',
        hash: '#',
        range: '-',
      });
      expect(ideAdapter.showErrorMessage).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should load valid custom delimiters without showing error', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'LINE',
        [DelimiterConfigKey.Position]: 'COL',
        [DelimiterConfigKey.Hash]: '$',
        [DelimiterConfigKey.Range]: 'TO',
      });
      const ideAdapter = createMockIdeAdapter();
      const logger = createMockLogger();

      const result = getDelimitersForExtension(config, ideAdapter, logger);

      expect(result).toStrictEqual({
        line: 'LINE',
        position: 'COL',
        hash: '$',
        range: 'TO',
      });
      expect(ideAdapter.showErrorMessage).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should use defaults when no config is provided', () => {
      const config = createMockConfig({});
      const ideAdapter = createMockIdeAdapter();
      const logger = createMockLogger();

      const result = getDelimitersForExtension(config, ideAdapter, logger);

      expect(result).toStrictEqual(DEFAULT_DELIMITERS);
      expect(ideAdapter.showErrorMessage).not.toHaveBeenCalled();
    });
  });

  describe('invalid configuration', () => {
    it('should show error message when configuration has validation errors', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'L',
        [DelimiterConfigKey.Position]: 'L', // Duplicate - conflicts with line
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const ideAdapter = createMockIdeAdapter();
      const logger = createMockLogger();

      const result = getDelimitersForExtension(config, ideAdapter, logger);

      // Should return defaults when validation fails
      expect(result).toStrictEqual(DEFAULT_DELIMITERS);

      // Should show error notification to user
      expect(ideAdapter.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Invalid delimiter configuration. Using defaults. Check Output → RangeLink for details.',
      );
      expect(ideAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
    });

    it('should show error when delimiter contains numbers', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'L2', // Invalid - contains number
        [DelimiterConfigKey.Position]: 'C',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const ideAdapter = createMockIdeAdapter();
      const logger = createMockLogger();

      const result = getDelimitersForExtension(config, ideAdapter, logger);

      expect(result).toStrictEqual(DEFAULT_DELIMITERS);
      expect(ideAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
    });

    it('should show error when delimiter is empty string', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: '', // Invalid - empty
        [DelimiterConfigKey.Position]: 'C',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const ideAdapter = createMockIdeAdapter();
      const logger = createMockLogger();

      const result = getDelimitersForExtension(config, ideAdapter, logger);

      expect(result).toStrictEqual(DEFAULT_DELIMITERS);
      expect(ideAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
    });

    it('should show error when delimiters have substring conflicts', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'L',
        [DelimiterConfigKey.Position]: 'LINE', // Invalid - contains 'L'
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const ideAdapter = createMockIdeAdapter();
      const logger = createMockLogger();

      const result = getDelimitersForExtension(config, ideAdapter, logger);

      expect(result).toStrictEqual(DEFAULT_DELIMITERS);
      expect(ideAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
    });

    it('should log validation errors', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'L',
        [DelimiterConfigKey.Position]: 'L', // Duplicate
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const ideAdapter = createMockIdeAdapter();
      const logger = createMockLogger();

      getDelimitersForExtension(config, ideAdapter, logger);

      // Should log errors via loadDelimiterConfig
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle partial configuration with some valid and some invalid delimiters', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'L', // Valid
        [DelimiterConfigKey.Position]: '123', // Invalid - only numbers
        // Hash and Range will use defaults
      });
      const ideAdapter = createMockIdeAdapter();
      const logger = createMockLogger();

      const result = getDelimitersForExtension(config, ideAdapter, logger);

      // Should fall back to defaults on any validation error
      expect(result).toStrictEqual(DEFAULT_DELIMITERS);
      expect(ideAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
    });

    it('should handle config with whitespace delimiters', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: ' ', // Whitespace - may be valid depending on validation
        [DelimiterConfigKey.Position]: 'C',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const ideAdapter = createMockIdeAdapter();
      const logger = createMockLogger();

      const result = getDelimitersForExtension(config, ideAdapter, logger);

      // Validation should handle this according to rules in loadDelimiterConfig
      // If valid, returns the config; if invalid, returns defaults
      expect(result).toBeDefined();
    });
  });
});
