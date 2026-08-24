import { createMockVscodeAdapter, type VscodeAdapterWithTestHooks } from '../../../__tests__/helpers';
import { CLINE_FOCUS_COMMANDS } from '../../../destinations/aiAssistantFocusCommands';
import { EXTENSION_ID_CLINE } from '../../aiAssistants/builtInAiAssistants';
import { isClineAvailable } from '../../aiAssistants/isClineAvailable';

import { createMockLogger } from '@couimet/logger-contract-testing';

describe('isClineAvailable', () => {
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  describe('extension detection', () => {
    it('should return true when extension is installed and active', async () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [{ id: EXTENSION_ID_CLINE, isActive: true }],
      });

      const result = await isClineAvailable(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isClineAvailable',
          extensionId: 'saoudrizwan.claude-dev',
          extensionFound: true,
          extensionActive: true,
        },
        'Cline extension detected and active',
      );
    });

    it('should return false when extension is installed but inactive', async () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [{ id: EXTENSION_ID_CLINE, isActive: false }],
      });

      const result = await isClineAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isClineAvailable',
          extensionId: 'saoudrizwan.claude-dev',
          extensionFound: true,
          extensionActive: false,
        },
        'Cline extension not available (not installed or not active)',
      );
    });

    it('should return false when extension is not installed', async () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [],
      });

      const result = await isClineAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isClineAvailable',
          extensionId: 'saoudrizwan.claude-dev',
          extensionFound: false,
          extensionActive: false,
        },
        'Cline extension not available (not installed or not active)',
      );
    });
  });

  describe('edge cases', () => {
    it('should not match other assistant extensions', async () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [{ id: 'anthropic.claude-code', isActive: true }],
      });

      const result = await isClineAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isClineAvailable',
          extensionId: 'saoudrizwan.claude-dev',
          extensionFound: false,
          extensionActive: false,
        },
        'Cline extension not available (not installed or not active)',
      );
    });

    it('should handle mixed extensions list', async () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [
          { id: 'other.extension', isActive: true },
          { id: EXTENSION_ID_CLINE, isActive: true },
          { id: 'another.extension', isActive: false },
        ],
      });

      const result = await isClineAvailable(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isClineAvailable',
          extensionId: 'saoudrizwan.claude-dev',
          extensionFound: true,
          extensionActive: true,
        },
        'Cline extension detected and active',
      );
    });

    it('should use exact extension ID match', async () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [{ id: 'saoudrizwan.claude-dev-preview', isActive: true }],
      });

      const result = await isClineAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isClineAvailable',
          extensionId: 'saoudrizwan.claude-dev',
          extensionFound: false,
          extensionActive: false,
        },
        'Cline extension not available (not installed or not active)',
      );
    });
  });
});

describe('CLINE_FOCUS_COMMANDS', () => {
  it('should export focus commands array', () => {
    expect(CLINE_FOCUS_COMMANDS).toStrictEqual([['claude-dev.SidebarProvider.focus', 'cline.focusChatInput'], ['claude-dev.SidebarProvider.focus']]);
  });
});
