import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import type { PasteDestination } from '../../destinations/PasteDestination';
import { TerminalDestination } from '../../destinations/TerminalDestination';
import { BehaviourAfterPaste } from '../../types/BehaviourAfterPaste';
import { TerminalFocusType } from '../../types/TerminalFocusType';
import { applySmartPadding } from '../../utils/applySmartPadding';
import { isEligibleForPaste } from '../../utils/isEligibleForPaste';
import { createMockFormattedLink } from '../helpers/createMockFormattedLink';
import { createMockTerminal } from '../helpers/createMockTerminal';
import { createMockVscodeAdapter, type VscodeAdapterWithTestHooks } from '../helpers/mockVSCode';

jest.mock('../../utils/isEligibleForPaste');
jest.mock('../../utils/applySmartPadding');

describe('TerminalDestination', () => {
  let destination: TerminalDestination;
  let mockLogger: Logger;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockTerminal: vscode.Terminal;

  beforeEach(() => {
    // Create mock logger
    mockLogger = createMockLogger();

    // Create mock terminal using helper
    mockTerminal = createMockTerminal({ name: 'bash', processId: Promise.resolve(12345) });

    // Create mock VscodeAdapter using helper
    mockAdapter = createMockVscodeAdapter();

    // Spy on adapter methods used by TerminalDestination
    jest.spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard').mockResolvedValue();
    jest.spyOn(mockAdapter, 'showTerminal').mockReturnValue();
    jest.spyOn(mockAdapter, 'getTerminalName').mockImplementation((terminal) => terminal.name);

    destination = new TerminalDestination(mockTerminal, mockAdapter, mockLogger);

    // Set up default mock implementations
    (isEligibleForPaste as jest.Mock).mockReturnValue(true);
    (applySmartPadding as jest.Mock).mockImplementation((text: string) => ` ${text} `);
  });

  describe('Interface compliance', () => {
    it('should have correct id', () => {
      expect(destination.id).toBe('terminal');
    });

    it('should have correct displayName', () => {
      expect(destination.displayName).toBe('Terminal ("bash")');
    });
  });

  describe('isAvailable()', () => {
    it('should return true since construction implies availability', async () => {
      expect(await destination.isAvailable()).toBe(true);
    });
  });

  describe('paste() - Basic behavior', () => {
    it('should return true when paste succeeds', async () => {
      const result = await destination.pasteLink(createMockFormattedLink('src/file.ts#L10'));

      expect(result).toBe(true);
    });

    it('should call ideAdapter.pasteTextToTerminalViaClipboard with padded text and NOTHING behaviour', async () => {
      (applySmartPadding as jest.Mock).mockReturnValue(' link ');

      await destination.pasteLink(createMockFormattedLink('link'));

      expect(applySmartPadding).toHaveBeenCalledWith('link');
      expect(mockAdapter.pasteTextToTerminalViaClipboard).toHaveBeenCalledWith(
        mockTerminal,
        ' link ',
        {
          behaviour: BehaviourAfterPaste.NOTHING,
        },
      );
    });

    it('should call ideAdapter.showTerminal to focus terminal', async () => {
      await destination.pasteLink(createMockFormattedLink('link'));

      expect(mockAdapter.showTerminal).toHaveBeenCalledWith(
        mockTerminal,
        TerminalFocusType.StealFocus,
      );
    });

    it('should log success with terminal name and formattedLink', async () => {
      const testLink = 'src/file.ts#L10';
      const formattedLink = createMockFormattedLink(testLink);
      await destination.pasteLink(formattedLink);

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'TerminalDestination.pasteLink',
          terminalName: 'bash',
          formattedLink,
          linkLength: testLink.length,
          originalLength: testLink.length,
          paddedLength: testLink.length + 2,
        },
        'Pasted link to terminal',
      );
    });
  });

  describe('paste() - Delegation to utilities', () => {
    it('should return false and skip terminal operations when text is ineligible', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(false);
      const testLink = '';
      const formattedLink = createMockFormattedLink(testLink);

      const result = await destination.pasteLink(formattedLink);

      expect(isEligibleForPaste).toHaveBeenCalledWith(testLink);
      expect(result).toBe(false);
      expect(applySmartPadding).not.toHaveBeenCalled();
      expect(mockAdapter.pasteTextToTerminalViaClipboard).not.toHaveBeenCalled();
      expect(mockAdapter.showTerminal).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'TerminalDestination.pasteLink',
          formattedLink,
          linkLength: testLink.length,
        },
        'Link not eligible for paste',
      );
    });

    it('should apply smart padding when text is eligible', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(true);
      (applySmartPadding as jest.Mock).mockReturnValue(' padded-text ');

      await destination.pasteLink(createMockFormattedLink('original-text'));

      expect(isEligibleForPaste).toHaveBeenCalledWith('original-text');
      expect(applySmartPadding).toHaveBeenCalledWith('original-text');
      expect(mockAdapter.pasteTextToTerminalViaClipboard).toHaveBeenCalledWith(
        mockTerminal,
        ' padded-text ',
        { behaviour: BehaviourAfterPaste.NOTHING },
      );
    });

    it('should use applySmartPadding result for ideAdapter.pasteTextToTerminalViaClipboard with NOTHING behaviour', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(true);
      (applySmartPadding as jest.Mock).mockReturnValue('\tcustom-padded\n');

      await destination.pasteLink(createMockFormattedLink('src/file.ts#L10'));

      expect(applySmartPadding).toHaveBeenCalledWith('src/file.ts#L10');
      expect(mockAdapter.pasteTextToTerminalViaClipboard).toHaveBeenCalledWith(
        mockTerminal,
        '\tcustom-padded\n',
        { behaviour: BehaviourAfterPaste.NOTHING },
      );
    });

    it('should log success with formattedLink', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(true);
      const testLink = 'short';
      (applySmartPadding as jest.Mock).mockReturnValue(' short ');
      const formattedLink = createMockFormattedLink(testLink);

      await destination.pasteLink(formattedLink);

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'TerminalDestination.pasteLink',
          terminalName: 'bash',
          formattedLink,
          linkLength: testLink.length,
          originalLength: testLink.length,
          paddedLength: testLink.length + 2,
        },
        'Pasted link to terminal',
      );
    });
  });

  describe('pasteContent()', () => {
    it('should return false when content is ineligible', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(false);

      const result = await destination.pasteContent('');

      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'TerminalDestination.pasteContent',
          contentLength: 0,
        },
        'Content not eligible for paste',
      );
    });

    it('should return true when paste succeeds', async () => {
      const result = await destination.pasteContent('some text');

      expect(result).toBe(true);
    });

    it('should call ideAdapter.pasteTextToTerminalViaClipboard with padded content and NOTHING behaviour', async () => {
      const testContent = 'selected text';
      (applySmartPadding as jest.Mock).mockReturnValue(' selected text ');

      await destination.pasteContent(testContent);

      expect(applySmartPadding).toHaveBeenCalledWith(testContent);
      expect(mockAdapter.pasteTextToTerminalViaClipboard).toHaveBeenCalledWith(
        mockTerminal,
        ' selected text ',
        { behaviour: BehaviourAfterPaste.NOTHING },
      );
    });

    it('should call ideAdapter.showTerminal to focus terminal', async () => {
      await destination.pasteContent('text');

      expect(mockAdapter.showTerminal).toHaveBeenCalledWith(
        mockTerminal,
        TerminalFocusType.StealFocus,
      );
    });

    it('should log success with terminal name and content length', async () => {
      const testContent = 'selected text';
      (applySmartPadding as jest.Mock).mockReturnValue(' selected text ');

      await destination.pasteContent(testContent);

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'TerminalDestination.pasteContent',
          contentLength: testContent.length,
          terminalName: 'bash',
          originalLength: testContent.length,
          paddedLength: testContent.length + 2,
        },
        'Pasted content to terminal',
      );
    });

    it('should apply smart padding when content is eligible', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(true);
      (applySmartPadding as jest.Mock).mockReturnValue(' padded-content ');

      await destination.pasteContent('original-content');

      expect(isEligibleForPaste).toHaveBeenCalledWith('original-content');
      expect(applySmartPadding).toHaveBeenCalledWith('original-content');
      expect(mockAdapter.pasteTextToTerminalViaClipboard).toHaveBeenCalledWith(
        mockTerminal,
        ' padded-content ',
        { behaviour: BehaviourAfterPaste.NOTHING },
      );
    });
  });

  describe('resourceName getter', () => {
    it('should return raw terminal name from bound terminal', () => {
      expect(destination.resourceName).toBe('bash');
    });
  });

  describe('getLoggingDetails()', () => {
    it('should return terminal name when terminal is bound', () => {
      const details = destination.getLoggingDetails();

      expect(details).toStrictEqual({ terminalName: 'bash' });
    });
  });

  describe('focus()', () => {
    it('should return true when terminal is bound', async () => {
      const result = await destination.focus();

      expect(result).toBe(true);
    });

    it('should call ideAdapter.showTerminal to focus terminal', async () => {
      await destination.focus();

      expect(mockAdapter.showTerminal).toHaveBeenCalledWith(
        mockTerminal,
        TerminalFocusType.StealFocus,
      );
    });

    it('should log success with terminal name', async () => {
      await destination.focus();

      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'TerminalDestination.focus', terminalName: 'bash' },
        'Focused terminal',
      );
    });
  });

  describe('equals()', () => {
    it('should return true when comparing same terminal (same processId)', async () => {
      const otherTerminal = {
        ...mockTerminal,
        processId: Promise.resolve(12345), // Same processId
      } as vscode.Terminal;
      const otherDestination = new TerminalDestination(otherTerminal, mockAdapter, mockLogger);

      const result = await destination.equals(otherDestination);

      expect(result).toBe(true);
    });

    it('should return false when comparing different terminals (different processId)', async () => {
      const otherTerminal = {
        ...mockTerminal,
        processId: Promise.resolve(99999), // Different processId
      } as vscode.Terminal;
      const otherDestination = new TerminalDestination(otherTerminal, mockAdapter, mockLogger);

      const result = await destination.equals(otherDestination);

      expect(result).toBe(false);
    });

    it('should return false when comparing with undefined', async () => {
      const result = await destination.equals(undefined);

      expect(result).toBe(false);
    });

    it('should return false when comparing with different destination type', async () => {
      const cursorAIDest = {
        id: 'cursor-ai',
        displayName: 'Cursor AI Assistant',
      } as PasteDestination;

      const result = await destination.equals(cursorAIDest);

      expect(result).toBe(false);
    });

    it('should return false when terminal processId is undefined', async () => {
      const terminalWithoutPid = {
        ...mockTerminal,
        processId: Promise.resolve(undefined),
      } as vscode.Terminal;
      const otherDestination = new TerminalDestination(terminalWithoutPid, mockAdapter, mockLogger);

      const result = await destination.equals(otherDestination);

      expect(result).toBe(false);
    });

    it('should log debug message when processId is undefined', async () => {
      const terminalWithoutPid = {
        ...mockTerminal,
        processId: Promise.resolve(undefined),
      } as vscode.Terminal;
      const otherDestination = new TerminalDestination(terminalWithoutPid, mockAdapter, mockLogger);

      await destination.equals(otherDestination);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'TerminalDestination.equals',
          thisPid: 12345,
          otherPid: undefined,
        },
        'Cannot compare terminals: processId undefined (terminal may not be started yet)',
      );
    });
  });

  describe('getJumpSuccessMessage()', () => {
    it('should return formatted message with terminal name', () => {
      const message = destination.getJumpSuccessMessage();

      expect(message).toBe('✓ Focused Terminal: "bash"');
    });
  });
});
