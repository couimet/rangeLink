import { FocusErrorReason } from '../../destinations/capabilities/FocusCapability';
import { ComposablePasteDestination } from '../../destinations/ComposablePasteDestination';
import { AutoPasteResult, PasteContentType } from '../../types';
import {
  createMockComposablePasteDestination,
  createMockEditorComposablePasteDestination,
  createMockEligibilityChecker,
  createMockFocusCapability,
  createMockFormattedLink,
  createMockTerminal,
  createMockTerminalComposablePasteDestination,
  createMockUri,
} from '../helpers';

import { DetailedResult } from '@couimet/detailed-result';
import { getUniqueInt } from '@couimet/dynamic-testing';
import { createMockLogger } from '@couimet/logger-contract-testing';

describe('ComposablePasteDestination', () => {
  const mockLogger = createMockLogger();

  describe('performPaste() (white-box)', () => {
    it('should check availability first', async () => {
      const isAvailable = jest.fn().mockResolvedValue(true);
      const destination = createMockComposablePasteDestination({ isAvailable, logger: mockLogger });
      const context = { fn: 'test', mock: true };

      await destination['performPaste']('text', context, PasteContentType.Link);

      expect(isAvailable).toHaveBeenCalledTimes(1);
    });

    it('should return false when unavailable without focusing', async () => {
      const isAvailable = jest.fn().mockResolvedValue(false);
      const focusCapability = createMockFocusCapability();
      const destination = createMockComposablePasteDestination({
        isAvailable,
        focusCapability,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };

      const result = await destination['performPaste']('text', context, PasteContentType.Link);

      expect(result).toBe(false);
      expect(focusCapability.focus).not.toHaveBeenCalled();
    });

    it('should pass text through as-is (padding applied upstream at call sites)', async () => {
      const mockInsert = jest.fn().mockResolvedValue(true);
      const focusCapability = createMockFocusCapability();
      focusCapability.focus.mockResolvedValue(DetailedResult.success({ inserter: mockInsert }));

      const destination = createMockComposablePasteDestination({
        focusCapability,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };

      await destination['performPaste'](' already-padded ', context, PasteContentType.Link);

      expect(mockInsert).toHaveBeenCalledWith(' already-padded ');
    });

    it('should focus before inserting text', async () => {
      const callOrder: string[] = [];
      const mockInsert = jest.fn().mockImplementation(() => {
        callOrder.push('insert');
        return true;
      });

      const focusCapability = createMockFocusCapability();
      focusCapability.focus.mockImplementation(() => {
        callOrder.push('focus');
        return Promise.resolve(DetailedResult.success({ inserter: mockInsert }));
      });

      const destination = createMockComposablePasteDestination({
        focusCapability,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };

      await destination['performPaste']('text', context, PasteContentType.Link);

      expect(focusCapability.focus).toHaveBeenCalledTimes(1);
      expect(focusCapability.focus).toHaveBeenCalledWith(context);
      expect(callOrder).toStrictEqual(['focus', 'insert']);
    });

    it('should return true when insertion succeeds', async () => {
      const mockInsert = jest.fn().mockResolvedValue(true);
      const focusCapability = createMockFocusCapability();
      focusCapability.focus.mockResolvedValue(DetailedResult.success({ inserter: mockInsert }));

      const destination = createMockComposablePasteDestination({
        focusCapability,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };

      const result = await destination['performPaste']('text', context, PasteContentType.Link);

      expect(result).toBe(true);
    });

    it('should return false when insertion fails', async () => {
      const mockInsert = jest.fn().mockResolvedValue(false);
      const focusCapability = createMockFocusCapability();
      focusCapability.focus.mockResolvedValue(DetailedResult.success({ inserter: mockInsert }));

      const destination = createMockComposablePasteDestination({
        focusCapability,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };

      const result = await destination['performPaste']('text', context, PasteContentType.Link);

      expect(result).toBe(false);
    });

    it('should return false when focus fails', async () => {
      const focusCapability = createMockFocusCapability();
      focusCapability.focus.mockResolvedValue(DetailedResult.failure({ reason: FocusErrorReason.SHOW_DOCUMENT_FAILED }));

      const destination = createMockComposablePasteDestination({
        focusCapability,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };

      const result = await destination['performPaste']('text', context, PasteContentType.Link);

      expect(result).toBe(false);
    });

    it('should use "link" label for PasteContentType.Link in log messages', async () => {
      const isAvailable = jest.fn().mockResolvedValue(false);
      const destination = createMockComposablePasteDestination({
        isAvailable,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };

      await destination['performPaste']('text', context, PasteContentType.Link);

      expect(mockLogger.info).toHaveBeenCalledWith(context, 'Cannot paste link: Mock Destination not available');
    });

    it('should use "content" label for PasteContentType.Text in log messages', async () => {
      const isAvailable = jest.fn().mockResolvedValue(false);
      const destination = createMockComposablePasteDestination({
        isAvailable,
        logger: mockLogger,
      });
      const context = { fn: 'test', mock: true };

      await destination['performPaste']('text', context, PasteContentType.Text);

      expect(mockLogger.info).toHaveBeenCalledWith(context, 'Cannot paste content: Mock Destination not available');
    });
  });

  describe('pasteLink() delegation', () => {
    it('should build context with formattedLink and linkLength', async () => {
      const focusCapability = createMockFocusCapability();
      const destination = createMockComposablePasteDestination({
        focusCapability,
        logger: mockLogger,
      });
      const formattedLink = createMockFormattedLink('test-link');

      await destination.pasteLink(formattedLink);

      expect(focusCapability.focus).toHaveBeenCalledWith({
        fn: 'ComposablePasteDestination.pasteLink',
        formattedLink,
        linkLength: 9,
        mock: true,
      });
    });

    it('should pass link text to insert function unchanged (padding applied upstream)', async () => {
      const mockInsert = jest.fn().mockResolvedValue(true);
      const focusCapability = createMockFocusCapability();
      focusCapability.focus.mockResolvedValue(DetailedResult.success({ inserter: mockInsert }));

      const destination = createMockComposablePasteDestination({
        focusCapability,
        logger: mockLogger,
      });
      const formattedLink = createMockFormattedLink('my-link');

      await destination.pasteLink(formattedLink);

      expect(mockInsert).toHaveBeenCalledWith('my-link');
    });
  });

  describe('pasteContent() delegation', () => {
    it('should build context with contentLength', async () => {
      const focusCapability = createMockFocusCapability();
      const destination = createMockComposablePasteDestination({
        focusCapability,
        logger: mockLogger,
      });

      await destination.pasteContent('test content');

      expect(focusCapability.focus).toHaveBeenCalledWith({
        fn: 'ComposablePasteDestination.pasteContent',
        contentLength: 12,
        mock: true,
      });
    });

    it('should pass content text to insert function unchanged (padding applied upstream)', async () => {
      const mockInsert = jest.fn().mockResolvedValue(true);
      const focusCapability = createMockFocusCapability();
      focusCapability.focus.mockResolvedValue(DetailedResult.success({ inserter: mockInsert }));

      const destination = createMockComposablePasteDestination({
        focusCapability,
        logger: mockLogger,
      });

      await destination.pasteContent('my content');

      expect(mockInsert).toHaveBeenCalledWith('my content');
    });
  });

  describe('focus() behavior', () => {
    it('should check availability before focusing', async () => {
      const isAvailable = jest.fn().mockResolvedValue(true);
      const destination = createMockComposablePasteDestination({ isAvailable, logger: mockLogger });

      await destination.focus();

      expect(isAvailable).toHaveBeenCalledTimes(1);
    });

    it('should return false when destination unavailable', async () => {
      const isAvailable = jest.fn().mockResolvedValue(false);
      const focusCapability = createMockFocusCapability();
      const destination = createMockComposablePasteDestination({
        isAvailable,
        focusCapability,
        logger: mockLogger,
      });

      const result = await destination.focus();

      expect(result).toBe(false);
      expect(focusCapability.focus).not.toHaveBeenCalled();
    });

    it('should delegate to focusCapability when available', async () => {
      const focusCapability = createMockFocusCapability();
      const destination = createMockComposablePasteDestination({
        focusCapability,
        logger: mockLogger,
      });

      await destination.focus();

      expect(focusCapability.focus).toHaveBeenCalledTimes(1);
      expect(focusCapability.focus).toHaveBeenCalledWith({
        fn: 'ComposablePasteDestination.focus',
        mock: true,
      });
    });

    it('should return true on successful focus', async () => {
      const destination = createMockComposablePasteDestination({ logger: mockLogger });

      const result = await destination.focus();

      expect(result).toBe(true);
    });

    it('should return false when focus fails', async () => {
      const focusCapability = createMockFocusCapability();
      focusCapability.focus.mockResolvedValue(DetailedResult.failure({ reason: FocusErrorReason.TERMINAL_FOCUS_FAILED }));

      const destination = createMockComposablePasteDestination({
        focusCapability,
        logger: mockLogger,
      });

      const result = await destination.focus();

      expect(result).toBe(false);
    });
  });

  describe('equality comparison', () => {
    it('should return false for undefined other', async () => {
      const destination = createMockComposablePasteDestination({ logger: mockLogger });

      const result = await destination.equals(undefined);

      expect(result).toBe(false);
    });

    it('should use singleton comparison when compareWith not provided', async () => {
      const destination = createMockComposablePasteDestination({ logger: mockLogger });

      const resultSame = await destination.equals(destination);
      expect(resultSame).toBe(true);

      const other = createMockComposablePasteDestination({ logger: mockLogger });
      const resultDifferent = await destination.equals(other);
      expect(resultDifferent).toBe(false);
    });

    it('should use compareWith when provided', async () => {
      const compareWith = jest.fn().mockResolvedValue(true);
      const destination = createMockComposablePasteDestination({
        compareWith,
        logger: mockLogger,
      });
      const other = createMockComposablePasteDestination({ logger: mockLogger });

      await destination.equals(other);

      expect(compareWith).toHaveBeenCalledTimes(1);
      expect(compareWith).toHaveBeenCalledWith(other);
    });

    it('should return result from compareWith', async () => {
      const compareWith = jest.fn().mockResolvedValue(false);
      const destination = createMockComposablePasteDestination({
        compareWith,
        logger: mockLogger,
      });
      const other = createMockComposablePasteDestination({ logger: mockLogger });

      const result = await destination.equals(other);

      expect(result).toBe(false);
    });

    describe('AI assistant kind-based equality (createAiAssistant factory)', () => {
      const createAiAssistantDestination = (id: 'claude-code' | 'cursor-ai' | 'github-copilot-chat') =>
        ComposablePasteDestination.createAiAssistant({
          id,
          displayName: `Mock ${id}`,
          focusCapability: createMockFocusCapability(),
          isAvailable: jest.fn().mockResolvedValue(true),
          jumpSuccessMessage: `Focused ${id}`,
          loggingDetails: {},
          logger: mockLogger,
        });

      it('should return true for two destinations with the same AI assistant kind', async () => {
        const first = createAiAssistantDestination('claude-code');
        const second = createAiAssistantDestination('claude-code');

        expect(await first.equals(second)).toBe(true);
        expect(await second.equals(first)).toBe(true);
      });

      it('should return false for two destinations with different AI assistant kinds', async () => {
        const claudeCode = createAiAssistantDestination('claude-code');
        const cursorAi = createAiAssistantDestination('cursor-ai');

        expect(await claudeCode.equals(cursorAi)).toBe(false);
        expect(await cursorAi.equals(claudeCode)).toBe(false);
      });

      it('should return false when comparing AI assistant with terminal destination', async () => {
        const claudeCode = createAiAssistantDestination('claude-code');
        const terminal = createMockTerminalComposablePasteDestination({ logger: mockLogger });

        expect(await claudeCode.equals(terminal)).toBe(false);
      });
    });
  });

  describe('user instructions', () => {
    it('should return undefined when getUserInstruction not provided', () => {
      const destination = createMockComposablePasteDestination({ logger: mockLogger });

      const result = destination.getUserInstruction(AutoPasteResult.Success);

      expect(result).toBeUndefined();
    });

    it('should delegate to getUserInstruction when provided', () => {
      const getUserInstruction = jest.fn().mockReturnValue('Manual paste instruction');
      const destination = createMockComposablePasteDestination({
        getUserInstruction,
        logger: mockLogger,
      });

      const result = destination.getUserInstruction(AutoPasteResult.Failure);

      expect(getUserInstruction).toHaveBeenCalledTimes(1);
      expect(getUserInstruction).toHaveBeenCalledWith(AutoPasteResult.Failure);
      expect(result).toBe('Manual paste instruction');
    });
  });

  describe('configuration properties', () => {
    it('should expose id from config', () => {
      const destination = createMockComposablePasteDestination({ id: 'terminal' });

      expect(destination.id).toBe('terminal');
    });

    it('should expose displayName from config', () => {
      const destination = createMockComposablePasteDestination({
        displayName: 'Custom Display Name',
      });

      expect(destination.displayName).toBe('Custom Display Name');
    });

    it('should return jumpSuccessMessage from getJumpSuccessMessage', () => {
      const destination = createMockComposablePasteDestination({
        jumpSuccessMessage: 'Custom jump message',
      });

      const message = destination.getJumpSuccessMessage();

      expect(message).toBe('Custom jump message');
    });

    it('should return loggingDetails from getLoggingDetails', () => {
      const loggingDetails = { terminal: 'bash', pid: 12345 };
      const destination = createMockComposablePasteDestination({ loggingDetails });

      const details = destination.getLoggingDetails();

      expect(details).toStrictEqual(loggingDetails);
    });
  });

  describe('isEligibleForPasteLink() delegation', () => {
    it('should delegate to eligibilityChecker with correct context', async () => {
      const eligibilityChecker = createMockEligibilityChecker();
      const destination = createMockComposablePasteDestination({
        eligibilityChecker,
        logger: mockLogger,
      });
      const formattedLink = createMockFormattedLink('test-link');

      await destination.isEligibleForPasteLink(formattedLink);

      expect(eligibilityChecker.isEligible).toHaveBeenCalledTimes(1);
      expect(eligibilityChecker.isEligible).toHaveBeenCalledWith('test-link', {
        fn: 'ComposablePasteDestination.isEligibleForPasteLink',
        mock: true,
      });
    });

    it('should return result from eligibilityChecker', async () => {
      const eligibilityChecker = createMockEligibilityChecker();
      eligibilityChecker.isEligible.mockResolvedValue(false);
      const destination = createMockComposablePasteDestination({
        eligibilityChecker,
        logger: mockLogger,
      });
      const formattedLink = createMockFormattedLink('test-link');

      const result = await destination.isEligibleForPasteLink(formattedLink);

      expect(result).toBe(false);
    });
  });

  describe('isEligibleForPasteContent() delegation', () => {
    it('should delegate to eligibilityChecker with correct context', async () => {
      const eligibilityChecker = createMockEligibilityChecker();
      const destination = createMockComposablePasteDestination({
        eligibilityChecker,
        logger: mockLogger,
      });

      await destination.isEligibleForPasteContent('test content');

      expect(eligibilityChecker.isEligible).toHaveBeenCalledTimes(1);
      expect(eligibilityChecker.isEligible).toHaveBeenCalledWith('test content', {
        fn: 'ComposablePasteDestination.isEligibleForPasteContent',
        mock: true,
      });
    });

    it('should return result from eligibilityChecker', async () => {
      const eligibilityChecker = createMockEligibilityChecker();
      eligibilityChecker.isEligible.mockResolvedValue(false);
      const destination = createMockComposablePasteDestination({
        eligibilityChecker,
        logger: mockLogger,
      });

      const result = await destination.isEligibleForPasteContent('test content');

      expect(result).toBe(false);
    });
  });

  describe('isAvailable() delegation', () => {
    it('should delegate to isAvailable function', async () => {
      const isAvailable = jest.fn().mockResolvedValue(true);
      const destination = createMockComposablePasteDestination({
        isAvailable,
        logger: mockLogger,
      });

      await destination.isAvailable();

      expect(isAvailable).toHaveBeenCalledTimes(1);
    });

    it('should return result from isAvailable function', async () => {
      const isAvailable = jest.fn().mockResolvedValue(false);
      const destination = createMockComposablePasteDestination({
        isAvailable,
        logger: mockLogger,
      });

      const result = await destination.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('shouldPreserveClipboard()', () => {
    it('returns true when no callback is provided', () => {
      const destination = createMockComposablePasteDestination({
        logger: mockLogger,
      });

      expect(destination.shouldPreserveClipboard()).toBe(true);
    });

    it('delegates to shouldPreserveClipboard callback when provided', () => {
      const destination = createMockComposablePasteDestination({
        shouldPreserveClipboard: () => false,
        logger: mockLogger,
      });

      expect(destination.shouldPreserveClipboard()).toBe(false);
    });

    it('returns true when callback returns true', () => {
      const destination = createMockComposablePasteDestination({
        shouldPreserveClipboard: () => true,
        logger: mockLogger,
      });

      expect(destination.shouldPreserveClipboard()).toBe(true);
    });
  });

  describe('getDestinationUri()', () => {
    it('should return document URI for editor destinations', () => {
      const mockUri = { toString: () => 'file:///workspace/src/file.ts' } as never;
      const destination = createMockComposablePasteDestination({
        resource: { kind: 'editor', uri: mockUri, viewColumn: 1 },
        logger: mockLogger,
      });

      const result = destination.getDestinationUri();

      expect(result).toBe(mockUri);
    });

    it('should return undefined for terminal destinations', () => {
      const mockTerminal = { name: 'bash' };
      const destination = createMockComposablePasteDestination({
        resource: { kind: 'terminal', terminal: mockTerminal as never },
        logger: mockLogger,
      });

      const result = destination.getDestinationUri();

      expect(result).toBeUndefined();
    });

    it('should return undefined for singleton destinations', () => {
      const destination = createMockComposablePasteDestination({
        resource: { kind: 'singleton' },
        logger: mockLogger,
      });

      const result = destination.getDestinationUri();

      expect(result).toBeUndefined();
    });
  });

  describe('rawLabel getter', () => {
    it('should return terminalName for terminal destinations with string name', () => {
      const destination = createMockTerminalComposablePasteDestination({
        loggingDetails: { terminalName: 'bash' },
        logger: mockLogger,
      });

      expect(destination.rawLabel).toBe('bash');
    });

    it('should fall back to displayName for terminal destinations with non-string name', () => {
      const destination = createMockTerminalComposablePasteDestination({
        displayName: 'Terminal ("bash")',
        loggingDetails: { terminalName: getUniqueInt() },
        logger: mockLogger,
      });

      expect(destination.rawLabel).toBe('Terminal ("bash")');
    });

    it('should return editorName for editor destinations with string name', () => {
      const destination = createMockEditorComposablePasteDestination({
        logger: mockLogger,
      });

      expect(destination.rawLabel).toBe('file.ts');
    });

    it('should fall back to displayName for editor destinations with non-string name', () => {
      const destination = createMockEditorComposablePasteDestination({
        displayName: 'Text Editor ("file.ts")',
        loggingDetails: { editorName: getUniqueInt() },
        logger: mockLogger,
      });

      expect(destination.rawLabel).toBe('Text Editor ("file.ts")');
    });

    it('should return displayName for singleton destinations', () => {
      const destination = createMockComposablePasteDestination({
        displayName: 'Claude Code',
        resource: { kind: 'singleton' },
        logger: mockLogger,
      });

      expect(destination.rawLabel).toBe('Claude Code');
    });
  });

  describe('getDestinationViewColumn()', () => {
    it('should return view column for editor destinations', () => {
      const viewColumn = getUniqueInt();
      const destination = createMockComposablePasteDestination({
        resource: { kind: 'editor', uri: { toString: () => 'file:///workspace/src/file.ts' } as never, viewColumn },
        logger: mockLogger,
      });

      const result = destination.getDestinationViewColumn();

      expect(result).toBe(viewColumn);
    });

    it('should return undefined for terminal destinations', () => {
      const destination = createMockComposablePasteDestination({
        resource: { kind: 'terminal', terminal: { name: 'bash' } as never },
        logger: mockLogger,
      });

      expect(destination.getDestinationViewColumn()).toBeUndefined();
    });

    it('should return undefined for singleton destinations', () => {
      const destination = createMockComposablePasteDestination({
        resource: { kind: 'singleton' },
        logger: mockLogger,
      });

      expect(destination.getDestinationViewColumn()).toBeUndefined();
    });
  });

  describe('editorHasActiveSelection()', () => {
    it('should return true when the editor has an active selection', () => {
      const destination = createMockEditorComposablePasteDestination({
        editorHasActiveSelection: () => true,
        logger: mockLogger,
      });

      expect(destination.editorHasActiveSelection()).toBe(true);
    });

    it('should return false when the editor has no active selection', () => {
      const destination = createMockEditorComposablePasteDestination({
        editorHasActiveSelection: () => false,
        logger: mockLogger,
      });

      expect(destination.editorHasActiveSelection()).toBe(false);
    });

    it('should return false when no active-selection function is provided', () => {
      const destination = createMockComposablePasteDestination({
        resource: { kind: 'singleton' },
        logger: mockLogger,
      });

      expect(destination.editorHasActiveSelection()).toBe(false);
    });
  });

  describe('static factories', () => {
    it('createTerminal builds a terminal destination with terminal resource', async () => {
      const terminal = createMockTerminal({ name: 'bash' });
      const destination = ComposablePasteDestination.createTerminal({
        terminal,
        displayName: 'Terminal ("bash")',
        focusCapability: createMockFocusCapability(),
        jumpSuccessMessage: 'Jumped to terminal',
        loggingDetails: { terminalName: 'bash' },
        logger: mockLogger,
        compareWith: jest.fn().mockResolvedValue(true),
      });

      expect(destination.id).toBe('terminal');
      expect(destination.displayName).toBe('Terminal ("bash")');
      expect(destination.resource).toStrictEqual({ kind: 'terminal', terminal });
      await expect(destination.isAvailable()).resolves.toBe(true);
    });

    it('createEditor builds an editor destination with editor resource', async () => {
      const mockUri = createMockUri('/workspace/src/file.ts');
      const viewColumn = getUniqueInt();
      const destination = ComposablePasteDestination.createEditor({
        uri: mockUri,
        viewColumn,
        displayName: 'Text Editor ("file.ts")',
        focusCapability: createMockFocusCapability(),
        eligibilityChecker: createMockEligibilityChecker(),
        editorHasActiveSelection: () => false,
        jumpSuccessMessage: 'Jumped to editor',
        loggingDetails: { editorName: 'file.ts' },
        logger: mockLogger,
        compareWith: jest.fn().mockResolvedValue(false),
      });

      expect(destination.id).toBe('text-editor');
      expect(destination.displayName).toBe('Text Editor ("file.ts")');
      expect(destination.resource).toStrictEqual({ kind: 'editor', uri: mockUri, viewColumn });
      await expect(destination.isAvailable()).resolves.toBe(true);
    });
  });
});
