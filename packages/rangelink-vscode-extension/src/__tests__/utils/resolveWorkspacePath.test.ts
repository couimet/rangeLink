import * as path from 'node:path';

import { resolveWorkspacePath } from '../../utils';
import { createMockUri, createMockWorkspaceFolder } from '../helpers';

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

      expect(result).toBeDefined();
      expect(result?.uri.fsPath).toBe(absolutePath);
      expect(result?.resolvedVia).toBe('absolute');
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
      const absolutePath =
        process.platform === 'win32'
          ? 'C:\\Users\\name\\project\\src\\file.ts'
          : '/Users/name/project/src/file.ts';

      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(absolutePath, mockVscode);

      expect(result).toBeDefined();
      expect(result?.uri.fsPath).toBe(absolutePath);
      expect(result?.resolvedVia).toBe('absolute');
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

      expect(result).toBeDefined();
      expect(result?.uri.fsPath).toBe(expectedPath);
      expect(result?.resolvedVia).toBe('workspace-relative');
      expect(mockUriFile).toHaveBeenCalledWith(expectedPath);
    });

    it('should try multiple workspace folders', async () => {
      const workspace1 = '/Users/name/project1';
      const workspace2 = '/Users/name/project2';
      const relativePath = 'src/auth.ts';
      const expectedPath = path.join(workspace2, relativePath);

      mockVscode.workspace.workspaceFolders = [
        createMockWorkspaceFolder(workspace1),
        createMockWorkspaceFolder(workspace2),
      ];

      mockStat.mockImplementation((uri: any) => {
        if (uri.fsPath.includes('project1')) {
          return Promise.reject(new Error('File not found'));
        } else if (uri.fsPath.includes('project2')) {
          return Promise.resolve({} as any);
        }
        return Promise.reject(new Error('Unexpected path'));
      });

      const result = await resolveWorkspacePath(relativePath, mockVscode);

      expect(result).toBeDefined();
      expect(result?.uri.fsPath).toBe(expectedPath);
      expect(result?.resolvedVia).toBe('workspace-relative');
      expect(mockStat).toHaveBeenCalledTimes(2);
    });

    it('should return undefined if file not in any workspace', async () => {
      const workspace1 = '/Users/name/project1';
      const workspace2 = '/Users/name/project2';
      const relativePath = 'src/nonexistent.ts';

      mockVscode.workspace.workspaceFolders = [
        createMockWorkspaceFolder(workspace1),
        createMockWorkspaceFolder(workspace2),
      ];

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

    beforeEach(() => {
      mockFindFiles = jest.fn();
      mockVscode.workspace.findFiles = mockFindFiles;

      const workspaceRoot = '/Users/name/project';
      mockVscode.workspace.workspaceFolders = [createMockWorkspaceFolder(workspaceRoot)];
      mockStat.mockRejectedValue(new Error('File not found'));
    });

    it('should return URI when bare filename matches exactly one file', async () => {
      const matchUri = createMockUri('/Users/name/project/src/deep/auth.ts');
      mockFindFiles.mockResolvedValueOnce([matchUri]);

      const result = await resolveWorkspacePath('auth.ts', mockVscode);

      expect(result).toBeDefined();
      expect(result?.uri.fsPath).toBe('/Users/name/project/src/deep/auth.ts');
      expect(result?.resolvedVia).toBe('filename-fallback');
      expect(mockFindFiles).toHaveBeenCalledWith('**/auth.ts', undefined, 2);
    });

    it('should return undefined when bare filename matches multiple files', async () => {
      const match1 = createMockUri('/Users/name/project/src/auth.ts');
      const match2 = createMockUri('/Users/name/project/lib/auth.ts');
      mockFindFiles.mockResolvedValueOnce([match1, match2]);

      const result = await resolveWorkspacePath('auth.ts', mockVscode);

      expect(result).toBeUndefined();
      expect(mockFindFiles).toHaveBeenCalledWith('**/auth.ts', undefined, 2);
    });

    it('should return undefined when bare filename matches no files', async () => {
      mockFindFiles.mockResolvedValueOnce([]);

      const result = await resolveWorkspacePath('nonexistent.ts', mockVscode);

      expect(result).toBeUndefined();
      expect(mockFindFiles).toHaveBeenCalledWith('**/nonexistent.ts', undefined, 2);
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
      expect(mockFindFiles).toHaveBeenCalledWith('**/auth.ts', undefined, 2);
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

      expect(result).toBeDefined();
      expect(result?.uri.fsPath).toBe(expectedPath);
      expect(result?.resolvedVia).toBe('workspace-relative');
    });

    it('should handle paths with hash in filename', async () => {
      const workspaceRoot = '/Users/name/project';
      const relativePath = 'issue#123/auth.ts';
      const expectedPath = path.join(workspaceRoot, relativePath);

      mockVscode.workspace.workspaceFolders = [createMockWorkspaceFolder(workspaceRoot)];
      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(relativePath, mockVscode);

      expect(result).toBeDefined();
      expect(result?.uri.fsPath).toBe(expectedPath);
      expect(result?.resolvedVia).toBe('workspace-relative');
    });

    it('should handle nested relative paths', async () => {
      const workspaceRoot = '/Users/name/project';
      const relativePath = 'src/nested/deep/path/file.ts';
      const expectedPath = path.join(workspaceRoot, relativePath);

      mockVscode.workspace.workspaceFolders = [createMockWorkspaceFolder(workspaceRoot)];
      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(relativePath, mockVscode);

      expect(result).toBeDefined();
      expect(result?.uri.fsPath).toBe(expectedPath);
      expect(result?.resolvedVia).toBe('workspace-relative');
    });

    it('should handle relative paths starting with ./', async () => {
      const workspaceRoot = '/Users/name/project';
      const relativePath = './src/auth.ts';
      const expectedPath = path.join(workspaceRoot, relativePath);

      mockVscode.workspace.workspaceFolders = [createMockWorkspaceFolder(workspaceRoot)];
      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(relativePath, mockVscode);

      expect(result).toBeDefined();
      expect(result?.uri.fsPath).toBe(expectedPath);
      expect(result?.resolvedVia).toBe('workspace-relative');
    });
  });
});
