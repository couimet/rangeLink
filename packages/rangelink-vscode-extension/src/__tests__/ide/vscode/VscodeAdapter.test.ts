import { VscodeAdapter } from '../../../ide/vscode/VscodeAdapter';
import { BehaviourAfterPaste } from '../../../types/BehaviourAfterPaste';
import { TerminalFocusType } from '../../../types/TerminalFocusType';
import * as resolveWorkspacePathModule from '../../../utils/resolveWorkspacePath';
import { createMockDocument } from '../../helpers/createMockDocument';
import { createMockEditor } from '../../helpers/createMockEditor';
import { createMockTerminal } from '../../helpers/createMockTerminal';
import { createMockUri } from '../../helpers/createMockUri';
import { createMockUntitledUri } from '../../helpers/createMockUntitledUri';
import { createMockVscodeAdapter, type VscodeAdapterWithTestHooks } from '../../helpers/mockVSCode';

// ============================================================================
// Tests
// ============================================================================

describe('VscodeAdapter', () => {
  let adapter: VscodeAdapterWithTestHooks;
  let mockVSCode: any;

  beforeEach(() => {
    adapter = createMockVscodeAdapter();
    mockVSCode = adapter.__getVscodeInstance();
  });

  describe('writeTextToClipboard', () => {
    it('should write text to clipboard using VSCode API', async () => {
      const text = 'test text';

      await adapter.writeTextToClipboard(text);

      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledWith(text);
      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledTimes(1);
    });

    it('should handle empty string', async () => {
      await adapter.writeTextToClipboard('');

      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledWith('');
    });

    it('should handle multi-line text', async () => {
      const multiLineText = 'line1\nline2\nline3';

      await adapter.writeTextToClipboard(multiLineText);

      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledWith(multiLineText);
    });

    it('should handle text with special characters', async () => {
      const specialText = 'text with $pecial ch@racters & émojis 🎉';

      await adapter.writeTextToClipboard(specialText);

      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledWith(specialText);
    });
  });

  describe('setStatusBarMessage', () => {
    it('should set status bar message with default timeout when not specified', () => {
      const message = 'test message';

      const result = adapter.setStatusBarMessage(message);

      expect(mockVSCode.window.setStatusBarMessage).toHaveBeenCalledWith(message, 2000);
      expect(mockVSCode.window.setStatusBarMessage).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result.dispose).toBeDefined();
    });

    it('should forward custom timeout to underlying VSCode API', () => {
      const message = 'test message';
      const customTimeout = 31416;

      const result = adapter.setStatusBarMessage(message, customTimeout);

      expect(mockVSCode.window.setStatusBarMessage).toHaveBeenCalledWith(message, customTimeout);
      expect(mockVSCode.window.setStatusBarMessage).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should handle zero timeout', () => {
      const message = 'test message';

      adapter.setStatusBarMessage(message, 0);

      expect(mockVSCode.window.setStatusBarMessage).toHaveBeenCalledWith(message, 0);
    });

    it('should return disposable that can be disposed', () => {
      const result = adapter.setStatusBarMessage('test');

      expect(result).toBeDefined();
      expect(result.dispose).toBeDefined();
      expect(typeof result.dispose).toBe('function');

      // Verify dispose can be called without errors
      expect(() => result.dispose()).not.toThrow();
    });
  });

  describe('showWarningMessage', () => {
    it('should show warning message using VSCode API', async () => {
      const message = 'warning message';

      await adapter.showWarningMessage(message);

      expect(mockVSCode.window.showWarningMessage).toHaveBeenCalledWith(message);
      expect(mockVSCode.window.showWarningMessage).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when no button is selected', async () => {
      (mockVSCode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);

      const result = await adapter.showWarningMessage('test');

      expect(result).toBeUndefined();
    });

    it('should return button text when button is selected', async () => {
      const buttonText = 'OK';
      (mockVSCode.window.showWarningMessage as jest.Mock).mockResolvedValue(buttonText);

      const result = await adapter.showWarningMessage('test');

      expect(result).toBe(buttonText);
    });

    it('should handle empty message', async () => {
      await adapter.showWarningMessage('');

      expect(mockVSCode.window.showWarningMessage).toHaveBeenCalledWith('');
    });
  });

  describe('showErrorMessage', () => {
    it('should show error message using VSCode API', async () => {
      const message = 'error message';

      await adapter.showErrorMessage(message);

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(message);
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when no button is selected', async () => {
      (mockVSCode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      const result = await adapter.showErrorMessage('test');

      expect(result).toBeUndefined();
    });

    it('should return button text when button is selected', async () => {
      const buttonText = 'Retry';
      (mockVSCode.window.showErrorMessage as jest.Mock).mockResolvedValue(buttonText);

      const result = await adapter.showErrorMessage('test');

      expect(result).toBe(buttonText);
    });

    it('should handle error message with details', async () => {
      const detailedError =
        'RangeLink: Invalid delimiter configuration. Using defaults. Check Output → RangeLink for details.';

      await adapter.showErrorMessage(detailedError);

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(detailedError);
    });

    it('should handle multi-line error messages', async () => {
      const multiLineError = 'Error occurred:\nLine 1 detail\nLine 2 detail';

      await adapter.showErrorMessage(multiLineError);

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(multiLineError);
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple clipboard operations sequentially', async () => {
      await adapter.writeTextToClipboard('first');
      await adapter.writeTextToClipboard('second');
      await adapter.writeTextToClipboard('third');

      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple status bar messages', () => {
      const disposable1 = adapter.setStatusBarMessage('message 1', 1000);
      const disposable2 = adapter.setStatusBarMessage('message 2', 2000);

      expect(mockVSCode.window.setStatusBarMessage).toHaveBeenCalledTimes(2);
      expect(disposable1).toBeDefined();
      expect(disposable2).toBeDefined();
    });

    it('should handle showing multiple notification types', async () => {
      await adapter.showWarningMessage('warning');
      await adapter.showErrorMessage('error');

      expect(mockVSCode.window.showWarningMessage).toHaveBeenCalledTimes(1);
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('resolveWorkspacePath', () => {
    it('should delegate to resolveWorkspacePath utility with ideInstance', async () => {
      const linkPath = 'src/auth.ts';
      const mockUri = { fsPath: '/workspace/src/auth.ts' };
      const spy = jest
        .spyOn(resolveWorkspacePathModule, 'resolveWorkspacePath')
        .mockResolvedValue(mockUri as any);

      const result = await adapter.resolveWorkspacePath(linkPath);

      expect(result).toStrictEqual(mockUri);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(linkPath, mockVSCode);
    });
  });

  describe('createPosition', () => {
    it('should create Position with line and character', () => {
      const position = adapter.createPosition(10, 5);

      expect(position).toStrictEqual({ line: 10, character: 5 });
      expect(mockVSCode.Position).toHaveBeenCalledWith(10, 5);
    });

    it('should create Position at line start (character 0)', () => {
      const position = adapter.createPosition(0, 0);

      expect(position).toStrictEqual({ line: 0, character: 0 });
    });
  });

  describe('createSelection', () => {
    it('should create Selection with anchor and active positions', () => {
      const anchor = { line: 10, character: 5 } as any;
      const active = { line: 15, character: 10 } as any;

      const selection = adapter.createSelection(anchor, active);

      expect(selection).toStrictEqual({ anchor, active });
      expect(mockVSCode.Selection).toHaveBeenCalledWith(anchor, active);
    });

    it('should create single-position selection (anchor === active)', () => {
      const position = { line: 5, character: 3 } as any;

      const selection = adapter.createSelection(position, position);

      expect(selection).toStrictEqual({ anchor: position, active: position });
    });
  });

  describe('createRange', () => {
    it('should create Range with start and end positions', () => {
      const start = { line: 10, character: 5 } as any;
      const end = { line: 15, character: 10 } as any;

      const range = adapter.createRange(start, end);

      expect(range).toStrictEqual({ start, end });
      expect(mockVSCode.Range).toHaveBeenCalledWith(start, end);
    });

    it('should create single-line range', () => {
      const start = { line: 5, character: 0 } as any;
      const end = { line: 5, character: 10 } as any;

      const range = adapter.createRange(start, end);

      expect(range).toStrictEqual({ start, end });
    });
  });

  describe('showTerminal', () => {
    it('should call terminal.show(false) with StealFocus', () => {
      const mockTerminal = createMockTerminal();

      adapter.showTerminal(mockTerminal, TerminalFocusType.StealFocus);

      expect(mockTerminal.show).toHaveBeenCalledWith(false);
      expect(mockTerminal.show).toHaveBeenCalledTimes(1);
    });

    it('should throw TERMINAL_NOT_DEFINED when terminal is undefined', () => {
      const undefinedTerminal = undefined as any;

      expect(() =>
        adapter.showTerminal(undefinedTerminal, TerminalFocusType.StealFocus),
      ).toThrowRangeLinkExtensionError('TERMINAL_NOT_DEFINED', {
        message: 'Terminal reference is not defined',
        functionName: 'VscodeAdapter.showTerminal',
      });
    });

    it('should throw TERMINAL_NOT_DEFINED when terminal is null', () => {
      const nullTerminal = null as any;

      expect(() =>
        adapter.showTerminal(nullTerminal, TerminalFocusType.StealFocus),
      ).toThrowRangeLinkExtensionError('TERMINAL_NOT_DEFINED', {
        message: 'Terminal reference is not defined',
        functionName: 'VscodeAdapter.showTerminal',
      });
    });

    it('should throw UNKNOWN_FOCUS_TYPE for invalid focus type', () => {
      const mockTerminal = createMockTerminal();
      const invalidFocusType = 'invalid-focus-type' as any;

      expect(() =>
        adapter.showTerminal(mockTerminal, invalidFocusType),
      ).toThrowRangeLinkExtensionError('UNKNOWN_FOCUS_TYPE', {
        message: 'Unknown focus type: invalid-focus-type',
        functionName: 'VscodeAdapter.showTerminal',
      });
    });
  });
  describe('getTerminalName', () => {
    it('should return terminal name', () => {
      const terminalName = 'bash';
      const mockTerminal = createMockTerminal({ name: terminalName });

      const result = adapter.getTerminalName(mockTerminal);

      expect(result).toBe(terminalName);
    });

    it('should return different terminal names', () => {
      const mockTerminal1 = createMockTerminal({ name: 'zsh' });
      const mockTerminal2 = createMockTerminal({ name: 'powershell' });

      expect(adapter.getTerminalName(mockTerminal1)).toBe('zsh');
      expect(adapter.getTerminalName(mockTerminal2)).toBe('powershell');
    });

    it('should throw TERMINAL_NOT_DEFINED when terminal is undefined', () => {
      const undefinedTerminal = undefined as any;

      expect(() => adapter.getTerminalName(undefinedTerminal)).toThrowRangeLinkExtensionError(
        'TERMINAL_NOT_DEFINED',
        {
          message: 'Terminal reference is not defined',
          functionName: 'VscodeAdapter.getTerminalName',
        },
      );
    });

    it('should throw TERMINAL_NOT_DEFINED when terminal is null', () => {
      const nullTerminal = null as any;

      expect(() => adapter.getTerminalName(nullTerminal)).toThrowRangeLinkExtensionError(
        'TERMINAL_NOT_DEFINED',
        {
          message: 'Terminal reference is not defined',
          functionName: 'VscodeAdapter.getTerminalName',
        },
      );
    });
  });

  describe('pasteTextToTerminalViaClipboard', () => {
    it('should write to clipboard, show terminal, and execute paste command with default behavior', async () => {
      const mockTerminal = createMockTerminal();
      const text = 'test text for paste';
      const writeToClipboardSpy = jest.spyOn(adapter, 'writeTextToClipboard');
      const executeCommandSpy = jest.spyOn(adapter, 'executeCommand');

      await adapter.pasteTextToTerminalViaClipboard(mockTerminal, text);

      expect(writeToClipboardSpy).toHaveBeenCalledWith(text);
      expect(writeToClipboardSpy).toHaveBeenCalledTimes(1);
      expect(mockTerminal.show).toHaveBeenCalledTimes(1);
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.terminal.paste');
      expect(executeCommandSpy).toHaveBeenCalledTimes(1);
      expect(mockTerminal.sendText).not.toHaveBeenCalled();
    });

    it('should use NOTHING behaviour when explicitly specified', async () => {
      const mockTerminal = createMockTerminal();
      const text = 'test text';
      const writeToClipboardSpy = jest.spyOn(adapter, 'writeTextToClipboard');
      const executeCommandSpy = jest.spyOn(adapter, 'executeCommand');

      await adapter.pasteTextToTerminalViaClipboard(mockTerminal, text, {
        behaviour: BehaviourAfterPaste.NOTHING,
      });

      expect(writeToClipboardSpy).toHaveBeenCalledWith(text);
      expect(mockTerminal.show).toHaveBeenCalledTimes(1);
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.terminal.paste');
      expect(mockTerminal.sendText).not.toHaveBeenCalled();
    });

    it('should send Enter after paste when EXECUTE behaviour specified', async () => {
      const mockTerminal = createMockTerminal();
      const text = 'command to execute';
      const writeToClipboardSpy = jest.spyOn(adapter, 'writeTextToClipboard');
      const executeCommandSpy = jest.spyOn(adapter, 'executeCommand');

      await adapter.pasteTextToTerminalViaClipboard(mockTerminal, text, {
        behaviour: BehaviourAfterPaste.EXECUTE,
      });

      expect(writeToClipboardSpy).toHaveBeenCalledWith(text);
      expect(mockTerminal.show).toHaveBeenCalledTimes(1);
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.terminal.paste');
      expect(mockTerminal.sendText).toHaveBeenCalledWith('', true);
      expect(mockTerminal.sendText).toHaveBeenCalledTimes(1);
    });

    it('should handle empty text', async () => {
      const mockTerminal = createMockTerminal();
      const writeToClipboardSpy = jest.spyOn(adapter, 'writeTextToClipboard');
      const executeCommandSpy = jest.spyOn(adapter, 'executeCommand');

      await adapter.pasteTextToTerminalViaClipboard(mockTerminal, '');

      expect(writeToClipboardSpy).toHaveBeenCalledWith('');
      expect(mockTerminal.show).toHaveBeenCalledTimes(1);
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.terminal.paste');
    });

    it('should handle long text (130+ characters)', async () => {
      const mockTerminal = createMockTerminal();
      const longText = 'a'.repeat(150);
      const writeToClipboardSpy = jest.spyOn(adapter, 'writeTextToClipboard');
      const executeCommandSpy = jest.spyOn(adapter, 'executeCommand');

      await adapter.pasteTextToTerminalViaClipboard(mockTerminal, longText);

      expect(writeToClipboardSpy).toHaveBeenCalledWith(longText);
      expect(mockTerminal.show).toHaveBeenCalledTimes(1);
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.terminal.paste');
    });

    it('should handle multi-line text', async () => {
      const mockTerminal = createMockTerminal();
      const multiLineText = 'line1\nline2\nline3';
      const writeToClipboardSpy = jest.spyOn(adapter, 'writeTextToClipboard');
      const executeCommandSpy = jest.spyOn(adapter, 'executeCommand');

      await adapter.pasteTextToTerminalViaClipboard(mockTerminal, multiLineText);

      expect(writeToClipboardSpy).toHaveBeenCalledWith(multiLineText);
      expect(mockTerminal.show).toHaveBeenCalledTimes(1);
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.terminal.paste');
    });

    it('should throw TERMINAL_NOT_DEFINED when terminal is undefined', async () => {
      const undefinedTerminal = undefined as any;

      await expect(async () =>
        adapter.pasteTextToTerminalViaClipboard(undefinedTerminal, 'text'),
      ).toThrowRangeLinkExtensionErrorAsync('TERMINAL_NOT_DEFINED', {
        message: 'Terminal reference is not defined',
        functionName: 'VscodeAdapter.pasteTextToTerminalViaClipboard',
      });
    });

    it('should throw TERMINAL_NOT_DEFINED when terminal is null', async () => {
      const nullTerminal = null as any;

      await expect(async () =>
        adapter.pasteTextToTerminalViaClipboard(nullTerminal, 'text'),
      ).toThrowRangeLinkExtensionErrorAsync('TERMINAL_NOT_DEFINED', {
        message: 'Terminal reference is not defined',
        functionName: 'VscodeAdapter.pasteTextToTerminalViaClipboard',
      });
    });
  });

  describe('insertTextAtCursor', () => {
    it('should call editor.edit and insert text at cursor position', async () => {
      const mockEditor = {
        selection: {
          active: { line: 5, character: 10 },
        },
        edit: jest.fn().mockResolvedValue(true),
      } as any;
      const text = 'inserted text';

      const result = await adapter.insertTextAtCursor(mockEditor, text);

      expect(mockEditor.edit).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);

      // Verify the editBuilder callback was used correctly
      const editCallback = (mockEditor.edit as jest.Mock).mock.calls[0][0];
      const mockEditBuilder = {
        insert: jest.fn(),
      };
      editCallback(mockEditBuilder);
      expect(mockEditBuilder.insert).toHaveBeenCalledWith(mockEditor.selection.active, text);
    });

    it('should return false when edit fails', async () => {
      const mockEditor = {
        selection: {
          active: { line: 0, character: 0 },
        },
        edit: jest.fn().mockResolvedValue(false),
      } as any;

      const result = await adapter.insertTextAtCursor(mockEditor, 'text');

      expect(result).toBe(false);
    });

    it('should handle empty text insertion', async () => {
      const mockEditor = {
        selection: {
          active: { line: 0, character: 0 },
        },
        edit: jest.fn().mockResolvedValue(true),
      } as any;

      const result = await adapter.insertTextAtCursor(mockEditor, '');

      expect(result).toBe(true);
      const editCallback = (mockEditor.edit as jest.Mock).mock.calls[0][0];
      const mockEditBuilder = { insert: jest.fn() };
      editCallback(mockEditBuilder);
      expect(mockEditBuilder.insert).toHaveBeenCalledWith(mockEditor.selection.active, '');
    });
  });

  describe('getDocumentUri', () => {
    it('should return exact same URI reference from editor.document.uri', () => {
      const mockUri = createMockUri('/path/to/file.ts');
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
      });

      const result = adapter.getDocumentUri(mockEditor);

      // Verify it returns the exact same object reference (not a copy)
      expect(result).toBe(mockUri);
    });

    it('should return same URI when different editors share the same document URI', () => {
      const sharedUri = createMockUri('/path/to/shared.ts');
      const editor1 = createMockEditor({
        document: createMockDocument({ uri: sharedUri }),
      });
      const editor2 = createMockEditor({
        document: createMockDocument({ uri: sharedUri }),
      });

      const uri1 = adapter.getDocumentUri(editor1);
      const uri2 = adapter.getDocumentUri(editor2);

      // Both editors share the same URI reference
      expect(uri1).toBe(sharedUri);
      expect(uri2).toBe(sharedUri);
      expect(uri1).toBe(uri2);
    });

    it('should return different URIs when editors have different document URIs', () => {
      const uri1 = createMockUri('/path/to/file1.ts');
      const uri2 = createMockUri('/path/to/file2.ts');
      const editor1 = createMockEditor({
        document: createMockDocument({ uri: uri1 }),
      });
      const editor2 = createMockEditor({
        document: createMockDocument({ uri: uri2 }),
      });

      const result1 = adapter.getDocumentUri(editor1);
      const result2 = adapter.getDocumentUri(editor2);

      // Each editor has its own URI reference
      expect(result1).toBe(uri1);
      expect(result2).toBe(uri2);
      expect(result1).not.toBe(result2);
    });
  });

  describe('Extension Lifecycle Operations (commit 0140)', () => {
    describe('createOutputChannel', () => {
      it('should create output channel using VSCode API', () => {
        const channelName = 'RangeLink';
        const mockChannel = { appendLine: jest.fn(), dispose: jest.fn() };
        mockVSCode.window.createOutputChannel.mockReturnValue(mockChannel);

        const result = adapter.createOutputChannel(channelName);

        expect(mockVSCode.window.createOutputChannel).toHaveBeenCalledWith(channelName);
        expect(mockVSCode.window.createOutputChannel).toHaveBeenCalledTimes(1);
        expect(result).toBe(mockChannel);
      });

      it('should handle different channel names', () => {
        const mockChannel1 = { appendLine: jest.fn() };
        const mockChannel2 = { appendLine: jest.fn() };
        mockVSCode.window.createOutputChannel
          .mockReturnValueOnce(mockChannel1)
          .mockReturnValueOnce(mockChannel2);

        const result1 = adapter.createOutputChannel('Channel1');
        const result2 = adapter.createOutputChannel('Channel2');

        expect(mockVSCode.window.createOutputChannel).toHaveBeenCalledWith('Channel1');
        expect(mockVSCode.window.createOutputChannel).toHaveBeenCalledWith('Channel2');
        expect(result1).toBe(mockChannel1);
        expect(result2).toBe(mockChannel2);
      });

      it('should handle channel names with special characters', () => {
        const specialName = 'Range-Link: Debug (v1.0)';
        const mockChannel = { appendLine: jest.fn() };
        mockVSCode.window.createOutputChannel.mockReturnValue(mockChannel);

        adapter.createOutputChannel(specialName);

        expect(mockVSCode.window.createOutputChannel).toHaveBeenCalledWith(specialName);
      });
    });

    describe('language getter', () => {
      it('should return language from VSCode env', () => {
        mockVSCode.env.language = 'en';

        const result = adapter.language;

        expect(result).toBe('en');
      });

      it('should handle different locales', () => {
        mockVSCode.env.language = 'fr';
        expect(adapter.language).toBe('fr');

        mockVSCode.env.language = 'de';
        expect(adapter.language).toBe('de');

        mockVSCode.env.language = 'ja';
        expect(adapter.language).toBe('ja');
      });

      it('should handle regional locales', () => {
        mockVSCode.env.language = 'en-US';
        expect(adapter.language).toBe('en-US');

        mockVSCode.env.language = 'pt-BR';
        expect(adapter.language).toBe('pt-BR');
      });

      it('should be accessible multiple times', () => {
        mockVSCode.env.language = 'en';

        const result1 = adapter.language;
        const result2 = adapter.language;

        expect(result1).toBe('en');
        expect(result2).toBe('en');
      });
    });

    describe('getConfiguration', () => {
      it('should get configuration section using VSCode API', () => {
        const section = 'rangelink';
        const mockConfig = { get: jest.fn(), has: jest.fn() };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);

        const result = adapter.getConfiguration(section);

        expect(mockVSCode.workspace.getConfiguration).toHaveBeenCalledWith(section);
        expect(mockVSCode.workspace.getConfiguration).toHaveBeenCalledTimes(1);
        expect(result).toBe(mockConfig);
      });

      it('should handle different configuration sections', () => {
        const mockConfig1 = { get: jest.fn() };
        const mockConfig2 = { get: jest.fn() };
        mockVSCode.workspace.getConfiguration
          .mockReturnValueOnce(mockConfig1)
          .mockReturnValueOnce(mockConfig2);

        const result1 = adapter.getConfiguration('editor');
        const result2 = adapter.getConfiguration('workbench');

        expect(mockVSCode.workspace.getConfiguration).toHaveBeenCalledWith('editor');
        expect(mockVSCode.workspace.getConfiguration).toHaveBeenCalledWith('workbench');
        expect(result1).toBe(mockConfig1);
        expect(result2).toBe(mockConfig2);
      });

      it('should handle empty section name', () => {
        const mockConfig = { get: jest.fn() };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);

        adapter.getConfiguration('');

        expect(mockVSCode.workspace.getConfiguration).toHaveBeenCalledWith('');
      });
    });
  });

  describe('Registration Operations (commit 0140)', () => {
    describe('registerTerminalLinkProvider', () => {
      it('should register terminal link provider using VSCode API', () => {
        const mockProvider = { provideTerminalLinks: jest.fn() };
        const mockDisposable = { dispose: jest.fn() };
        mockVSCode.window.registerTerminalLinkProvider.mockReturnValue(mockDisposable);

        const result = adapter.registerTerminalLinkProvider(mockProvider as any);

        expect(mockVSCode.window.registerTerminalLinkProvider).toHaveBeenCalledWith(mockProvider);
        expect(mockVSCode.window.registerTerminalLinkProvider).toHaveBeenCalledTimes(1);
        expect(result).toBe(mockDisposable);
      });

      it('should return disposable that can be disposed', () => {
        const mockProvider = { provideTerminalLinks: jest.fn() };
        const mockDisposable = { dispose: jest.fn() };
        mockVSCode.window.registerTerminalLinkProvider.mockReturnValue(mockDisposable);

        const result = adapter.registerTerminalLinkProvider(mockProvider as any);

        expect(result.dispose).toBeDefined();
        result.dispose();
        expect(mockDisposable.dispose).toHaveBeenCalledTimes(1);
      });

      it('should handle multiple provider registrations', () => {
        const mockProvider1 = { provideTerminalLinks: jest.fn() };
        const mockProvider2 = { provideTerminalLinks: jest.fn() };
        const mockDisposable1 = { dispose: jest.fn() };
        const mockDisposable2 = { dispose: jest.fn() };
        mockVSCode.window.registerTerminalLinkProvider
          .mockReturnValueOnce(mockDisposable1)
          .mockReturnValueOnce(mockDisposable2);

        const result1 = adapter.registerTerminalLinkProvider(mockProvider1 as any);
        const result2 = adapter.registerTerminalLinkProvider(mockProvider2 as any);

        expect(result1).toBe(mockDisposable1);
        expect(result2).toBe(mockDisposable2);
        expect(mockVSCode.window.registerTerminalLinkProvider).toHaveBeenCalledTimes(2);
      });
    });

    describe('registerDocumentLinkProvider', () => {
      it('should register document link provider using VSCode API', () => {
        const mockSelector = { scheme: 'file' };
        const mockProvider = { provideDocumentLinks: jest.fn() };
        const mockDisposable = { dispose: jest.fn() };
        mockVSCode.languages.registerDocumentLinkProvider.mockReturnValue(mockDisposable);

        const result = adapter.registerDocumentLinkProvider(
          mockSelector as any,
          mockProvider as any,
        );

        expect(mockVSCode.languages.registerDocumentLinkProvider).toHaveBeenCalledWith(
          mockSelector,
          mockProvider,
        );
        expect(mockVSCode.languages.registerDocumentLinkProvider).toHaveBeenCalledTimes(1);
        expect(result).toBe(mockDisposable);
      });

      it('should handle array of document selectors', () => {
        const mockSelectors = [{ scheme: 'file' }, { scheme: 'untitled' }];
        const mockProvider = { provideDocumentLinks: jest.fn() };
        const mockDisposable = { dispose: jest.fn() };
        mockVSCode.languages.registerDocumentLinkProvider.mockReturnValue(mockDisposable);

        const result = adapter.registerDocumentLinkProvider(
          mockSelectors as any,
          mockProvider as any,
        );

        expect(mockVSCode.languages.registerDocumentLinkProvider).toHaveBeenCalledWith(
          mockSelectors,
          mockProvider,
        );
        expect(result).toBe(mockDisposable);
      });

      it('should return disposable that can be disposed', () => {
        const mockSelector = { scheme: 'file' };
        const mockProvider = { provideDocumentLinks: jest.fn() };
        const mockDisposable = { dispose: jest.fn() };
        mockVSCode.languages.registerDocumentLinkProvider.mockReturnValue(mockDisposable);

        const result = adapter.registerDocumentLinkProvider(
          mockSelector as any,
          mockProvider as any,
        );

        result.dispose();
        expect(mockDisposable.dispose).toHaveBeenCalledTimes(1);
      });
    });

    describe('registerCommand', () => {
      it('should register command using VSCode API', () => {
        const commandName = 'rangelink.copyLink';
        const callback = jest.fn();
        const mockDisposable = { dispose: jest.fn() };
        mockVSCode.commands.registerCommand.mockReturnValue(mockDisposable);

        const result = adapter.registerCommand(commandName, callback);

        expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(commandName, callback);
        expect(mockVSCode.commands.registerCommand).toHaveBeenCalledTimes(1);
        expect(result).toBe(mockDisposable);
      });

      it('should handle multiple command registrations', () => {
        const callback1 = jest.fn();
        const callback2 = jest.fn();
        const mockDisposable1 = { dispose: jest.fn() };
        const mockDisposable2 = { dispose: jest.fn() };
        mockVSCode.commands.registerCommand
          .mockReturnValueOnce(mockDisposable1)
          .mockReturnValueOnce(mockDisposable2);

        const result1 = adapter.registerCommand('rangelink.command1', callback1);
        const result2 = adapter.registerCommand('rangelink.command2', callback2);

        expect(result1).toBe(mockDisposable1);
        expect(result2).toBe(mockDisposable2);
        expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
          'rangelink.command1',
          callback1,
        );
        expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
          'rangelink.command2',
          callback2,
        );
      });

      it('should return disposable that can be disposed', () => {
        const callback = jest.fn();
        const mockDisposable = { dispose: jest.fn() };
        mockVSCode.commands.registerCommand.mockReturnValue(mockDisposable);

        const result = adapter.registerCommand('test.command', callback);

        result.dispose();
        expect(mockDisposable.dispose).toHaveBeenCalledTimes(1);
      });

      it('should register callback that can be invoked', () => {
        const callback = jest.fn().mockReturnValue('result');
        mockVSCode.commands.registerCommand.mockImplementation(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (_: any, cb: any) => {
            cb(); // Simulate VSCode calling the command
            return { dispose: jest.fn() };
          },
        );

        adapter.registerCommand('test.command', callback);

        expect(callback).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('showInformationMessage with action buttons (commit 0140)', () => {
    it('should show information message without buttons', async () => {
      const message = 'Test message';

      await adapter.showInformationMessage(message);

      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(message);
      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledTimes(1);
    });

    it('should show information message with single button', async () => {
      const message = 'Test message';
      const button = 'OK';

      await adapter.showInformationMessage(message, button);

      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(message, button);
    });

    it('should show information message with multiple buttons', async () => {
      const message = 'Commit hash: abc123';
      const button1 = 'Copy Commit Hash';
      const button2 = 'Close';

      await adapter.showInformationMessage(message, button1, button2);

      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        message,
        button1,
        button2,
      );
    });

    it('should return button text when button is clicked', async () => {
      const buttonText = 'Copy Commit Hash';
      (mockVSCode.window.showInformationMessage as jest.Mock).mockResolvedValue(buttonText);

      const result = await adapter.showInformationMessage('Message', buttonText);

      expect(result).toBe(buttonText);
    });

    it('should return undefined when no button is clicked', async () => {
      (mockVSCode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

      const result = await adapter.showInformationMessage('Message', 'Button');

      expect(result).toBeUndefined();
    });

    it('should handle empty buttons array', async () => {
      const message = 'Test message';

      await adapter.showInformationMessage(message);

      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(message);
    });
  });

  describe('findOpenUntitledFile', () => {
    it('should find untitled file with matching display name (test format)', () => {
      const mockDoc1 = createMockDocument({ uri: createMockUntitledUri('untitled:/1') });
      const mockDoc2 = createMockDocument({ uri: createMockUri('/workspace/file.ts') });
      const mockDoc3 = createMockDocument({ uri: createMockUntitledUri('untitled:/2') });
      mockVSCode.workspace.textDocuments = [mockDoc1, mockDoc2, mockDoc3];

      const result = adapter.findOpenUntitledFile('Untitled-1');

      expect(result?.toString()).toBe('untitled:/1');
    });

    it('should find untitled file with matching display name (actual format)', () => {
      const mockDoc1 = createMockDocument({ uri: createMockUntitledUri('untitled:Untitled-1') });
      const mockDoc2 = createMockDocument({ uri: createMockUri('/workspace/file.ts') });
      mockVSCode.workspace.textDocuments = [mockDoc1, mockDoc2];

      const result = adapter.findOpenUntitledFile('Untitled-1');

      expect(result?.toString()).toBe('untitled:Untitled-1');
    });

    it('should return undefined when no untitled files are open', () => {
      const mockDoc1 = createMockDocument({ uri: createMockUri('file:///workspace/file1.ts') });
      const mockDoc2 = createMockDocument({ uri: createMockUri('file:///workspace/file2.ts') });
      mockVSCode.workspace.textDocuments = [mockDoc1, mockDoc2];

      const result = adapter.findOpenUntitledFile('Untitled-1');

      expect(result).toBeUndefined();
    });

    it('should return undefined when display name does not match', () => {
      const mockDoc1 = createMockDocument({ uri: createMockUntitledUri('untitled:/1') });
      const mockDoc2 = createMockDocument({ uri: createMockUntitledUri('untitled:/2') });
      mockVSCode.workspace.textDocuments = [mockDoc1, mockDoc2];

      const result = adapter.findOpenUntitledFile('Untitled-3');

      expect(result).toBeUndefined();
    });

    it('should return first match when multiple files have same display name', () => {
      // Edge case: multiple untitled files with same display name (unlikely but possible)
      const mockDoc1 = createMockDocument({ uri: createMockUntitledUri('untitled:/1') });
      const mockDoc2 = createMockDocument({ uri: createMockUntitledUri('untitled:Untitled-1') });
      mockVSCode.workspace.textDocuments = [mockDoc1, mockDoc2];

      const result = adapter.findOpenUntitledFile('Untitled-1');

      // Should return first match
      expect(result?.toString()).toBe('untitled:/1');
    });

    it('should filter out non-untitled documents', () => {
      const mockDoc1 = createMockDocument({ uri: createMockUri('/workspace/file.ts') });
      const mockDoc2 = createMockDocument({ uri: createMockUri('/example') });
      const mockDoc3 = createMockDocument({ uri: createMockUntitledUri('untitled:/1') });
      mockVSCode.workspace.textDocuments = [mockDoc1, mockDoc2, mockDoc3];

      const result = adapter.findOpenUntitledFile('Untitled-1');

      expect(result?.toString()).toBe('untitled:/1');
    });

    it('should handle empty document list', () => {
      mockVSCode.workspace.textDocuments = [];

      const result = adapter.findOpenUntitledFile('Untitled-1');

      expect(result).toBeUndefined();
    });

    it('should handle lowercase path: untitled:untitled-1 (case-insensitive)', () => {
      const mockDoc = createMockDocument({ uri: createMockUntitledUri('untitled:untitled-1') });
      mockVSCode.workspace.textDocuments = [mockDoc];

      // With case-insensitive matching, "untitled-1" is the display name (no "Untitled-" prefix added)
      const result = adapter.findOpenUntitledFile('untitled-1');

      expect(result?.toString()).toBe('untitled:untitled-1');
    });
  });

  describe('getExtension', () => {
    it('should return extension when it exists', () => {
      const customAdapter = createMockVscodeAdapter({
        extensionsOptions: [
          {
            id: 'test.extension',
            extensionUri: createMockUri('/path/to/extension'),
            extensionPath: '/path/to/extension',
          },
        ],
      });

      const result = customAdapter.getExtension('test.extension');

      expect(result).toBeDefined();
      expect(result?.id).toBe('test.extension');
      expect(result?.extensionPath).toBe('/path/to/extension');
      expect(result?.isActive).toBe(true); // Default from createMockExtension
    });

    it('should return undefined when extension does not exist', () => {
      const customAdapter = createMockVscodeAdapter(); // No extensions

      const result = customAdapter.getExtension('nonexistent.extension');

      expect(result).toBeUndefined();
    });

    it('should return correct extension by exact extensionId', () => {
      const customAdapter = createMockVscodeAdapter({
        extensionsOptions: ['anthropic.claude-code', 'github.copilot'],
      });

      const result = customAdapter.getExtension('anthropic.claude-code');

      expect(result).toBeDefined();
      expect(result?.id).toBe('anthropic.claude-code');
    });

    it('should handle special characters in extensionId', () => {
      const extensionId = 'publisher.extension-with-dash_and_underscore';
      const customAdapter = createMockVscodeAdapter({
        extensionsOptions: [extensionId],
      });

      const result = customAdapter.getExtension(extensionId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(extensionId);
    });
  });
});
