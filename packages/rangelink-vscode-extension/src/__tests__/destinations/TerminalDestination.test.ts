import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import { TerminalDestination } from '../../destinations/TerminalDestination';
import { applySmartPadding } from '../../utils/applySmartPadding';
import { isEligibleForPaste } from '../../utils/isEligibleForPaste';

jest.mock('../../utils/isEligibleForPaste');
jest.mock('../../utils/applySmartPadding');

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

    // Set up default mock implementations
    (isEligibleForPaste as jest.Mock).mockReturnValue(true);
    (applySmartPadding as jest.Mock).mockImplementation((text: string) => ` ${text} `);
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
      (applySmartPadding as jest.Mock).mockReturnValue(' link ');

      await destination.paste('link');

      expect(applySmartPadding).toHaveBeenCalledWith('link');
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

  describe('paste() - Delegation to utilities', () => {
    beforeEach(() => {
      destination.setTerminal(mockTerminal);
    });

    it('should return false and skip terminal operations when text is ineligible', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(false);

      const result = await destination.paste('');

      expect(isEligibleForPaste).toHaveBeenCalledWith('');
      expect(result).toBe(false);
      expect(applySmartPadding).not.toHaveBeenCalled();
      expect(mockTerminal.sendText).not.toHaveBeenCalled();
      expect(mockTerminal.show).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'TerminalDestination.paste',
          text: '',
        }),
        'Text not eligible for paste',
      );
    });

    it('should check eligibility before checking terminal binding', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(false);
      destination.setTerminal(undefined);

      await destination.paste('invalid-text');

      expect(isEligibleForPaste).toHaveBeenCalledWith('invalid-text');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'TerminalDestination.paste',
        }),
        'Text not eligible for paste',
      );
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should apply smart padding when text is eligible', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(true);
      (applySmartPadding as jest.Mock).mockReturnValue(' padded-text ');

      await destination.paste('original-text');

      expect(isEligibleForPaste).toHaveBeenCalledWith('original-text');
      expect(applySmartPadding).toHaveBeenCalledWith('original-text');
      expect(mockTerminal.sendText).toHaveBeenCalledWith(' padded-text ', false);
    });

    it('should use applySmartPadding result for terminal sendText', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(true);
      (applySmartPadding as jest.Mock).mockReturnValue('\tcustom-padded\n');

      await destination.paste('src/file.ts#L10');

      expect(applySmartPadding).toHaveBeenCalledWith('src/file.ts#L10');
      expect(mockTerminal.sendText).toHaveBeenCalledWith('\tcustom-padded\n', false);
    });

    it('should log success with original and padded lengths', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(true);
      (applySmartPadding as jest.Mock).mockReturnValue(' short ');

      await destination.paste('short');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'TerminalDestination.paste',
          terminalName: 'bash',
          originalLength: 5,
          paddedLength: 7,
        }),
        expect.stringContaining('Pasted to terminal: bash'),
      );
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
