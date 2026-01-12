import { VscodeAdapter } from '../../../ide/vscode/VscodeAdapter';
import { BehaviourAfterPaste } from '../../../types/BehaviourAfterPaste';
import { TerminalFocusType } from '../../../types/TerminalFocusType';
import * as resolveWorkspacePathModule from '../../../utils/resolveWorkspacePath';
import {
  createMockDocument,
  createMockEditor,
  createMockTab,
  createMockTabGroup,
  createMockTabGroups,
  createMockTerminal,
  createMockUntitledUri,
  createMockUri,
  createMockVscodeAdapter,
  type VscodeAdapterWithTestHooks,
} from '../../helpers';

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

    it('should pass action items to VSCode API and return selected item', async () => {
      (mockVSCode.window.showWarningMessage as jest.Mock).mockResolvedValue('Yes');

      const result = await adapter.showWarningMessage('Delete this?', 'Yes', 'No');

      expect(mockVSCode.window.showWarningMessage).toHaveBeenCalledWith('Delete this?', 'Yes', 'No');
      expect(result).toBe('Yes');
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

  describe('showInputBox', () => {
    it('should show input box with options', async () => {
      const options = {
        prompt: 'Enter a label',
        value: 'default',
        placeHolder: 'Type here...',
      };
      (mockVSCode.window.showInputBox as jest.Mock).mockResolvedValue('user input');

      const result = await adapter.showInputBox(options);

      expect(mockVSCode.window.showInputBox).toHaveBeenCalledWith(options);
      expect(mockVSCode.window.showInputBox).toHaveBeenCalledTimes(1);
      expect(result).toBe('user input');
    });

    it('should return undefined when user cancels', async () => {
      (mockVSCode.window.showInputBox as jest.Mock).mockResolvedValue(undefined);

      const result = await adapter.showInputBox({ prompt: 'test' });

      expect(result).toBeUndefined();
    });

    it('should return empty string when user clears input and confirms', async () => {
      (mockVSCode.window.showInputBox as jest.Mock).mockResolvedValue('');

      const result = await adapter.showInputBox({ prompt: 'test' });

      expect(result).toBe('');
    });

    it('should work without options', async () => {
      (mockVSCode.window.showInputBox as jest.Mock).mockResolvedValue('input');

      const result = await adapter.showInputBox();

      expect(mockVSCode.window.showInputBox).toHaveBeenCalledWith(undefined);
      expect(result).toBe('input');
    });
  });

  describe('createQuickPick', () => {
    it('should create QuickPick instance using VSCode API', () => {
      const quickPick = adapter.createQuickPick();

      expect(mockVSCode.window.createQuickPick).toHaveBeenCalledTimes(1);
      expect(quickPick).toBeDefined();
    });

    it('should return QuickPick with configurable properties', () => {
      const quickPick = adapter.createQuickPick();

      quickPick.title = 'Test Title';
      quickPick.placeholder = 'Select an item';
      quickPick.items = [{ label: 'Item 1' }, { label: 'Item 2' }];

      expect(quickPick.title).toBe('Test Title');
      expect(quickPick.placeholder).toBe('Select an item');
      expect(quickPick.items).toStrictEqual([{ label: 'Item 1' }, { label: 'Item 2' }]);
    });

    it('should return QuickPick with show, hide, and dispose methods', () => {
      const quickPick = adapter.createQuickPick();

      expect(typeof quickPick.show).toBe('function');
      expect(typeof quickPick.hide).toBe('function');
      expect(typeof quickPick.dispose).toBe('function');
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
      // Capture the callback passed to edit()
      let capturedCallback: ((builder: { insert: jest.Mock }) => void) | undefined;
      const mockEditor = {
        selection: {
          active: { line: 5, character: 10 },
        },
        edit: jest.fn().mockImplementation((callback) => {
          capturedCallback = callback;
          return Promise.resolve(true);
        }),
      } as any;
      const text = 'inserted text';

      const result = await adapter.insertTextAtCursor(mockEditor, text);

      expect(mockEditor.edit).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);

      // Verify the editBuilder callback was used correctly
      expect(capturedCallback).toBeDefined();
      const mockEditBuilder = {
        insert: jest.fn(),
      };
      capturedCallback!(mockEditBuilder);
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
      let capturedCallback: ((builder: { insert: jest.Mock }) => void) | undefined;
      const mockEditor = {
        selection: {
          active: { line: 0, character: 0 },
        },
        edit: jest.fn().mockImplementation((callback) => {
          capturedCallback = callback;
          return Promise.resolve(true);
        }),
      } as any;

      const result = await adapter.insertTextAtCursor(mockEditor, '');

      expect(result).toBe(true);
      expect(capturedCallback).toBeDefined();
      const mockEditBuilder = { insert: jest.fn() };
      capturedCallback!(mockEditBuilder);
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

  describe('getDocumentScheme', () => {
    it('returns scheme from editor document URI', () => {
      const mockUri = createMockUri('/path/to/file.ts', { scheme: 'file' });
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
      });

      const result = adapter.getDocumentScheme(mockEditor);

      expect(result).toBe('file');
    });

    it('returns untitled scheme for new unsaved files', () => {
      const mockUri = createMockUri('Untitled-1', { scheme: 'untitled' });
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
      });

      const result = adapter.getDocumentScheme(mockEditor);

      expect(result).toBe('untitled');
    });

    it('returns git scheme for diff views', () => {
      const mockUri = createMockUri('/repo/file.ts', { scheme: 'git' });
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
      });

      const result = adapter.getDocumentScheme(mockEditor);

      expect(result).toBe('git');
    });

    it('returns output scheme for output panel', () => {
      const mockUri = createMockUri('/output/channel', { scheme: 'output' });
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
      });

      const result = adapter.getDocumentScheme(mockEditor);

      expect(result).toBe('output');
    });
  });

  describe('getFilenameFromUri', () => {
    it('extracts filename from Unix-style path', () => {
      const mockUri = createMockUri('/workspace/src/auth.ts');

      const result = adapter.getFilenameFromUri(mockUri);

      expect(result).toBe('auth.ts');
    });

    it('extracts filename from Windows-style path', () => {
      const mockUri = { fsPath: 'C:\\Users\\dev\\project\\index.js' } as any;

      const result = adapter.getFilenameFromUri(mockUri);

      expect(result).toBe('index.js');
    });

    it('handles deeply nested Unix paths', () => {
      const mockUri = createMockUri('/a/b/c/d/e/f/deeply-nested.tsx');

      const result = adapter.getFilenameFromUri(mockUri);

      expect(result).toBe('deeply-nested.tsx');
    });

    it('handles deeply nested Windows paths', () => {
      const mockUri = { fsPath: 'C:\\a\\b\\c\\d\\e\\f\\deeply-nested.tsx' } as any;

      const result = adapter.getFilenameFromUri(mockUri);

      expect(result).toBe('deeply-nested.tsx');
    });

    it('returns "Unknown" for empty fsPath', () => {
      const mockUri = { fsPath: '' } as any;

      const result = adapter.getFilenameFromUri(mockUri);

      expect(result).toBe('Unknown');
    });

    it('returns "Unknown" for undefined uri', () => {
      const result = adapter.getFilenameFromUri(undefined as any);

      expect(result).toBe('Unknown');
    });

    it('returns "Unknown" for null uri', () => {
      const result = adapter.getFilenameFromUri(null as any);

      expect(result).toBe('Unknown');
    });

    it('returns "Unknown" for undefined fsPath', () => {
      const mockUri = { fsPath: undefined } as any;

      const result = adapter.getFilenameFromUri(mockUri);

      expect(result).toBe('Unknown');
    });

    it('handles filename-only path (no directory)', () => {
      const mockUri = createMockUri('standalone.ts');

      const result = adapter.getFilenameFromUri(mockUri);

      expect(result).toBe('standalone.ts');
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

  describe('showTextDocument', () => {
    it('should open document and show in editor with basic URI', async () => {
      const mockUri = createMockUri('/workspace/file.ts');
      const mockDocument = createMockDocument({ uri: mockUri });
      const mockEditor = createMockEditor({ document: mockDocument });

      mockVSCode.workspace.openTextDocument.mockResolvedValue(mockDocument);
      mockVSCode.window.showTextDocument.mockResolvedValue(mockEditor);

      const result = await adapter.showTextDocument(mockUri);

      expect(mockVSCode.workspace.openTextDocument).toHaveBeenCalledWith(mockUri);
      expect(mockVSCode.workspace.openTextDocument).toHaveBeenCalledTimes(1);
      expect(mockVSCode.window.showTextDocument).toHaveBeenCalledWith(mockDocument, undefined);
      expect(mockVSCode.window.showTextDocument).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockEditor);
    });

    it('should open document with preserveFocus option set to true', async () => {
      const mockUri = createMockUri('/workspace/file.ts');
      const mockDocument = createMockDocument({ uri: mockUri });
      const mockEditor = createMockEditor({ document: mockDocument });

      mockVSCode.workspace.openTextDocument.mockResolvedValue(mockDocument);
      mockVSCode.window.showTextDocument.mockResolvedValue(mockEditor);

      const options = { preserveFocus: true };
      const result = await adapter.showTextDocument(mockUri, options);

      expect(mockVSCode.workspace.openTextDocument).toHaveBeenCalledWith(mockUri);
      expect(mockVSCode.window.showTextDocument).toHaveBeenCalledWith(mockDocument, options);
      expect(result).toBe(mockEditor);
    });

    it('should open document with preserveFocus option set to false', async () => {
      const mockUri = createMockUri('/workspace/file.ts');
      const mockDocument = createMockDocument({ uri: mockUri });
      const mockEditor = createMockEditor({ document: mockDocument });

      mockVSCode.workspace.openTextDocument.mockResolvedValue(mockDocument);
      mockVSCode.window.showTextDocument.mockResolvedValue(mockEditor);

      const options = { preserveFocus: false };
      const result = await adapter.showTextDocument(mockUri, options);

      expect(mockVSCode.workspace.openTextDocument).toHaveBeenCalledWith(mockUri);
      expect(mockVSCode.window.showTextDocument).toHaveBeenCalledWith(mockDocument, options);
      expect(result).toBe(mockEditor);
    });

    it('should open document with selection option to highlight range', async () => {
      const mockUri = createMockUri('/workspace/file.ts');
      const mockDocument = createMockDocument({ uri: mockUri });
      const mockEditor = createMockEditor({ document: mockDocument });

      mockVSCode.workspace.openTextDocument.mockResolvedValue(mockDocument);
      mockVSCode.window.showTextDocument.mockResolvedValue(mockEditor);

      const mockRange = {
        start: { line: 10, character: 5 },
        end: { line: 15, character: 10 },
      };
      const options = { selection: mockRange as any };
      const result = await adapter.showTextDocument(mockUri, options);

      expect(mockVSCode.workspace.openTextDocument).toHaveBeenCalledWith(mockUri);
      expect(mockVSCode.window.showTextDocument).toHaveBeenCalledWith(mockDocument, options);
      expect(result).toBe(mockEditor);
    });

    it('should open document in specific editor column', async () => {
      const mockUri = createMockUri('/workspace/file.ts');
      const mockDocument = createMockDocument({ uri: mockUri });
      const mockEditor = createMockEditor({ document: mockDocument });

      mockVSCode.workspace.openTextDocument.mockResolvedValue(mockDocument);
      mockVSCode.window.showTextDocument.mockResolvedValue(mockEditor);

      const options = { viewColumn: 2 }; // Open in second editor column
      const result = await adapter.showTextDocument(mockUri, options);

      expect(mockVSCode.workspace.openTextDocument).toHaveBeenCalledWith(mockUri);
      expect(mockVSCode.window.showTextDocument).toHaveBeenCalledWith(mockDocument, options);
      expect(result).toBe(mockEditor);
    });

    it('should open document in preview mode', async () => {
      const mockUri = createMockUri('/workspace/file.ts');
      const mockDocument = createMockDocument({ uri: mockUri });
      const mockEditor = createMockEditor({ document: mockDocument });

      mockVSCode.workspace.openTextDocument.mockResolvedValue(mockDocument);
      mockVSCode.window.showTextDocument.mockResolvedValue(mockEditor);

      const options = { preview: true };
      const result = await adapter.showTextDocument(mockUri, options);

      expect(mockVSCode.workspace.openTextDocument).toHaveBeenCalledWith(mockUri);
      expect(mockVSCode.window.showTextDocument).toHaveBeenCalledWith(mockDocument, options);
      expect(result).toBe(mockEditor);
    });

    it('should open document with multiple options combined', async () => {
      const mockUri = createMockUri('/workspace/file.ts');
      const mockDocument = createMockDocument({ uri: mockUri });
      const mockEditor = createMockEditor({ document: mockDocument });

      mockVSCode.workspace.openTextDocument.mockResolvedValue(mockDocument);
      mockVSCode.window.showTextDocument.mockResolvedValue(mockEditor);

      const mockRange = {
        start: { line: 5, character: 0 },
        end: { line: 5, character: 10 },
      };
      const options = {
        preserveFocus: false,
        preview: false,
        viewColumn: 1,
        selection: mockRange as any,
      };
      const result = await adapter.showTextDocument(mockUri, options);

      expect(mockVSCode.workspace.openTextDocument).toHaveBeenCalledWith(mockUri);
      expect(mockVSCode.window.showTextDocument).toHaveBeenCalledWith(mockDocument, options);
      expect(result).toBe(mockEditor);
    });

    it('should open untitled document', async () => {
      const mockUri = createMockUntitledUri('untitled:Untitled-1');
      const mockDocument = createMockDocument({ uri: mockUri });
      const mockEditor = createMockEditor({ document: mockDocument });

      mockVSCode.workspace.openTextDocument.mockResolvedValue(mockDocument);
      mockVSCode.window.showTextDocument.mockResolvedValue(mockEditor);

      const result = await adapter.showTextDocument(mockUri);

      expect(mockVSCode.workspace.openTextDocument).toHaveBeenCalledWith(mockUri);
      expect(mockVSCode.window.showTextDocument).toHaveBeenCalledWith(mockDocument, undefined);
      expect(result).toBe(mockEditor);
    });

    it('should open already-open document', async () => {
      const mockUri = createMockUri('/workspace/file.ts');
      const mockDocument = createMockDocument({ uri: mockUri });
      const mockEditor = createMockEditor({ document: mockDocument });

      // Simulate document already being open (VSCode returns same document instance)
      mockVSCode.workspace.openTextDocument.mockResolvedValue(mockDocument);
      mockVSCode.window.showTextDocument.mockResolvedValue(mockEditor);

      const result = await adapter.showTextDocument(mockUri);

      expect(mockVSCode.workspace.openTextDocument).toHaveBeenCalledWith(mockUri);
      expect(mockVSCode.window.showTextDocument).toHaveBeenCalledWith(mockDocument, undefined);
      expect(result).toBe(mockEditor);
    });

    it('should verify two-step process: openTextDocument then showTextDocument', async () => {
      const mockUri = createMockUri('/workspace/file.ts');
      const mockDocument = createMockDocument({ uri: mockUri });
      const mockEditor = createMockEditor({ document: mockDocument });

      const openDocSpy = jest
        .spyOn(mockVSCode.workspace, 'openTextDocument')
        .mockResolvedValue(mockDocument);
      const showDocSpy = jest
        .spyOn(mockVSCode.window, 'showTextDocument')
        .mockResolvedValue(mockEditor);

      await adapter.showTextDocument(mockUri);

      // Verify order: openTextDocument called before showTextDocument
      expect(openDocSpy).toHaveBeenCalledTimes(1);
      expect(showDocSpy).toHaveBeenCalledTimes(1);

      // Verify the document from openTextDocument is passed to showTextDocument
      expect(showDocSpy).toHaveBeenCalledWith(mockDocument, undefined);
    });

    it('should return TextEditor instance with correct document reference', async () => {
      const mockUri = createMockUri('/workspace/file.ts');
      const mockDocument = createMockDocument({ uri: mockUri });
      const mockEditor = createMockEditor({ document: mockDocument });

      mockVSCode.workspace.openTextDocument.mockResolvedValue(mockDocument);
      mockVSCode.window.showTextDocument.mockResolvedValue(mockEditor);

      const result = await adapter.showTextDocument(mockUri);

      expect(result).toBe(mockEditor);
      expect(result.document).toBe(mockDocument);
      expect(result.document.uri).toBe(mockUri);
    });
  });

  describe('executeCommand', () => {
    it('should execute command without arguments', async () => {
      const commandId = 'workbench.action.files.save';
      mockVSCode.commands.executeCommand.mockResolvedValue(undefined);

      const result = await adapter.executeCommand(commandId);

      expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(commandId);
      expect(mockVSCode.commands.executeCommand).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('should execute command with single argument', async () => {
      const commandId = 'vscode.open';
      const arg = createMockUri('/workspace/file.ts');
      mockVSCode.commands.executeCommand.mockResolvedValue(undefined);

      const result = await adapter.executeCommand(commandId, arg);

      expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(commandId, arg);
      expect(mockVSCode.commands.executeCommand).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('should execute command with multiple arguments', async () => {
      const commandId = 'editor.action.insertSnippet';
      const arg1 = { snippet: 'console.log($1)' };
      const arg2 = { languageId: 'typescript' };
      mockVSCode.commands.executeCommand.mockResolvedValue(undefined);

      const result = await adapter.executeCommand(commandId, arg1, arg2);

      expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(commandId, arg1, arg2);
      expect(mockVSCode.commands.executeCommand).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('should forward return value from VSCode command', async () => {
      const commandId = 'vscode.executeCommand';
      const expectedReturn = { success: true, data: 'test data' };
      mockVSCode.commands.executeCommand.mockResolvedValue(expectedReturn);

      const result = await adapter.executeCommand(commandId);

      expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(commandId);
      expect(result).toStrictEqual(expectedReturn);
    });

    it('should execute workbench action command', async () => {
      const commandId = 'workbench.action.terminal.paste';
      mockVSCode.commands.executeCommand.mockResolvedValue(undefined);

      const result = await adapter.executeCommand(commandId);

      expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(commandId);
      expect(result).toBeUndefined();
    });

    it('should execute rangelink command', async () => {
      const commandId = 'rangelink.copyLink';
      mockVSCode.commands.executeCommand.mockResolvedValue(undefined);

      const result = await adapter.executeCommand(commandId);

      expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(commandId);
      expect(result).toBeUndefined();
    });

    it('should execute command with typed result', async () => {
      const commandId = 'vscode.executeDocumentSymbolProvider';
      interface SymbolInfo {
        name: string;
        kind: number;
      }
      const typedResult: SymbolInfo[] = [
        { name: 'myFunction', kind: 12 },
        { name: 'myVariable', kind: 13 },
      ];
      mockVSCode.commands.executeCommand.mockResolvedValue(typedResult);

      const result = await adapter.executeCommand<SymbolInfo[]>(commandId);

      expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(commandId);
      expect(result).toStrictEqual(typedResult);
    });

    it('should execute command that returns undefined', async () => {
      const commandId = 'editor.action.formatDocument';
      mockVSCode.commands.executeCommand.mockResolvedValue(undefined);

      const result = await adapter.executeCommand(commandId);

      expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(commandId);
      expect(result).toBeUndefined();
    });

    it('should execute command that returns string', async () => {
      const commandId = 'vscode.executeCommand';
      const stringResult = 'command executed successfully';
      mockVSCode.commands.executeCommand.mockResolvedValue(stringResult);

      const result = await adapter.executeCommand<string>(commandId);

      expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(commandId);
      expect(result).toBe(stringResult);
    });

    it('should execute command that returns number', async () => {
      const commandId = 'custom.getCount';
      const numberResult = 42;
      mockVSCode.commands.executeCommand.mockResolvedValue(numberResult);

      const result = await adapter.executeCommand<number>(commandId);

      expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(commandId);
      expect(result).toBe(numberResult);
    });

    it('should execute command that returns boolean', async () => {
      const commandId = 'custom.checkStatus';
      const boolResult = true;
      mockVSCode.commands.executeCommand.mockResolvedValue(boolResult);

      const result = await adapter.executeCommand<boolean>(commandId);

      expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(commandId);
      expect(result).toBe(boolResult);
    });
  });

  describe('parseUri', () => {
    it('should parse file:// URI using VSCode API', () => {
      const uriString = 'file:///workspace/file.ts';
      const mockParsedUri = {
        scheme: 'file',
        path: '/workspace/file.ts',
        fsPath: '/workspace/file.ts',
        toString: () => uriString,
      };

      mockVSCode.Uri.parse.mockReturnValue(mockParsedUri);

      const result = adapter.parseUri(uriString);

      expect(mockVSCode.Uri.parse).toHaveBeenCalledWith(uriString);
      expect(mockVSCode.Uri.parse).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockParsedUri);
    });

    it('should parse untitled: URI', () => {
      const uriString = 'untitled:Untitled-1';
      const mockParsedUri = {
        scheme: 'untitled',
        path: 'Untitled-1',
        fsPath: 'Untitled-1',
        toString: () => uriString,
      };

      mockVSCode.Uri.parse.mockReturnValue(mockParsedUri);

      const result = adapter.parseUri(uriString);

      expect(mockVSCode.Uri.parse).toHaveBeenCalledWith(uriString);
      expect(result).toStrictEqual(mockParsedUri);
    });

    it('should parse custom scheme URI (vscode:)', () => {
      const uriString = 'vscode://settings/editor';
      const mockParsedUri = {
        scheme: 'vscode',
        path: '/settings/editor',
        toString: () => uriString,
      };

      mockVSCode.Uri.parse.mockReturnValue(mockParsedUri);

      const result = adapter.parseUri(uriString);

      expect(mockVSCode.Uri.parse).toHaveBeenCalledWith(uriString);
      expect(result).toStrictEqual(mockParsedUri);
    });

    it('should parse custom scheme URI (command:)', () => {
      const uriString = 'command:workbench.action.openSettings';
      const mockParsedUri = {
        scheme: 'command',
        path: 'workbench.action.openSettings',
        toString: () => uriString,
      };

      mockVSCode.Uri.parse.mockReturnValue(mockParsedUri);

      const result = adapter.parseUri(uriString);

      expect(mockVSCode.Uri.parse).toHaveBeenCalledWith(uriString);
      expect(result).toStrictEqual(mockParsedUri);
    });

    it('should parse URI with query parameters', () => {
      const uriString = 'file:///workspace/file.ts?line=10&column=5';
      const mockParsedUri = {
        scheme: 'file',
        path: '/workspace/file.ts',
        query: 'line=10&column=5',
        fsPath: '/workspace/file.ts',
        toString: () => uriString,
      };

      mockVSCode.Uri.parse.mockReturnValue(mockParsedUri);

      const result = adapter.parseUri(uriString);

      expect(mockVSCode.Uri.parse).toHaveBeenCalledWith(uriString);
      expect(result.query).toBe('line=10&column=5');
    });

    it('should parse URI with fragments', () => {
      const uriString = 'file:///workspace/file.ts#L10-L20';
      const mockParsedUri = {
        scheme: 'file',
        path: '/workspace/file.ts',
        fragment: 'L10-L20',
        fsPath: '/workspace/file.ts',
        toString: () => uriString,
      };

      mockVSCode.Uri.parse.mockReturnValue(mockParsedUri);

      const result = adapter.parseUri(uriString);

      expect(mockVSCode.Uri.parse).toHaveBeenCalledWith(uriString);
      expect(result.fragment).toBe('L10-L20');
    });

    it('should parse URI with both query and fragment', () => {
      const uriString = 'file:///workspace/file.ts?foo=bar#section';
      const mockParsedUri = {
        scheme: 'file',
        path: '/workspace/file.ts',
        query: 'foo=bar',
        fragment: 'section',
        fsPath: '/workspace/file.ts',
        toString: () => uriString,
      };

      mockVSCode.Uri.parse.mockReturnValue(mockParsedUri);

      const result = adapter.parseUri(uriString);

      expect(mockVSCode.Uri.parse).toHaveBeenCalledWith(uriString);
      expect(result.query).toBe('foo=bar');
      expect(result.fragment).toBe('section');
    });
  });

  describe('createDocumentLink', () => {
    it('should create document link with range only (no target)', () => {
      const mockRange = adapter.createRange(
        adapter.createPosition(10, 0),
        adapter.createPosition(10, 20),
      );

      const result = adapter.createDocumentLink(mockRange);

      expect(mockVSCode.DocumentLink).toHaveBeenCalledWith(mockRange, undefined);
      expect(mockVSCode.DocumentLink).toHaveBeenCalledTimes(1);
      expect(result.range).toBe(mockRange);
      expect(result.target).toBeUndefined();
    });

    it('should create document link with range and target URI', () => {
      const mockRange = adapter.createRange(
        adapter.createPosition(5, 10),
        adapter.createPosition(5, 30),
      );
      const mockTargetUri = createMockUri('file:///workspace/target.ts');

      const result = adapter.createDocumentLink(mockRange, mockTargetUri);

      expect(mockVSCode.DocumentLink).toHaveBeenCalledWith(mockRange, mockTargetUri);
      expect(result.range).toBe(mockRange);
      expect(result.target).toBe(mockTargetUri);
    });

    it('should create document link with single-line range', () => {
      const mockRange = adapter.createRange(
        adapter.createPosition(15, 5),
        adapter.createPosition(15, 25),
      );

      const result = adapter.createDocumentLink(mockRange);

      expect(result.range).toStrictEqual({
        start: { line: 15, character: 5 },
        end: { line: 15, character: 25 },
      });
    });

    it('should create document link with multi-line range', () => {
      const mockRange = adapter.createRange(
        adapter.createPosition(10, 0),
        adapter.createPosition(20, 10),
      );
      const mockTargetUri = createMockUri('file:///workspace/file.ts');

      const result = adapter.createDocumentLink(mockRange, mockTargetUri);

      expect(result.range).toStrictEqual({
        start: { line: 10, character: 0 },
        end: { line: 20, character: 10 },
      });
      expect(result.target).toBe(mockTargetUri);
    });

    it('should create document link with different target URI schemes', () => {
      const mockRange = adapter.createRange(
        adapter.createPosition(0, 0),
        adapter.createPosition(0, 10),
      );
      const mockTargetUri = createMockUri('command:workbench.action.openSettings');

      const result = adapter.createDocumentLink(mockRange, mockTargetUri);

      expect(mockVSCode.DocumentLink).toHaveBeenCalledWith(mockRange, mockTargetUri);
      expect(result.target).toBe(mockTargetUri);
    });

    it('should verify DocumentLink properties are properly initialized', () => {
      const mockRange = adapter.createRange(
        adapter.createPosition(1, 2),
        adapter.createPosition(3, 4),
      );
      const mockTargetUri = createMockUri('file:///test.ts');

      const result = adapter.createDocumentLink(mockRange, mockTargetUri);

      expect(result.range).toBe(mockRange);
      expect(result.target).toBe(mockTargetUri);
      expect(result.tooltip).toBeUndefined();
    });
  });

  describe('getWorkspaceFolder', () => {
    it('should get workspace folder for file inside workspace', () => {
      const mockUri = createMockUri('/workspace/src/file.ts');
      const mockWorkspaceFolder = {
        uri: createMockUri('/workspace'),
        name: 'workspace',
        index: 0,
      };

      mockVSCode.workspace.getWorkspaceFolder.mockReturnValue(mockWorkspaceFolder);

      const result = adapter.getWorkspaceFolder(mockUri);

      expect(mockVSCode.workspace.getWorkspaceFolder).toHaveBeenCalledWith(mockUri);
      expect(mockVSCode.workspace.getWorkspaceFolder).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockWorkspaceFolder);
    });

    it('should return undefined for file outside workspace', () => {
      const mockUri = createMockUri('/outside/file.ts');

      mockVSCode.workspace.getWorkspaceFolder.mockReturnValue(undefined);

      const result = adapter.getWorkspaceFolder(mockUri);

      expect(mockVSCode.workspace.getWorkspaceFolder).toHaveBeenCalledWith(mockUri);
      expect(result).toBeUndefined();
    });

    it('should handle URI with multiple workspace folders (monorepo)', () => {
      const mockUri = createMockUri('/workspace/packages/core/src/file.ts');
      const mockWorkspaceFolder = {
        uri: createMockUri('/workspace/packages/core'),
        name: 'core',
        index: 1,
      };

      mockVSCode.workspace.getWorkspaceFolder.mockReturnValue(mockWorkspaceFolder);

      const result = adapter.getWorkspaceFolder(mockUri);

      expect(mockVSCode.workspace.getWorkspaceFolder).toHaveBeenCalledWith(mockUri);
      expect(result).toStrictEqual(mockWorkspaceFolder);
      expect(result?.name).toBe('core');
      expect(result?.index).toBe(1);
    });

    it('should delegate to vscode.workspace.getWorkspaceFolder', () => {
      const mockUri = createMockUri('/workspace/test.ts');
      const mockFolder = {
        uri: createMockUri('/workspace'),
        name: 'workspace',
        index: 0,
      };

      mockVSCode.workspace.getWorkspaceFolder.mockReturnValue(mockFolder);

      adapter.getWorkspaceFolder(mockUri);

      expect(mockVSCode.workspace.getWorkspaceFolder).toHaveBeenCalledWith(mockUri);
      expect(mockVSCode.workspace.getWorkspaceFolder).toHaveBeenCalledTimes(1);
    });
  });

  describe('asRelativePath', () => {
    it('should convert absolute path to relative without workspace folder name', () => {
      const absolutePath = '/workspace/src/file.ts';
      const relativePath = 'src/file.ts';

      mockVSCode.workspace.asRelativePath.mockReturnValue(relativePath);

      const result = adapter.asRelativePath(absolutePath);

      expect(mockVSCode.workspace.asRelativePath).toHaveBeenCalledWith(absolutePath, undefined);
      expect(mockVSCode.workspace.asRelativePath).toHaveBeenCalledTimes(1);
      expect(result).toBe(relativePath);
    });

    it('should convert absolute path to relative with workspace folder name', () => {
      const absolutePath = '/workspace/src/file.ts';
      const relativePath = 'workspace/src/file.ts';

      mockVSCode.workspace.asRelativePath.mockReturnValue(relativePath);

      const result = adapter.asRelativePath(absolutePath, true);

      expect(mockVSCode.workspace.asRelativePath).toHaveBeenCalledWith(absolutePath, true);
      expect(result).toBe(relativePath);
    });

    it('should convert absolute path to relative with includeWorkspaceFolder false', () => {
      const absolutePath = '/workspace/src/file.ts';
      const relativePath = 'src/file.ts';

      mockVSCode.workspace.asRelativePath.mockReturnValue(relativePath);

      const result = adapter.asRelativePath(absolutePath, false);

      expect(mockVSCode.workspace.asRelativePath).toHaveBeenCalledWith(absolutePath, false);
      expect(result).toBe(relativePath);
    });

    it('should convert URI to relative path', () => {
      const mockUri = createMockUri('/workspace/src/file.ts');
      const relativePath = 'src/file.ts';

      mockVSCode.workspace.asRelativePath.mockReturnValue(relativePath);

      const result = adapter.asRelativePath(mockUri);

      expect(mockVSCode.workspace.asRelativePath).toHaveBeenCalledWith(mockUri, undefined);
      expect(result).toBe(relativePath);
    });

    it('should convert URI to relative path with workspace folder name', () => {
      const mockUri = createMockUri('/workspace/src/file.ts');
      const relativePath = 'workspace/src/file.ts';

      mockVSCode.workspace.asRelativePath.mockReturnValue(relativePath);

      const result = adapter.asRelativePath(mockUri, true);

      expect(mockVSCode.workspace.asRelativePath).toHaveBeenCalledWith(mockUri, true);
      expect(result).toBe(relativePath);
    });

    it('should handle file outside workspace (returns absolute)', () => {
      const absolutePath = '/outside/file.ts';

      mockVSCode.workspace.asRelativePath.mockReturnValue(absolutePath);

      const result = adapter.asRelativePath(absolutePath);

      expect(mockVSCode.workspace.asRelativePath).toHaveBeenCalledWith(absolutePath, undefined);
      expect(result).toBe(absolutePath);
    });

    it('should test with monorepo (multiple workspace folders)', () => {
      const absolutePath = '/workspace/packages/core/src/file.ts';
      const relativePath = 'core/src/file.ts';

      mockVSCode.workspace.asRelativePath.mockReturnValue(relativePath);

      const result = adapter.asRelativePath(absolutePath, true);

      expect(mockVSCode.workspace.asRelativePath).toHaveBeenCalledWith(absolutePath, true);
      expect(result).toBe(relativePath);
    });

    it('should delegate to vscode.workspace.asRelativePath with all parameters', () => {
      const pathOrUri = '/workspace/test.ts';
      const includeWorkspaceFolder = true;

      mockVSCode.workspace.asRelativePath.mockReturnValue('workspace/test.ts');

      adapter.asRelativePath(pathOrUri, includeWorkspaceFolder);

      expect(mockVSCode.workspace.asRelativePath).toHaveBeenCalledWith(
        pathOrUri,
        includeWorkspaceFolder,
      );
      expect(mockVSCode.workspace.asRelativePath).toHaveBeenCalledTimes(1);
    });
  });

  describe('Workspace Getters', () => {
    describe('activeTerminal', () => {
      it('should return terminal when one is active', () => {
        const mockTerminal = createMockTerminal({ name: 'bash' });
        mockVSCode.window.activeTerminal = mockTerminal;

        const result = adapter.activeTerminal;

        expect(result).toBe(mockTerminal);
      });

      it('should return undefined when no terminal active', () => {
        mockVSCode.window.activeTerminal = undefined;

        const result = adapter.activeTerminal;

        expect(result).toBeUndefined();
      });
    });

    describe('activeTextEditor', () => {
      it('should return editor when one is active', () => {
        const mockEditor = createMockEditor({
          document: createMockDocument({ uri: createMockUri('/workspace/file.ts') }),
        });
        mockVSCode.window.activeTextEditor = mockEditor;

        const result = adapter.activeTextEditor;

        expect(result).toBe(mockEditor);
      });

      it('should return undefined when no editor active', () => {
        mockVSCode.window.activeTextEditor = undefined;

        const result = adapter.activeTextEditor;

        expect(result).toBeUndefined();
      });
    });

    describe('visibleTextEditors', () => {
      it('should return array of visible editors', () => {
        const mockEditor1 = createMockEditor({
          document: createMockDocument({ uri: createMockUri('/workspace/file1.ts') }),
        });
        const mockEditor2 = createMockEditor({
          document: createMockDocument({ uri: createMockUri('/workspace/file2.ts') }),
        });
        mockVSCode.window.visibleTextEditors = [mockEditor1, mockEditor2];

        const result = adapter.visibleTextEditors;

        expect(result).toStrictEqual([mockEditor1, mockEditor2]);
        expect(result).toHaveLength(2);
      });

      it('should return empty array when none visible', () => {
        mockVSCode.window.visibleTextEditors = [];

        const result = adapter.visibleTextEditors;

        expect(result).toStrictEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should return multiple editors (split view)', () => {
        const mockEditors = [
          createMockEditor({
            document: createMockDocument({ uri: createMockUri('/workspace/left.ts') }),
          }),
          createMockEditor({
            document: createMockDocument({ uri: createMockUri('/workspace/center.ts') }),
          }),
          createMockEditor({
            document: createMockDocument({ uri: createMockUri('/workspace/right.ts') }),
          }),
        ];
        mockVSCode.window.visibleTextEditors = mockEditors;

        const result = adapter.visibleTextEditors;

        expect(result).toStrictEqual(mockEditors);
        expect(result).toHaveLength(3);
      });
    });
  });

  describe('Tab Group Operations', () => {
    describe('tabGroups getter', () => {
      it('should return TabGroups API from vscode.window', () => {
        const mockTabGroups = createMockTabGroups();
        mockVSCode.window.tabGroups = mockTabGroups;

        const result = adapter.tabGroups;

        expect(result).toBe(mockTabGroups);
      });
    });

    describe('findTabGroupForDocument', () => {
      it('should find tab group containing target document', () => {
        const targetUri = createMockUri('/workspace/target.ts');
        const tab1 = createMockTab(createMockUri('/workspace/file1.ts'));
        const tab2 = createMockTab(targetUri);
        const tab3 = createMockTab(createMockUri('/workspace/file3.ts'));

        const tabGroup1 = createMockTabGroup([tab1, tab2]);
        const tabGroup2 = createMockTabGroup([tab3]);

        mockVSCode.window.tabGroups = createMockTabGroups({ all: [tabGroup1, tabGroup2] });

        const result = adapter.findTabGroupForDocument(targetUri);

        expect(result).toBe(tabGroup1);
      });

      it('should return undefined when document not in any tab group', () => {
        const targetUri = createMockUri('/workspace/missing.ts');
        const tab1 = createMockTab(createMockUri('/workspace/file1.ts'));
        const tab2 = createMockTab(createMockUri('/workspace/file2.ts'));

        const tabGroup = createMockTabGroup([tab1, tab2]);
        mockVSCode.window.tabGroups = createMockTabGroups({ all: [tabGroup] });

        const result = adapter.findTabGroupForDocument(targetUri);

        expect(result).toBeUndefined();
      });

      it('should handle multiple tab groups (split editors)', () => {
        const targetUri = createMockUri('/workspace/target.ts');
        const tab1 = createMockTab(createMockUri('/workspace/file1.ts'));
        const tab2 = createMockTab(createMockUri('/workspace/file2.ts'));
        const tab3 = createMockTab(targetUri);

        const leftGroup = createMockTabGroup([tab1]);
        const centerGroup = createMockTabGroup([tab2]);
        const rightGroup = createMockTabGroup([tab3]);

        mockVSCode.window.tabGroups = createMockTabGroups({
          all: [leftGroup, centerGroup, rightGroup],
        });

        const result = adapter.findTabGroupForDocument(targetUri);

        expect(result).toBe(rightGroup);
      });

      it('should skip non-text tabs (terminals, webviews)', () => {
        const targetUri = createMockUri('/workspace/target.ts');
        const textTab = createMockTab(targetUri);
        const terminalTab = { input: { type: 'terminal' } } as any; // Non-text tab
        const webviewTab = { input: { type: 'webview' } } as any; // Non-text tab

        const tabGroup = createMockTabGroup([terminalTab, textTab, webviewTab]);
        mockVSCode.window.tabGroups = createMockTabGroups({ all: [tabGroup] });

        const result = adapter.findTabGroupForDocument(targetUri);

        expect(result).toBe(tabGroup);
      });

      it('should handle same document in multiple tab groups (return first match)', () => {
        const targetUri = createMockUri('/workspace/target.ts');
        const tab1 = createMockTab(targetUri);
        const tab2 = createMockTab(targetUri); // Same document in different group

        const group1 = createMockTabGroup([tab1]);
        const group2 = createMockTabGroup([tab2]);

        mockVSCode.window.tabGroups = createMockTabGroups({ all: [group1, group2] });

        const result = adapter.findTabGroupForDocument(targetUri);

        expect(result).toBe(group1); // First match
      });

      it('should test URI comparison (toString equality)', () => {
        const uri1 = createMockUri('/workspace/file.ts');
        const uri2 = createMockUri('/workspace/file.ts'); // Same path, different object

        const tab = createMockTab(uri1);
        const tabGroup = createMockTabGroup([tab]);
        mockVSCode.window.tabGroups = createMockTabGroups({ all: [tabGroup] });

        const result = adapter.findTabGroupForDocument(uri2);

        expect(result).toBe(tabGroup);
        expect(uri1).not.toBe(uri2); // Different objects
        expect(uri1.toString()).toBe(uri2.toString()); // Same string representation
      });
    });

    describe('isTextEditorTab', () => {
      it('should return true for text editor tab (TabInputText)', () => {
        const tab = createMockTab(createMockUri('/workspace/file.ts'));

        const result = adapter.isTextEditorTab(tab);

        expect(result).toBe(true);
      });

      it('should return false for terminal tab', () => {
        const terminalTab = {
          input: { type: 'terminal' },
        } as any;

        const result = adapter.isTextEditorTab(terminalTab);

        expect(result).toBe(false);
      });

      it('should return false for webview tab', () => {
        const webviewTab = {
          input: { type: 'webview', viewType: 'markdown.preview' },
        } as any;

        const result = adapter.isTextEditorTab(webviewTab);

        expect(result).toBe(false);
      });

      it('should return false for custom tab types', () => {
        const customTab = {
          input: { type: 'custom', customId: 'some-extension' },
        } as any;

        const result = adapter.isTextEditorTab(customTab);

        expect(result).toBe(false);
      });

      it('should verify type guard narrows type correctly', () => {
        const tab = createMockTab(createMockUri('/workspace/file.ts'));

        if (adapter.isTextEditorTab(tab)) {
          // Type narrowing should allow accessing tab.input.uri without error
          const uri = tab.input.uri;
          expect(uri).toBeDefined();
          expect(uri.fsPath).toBe('/workspace/file.ts');
        }
      });
    });

    describe('getTabDocumentUri', () => {
      it('should extract URI from text editor tab', () => {
        const mockUri = createMockUri('/workspace/file.ts');
        const tab = createMockTab(mockUri);

        const result = adapter.getTabDocumentUri(tab);

        expect(result).toBe(mockUri);
      });

      it('should return undefined for terminal tab', () => {
        const terminalTab = {
          input: { type: 'terminal' },
        } as any;

        const result = adapter.getTabDocumentUri(terminalTab);

        expect(result).toBeUndefined();
      });

      it('should return undefined for webview tab', () => {
        const webviewTab = {
          input: { type: 'webview' },
        } as any;

        const result = adapter.getTabDocumentUri(webviewTab);

        expect(result).toBeUndefined();
      });

      it('should verify delegates to isTextEditorTab for type checking', () => {
        const mockUri = createMockUri('/workspace/file.ts');
        const textTab = createMockTab(mockUri);
        const terminalTab = { input: { type: 'terminal' } } as any;

        const textResult = adapter.getTabDocumentUri(textTab);
        const terminalResult = adapter.getTabDocumentUri(terminalTab);

        expect(textResult).toBe(mockUri);
        expect(terminalResult).toBeUndefined();
      });
    });
  });

  describe('Environment Getters', () => {
    describe('appName', () => {
      it('should return "Visual Studio Code"', () => {
        mockVSCode.env.appName = 'Visual Studio Code';

        const result = adapter.appName;

        expect(result).toBe('Visual Studio Code');
      });

      it('should return "Cursor" (for Cursor IDE)', () => {
        mockVSCode.env.appName = 'Cursor';

        const result = adapter.appName;

        expect(result).toBe('Cursor');
      });
    });

    describe('uriScheme', () => {
      it('should return "vscode"', () => {
        mockVSCode.env.uriScheme = 'vscode';

        const result = adapter.uriScheme;

        expect(result).toBe('vscode');
      });

      it('should return "cursor"', () => {
        mockVSCode.env.uriScheme = 'cursor';

        const result = adapter.uriScheme;

        expect(result).toBe('cursor');
      });
    });

    describe('extensions', () => {
      it('should return array of all extensions', () => {
        const mockExtensions = [
          { id: 'ms-vscode.test-extension-1', extensionUri: createMockUri('/ext1') },
          { id: 'ms-vscode.test-extension-2', extensionUri: createMockUri('/ext2') },
        ] as any[];
        mockVSCode.extensions.all = mockExtensions;

        const result = adapter.extensions;

        expect(result).toBe(mockExtensions);
        expect(result).toHaveLength(2);
      });

      it('should return empty array when no extensions', () => {
        mockVSCode.extensions.all = [];

        const result = adapter.extensions;

        expect(result).toStrictEqual([]);
        expect(result).toHaveLength(0);
      });
    });
  });

  describe('Event Listeners', () => {
    describe('onDidCloseTerminal', () => {
      it('should register listener and verify Disposable returned', () => {
        const mockDisposable = { dispose: jest.fn() };
        const listener = jest.fn();
        mockVSCode.window.onDidCloseTerminal.mockReturnValue(mockDisposable);

        const result = adapter.onDidCloseTerminal(listener);

        expect(mockVSCode.window.onDidCloseTerminal).toHaveBeenCalledWith(listener);
        expect(mockVSCode.window.onDidCloseTerminal).toHaveBeenCalledTimes(1);
        expect(result).toBe(mockDisposable);
        expect(result.dispose).toBeDefined();
      });

      it('should verify listener is called when terminal closes', () => {
        const listener = jest.fn();
        const mockTerminal = createMockTerminal({ name: 'bash' });
        let registeredListener: ((terminal: any) => void) | undefined;

        mockVSCode.window.onDidCloseTerminal.mockImplementation((cb: (terminal: any) => void) => {
          registeredListener = cb;
          return { dispose: jest.fn() };
        });

        adapter.onDidCloseTerminal(listener);

        // Simulate terminal closure
        registeredListener!(mockTerminal);

        expect(listener).toHaveBeenCalledWith(mockTerminal);
        expect(listener).toHaveBeenCalledTimes(1);
      });

      it('should verify dispose unregisters listener', () => {
        const listener = jest.fn();
        const mockDisposable = { dispose: jest.fn() };
        mockVSCode.window.onDidCloseTerminal.mockReturnValue(mockDisposable);

        const result = adapter.onDidCloseTerminal(listener);
        result.dispose();

        expect(mockDisposable.dispose).toHaveBeenCalledTimes(1);
      });
    });

    describe('onDidCloseTextDocument', () => {
      it('should register listener and verify Disposable returned', () => {
        const mockDisposable = { dispose: jest.fn() };
        const listener = jest.fn();
        mockVSCode.workspace.onDidCloseTextDocument.mockReturnValue(mockDisposable);

        const result = adapter.onDidCloseTextDocument(listener);

        expect(mockVSCode.workspace.onDidCloseTextDocument).toHaveBeenCalledWith(listener);
        expect(mockVSCode.workspace.onDidCloseTextDocument).toHaveBeenCalledTimes(1);
        expect(result).toBe(mockDisposable);
        expect(result.dispose).toBeDefined();
      });

      it('should verify listener is called when document closes', () => {
        const listener = jest.fn();
        const mockDocument = createMockDocument({ uri: createMockUri('/workspace/file.ts') });
        let registeredListener: ((document: any) => void) | undefined;

        mockVSCode.workspace.onDidCloseTextDocument.mockImplementation(
          (cb: (document: any) => void) => {
            registeredListener = cb;
            return { dispose: jest.fn() };
          },
        );

        adapter.onDidCloseTextDocument(listener);

        // Simulate document closure
        registeredListener!(mockDocument);

        expect(listener).toHaveBeenCalledWith(mockDocument);
        expect(listener).toHaveBeenCalledTimes(1);
      });

      it('should verify dispose unregisters listener', () => {
        const listener = jest.fn();
        const mockDisposable = { dispose: jest.fn() };
        mockVSCode.workspace.onDidCloseTextDocument.mockReturnValue(mockDisposable);

        const result = adapter.onDidCloseTextDocument(listener);
        result.dispose();

        expect(mockDisposable.dispose).toHaveBeenCalledTimes(1);
      });
    });
  });
});
