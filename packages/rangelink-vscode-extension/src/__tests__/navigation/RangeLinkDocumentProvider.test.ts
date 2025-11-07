import { getLogger } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { RangeLinkDocumentProvider } from '../../navigation/RangeLinkDocumentProvider';

// Mock vscode module
jest.mock('vscode', () => ({
  Uri: {
    parse: jest.fn((str) => ({ scheme: 'command', toString: () => str })),
  },
  Range: jest.fn((start, end) => ({ start, end })),
  Position: jest.fn((line, char) => ({ line, character: char })),
  Selection: jest.fn((start, end) => ({ start, end, anchor: start, active: end })),
  DocumentLink: jest.fn(function (this: any, range: any) {
    this.range = range;
    this.tooltip = undefined;
    this.target = undefined;
  }),
  TextEditorRevealType: {
    InCenterIfOutsideViewport: 2,
  },
  workspace: {
    openTextDocument: jest.fn(),
    getWorkspaceFolder: jest.fn(),
    workspaceFolders: undefined,
  },
  window: {
    showTextDocument: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
  },
  languages: {
    registerDocumentLinkProvider: jest.fn(),
  },
}));

// Mock logger
jest.mock('rangelink-core-ts', () => ({
  ...jest.requireActual('rangelink-core-ts'),
  getLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('RangeLinkDocumentProvider', () => {
  it.todo('re-enable tests after navigation refactor is complete');

  // let provider: RangeLinkDocumentProvider;
  // let mockLogger: ReturnType<typeof getLogger>;
  // const delimiters = { line: 'L', position: 'C', hash: '#', range: '-' };
  // beforeEach(() => {
  //   jest.clearAllMocks();
  //   mockLogger = getLogger();
  //   provider = new RangeLinkDocumentProvider(delimiters, mockLogger);
  // });
  // describe('provideDocumentLinks', () => {
  //   const createMockDocument = (text: string): vscode.TextDocument => ({
  //     getText: () => text,
  //     positionAt: (index: number) => {
  //       // Simple implementation: each char is a position
  //       const lines = text.substring(0, index).split('\n');
  //       const line = lines.length - 1;
  //       const character = lines[lines.length - 1].length;
  //       return new vscode.Position(line, character);
  //     },
  //     uri: vscode.Uri.parse('file:///test.md'),
  //   } as any);
  //   const createMockToken = (): vscode.CancellationToken => ({
  //     isCancellationRequested: false,
  //     onCancellationRequested: jest.fn(),
  //   } as any);
  //   it('should detect single-line link', () => {
  //     const document = createMockDocument('Check src/auth.ts#L10');
  //     const token = createMockToken();
  //     const links = provider.provideDocumentLinks(document, token);
  //     expect(links).toHaveLength(1);
  //     expect(links![0].tooltip).toContain('Navigate to src/auth.ts at line 11');
  //   });
  //   it('should detect multi-line range link', () => {
  //     const document = createMockDocument('See src/auth.ts#L10-L20 for details');
  //     const token = createMockToken();
  //     const links = provider.provideDocumentLinks(document, token);
  //     expect(links).toHaveLength(1);
  //     expect(links![0].tooltip).toContain('Navigate to src/auth.ts: line 11');
  //     expect(links![0].tooltip).toContain('line 21');
  //   });
  //   it('should detect link with columns', () => {
  //     const document = createMockDocument('src/file.ts#L5C10-L10C20');
  //     const token = createMockToken();
  //     const links = provider.provideDocumentLinks(document, token);
  //     expect(links).toHaveLength(1);
  //     expect(links![0].tooltip).toContain('line 6, col 11');
  //   });
  //   it('should detect rectangular mode link', () => {
  //     const document = createMockDocument('src/file.ts##L5C10-L10C20');
  //     const token = createMockToken();
  //     const links = provider.provideDocumentLinks(document, token);
  //     expect(links).toHaveLength(1);
  //     expect(links![0].tooltip).toContain('rectangular selection');
  //   });
  //   it('should detect multiple links in same document', () => {
  //     const document = createMockDocument(
  //       'First: src/a.ts#L1 and second: src/b.ts#L2-L3',
  //     );
  //     const token = createMockToken();
  //     const links = provider.provideDocumentLinks(document, token);
  //     expect(links).toHaveLength(2);
  //   });
  //   it('should skip invalid links', () => {
  //     const document = createMockDocument('Invalid: src/file.ts#INVALID');
  //     const token = createMockToken();
  //     const links = provider.provideDocumentLinks(document, token);
  //     expect(links).toHaveLength(0);
  //     expect(mockLogger.debug).toHaveBeenCalledWith(
  //       expect.objectContaining({ linkText: 'src/file.ts#INVALID' }),
  //       'Skipping invalid link',
  //     );
  //   });
  //   it('should handle empty document', () => {
  //     const document = createMockDocument('');
  //     const token = createMockToken();
  //     const links = provider.provideDocumentLinks(document, token);
  //     expect(links).toHaveLength(0);
  //   });
  //   it('should handle cancellation', () => {
  //     const document = createMockDocument('src/a.ts#L1 src/b.ts#L2 src/c.ts#L3');
  //     const token = {
  //       isCancellationRequested: true,
  //       onCancellationRequested: jest.fn(),
  //     } as any;
  //     const links = provider.provideDocumentLinks(document, token);
  //     expect(links).toHaveLength(0); // Should stop processing
  //   });
  //   it('should create command URI with encoded arguments', () => {
  //     const document = createMockDocument('src/file.ts#L10');
  //     const token = createMockToken();
  //     const links = provider.provideDocumentLinks(document, token);
  //     expect(links![0].target).toBeDefined();
  //     expect(links![0].target!.toString()).toContain('command:rangelink.navigateToLink');
  //   });
  // });
  // describe('handleLinkClick', () => {
  //   beforeEach(() => {
  //     // Mock workspace resolution
  //     (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue({
  //       uri: vscode.Uri.parse('file:///workspace'),
  //     });
  //     (vscode.workspace as any).workspaceFolders = [
  //       { uri: vscode.Uri.parse('file:///workspace') },
  //     ];
  //   });
  //   it('should navigate to single-line link', async () => {
  //     const mockDocument = { uri: vscode.Uri.parse('file:///workspace/src/file.ts') };
  //     const mockEditor = {
  //       selection: undefined,
  //       selections: [],
  //       revealRange: jest.fn(),
  //     };
  //     (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);
  //     (vscode.window.showTextDocument as jest.Mock).mockResolvedValue(mockEditor);
  //     await RangeLinkDocumentProvider.handleLinkClick(
  //       {
  //         linkText: 'src/file.ts#L10',
  //         parsed: {
  //           path: 'src/file.ts',
  //           start: { line: 9, character: 0 },
  //           selectionType: 'single',
  //         },
  //       },
  //       mockLogger,
  //     );
  //     expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
  //     expect(vscode.window.showTextDocument).toHaveBeenCalled();
  //     expect(mockEditor.selection).toBeDefined();
  //   });
  //   it('should handle rectangular mode with multi-cursor', async () => {
  //     const mockDocument = { uri: vscode.Uri.parse('file:///workspace/src/file.ts') };
  //     const mockEditor = {
  //       selections: [],
  //       revealRange: jest.fn(),
  //     };
  //     (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);
  //     (vscode.window.showTextDocument as jest.Mock).mockResolvedValue(mockEditor);
  //     await RangeLinkDocumentProvider.handleLinkClick(
  //       {
  //         linkText: 'src/file.ts##L10C5-L12C10',
  //         parsed: {
  //           path: 'src/file.ts',
  //           start: { line: 9, character: 4 },
  //           end: { line: 11, character: 9 },
  //           selectionType: 'rectangular',
  //         },
  //       },
  //       mockLogger,
  //     );
  //     expect(mockEditor.selections).toHaveLength(3); // Lines 9, 10, 11
  //   });
  //   it('should show warning when file not found', async () => {
  //     await RangeLinkDocumentProvider.handleLinkClick(
  //       {
  //         linkText: 'nonexistent.ts#L10',
  //         parsed: {
  //           path: 'nonexistent.ts',
  //           start: { line: 9, character: 0 },
  //           selectionType: 'single',
  //         },
  //       },
  //       mockLogger,
  //     );
  //     expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
  //       expect.stringContaining('Cannot find file: nonexistent.ts'),
  //     );
  //   });
  //   it('should show error when navigation fails', async () => {
  //     const mockDocument = { uri: vscode.Uri.parse('file:///workspace/src/file.ts') };
  //     (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);
  //     (vscode.window.showTextDocument as jest.Mock).mockRejectedValue(
  //       new Error('Failed to open'),
  //     );
  //     await RangeLinkDocumentProvider.handleLinkClick(
  //       {
  //         linkText: 'src/file.ts#L10',
  //         parsed: {
  //           path: 'src/file.ts',
  //           start: { line: 9, character: 0 },
  //           selectionType: 'single',
  //         },
  //       },
  //       mockLogger,
  //     );
  //     expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
  //       expect.stringContaining('Failed to navigate'),
  //     );
  //   });
  // });
});
