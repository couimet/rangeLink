import { createMockLogger } from 'barebone-logger-testing';

import {
  createMockVscodeAdapter,
  type VscodeAdapterWithTestHooks,
} from '../../../__tests__/helpers';
import { CLAUDE_CODE_FOCUS_COMMANDS } from '../../../destinations/aiAssistantFocusCommands';
import { EXTENSION_ID_CLAUDE_CODE } from '../../aiAssistants/builtInAiAssistants';
import { isClaudeCodeAvailable } from '../../aiAssistants/isClaudeCodeAvailable';

describe('isClaudeCodeAvailable', () => {
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  describe('extension detection', () => {
    it('should return true when Claude Code extension is installed and active', () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [{ id: EXTENSION_ID_CLAUDE_CODE, isActive: true }],
      });

      const result = isClaudeCodeAvailable(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isClaudeCodeAvailable',
          extensionId: 'anthropic.claude-code',
          extensionFound: true,
          extensionActive: true,
          isAvailable: true,
        },
        'Claude Code extension detected and active',
      );
    });

    it('should return false when Claude Code extension is installed but inactive', () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [{ id: EXTENSION_ID_CLAUDE_CODE, isActive: false }],
      });

      const result = isClaudeCodeAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isClaudeCodeAvailable',
          extensionId: 'anthropic.claude-code',
          extensionFound: true,
          extensionActive: false,
          isAvailable: false,
        },
        'Claude Code extension not available (not installed or not active)',
      );
    });

    it('should return false when Claude Code extension is not installed', () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [],
      });

      const result = isClaudeCodeAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isClaudeCodeAvailable',
          extensionId: 'anthropic.claude-code',
          extensionFound: false,
          extensionActive: false,
          isAvailable: false,
        },
        'Claude Code extension not available (not installed or not active)',
      );
    });
  });

  describe('edge cases', () => {
    it('should not match other Anthropic extensions', () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [{ id: 'anthropic.other-extension', isActive: true }],
      });

      const result = isClaudeCodeAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
    });

    it('should handle mixed extensions list', () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [
          { id: 'ms-vscode.csharp', isActive: true },
          { id: EXTENSION_ID_CLAUDE_CODE, isActive: true },
          { id: 'GitHub.copilot', isActive: true },
        ],
      });

      const result = isClaudeCodeAvailable(mockAdapter, mockLogger);

      expect(result).toBe(true);
    });

    it('should use exact extension ID match', () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [{ id: 'anthropic.claude-code-beta', isActive: true }],
      });

      const result = isClaudeCodeAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
    });
  });
});

describe('CLAUDE_CODE_FOCUS_COMMANDS', () => {
  it('should export focus commands array with primary and fallback commands', () => {
    expect(CLAUDE_CODE_FOCUS_COMMANDS).toStrictEqual([
      'claude-vscode.focus',
      'claude-vscode.sidebar.open',
      'claude-vscode.editor.open',
    ]);
  });
});
