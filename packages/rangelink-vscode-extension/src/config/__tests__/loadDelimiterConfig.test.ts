import { createMockLogger } from 'barebone-logger-testing';
import { DEFAULT_DELIMITERS } from 'rangelink-core-ts';

import { loadDelimiterConfig } from '../loadDelimiterConfig';
import type { ConfigGetter, ConfigInspection } from '../types';
import { DelimiterConfigKey } from '../types';

// ============================================================================
// Test Utilities
// ============================================================================

const createMockConfig = (overrides: Partial<Record<string, string>> = {}): ConfigGetter => {
  // Note: When testing with overrides, we simulate user settings (globalValue)
  // When no override, config.get() returns undefined (no user setting)

  return {
    get: <T>(key: string): T | undefined => {
      // If the key is in overrides, return the override value
      // Otherwise, return undefined to simulate "no config value set"
      if (key in overrides) {
        return overrides[key] as T;
      }
      return undefined;
    },
    inspect: (key: string): ConfigInspection | undefined => {
      const isOverridden = key in overrides;
      return {
        key: 'line', // Simplified for testing
        defaultValue: undefined, // Defaults come from DEFAULT_DELIMITERS in core
        globalValue: isOverridden ? overrides[key] : undefined,
        workspaceValue: undefined,
        workspaceFolderValue: undefined,
      };
    },
  };
};

// ============================================================================
// Tests
// ============================================================================

