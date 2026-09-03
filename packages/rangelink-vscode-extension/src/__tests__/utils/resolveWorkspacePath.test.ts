import { PathResolutionStrategy, ResolvedPath, ResolveWorkspacePathResult } from '../../types/ResolvedPath';
import { resolveWorkspacePath } from '../../utils';
import { createMockDocument, createMockUri, createMockWorkspaceFolder } from '../helpers';

import * as path from 'node:path';
import type * as vscode from 'vscode';

const FITTING_DOCUMENT = createMockDocument({
  lineCount: 5,
  lineAt: (_line: number) => ({ text: 'abc' }),
} as Partial<vscode.TextDocument>);

const CLAMPING_DOCUMENT = createMockDocument({
  lineCount: 1,
  lineAt: (_line: number) => ({ text: 'short' }),
} as Partial<vscode.TextDocument>);

interface ResolvedPathSnapshot {
  fsPath: string;
  resolvedVia: PathResolutionStrategy;
}

// A ResolvedPath embeds a vscode.Uri whose mock instance carries an own
// toString() function, so two freshly built URIs never deep-equal. Snapshot the
// declared contract fields into one object and assert it whole with
// toStrictEqual instead of scattering per-field toBe() checks.
const snapshotResolvedPath = (resolved: ResolvedPath): ResolvedPathSnapshot => ({
  fsPath: resolved.uri.fsPath,
  resolvedVia: resolved.resolvedVia,
});

const expectResolvedPath = (result: ResolveWorkspacePathResult): ResolvedPath => {
  expect(result).toBeDefined();
  if (result === undefined || 'candidates' in result) {
    throw new Error('Expected a resolved path result');
  }
  return result;
};

