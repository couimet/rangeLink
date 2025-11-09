import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import { TerminalDestination } from '../../destinations/TerminalDestination';

describe('TerminalDestination', () => {
  let destination: TerminalDestination;
  let mockLogger: Logger;
  let mockTerminal: vscode.Terminal;

  beforeEach(() => {
    // Create mock logger
    mockLogger = createMockLogger();

    // Create mock terminal
    mockTerminal = {
      name: 'bash',
      sendText: jest.fn(),
      show: jest.fn(),
    } as unknown as vscode.Terminal;

    destination = new TerminalDestination(mockLogger);
  });

  describe('Interface compliance', () => {
    it('should have correct id', () => {
      expect(destination.id).toBe('terminal');
    });

    it('should have correct displayName', () => {
      expect(destination.displayName).toBe('Terminal');
    });
  });

  describe('isAvailable()', () => {
    it('should return false when no terminal bound', async () => {
      expect(await destination.isAvailable()).toBe(false);
    });

    it('should return true when terminal is bound', async () => {
      destination.setTerminal(mockTerminal);
      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return false after terminal is unbound', async () => {
      destination.setTerminal(mockTerminal);
      destination.setTerminal(undefined);
      expect(await destination.isAvailable()).toBe(false);
    });
  });

  describe('paste() - Basic behavior', () => {
    beforeEach(() => {
      destination.setTerminal(mockTerminal);
    });

    it('should return false when no terminal bound', async () => {
      destination.setTerminal(undefined);
      const result = await destination.paste('src/file.ts#L10');

      expect(result).toBe(false);
    });

    it('should return true when paste succeeds', async () => {
      const result = await destination.paste('src/file.ts#L10');

      expect(result).toBe(true);
    });

    it('should call terminal.sendText with padded text', async () => {
      await destination.paste('link');

      expect(mockTerminal.sendText).toHaveBeenCalledWith(' link ', false);
    });

    it('should call terminal.show to focus terminal', async () => {
      await destination.paste('link');

      expect(mockTerminal.show).toHaveBeenCalledWith(false);
    });

    it('should call sendText before show (correct order)', async () => {
      const sendTextSpy = mockTerminal.sendText as jest.Mock;
      const showSpy = mockTerminal.show as jest.Mock;

      await destination.paste('link');

      expect(sendTextSpy.mock.invocationCallOrder[0]).toBeLessThan(
        showSpy.mock.invocationCallOrder[0],
      );
    });

    it('should log success with terminal name and lengths', async () => {
      await destination.paste('src/file.ts#L10');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'TerminalDestination.paste',
          terminalName: 'bash',
          originalLength: 15,
          paddedLength: 17,
        }),
        expect.stringContaining('Pasted to terminal: bash'),
      );
    });

    it('should log warning when no terminal bound', async () => {
      destination.setTerminal(undefined);
      await destination.paste('src/file.ts#L10');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'TerminalDestination.paste',
          textLength: 15,
        }),
        'Cannot paste: No terminal bound',
      );
    });
  });

  describe('paste() - Text eligibility validation', () => {
    beforeEach(() => {
      destination.setTerminal(mockTerminal);
    });

    it('should return false for empty string', async () => {
      const result = await destination.paste('');

      expect(result).toBe(false);
    });

    it('should log INFO when empty string is rejected', async () => {
      await destination.paste('');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'TerminalDestination.paste',
          text: '',
        }),
        'Text not eligible for paste',
      );
    });

    it('should return false for whitespace-only string (single space)', async () => {
      const result = await destination.paste(' ');

      expect(result).toBe(false);
    });

    it('should return false for whitespace-only string (multiple spaces)', async () => {
      const result = await destination.paste('   ');

      expect(result).toBe(false);
    });

    it('should return false for whitespace-only string (mixed whitespace)', async () => {
      const result = await destination.paste(' \t\n ');

      expect(result).toBe(false);
    });

    it('should log INFO when whitespace-only string is rejected', async () => {
      await destination.paste('   ');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'TerminalDestination.paste',
          text: '   ',
        }),
        'Text not eligible for paste',
      );
    });

    it('should not call terminal.sendText when text is ineligible', async () => {
      await destination.paste('');

      expect(mockTerminal.sendText).not.toHaveBeenCalled();
    });

    it('should not call terminal.show when text is ineligible', async () => {
      await destination.paste('');

      expect(mockTerminal.show).not.toHaveBeenCalled();
    });

    it('should validate eligibility before checking terminal binding', async () => {
      // Unbind terminal to test order of checks
      destination.setTerminal(undefined);

      await destination.paste('');

      // Should log INFO (eligibility check), not WARN (terminal check)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'TerminalDestination.paste',
        }),
        expect.stringContaining('not eligible'),
      );
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('paste() - Smart padding', () => {
    beforeEach(() => {
      destination.setTerminal(mockTerminal);
    });

    it('should add leading and trailing spaces for text without padding', async () => {
      await destination.paste('link');

      expect(mockTerminal.sendText).toHaveBeenCalledWith(' link ', false);
    });

    it('should preserve existing leading space', async () => {
      await destination.paste(' link');

      expect(mockTerminal.sendText).toHaveBeenCalledWith(' link ', false);
    });

    it('should preserve existing trailing space', async () => {
      await destination.paste('link ');

      expect(mockTerminal.sendText).toHaveBeenCalledWith(' link ', false);
    });

    it('should not add padding when text already has both leading and trailing spaces', async () => {
      await destination.paste(' link ');

      expect(mockTerminal.sendText).toHaveBeenCalledWith(' link ', false);
    });

    // Note: Empty and whitespace-only strings are now rejected by eligibility check
    // See "paste() - Text eligibility validation" tests above

    it('should handle text with tabs as whitespace', async () => {
      await destination.paste('\tlink\t');

      expect(mockTerminal.sendText).toHaveBeenCalledWith('\tlink\t', false);
    });

    it('should handle text with newlines as whitespace', async () => {
      await destination.paste('\nlink\n');

      expect(mockTerminal.sendText).toHaveBeenCalledWith('\nlink\n', false);
    });

    it('should add padding to multiline text without leading/trailing whitespace', async () => {
      await destination.paste('line1\nline2');

      expect(mockTerminal.sendText).toHaveBeenCalledWith(' line1\nline2 ', false);
    });
  });

  describe('paste() - Edge cases', () => {
    beforeEach(() => {
      destination.setTerminal(mockTerminal);
    });

    it('should handle very long strings', async () => {
      const longLink = 'src/' + 'a'.repeat(1000) + '.ts#L1000-L2000';

      await destination.paste(longLink);

      expect(mockTerminal.sendText).toHaveBeenCalledWith(` ${longLink} `, false);
    });

    it('should handle special characters in link', async () => {
      const specialLink = 'src/file#123.ts##L10C5-L20C10';

      await destination.paste(specialLink);

      expect(mockTerminal.sendText).toHaveBeenCalledWith(` ${specialLink} `, false);
    });

    it('should handle unicode characters', async () => {
      const unicodeLink = 'src/文件.ts#L10';

      await destination.paste(unicodeLink);

      expect(mockTerminal.sendText).toHaveBeenCalledWith(` ${unicodeLink} `, false);
    });

    it('should handle emoji in link', async () => {
      const emojiLink = 'src/🚀file.ts#L10';

      await destination.paste(emojiLink);

      expect(mockTerminal.sendText).toHaveBeenCalledWith(` ${emojiLink} `, false);
    });

    it('should handle link with shell special characters', async () => {
      const shellLink = 'src/file$var.ts#L10';

      await destination.paste(shellLink);

      expect(mockTerminal.sendText).toHaveBeenCalledWith(` ${shellLink} `, false);
    });
  });

  describe('setTerminal()', () => {
    it('should update bound terminal reference', () => {
      destination.setTerminal(mockTerminal);

      expect(destination.getTerminalName()).toBe('bash');
    });

    it('should clear terminal when set to undefined', () => {
      destination.setTerminal(mockTerminal);
      destination.setTerminal(undefined);

      expect(destination.getTerminalName()).toBeUndefined();
    });

    it('should log debug message when terminal set', () => {
      destination.setTerminal(mockTerminal);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'TerminalDestination.setTerminal',
          terminalName: 'bash',
        }),
        'Terminal set: bash',
      );
    });

    it('should log debug message when terminal cleared', () => {
      destination.setTerminal(undefined);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'TerminalDestination.setTerminal',
          terminalName: undefined,
        }),
        'Terminal cleared',
      );
    });

    it('should replace existing terminal reference', () => {
      const terminal1 = { ...mockTerminal, name: 'zsh' };
      const terminal2 = { ...mockTerminal, name: 'bash' };

      destination.setTerminal(terminal1 as vscode.Terminal);
      destination.setTerminal(terminal2 as vscode.Terminal);

      expect(destination.getTerminalName()).toBe('bash');
    });
  });

  describe('getTerminalName()', () => {
    it('should return undefined when no terminal bound', () => {
      expect(destination.getTerminalName()).toBeUndefined();
    });

    it('should return terminal name when terminal is bound', () => {
      destination.setTerminal(mockTerminal);

      expect(destination.getTerminalName()).toBe('bash');
    });

    it('should return empty string when terminal has empty name', () => {
      const unnamedTerminal = { ...mockTerminal, name: '' };
      destination.setTerminal(unnamedTerminal as vscode.Terminal);

      expect(destination.getTerminalName()).toBe('');
    });

    it('should return correct name after terminal change', () => {
      const terminal1 = { ...mockTerminal, name: 'zsh' };
      const terminal2 = { ...mockTerminal, name: 'fish' };

      destination.setTerminal(terminal1 as vscode.Terminal);
      expect(destination.getTerminalName()).toBe('zsh');

      destination.setTerminal(terminal2 as vscode.Terminal);
      expect(destination.getTerminalName()).toBe('fish');
    });
  });
});
