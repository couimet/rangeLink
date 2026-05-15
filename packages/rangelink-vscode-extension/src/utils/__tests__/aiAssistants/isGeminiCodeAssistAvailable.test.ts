import { createMockLogger } from 'barebone-logger-testing';

import {
  createMockVscodeAdapter,
  type VscodeAdapterWithTestHooks,
} from '../../../__tests__/helpers';
import { GEMINI_CODE_ASSIST_FOCUS_COMMANDS } from '../../../destinations/aiAssistantFocusCommands';
import { EXTENSION_ID_GEMINI_CODE_ASSIST } from '../../aiAssistants/builtInAiAssistants';
import { isGeminiCodeAssistAvailable } from '../../aiAssistants/isGeminiCodeAssistAvailable';

describe('isGeminiCodeAssistAvailable', () => {
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  describe('extension detection', () => {
    it('should return true when extension is installed and active', async () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [{ id: EXTENSION_ID_GEMINI_CODE_ASSIST, isActive: true }],
      });

      const result = await isGeminiCodeAssistAvailable(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isGeminiCodeAssistAvailable',
          extensionId: 'google.geminicodeassist',
          extensionFound: true,
          extensionActive: true,
        },
        'Gemini Code Assist detected and active',
      );
    });

    it('should return false when extension is installed but inactive', async () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [{ id: EXTENSION_ID_GEMINI_CODE_ASSIST, isActive: false }],
      });

      const result = await isGeminiCodeAssistAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isGeminiCodeAssistAvailable',
          extensionId: 'google.geminicodeassist',
          extensionFound: true,
          extensionActive: false,
        },
        'Gemini Code Assist not available (not installed or not active)',
      );
    });

    it('should return false when extension is not installed', async () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [],
      });

      const result = await isGeminiCodeAssistAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isGeminiCodeAssistAvailable',
          extensionId: 'google.geminicodeassist',
          extensionFound: false,
          extensionActive: false,
        },
        'Gemini Code Assist not available (not installed or not active)',
      );
    });
  });

  describe('edge cases', () => {
    it('should not match other Google extensions', async () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [{ id: 'GoogleCloudTools.cloudcode', isActive: true }],
      });

      const result = await isGeminiCodeAssistAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isGeminiCodeAssistAvailable',
          extensionId: 'google.geminicodeassist',
          extensionFound: false,
          extensionActive: false,
        },
        'Gemini Code Assist not available (not installed or not active)',
      );
    });

    it('should handle mixed extensions list', async () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [
          { id: 'other.extension', isActive: true },
          { id: EXTENSION_ID_GEMINI_CODE_ASSIST, isActive: true },
          { id: 'another.extension', isActive: false },
        ],
      });

      const result = await isGeminiCodeAssistAvailable(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isGeminiCodeAssistAvailable',
          extensionId: 'google.geminicodeassist',
          extensionFound: true,
          extensionActive: true,
        },
        'Gemini Code Assist detected and active',
      );
    });

    it('should use exact extension ID match', async () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [{ id: 'google.geminicodeassist-preview', isActive: true }],
      });

      const result = await isGeminiCodeAssistAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isGeminiCodeAssistAvailable',
          extensionId: 'google.geminicodeassist',
          extensionFound: false,
          extensionActive: false,
        },
        'Gemini Code Assist not available (not installed or not active)',
      );
    });
  });
});

describe('GEMINI_CODE_ASSIST_FOCUS_COMMANDS', () => {
  it('should export focus commands array', () => {
    expect(GEMINI_CODE_ASSIST_FOCUS_COMMANDS).toStrictEqual(['cloudcode.gemini.chatView.focus']);
  });
});