describe('resolveWorkspacePath', () => {
  let mockVscode: any;
  let mockStat: jest.Mock;
  let mockUriFile: jest.Mock;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockStat = jest.fn();
    mockUriFile = jest.fn((fsPath: string) => createMockUri(fsPath));

    mockVscode = {
      Uri: {
        file: mockUriFile,
      },
      workspace: {
        fs: {
          stat: mockStat,
        },
        workspaceFolders: undefined,
      },
    };
  });

  describe('Absolute paths', () => {
    it('should resolve absolute path if file exists', async () => {
      const absolutePath = '/Users/name/project/src/auth.ts';
      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(absolutePath, mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: absolutePath, resolvedVia: 'absolute' });
      expect(mockUriFile).toHaveBeenCalledWith(absolutePath);
      expect(mockStat).toHaveBeenCalledTimes(1);
    });

    it('should return undefined if absolute path does not exist', async () => {
      const absolutePath = '/Users/name/project/nonexistent.ts';
      mockStat.mockRejectedValueOnce(new Error('File not found'));

      const result = await resolveWorkspacePath(absolutePath, mockVscode);

      expect(result).toBeUndefined();
      expect(mockUriFile).toHaveBeenCalledWith(absolutePath);
      expect(mockStat).toHaveBeenCalledTimes(1);
    });

    it('should handle platform-native absolute paths', async () => {
      const absolutePath = process.platform === 'win32' ? 'C:\\Users\\name\\project\\src\\file.ts' : '/Users/name/project/src/file.ts';

      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(absolutePath, mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: absolutePath, resolvedVia: 'absolute' });
      expect(mockUriFile).toHaveBeenCalledWith(absolutePath);
    });
  });

  describe('Workspace-relative paths', () => {
    it('should resolve relative path in single workspace folder', async () => {
      const workspaceRoot = '/Users/name/project';
      const relativePath = 'src/auth.ts';
      const expectedPath = path.join(workspaceRoot, relativePath);

      mockVscode.workspace.workspaceFolders = [createMockWorkspaceFolder(workspaceRoot)];
      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(relativePath, mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: expectedPath, resolvedVia: 'workspace-relative' });
      expect(mockUriFile).toHaveBeenCalledWith(expectedPath);
    });

    it('should try multiple workspace folders', async () => {
      const workspace1 = '/Users/name/project1';
      const workspace2 = '/Users/name/project2';
      const relativePath = 'src/auth.ts';
      const expectedPath = path.join(workspace2, relativePath);

      mockVscode.workspace.workspaceFolders = [createMockWorkspaceFolder(workspace1), createMockWorkspaceFolder(workspace2)];

      mockStat.mockImplementation((uri: any) => {
        if (uri.fsPath.includes('project1')) {
          return Promise.reject(new Error('File not found'));
        } else if (uri.fsPath.includes('project2')) {
          return Promise.resolve({} as any);
        }
        return Promise.reject(new Error('Unexpected path'));
      });

      const result = await resolveWorkspacePath(relativePath, mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: expectedPath, resolvedVia: 'workspace-relative' });
      expect(mockStat).toHaveBeenCalledTimes(2);
    });

    it('should return undefined if file not in any workspace', async () => {
      const workspace1 = '/Users/name/project1';
      const workspace2 = '/Users/name/project2';
      const relativePath = 'src/nonexistent.ts';

      mockVscode.workspace.workspaceFolders = [createMockWorkspaceFolder(workspace1), createMockWorkspaceFolder(workspace2)];

      mockStat.mockImplementation(() => Promise.reject(new Error('File not found')));

      const result = await resolveWorkspacePath(relativePath, mockVscode);

      expect(result).toBeUndefined();
      expect(mockStat).toHaveBeenCalledTimes(2);
    });
  });

  describe('No workspace', () => {
    it('should return undefined when no workspace is open', async () => {
      mockVscode.workspace.workspaceFolders = undefined;

      const result = await resolveWorkspacePath('src/auth.ts', mockVscode);

      expect(result).toBeUndefined();
      expect(mockStat).not.toHaveBeenCalled();
    });

    it('should return undefined when workspace folders array is empty', async () => {
      mockVscode.workspace.workspaceFolders = [];

      const result = await resolveWorkspacePath('src/auth.ts', mockVscode);

      expect(result).toBeUndefined();
      expect(mockStat).not.toHaveBeenCalled();
    });
  });

  describe('Bare-filename fallback', () => {
    let mockFindFiles: jest.Mock;
    let mockOpenTextDocument: jest.Mock;

    beforeEach(() => {
      mockFindFiles = jest.fn();
      mockOpenTextDocument = jest.fn();
      mockVscode.workspace.findFiles = mockFindFiles;
      mockVscode.workspace.openTextDocument = mockOpenTextDocument;

      const workspaceRoot = '/Users/name/project';
      mockVscode.workspace.workspaceFolders = [createMockWorkspaceFolder(workspaceRoot)];
      mockStat.mockRejectedValue(new Error('File not found'));
    });

    it('should return URI when bare filename matches exactly one file', async () => {
      const matchUri = createMockUri('/Users/name/project/src/deep/auth.ts');
      mockFindFiles.mockResolvedValueOnce([matchUri]);

      const result = await resolveWorkspacePath('auth.ts', mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: '/Users/name/project/src/deep/auth.ts', resolvedVia: 'filename-fallback' });
      expect(mockFindFiles).toHaveBeenCalledWith('**/auth.ts', undefined, 100);
    });

    it('should return filename candidates when bare filename matches multiple files', async () => {
      const match1 = createMockUri('/Users/name/project/src/auth.ts');
      const match2 = createMockUri('/Users/name/project/lib/auth.ts');
      mockFindFiles.mockResolvedValueOnce([match1, match2]);

      const result = await resolveWorkspacePath('auth.ts', mockVscode);

      expect(result).toStrictEqual({ candidates: [match1, match2] });
      expect(mockFindFiles).toHaveBeenCalledWith('**/auth.ts', undefined, 100);
    });

    it('should return undefined when bare filename matches no files', async () => {
      mockFindFiles.mockResolvedValueOnce([]);

      const result = await resolveWorkspacePath('nonexistent.ts', mockVscode);

      expect(result).toBeUndefined();
      expect(mockFindFiles).toHaveBeenCalledWith('**/nonexistent.ts', undefined, 100);
    });

    it('should skip fallback for paths with forward slash separators', async () => {
      const result = await resolveWorkspacePath('src/auth.ts', mockVscode);

      expect(result).toBeUndefined();
      expect(mockFindFiles).not.toHaveBeenCalled();
    });

    it('should skip fallback for paths with backslash separators', async () => {
      const result = await resolveWorkspacePath('src\\auth.ts', mockVscode);

      expect(result).toBeUndefined();
      expect(mockFindFiles).not.toHaveBeenCalled();
    });

    it('should return undefined when findFiles rejects', async () => {
      mockFindFiles.mockRejectedValueOnce(new Error('workspace error'));

      const result = await resolveWorkspacePath('auth.ts', mockVscode);

      expect(result).toBeUndefined();
      expect(mockFindFiles).toHaveBeenCalledWith('**/auth.ts', undefined, 100);
    });

    it('should escape square brackets in bare filename', async () => {
      const matchUri = createMockUri('/Users/name/project/src/routes/[id].ts');
      mockFindFiles.mockResolvedValueOnce([matchUri]);

      const result = await resolveWorkspacePath('[id].ts', mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: '/Users/name/project/src/routes/[id].ts', resolvedVia: 'filename-fallback' });
      expect(mockFindFiles).toHaveBeenCalledWith('**/[[]id[]].ts', undefined, 100);
    });

    it('should escape asterisk in bare filename', async () => {
      const matchUri = createMockUri('/Users/name/project/src/file*.ts');
      mockFindFiles.mockResolvedValueOnce([matchUri]);

      const result = await resolveWorkspacePath('file*.ts', mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: '/Users/name/project/src/file*.ts', resolvedVia: 'filename-fallback' });
      expect(mockFindFiles).toHaveBeenCalledWith('**/file[*].ts', undefined, 100);
    });

    it('should escape question mark in bare filename', async () => {
      const matchUri = createMockUri('/Users/name/project/src/foo?.ts');
      mockFindFiles.mockResolvedValueOnce([matchUri]);

      const result = await resolveWorkspacePath('foo?.ts', mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: '/Users/name/project/src/foo?.ts', resolvedVia: 'filename-fallback' });
      expect(mockFindFiles).toHaveBeenCalledWith('**/foo[?].ts', undefined, 100);
    });

    it('should escape curly braces in bare filename', async () => {
      const matchUri = createMockUri('/Users/name/project/src/{slug}.ts');
      mockFindFiles.mockResolvedValueOnce([matchUri]);

      const result = await resolveWorkspacePath('{slug}.ts', mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: '/Users/name/project/src/{slug}.ts', resolvedVia: 'filename-fallback' });
      expect(mockFindFiles).toHaveBeenCalledWith('**/[{]slug[}].ts', undefined, 100);
    });

    it('should resolve workspace-relative when bare filename exists at workspace root and subdirectory', async () => {
      const rootMatch = createMockUri('/Users/name/project/index.ts');
      mockFindFiles.mockResolvedValueOnce([rootMatch, createMockUri('/Users/name/project/src/index.ts')]);
      mockStat.mockResolvedValue({} as any);

      const result = await resolveWorkspacePath('index.ts', mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: '/Users/name/project/index.ts', resolvedVia: 'workspace-relative' });
      expect(mockFindFiles).not.toHaveBeenCalled();
      expect(mockStat).toHaveBeenCalledTimes(1);
    });

    it('should return filename-fallback when root file is missing and findFiles matches one file', async () => {
      const rootMatch = createMockUri('/Users/name/project/auth.ts');
      mockFindFiles.mockResolvedValueOnce([rootMatch]);

      const result = await resolveWorkspacePath('auth.ts', mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: '/Users/name/project/auth.ts', resolvedVia: 'filename-fallback' });
      expect(mockStat).toHaveBeenCalledTimes(1);
    });

    it('should resolve workspace-relative when file exists at workspace root even if findFiles rejects', async () => {
      mockFindFiles.mockRejectedValueOnce(new Error('workspace error'));
      mockStat.mockResolvedValue({} as any);

      const result = await resolveWorkspacePath('auth.ts', mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: '/Users/name/project/auth.ts', resolvedVia: 'workspace-relative' });
      expect(mockFindFiles).not.toHaveBeenCalled();
    });

    it('should resolve workspace-relative when file exists at workspace root even if findFiles returns empty', async () => {
      mockFindFiles.mockResolvedValueOnce([]);
      mockStat.mockResolvedValue({} as any);

      const result = await resolveWorkspacePath('auth.ts', mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: '/Users/name/project/auth.ts', resolvedVia: 'workspace-relative' });
      expect(mockFindFiles).not.toHaveBeenCalled();
    });

    describe('Root-first range validation', () => {
      it('should resolve workspace-relative when the range fits the root file', async () => {
        mockStat.mockResolvedValue({} as any);
        mockOpenTextDocument.mockResolvedValue(FITTING_DOCUMENT);

        const result = await resolveWorkspacePath('auth.ts', mockVscode, { start: { line: 1, character: 1 }, end: { line: 3, character: 1 } });

        const resolved = expectResolvedPath(result);
        expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: '/Users/name/project/auth.ts', resolvedVia: 'workspace-relative' });
        expect(mockOpenTextDocument).toHaveBeenCalledTimes(1);
        expect(mockFindFiles).not.toHaveBeenCalled();
      });

      it('should return filename candidates when the root file exists but the range clamps', async () => {
        mockStat.mockResolvedValue({} as any);
        mockOpenTextDocument.mockResolvedValue(CLAMPING_DOCUMENT);
        const match1 = createMockUri('/Users/name/project/auth.ts');
        const match2 = createMockUri('/Users/name/project/lib/auth.ts');
        mockFindFiles.mockResolvedValueOnce([match1, match2]);

        const result = await resolveWorkspacePath('auth.ts', mockVscode, { start: { line: 10 }, end: { line: 10 } });

        expect(result).toStrictEqual({ candidates: [match1, match2] });
        expect(mockOpenTextDocument).toHaveBeenCalledTimes(1);
        expect(mockFindFiles).toHaveBeenCalledWith('**/auth.ts', undefined, 100);
      });

      it('should return filename candidates when opening the root file fails', async () => {
        mockStat.mockResolvedValue({} as any);
        mockOpenTextDocument.mockRejectedValue(new Error('binary file'));
        const match1 = createMockUri('/Users/name/project/auth.ts');
        const match2 = createMockUri('/Users/name/project/lib/auth.ts');
        mockFindFiles.mockResolvedValueOnce([match1, match2]);

        const result = await resolveWorkspacePath('auth.ts', mockVscode, { start: { line: 1 }, end: { line: 1 } });

        expect(result).toStrictEqual({ candidates: [match1, match2] });
        expect(mockOpenTextDocument).toHaveBeenCalledTimes(1);
      });

      it('should prefer a later workspace folder whose root file fits the range over an earlier folder whose root clamps', async () => {
        mockVscode.workspace.workspaceFolders = [createMockWorkspaceFolder('/Users/name/project1'), createMockWorkspaceFolder('/Users/name/project2')];
        mockStat.mockResolvedValue({} as any);
        mockOpenTextDocument.mockImplementation((uri: any) => {
          if (uri.fsPath.includes('project1')) {
            return Promise.resolve(CLAMPING_DOCUMENT);
          }
          return Promise.resolve(FITTING_DOCUMENT);
        });

        const result = await resolveWorkspacePath('auth.ts', mockVscode, { start: { line: 2 }, end: { line: 2 } });

        const resolved = expectResolvedPath(result);
        expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: '/Users/name/project2/auth.ts', resolvedVia: 'workspace-relative' });
        expect(mockOpenTextDocument).toHaveBeenCalledTimes(2);
        expect(mockFindFiles).not.toHaveBeenCalled();
      });

      it('should try a later workspace folder when opening an earlier folder root file fails', async () => {
        mockVscode.workspace.workspaceFolders = [createMockWorkspaceFolder('/Users/name/project1'), createMockWorkspaceFolder('/Users/name/project2')];
        mockStat.mockResolvedValue({} as any);
        mockOpenTextDocument.mockImplementation((uri: any) => {
          if (uri.fsPath.includes('project1')) {
            return Promise.reject(new Error('binary file'));
          }
          return Promise.resolve(FITTING_DOCUMENT);
        });

        const result = await resolveWorkspacePath('auth.ts', mockVscode, { start: { line: 2 }, end: { line: 2 } });

        const resolved = expectResolvedPath(result);
        expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: '/Users/name/project2/auth.ts', resolvedVia: 'workspace-relative' });
        expect(mockOpenTextDocument).toHaveBeenCalledTimes(2);
        expect(mockFindFiles).not.toHaveBeenCalled();
      });

      it('should try each workspace folder root before falling back to findFiles', async () => {
        mockVscode.workspace.workspaceFolders = [createMockWorkspaceFolder('/Users/name/project1'), createMockWorkspaceFolder('/Users/name/project2')];
        mockStat.mockImplementation((uri: any) => {
          if (uri.fsPath.includes('project1')) {
            return Promise.reject(new Error('File not found'));
          }
          return Promise.resolve({} as any);
        });

        const result = await resolveWorkspacePath('auth.ts', mockVscode);

        const resolved = expectResolvedPath(result);
        expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: '/Users/name/project2/auth.ts', resolvedVia: 'workspace-relative' });
        expect(mockFindFiles).not.toHaveBeenCalled();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle paths with special characters', async () => {
      const workspaceRoot = '/Users/name/project';
      const relativePath = 'src/file with spaces.ts';
      const expectedPath = path.join(workspaceRoot, relativePath);

      mockVscode.workspace.workspaceFolders = [createMockWorkspaceFolder(workspaceRoot)];
      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(relativePath, mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: expectedPath, resolvedVia: 'workspace-relative' });
    });

    it('should handle paths with hash in filename', async () => {
      const workspaceRoot = '/Users/name/project';
      const relativePath = 'issue#123/auth.ts';
      const expectedPath = path.join(workspaceRoot, relativePath);

      mockVscode.workspace.workspaceFolders = [createMockWorkspaceFolder(workspaceRoot)];
      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(relativePath, mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: expectedPath, resolvedVia: 'workspace-relative' });
    });

    it('should handle nested relative paths', async () => {
      const workspaceRoot = '/Users/name/project';
      const relativePath = 'src/nested/deep/path/file.ts';
      const expectedPath = path.join(workspaceRoot, relativePath);

      mockVscode.workspace.workspaceFolders = [createMockWorkspaceFolder(workspaceRoot)];
      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(relativePath, mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: expectedPath, resolvedVia: 'workspace-relative' });
    });

    it('should handle relative paths starting with ./', async () => {
      const workspaceRoot = '/Users/name/project';
      const relativePath = './src/auth.ts';
      const expectedPath = path.join(workspaceRoot, relativePath);

      mockVscode.workspace.workspaceFolders = [createMockWorkspaceFolder(workspaceRoot)];
      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(relativePath, mockVscode);

      const resolved = expectResolvedPath(result);
      expect(snapshotResolvedPath(resolved)).toStrictEqual({ fsPath: expectedPath, resolvedVia: 'workspace-relative' });
    });
  });
});
