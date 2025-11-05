import * as path from 'path';
import * as vscode from 'vscode';

import { resolveWorkspacePath } from '../../utils/resolveWorkspacePath';

// Mock vscode module
jest.mock('vscode', () => {
  const mockUri = {
    file: jest.fn((fsPath: string) => ({
      fsPath,
      scheme: 'file',
      path: fsPath,
      toString: () => `file://${fsPath}`,
    })),
  };

  const mockWorkspace = {
    fs: {
      stat: jest.fn(),
    },
  };

  return {
    Uri: mockUri,
    workspace: mockWorkspace,
    FileSystemError: {
      FileNotFound: jest.fn((message: string) => new Error(message)),
    },
  };
});

describe('resolveWorkspacePath', () => {
  const mockWorkspace = vscode.workspace as jest.Mocked<typeof vscode.workspace>;
  const mockUri = vscode.Uri as jest.Mocked<typeof vscode.Uri>;
  const mockStat = mockWorkspace.fs.stat as jest.MockedFunction<typeof mockWorkspace.fs.stat>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Reset workspaceFolders to undefined
    Object.defineProperty(mockWorkspace, 'workspaceFolders', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  describe('Absolute paths', () => {
    it('should resolve absolute path if file exists', async () => {
      const absolutePath = '/Users/name/project/src/auth.ts';
      mockStat.mockResolvedValueOnce({} as any); // File exists

      const result = await resolveWorkspacePath(absolutePath);

      expect(result).toBeDefined();
      expect(result?.fsPath).toStrictEqual(absolutePath);
      expect(mockUri.file).toHaveBeenCalledWith(absolutePath);
      expect(mockStat).toHaveBeenCalledTimes(1);
    });

    it('should return undefined if absolute path does not exist', async () => {
      const absolutePath = '/Users/name/project/nonexistent.ts';
      mockStat.mockRejectedValueOnce(new Error('File not found'));

      const result = await resolveWorkspacePath(absolutePath);

      expect(result).toBeUndefined();
      expect(mockUri.file).toHaveBeenCalledWith(absolutePath);
      expect(mockStat).toHaveBeenCalledTimes(1);
    });

    it('should handle platform-native absolute paths', async () => {
      // Use platform-appropriate absolute path
      // This test verifies absolute path handling on the current platform
      const absolutePath = process.platform === 'win32'
        ? 'C:\\Users\\name\\project\\src\\file.ts'
        : '/Users/name/project/src/file.ts';

      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(absolutePath);

      expect(result).toBeDefined();
      expect(result?.fsPath).toStrictEqual(absolutePath);
      expect(mockUri.file).toHaveBeenCalledWith(absolutePath);
    });
  });

  describe('Workspace-relative paths', () => {
    it('should resolve relative path in single workspace folder', async () => {
      const workspaceRoot = '/Users/name/project';
      const relativePath = 'src/auth.ts';
      const expectedPath = path.join(workspaceRoot, relativePath);

      Object.defineProperty(mockWorkspace, 'workspaceFolders', {
        value: [{ uri: { fsPath: workspaceRoot } }],
        writable: true,
        configurable: true,
      });
      mockStat.mockResolvedValueOnce({} as any); // File exists

      const result = await resolveWorkspacePath(relativePath);

      expect(result).toBeDefined();
      expect(result?.fsPath).toStrictEqual(expectedPath);
      expect(mockUri.file).toHaveBeenCalledWith(expectedPath);
    });

    it('should try multiple workspace folders', async () => {
      const workspace1 = '/Users/name/project1';
      const workspace2 = '/Users/name/project2';
      const relativePath = 'src/auth.ts';
      const expectedPath = path.join(workspace2, relativePath);

      Object.defineProperty(mockWorkspace, 'workspaceFolders', {
        value: [
          { uri: { fsPath: workspace1 } },
          { uri: { fsPath: workspace2 } },
        ],
        writable: true,
        configurable: true,
      });

      // Mock implementation to check which path is being accessed
      mockStat.mockImplementation((uri: any) => {
        if (uri.fsPath.includes('project1')) {
          return Promise.reject(new Error('File not found'));
        } else if (uri.fsPath.includes('project2')) {
          return Promise.resolve({} as any);
        }
        return Promise.reject(new Error('Unexpected path'));
      });

      const result = await resolveWorkspacePath(relativePath);

      expect(result).toBeDefined();
      expect(result?.fsPath).toStrictEqual(expectedPath);
      expect(mockStat).toHaveBeenCalledTimes(2);
    });

    it('should return undefined if file not in any workspace', async () => {
      const workspace1 = '/Users/name/project1';
      const workspace2 = '/Users/name/project2';
      const relativePath = 'src/nonexistent.ts';

      Object.defineProperty(mockWorkspace, 'workspaceFolders', {
        value: [
          { uri: { fsPath: workspace1 } },
          { uri: { fsPath: workspace2 } },
        ],
        writable: true,
        configurable: true,
      });

      // All workspaces: file not found - use mockImplementation to ensure all calls fail
      mockStat.mockImplementation(() => Promise.reject(new Error('File not found')));

      const result = await resolveWorkspacePath(relativePath);

      expect(result).toBeUndefined();
      expect(mockStat).toHaveBeenCalledTimes(2);
    });
  });

  describe('No workspace', () => {
    it('should return undefined when no workspace is open', async () => {
      Object.defineProperty(mockWorkspace, 'workspaceFolders', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = await resolveWorkspacePath('src/auth.ts');

      expect(result).toBeUndefined();
      expect(mockStat).not.toHaveBeenCalled();
    });

    it('should return undefined when workspace folders array is empty', async () => {
      Object.defineProperty(mockWorkspace, 'workspaceFolders', {
        value: [],
        writable: true,
        configurable: true,
      });

      const result = await resolveWorkspacePath('src/auth.ts');

      expect(result).toBeUndefined();
      expect(mockStat).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle paths with special characters', async () => {
      const workspaceRoot = '/Users/name/project';
      const relativePath = 'src/file with spaces.ts';
      const expectedPath = path.join(workspaceRoot, relativePath);

      Object.defineProperty(mockWorkspace, 'workspaceFolders', {
        value: [{ uri: { fsPath: workspaceRoot } }],
        writable: true,
        configurable: true,
      });
      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(relativePath);

      expect(result).toBeDefined();
      expect(result?.fsPath).toStrictEqual(expectedPath);
    });

    it('should handle paths with hash in filename', async () => {
      const workspaceRoot = '/Users/name/project';
      const relativePath = 'issue#123/auth.ts';
      const expectedPath = path.join(workspaceRoot, relativePath);

      Object.defineProperty(mockWorkspace, 'workspaceFolders', {
        value: [{ uri: { fsPath: workspaceRoot } }],
        writable: true,
        configurable: true,
      });
      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(relativePath);

      expect(result).toBeDefined();
      expect(result?.fsPath).toStrictEqual(expectedPath);
    });

    it('should handle nested relative paths', async () => {
      const workspaceRoot = '/Users/name/project';
      const relativePath = 'src/nested/deep/path/file.ts';
      const expectedPath = path.join(workspaceRoot, relativePath);

      Object.defineProperty(mockWorkspace, 'workspaceFolders', {
        value: [{ uri: { fsPath: workspaceRoot } }],
        writable: true,
        configurable: true,
      });
      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(relativePath);

      expect(result).toBeDefined();
      expect(result?.fsPath).toStrictEqual(expectedPath);
    });

    it('should handle relative paths starting with ./', async () => {
      const workspaceRoot = '/Users/name/project';
      const relativePath = './src/auth.ts';
      const expectedPath = path.join(workspaceRoot, relativePath);

      Object.defineProperty(mockWorkspace, 'workspaceFolders', {
        value: [{ uri: { fsPath: workspaceRoot } }],
        writable: true,
        configurable: true,
      });
      mockStat.mockResolvedValueOnce({} as any);

      const result = await resolveWorkspacePath(relativePath);

      expect(result).toBeDefined();
      expect(result?.fsPath).toStrictEqual(expectedPath);
    });
  });
});
