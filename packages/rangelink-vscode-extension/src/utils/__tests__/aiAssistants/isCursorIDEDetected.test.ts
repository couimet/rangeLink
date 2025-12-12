/**
 * Tests for isCursorIDEDetected utility.
 */

import { createMockLogger } from 'barebone-logger-testing';

import { createMockVscodeAdapter, type VscodeAdapterWithTestHooks } from '../../../__tests__/helpers';

import { isCursorIDEDetected } from '../../aiAssistants/isCursorIDEDetected';

describe('isCursorIDEDetected', () => {
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  describe('appName detection (primary)', () => {
    it('should return true when appName is "Cursor"', () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Cursor' },
      });

      const result = isCursorIDEDetected(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isCursorIDEDetected',
          appName: 'Cursor',
          detectionMethod: 'appName',
        },
        'Cursor IDE detected via appName',
      );
    });

    it('should return true when appName contains "cursor" (case insensitive)', () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Cursor Editor' },
      });

      const result = isCursorIDEDetected(mockAdapter, mockLogger);

      expect(result).toBe(true);
    });

    it('should return true when appName contains "CURSOR" (uppercase)', () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'CURSOR' },
      });

      const result = isCursorIDEDetected(mockAdapter, mockLogger);

      expect(result).toBe(true);
    });

    it('should not check extensions or URI scheme when appName matches', () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Cursor', uriScheme: 'vscode' },
        extensionsOptions: [{ id: 'cursor.ai', isActive: true }],
      });

      const result = isCursorIDEDetected(mockAdapter, mockLogger);

      expect(result).toBe(true);
      // Should only log once for appName detection
      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ detectionMethod: 'appName' }),
        expect.any(String),
      );
    });
  });

  describe('extension detection (fallback)', () => {
    beforeEach(() => {
      // Ensure appName detection fails for fallback tests
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Visual Studio Code' },
      });
    });

    it('should return true when cursor.* extension is present', () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Visual Studio Code' },
        extensionsOptions: [{ id: 'cursor.ai', isActive: true }],
      });

      const result = isCursorIDEDetected(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isCursorIDEDetected',
          extensionIds: ['cursor.ai'],
          detectionMethod: 'extensions',
        },
        'Cursor IDE detected via Cursor-specific extensions',
      );
    });

    it('should return true when multiple cursor.* extensions are present', () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Visual Studio Code' },
        extensionsOptions: [
          { id: 'cursor.ai', isActive: true },
          { id: 'cursor.chat', isActive: true },
        ],
      });

      const result = isCursorIDEDetected(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          extensionIds: ['cursor.ai', 'cursor.chat'],
        }),
        expect.any(String),
      );
    });

    it('should not detect non-cursor extensions', () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Visual Studio Code' },
        extensionsOptions: [
          { id: 'ms-vscode.csharp', isActive: true },
          { id: 'GitHub.copilot', isActive: true },
        ],
      });

      const result = isCursorIDEDetected(mockAdapter, mockLogger);

      expect(result).toBe(false);
    });
  });

  describe('URI scheme detection (tertiary)', () => {
    it('should return true when uriScheme is "cursor"', () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Visual Studio Code', uriScheme: 'cursor' },
        extensionsOptions: [],
      });

      const result = isCursorIDEDetected(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isCursorIDEDetected',
          uriScheme: 'cursor',
          detectionMethod: 'uriScheme',
        },
        'Cursor IDE detected via URI scheme',
      );
    });

    it('should not match partial URI schemes like "cursor-dev"', () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Visual Studio Code', uriScheme: 'cursor-dev' },
        extensionsOptions: [],
      });

      const result = isCursorIDEDetected(mockAdapter, mockLogger);

      // The implementation uses exact match `=== 'cursor'`
      expect(result).toBe(false);
    });
  });

  describe('detection priority', () => {
    it('should prefer appName over extensions', () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Cursor' },
        extensionsOptions: [{ id: 'cursor.ai', isActive: true }],
      });

      const result = isCursorIDEDetected(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ detectionMethod: 'appName' }),
        expect.any(String),
      );
    });

    it('should prefer extensions over URI scheme', () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Visual Studio Code', uriScheme: 'cursor' },
        extensionsOptions: [{ id: 'cursor.ai', isActive: true }],
      });

      const result = isCursorIDEDetected(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ detectionMethod: 'extensions' }),
        expect.any(String),
      );
    });
  });

  describe('not detected', () => {
    it('should return false and log when not in Cursor IDE', () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Visual Studio Code', uriScheme: 'vscode' },
        extensionsOptions: [{ id: 'ms-vscode.csharp', isActive: true }],
      });

      const result = isCursorIDEDetected(mockAdapter, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isCursorIDEDetected',
          appName: 'Visual Studio Code',
          uriScheme: 'vscode',
          extensionCount: 1,
          detectionMethod: 'none',
        },
        'Cursor IDE not detected',
      );
    });

    it('should return false for empty extensions list', () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Visual Studio Code', uriScheme: 'vscode' },
        extensionsOptions: [],
      });

      const result = isCursorIDEDetected(mockAdapter, mockLogger);

      expect(result).toBe(false);
    });
  });
});
