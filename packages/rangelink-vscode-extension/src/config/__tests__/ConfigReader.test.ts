import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';

import { createMockConfigGetter, createMockConfigurationProvider } from '../../__tests__/helpers';
import type { PaddingMode } from '../../utils/applySmartPadding';
import { ConfigReader } from '../ConfigReader';
import type { ConfigGetterFactory } from '../types';

let mockLogger: Logger;
let reader: ConfigReader;

describe('ConfigReader', () => {
  beforeEach(() => {
    mockLogger = createMockLogger();
    reader = new (ConfigReader as any)(() => createMockConfigGetter(), mockLogger) as ConfigReader;
  });

  describe('create', () => {
    it('should create instance using ConfigurationProvider', () => {
      const mockConfigGetter = createMockConfigGetter({ testKey: 'testValue' });
      const mockConfigProvider = createMockConfigurationProvider(mockConfigGetter);

      const reader = ConfigReader.create(mockConfigProvider, mockLogger);

      expect(reader).toBeInstanceOf(ConfigReader);
      expect(mockConfigProvider.getConfiguration).not.toHaveBeenCalled();

      const value = reader.getWithDefault('testKey', 'default');

      expect(value).toBe('testValue');
      expect(mockConfigProvider.getConfiguration).toHaveBeenCalledWith('rangelink');
    });
  });

  describe('getSetting()', () => {
    it('should return configured value when present', () => {
      const factory: ConfigGetterFactory = () =>
        createMockConfigGetter({ myKey: 'configured-value' });
      const reader = new (ConfigReader as any)(factory, mockLogger) as ConfigReader;

      const result = reader.getWithDefault('myKey', 'default-value');

      expect(result).toBe('configured-value');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'ConfigReader.getSetting', key: 'myKey', value: 'configured-value' },
        'Using configured value',
      );
    });

    it('should return default value when setting not configured', () => {
      const result = reader.getWithDefault('missingKey', 'default-value');

      expect(result).toBe('default-value');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'ConfigReader.getSetting', key: 'missingKey', defaultValue: 'default-value' },
        'No missingKey configured, using default: default-value',
      );
    });

    it('should call factory on every read (fresh config)', () => {
      let callCount = 0;
      const factory: ConfigGetterFactory = () => {
        callCount++;
        return createMockConfigGetter({ key: `value-${callCount}` });
      };
      const reader = new (ConfigReader as any)(factory, mockLogger) as ConfigReader;

      const result1 = reader.getWithDefault('key', 'default');
      const result2 = reader.getWithDefault('key', 'default');

      expect(callCount).toBe(2);
      expect(result1).toBe('value-1');
      expect(result2).toBe('value-2');
    });

    it('should handle numeric values', () => {
      const factory: ConfigGetterFactory = () => createMockConfigGetter({ timeout: 5000 });
      const reader = new (ConfigReader as any)(factory, mockLogger) as ConfigReader;

      const result = reader.getWithDefault<number>('timeout', 3000);

      expect(result).toBe(5000);
    });

    it('should handle boolean values', () => {
      const factory: ConfigGetterFactory = () => createMockConfigGetter({ enabled: true });
      const reader = new (ConfigReader as any)(factory, mockLogger) as ConfigReader;

      const result = reader.getWithDefault<boolean>('enabled', false);

      expect(result).toBe(true);
    });
  });

  describe('getPaddingMode()', () => {
    it('should return configured padding mode', () => {
      const factory: ConfigGetterFactory = () =>
        createMockConfigGetter({ 'smartPadding.pasteLink': 'before' });
      const reader = new (ConfigReader as any)(factory, mockLogger) as ConfigReader;

      const result = reader.getPaddingMode('smartPadding.pasteLink', 'both');

      expect(result).toBe('before');
    });

    it('should return default padding mode when not configured', () => {
      const result = reader.getPaddingMode('smartPadding.pasteLink', 'both');

      expect(result).toBe('both');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'ConfigReader.getSetting', key: 'smartPadding.pasteLink', defaultValue: 'both' },
        'No smartPadding.pasteLink configured, using default: both',
      );
    });

    it('should support all PaddingMode values', () => {
      const modes: PaddingMode[] = ['both', 'before', 'after', 'none'];

      for (const mode of modes) {
        const factory: ConfigGetterFactory = () => createMockConfigGetter({ key: mode });
        const reader = new (ConfigReader as any)(factory, mockLogger) as ConfigReader;

        const result = reader.getPaddingMode('key', 'both');

        expect(result).toBe(mode);
      }
    });
  });
});
