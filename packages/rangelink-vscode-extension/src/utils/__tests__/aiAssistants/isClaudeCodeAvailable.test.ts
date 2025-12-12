/**
 * Tests for isClaudeCodeAvailable utility.
 */

import { createMockLogger } from 'barebone-logger-testing';

import {
  createMockVscodeAdapter,
  type VscodeAdapterWithTestHooks,
} from '../../../__tests__/helpers';

import {
  isClaudeCodeAvailable,
  CLAUDE_CODE_EXTENSION_ID,
} from '../../aiAssistants/isClaudeCodeAvailable';

describe('isClaudeCodeAvailable', () => {
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  describe('extension detection', () => {
    it('should return true when Claude Code extension is installed and active', () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [{ id: CLAUDE_CODE_EXTENSION_ID, isActive: true }],
      });

      const result = isClaudeCodeAvailable(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isClaudeCodeAvailable',
          extensionId: CLAUDE_CODE_EXTENSION_ID,
          extensionFound: true,
          extensionActive: true,
          isAvailable: true,
        },
        'Claude Code extension detected and active',
      );
    });

    it('should return false when Claude Code extension is installed but inactive', () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [{ id: CLAUDE_CODE_EXTENSION_ID, isActive: false }],
      });

      const result = isClaudeCodeAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isClaudeCodeAvailable',
          extensionId: CLAUDE_CODE_EXTENSION_ID,
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
          extensionId: CLAUDE_CODE_EXTENSION_ID,
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
          { id: CLAUDE_CODE_EXTENSION_ID, isActive: true },
          { id: 'GitHub.copilot', isActive: true },
        ],
      });

      const result = isClaudeCodeAvailable(mockAdapter, mockLogger);

      expect(result).toBe(true);
    });

    it('should use exact extension ID match', () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [
          // Similar but not exact match
          { id: 'anthropic.claude-code-beta', isActive: true },
        ],
      });

      const result = isClaudeCodeAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
    });
  });
});