describe('loadDelimiterConfig', () => {
  describe('successful configuration loading', () => {
    it('should load valid default delimiters', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'L',
        [DelimiterConfigKey.Position]: 'C',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.delimiters).toStrictEqual({
        line: 'L',
        position: 'C',
        hash: '#',
        range: '-',
      });
      expect(result.errors).toStrictEqual([]);
      expect(result.sources.line).toBe('user');
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled(); // Success logging
    });

    it('should load valid custom delimiters', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'LINE',
        [DelimiterConfigKey.Position]: 'COL',
        [DelimiterConfigKey.Hash]: '$',
        [DelimiterConfigKey.Range]: 'TO',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.delimiters).toStrictEqual({
        line: 'LINE',
        position: 'COL',
        hash: '$',
        range: 'TO',
      });
      expect(result.errors).toStrictEqual([]);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should load multi-character delimiters', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'LINE',
        [DelimiterConfigKey.Position]: 'POS',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: 'THRU',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.delimiters.line).toBe('LINE');
      expect(result.delimiters.range).toBe('THRU');
      expect(result.errors).toStrictEqual([]);
    });
  });

  describe('invalid delimiter values - empty and whitespace', () => {
    it('should reject empty string delimiter and return defaults', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: '',
        [DelimiterConfigKey.Position]: 'C',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.delimiters).toStrictEqual(DEFAULT_DELIMITERS);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('CONFIG_DELIMITER_EMPTY');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should reject whitespace-only delimiter', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'L',
        [DelimiterConfigKey.Position]: '   ',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.delimiters).toStrictEqual(DEFAULT_DELIMITERS);
      expect(result.errors.length).toBeGreaterThan(0);
      // Whitespace-only becomes empty after trimming
      expect(result.errors[0].code).toBe('CONFIG_DELIMITER_EMPTY');
    });
  });

  describe('invalid delimiter values - digits', () => {
    it.each([
      ['123', 'numbers only'],
      ['A1', 'contains numbers at end'],
      ['1A', 'starts with number'],
    ])('should reject delimiter "%s" (%s)', (invalidValue) => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: invalidValue,
        [DelimiterConfigKey.Position]: 'C',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.delimiters).toStrictEqual(DEFAULT_DELIMITERS);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('CONFIG_DELIMITER_DIGITS');
    });
  });

  describe('invalid delimiter values - whitespace', () => {
    it.each([
      ['L ', 'trailing space'],
      [' L', 'leading space'],
      ['L\t', 'tab'],
    ])('should reject delimiter containing whitespace "%s"', (invalidValue) => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'L',
        [DelimiterConfigKey.Position]: 'C',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: invalidValue,
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.delimiters).toStrictEqual(DEFAULT_DELIMITERS);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('CONFIG_DELIMITER_WHITESPACE');
    });
  });

  describe('reserved character validation', () => {
    const reservedChars = ['~', '|', '/', '\\', ':', ',', '@'];

    it.each(reservedChars)('should reject delimiter with reserved char "%s"', (char) => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'L',
        [DelimiterConfigKey.Position]: char,
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.delimiters).toStrictEqual(DEFAULT_DELIMITERS);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('CONFIG_DELIMITER_RESERVED');
    });
  });

  describe('hash delimiter special validation', () => {
    it('should accept single-character hash delimiter', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'L',
        [DelimiterConfigKey.Position]: 'C',
        [DelimiterConfigKey.Hash]: '$',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.delimiters.hash).toBe('$');
      expect(result.errors).toStrictEqual([]);
    });

    it('should reject multi-character hash delimiter', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'L',
        [DelimiterConfigKey.Position]: 'C',
        [DelimiterConfigKey.Hash]: '##',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.delimiters).toStrictEqual(DEFAULT_DELIMITERS);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('CONFIG_HASH_NOT_SINGLE_CHAR');
    });
  });

  describe('uniqueness validation', () => {
    it('should reject when delimiters are not unique (exact match)', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'X',
        [DelimiterConfigKey.Position]: 'X',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.delimiters).toStrictEqual(DEFAULT_DELIMITERS);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('CONFIG_DELIMITER_NOT_UNIQUE');
    });

    it('should reject when delimiters are not unique (case-insensitive)', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'L',
        [DelimiterConfigKey.Position]: 'l',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.delimiters).toStrictEqual(DEFAULT_DELIMITERS);
      expect(result.errors[0].code).toBe('CONFIG_DELIMITER_NOT_UNIQUE');
    });
  });

  describe('substring conflict detection', () => {
    it('should reject when one delimiter is substring of another', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'LINE',
        [DelimiterConfigKey.Position]: 'LIN',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.delimiters).toStrictEqual(DEFAULT_DELIMITERS);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('CONFIG_DELIMITER_SUBSTRING_CONFLICT');
    });

    it('should reject substring conflict (case-insensitive)', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'Line',
        [DelimiterConfigKey.Position]: 'line',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      // This should fail uniqueness check, not substring
      expect(result.errors[0].code).toBe('CONFIG_DELIMITER_NOT_UNIQUE');
    });
  });

  describe('aggregated error reporting', () => {
    it('should log multiple field validation errors', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: '',
        [DelimiterConfigKey.Position]: '123',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.errors.length).toBe(2);
      expect(result.errors[0].code).toBe('CONFIG_DELIMITER_EMPTY');
      expect(result.errors[1].code).toBe('CONFIG_DELIMITER_DIGITS');
      expect(logger.error).toHaveBeenCalledTimes(2);
    });

    it('should log all four field errors when all invalid', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: '',
        [DelimiterConfigKey.Position]: '1',
        [DelimiterConfigKey.Hash]: '  ',
        [DelimiterConfigKey.Range]: '~',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.errors.length).toBe(4);
      expect(logger.error).toHaveBeenCalledTimes(4);
    });
  });

  describe('error accumulation strategy (Option C)', () => {
    it('should NOT validate relationships when field errors exist', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: '123', // Invalid: digits
        [DelimiterConfigKey.Position]: 'X',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: 'X', // Would cause uniqueness error
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      // Should only have field error (digits), not uniqueness error
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CONFIG_DELIMITER_DIGITS');
      // Uniqueness not checked because fields invalid
    });

    it('should validate relationships when all fields are valid', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'X',
        [DelimiterConfigKey.Position]: 'X', // Uniqueness error
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      // Should have both uniqueness and substring errors (identical delimiters trigger both)
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors[0].code).toBe('CONFIG_DELIMITER_NOT_UNIQUE');
    });
  });

  describe('source detection', () => {
    it('should detect default source when no overrides', () => {
      const config: ConfigGetter = {
        get: <T>(key: string): T | undefined => {
          const defaults: Record<string, string> = {
            [DelimiterConfigKey.Line]: 'L',
            [DelimiterConfigKey.Position]: 'C',
            [DelimiterConfigKey.Hash]: '#',
            [DelimiterConfigKey.Range]: '-',
          };
          return defaults[key] as T;
        },
        inspect: (): ConfigInspection | undefined => ({
          key: 'line',
          defaultValue: 'L',
          globalValue: undefined,
          workspaceValue: undefined,
          workspaceFolderValue: undefined,
        }),
      };
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.sources.line).toBe('default');
      expect(result.sources.position).toBe('default');
      expect(result.sources.hash).toBe('default');
      expect(result.sources.range).toBe('default');
    });

    it('should detect user settings source (globalValue)', () => {
      const config: ConfigGetter = {
        get: <T>(key: string): T | undefined => {
          if (key === DelimiterConfigKey.Line) return 'X' as T;
          const defaults: Record<string, string> = {
            [DelimiterConfigKey.Position]: 'C',
            [DelimiterConfigKey.Hash]: '#',
            [DelimiterConfigKey.Range]: '-',
          };
          return defaults[key] as T;
        },
        inspect: (key: string): ConfigInspection | undefined => {
          if (key === DelimiterConfigKey.Line) {
            return {
              key: 'line',
              defaultValue: 'L',
              globalValue: 'X',
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }
          return {
            key: 'line',
            defaultValue: 'C',
            globalValue: undefined,
            workspaceValue: undefined,
            workspaceFolderValue: undefined,
          };
        },
      };
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.sources.line).toBe('user');
      expect(result.sources.position).toBe('default');
    });

    it('should detect workspace source (workspaceValue)', () => {
      const config: ConfigGetter = {
        get: <T>(key: string): T | undefined => {
          if (key === DelimiterConfigKey.Position) return 'POS' as T;
          const defaults: Record<string, string> = {
            [DelimiterConfigKey.Line]: 'L',
            [DelimiterConfigKey.Hash]: '#',
            [DelimiterConfigKey.Range]: '-',
          };
          return defaults[key] as T;
        },
        inspect: (key: string): ConfigInspection | undefined => {
          if (key === DelimiterConfigKey.Position) {
            return {
              key: 'position',
              defaultValue: 'C',
              globalValue: undefined,
              workspaceValue: 'POS',
              workspaceFolderValue: undefined,
            };
          }
          return {
            key: 'line',
            defaultValue: 'L',
            globalValue: undefined,
            workspaceValue: undefined,
            workspaceFolderValue: undefined,
          };
        },
      };
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.errors.length).toBe(0); // Should have no errors
      expect(result.sources.position).toBe('workspace');
    });

    it('should detect workspace folder source (workspaceFolderValue)', () => {
      const config: ConfigGetter = {
        get: <T>(key: string): T | undefined => {
          if (key === DelimiterConfigKey.Range) return 'TO' as T;
          const defaults: Record<string, string> = {
            [DelimiterConfigKey.Line]: 'L',
            [DelimiterConfigKey.Position]: 'C',
            [DelimiterConfigKey.Hash]: '#',
          };
          return defaults[key] as T;
        },
        inspect: (key: string): ConfigInspection | undefined => {
          if (key === DelimiterConfigKey.Range) {
            return {
              key: 'range',
              defaultValue: '-',
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: 'TO',
            };
          }
          return {
            key: 'line',
            defaultValue: 'L',
            globalValue: undefined,
            workspaceValue: undefined,
            workspaceFolderValue: undefined,
          };
        },
      };
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.sources.range).toBe('workspaceFolder');
    });

    it('should prioritize workspace folder over workspace over user', () => {
      const config: ConfigGetter = {
        get: <T>(key: string): T | undefined => {
          // Return different values for each key to avoid uniqueness conflicts
          const values: Record<string, string> = {
            [DelimiterConfigKey.Line]: 'FINAL',
            [DelimiterConfigKey.Position]: 'C',
            [DelimiterConfigKey.Hash]: '#',
            [DelimiterConfigKey.Range]: '-',
          };
          return values[key] as T;
        },
        inspect: (key: string): ConfigInspection => {
          if (key === DelimiterConfigKey.Line) {
            return {
              key: 'line',
              defaultValue: 'DEFAULT',
              globalValue: 'USER',
              workspaceValue: 'WORKSPACE',
              workspaceFolderValue: 'FINAL',
            };
          }
          return {
            key: 'position',
            defaultValue: undefined,
            globalValue: undefined,
            workspaceValue: undefined,
            workspaceFolderValue: undefined,
          };
        },
      };
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.errors.length).toBe(0); // Should have no errors
      expect(result.sources.line).toBe('workspaceFolder');
    });
  });

  describe('result structure', () => {
    it('should return empty errors array on success', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'L',
        [DelimiterConfigKey.Position]: 'C',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.errors).toStrictEqual([]);
      expect(result.errors.length).toBe(0); // Can check with .length
    });

    it('should return non-empty errors array on failure', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: '',
        [DelimiterConfigKey.Position]: 'C',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should include delimiters, sources, and errors in result', () => {
      const config = createMockConfig();
      const logger = createMockLogger();

      const result = loadDelimiterConfig(config, logger);

      expect(result).toHaveProperty('delimiters');
      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('errors');
      expect(typeof result.delimiters).toBe('object');
      expect(typeof result.sources).toBe('object');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('logging behavior', () => {
    it('should log success info when config is valid', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: 'L',
        [DelimiterConfigKey.Position]: 'C',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      loadDelimiterConfig(config, logger);

      expect(logger.info).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log errors when config is invalid', () => {
      const config = createMockConfig({ [DelimiterConfigKey.Line]: '' });
      const logger = createMockLogger();

      loadDelimiterConfig(config, logger);

      expect(logger.error).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled(); // Also logs "using defaults"
    });

    it('should log all errors individually', () => {
      const config = createMockConfig({
        [DelimiterConfigKey.Line]: '',
        [DelimiterConfigKey.Position]: '1',
        [DelimiterConfigKey.Hash]: '#',
        [DelimiterConfigKey.Range]: '-',
      });
      const logger = createMockLogger();

      loadDelimiterConfig(config, logger);

      // Should call error once per error
      expect(logger.error).toHaveBeenCalledTimes(2);
    });
  });
});
