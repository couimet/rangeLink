import { createMockLogger } from 'barebone-logger-testing';

import { FilePathPaster, getReferencePath } from '../../services/FilePathPaster';
import { DestinationBehavior, PathFormat, RelativePathFormat } from '../../types';
import {
  createMockConfigReader,
  createMockDestinationManager,
  createMockUri,
  createMockVscodeAdapter,
  createMockWorkspaceFolder,
  spyOnFormatMessage,
  type VscodeAdapterWithTestHooks,
} from '../helpers';

describe('getReferencePath', () => {
  let mockAdapter: VscodeAdapterWithTestHooks;

  beforeEach(() => {
    mockAdapter = createMockVscodeAdapter();
  });

  it('returns workspace-relative path when pathFormat is WorkspaceRelative and file is in workspace', () => {
    const uri = createMockUri('/workspace/src/file.ts');
    jest
      .spyOn(mockAdapter, 'getWorkspaceFolder')
      .mockReturnValue(createMockWorkspaceFolder('/workspace'));
    jest.spyOn(mockAdapter, 'asRelativePath').mockReturnValue('src/file.ts');

    const result = getReferencePath(mockAdapter, uri, PathFormat.WorkspaceRelative);

    expect(result).toBe('src/file.ts');
    expect(mockAdapter.asRelativePath).toHaveBeenCalledWith(uri, 'PathOnly');
  });

  it('returns absolute fsPath when pathFormat is Absolute', () => {
    const uri = createMockUri('/workspace/src/file.ts');
    jest
      .spyOn(mockAdapter, 'getWorkspaceFolder')
      .mockReturnValue(createMockWorkspaceFolder('/workspace'));

    const result = getReferencePath(mockAdapter, uri, PathFormat.Absolute);

    expect(result).toBe('/workspace/src/file.ts');
  });

  it('returns absolute fsPath when file is outside workspace', () => {
    const uri = createMockUri('/other/src/file.ts');
    jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);

    const result = getReferencePath(mockAdapter, uri, PathFormat.WorkspaceRelative);

    expect(result).toBe('/other/src/file.ts');
  });
});

describe('FilePathPaster', () => {
  let paster: FilePathPaster;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockDestinationManager: ReturnType<typeof createMockDestinationManager>;
  let mockConfigReader: ReturnType<typeof createMockConfigReader>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockShowErrorMessage: jest.Mock;
  let formatMessageSpy: jest.SpyInstance;
  let mockClipboardRouter: {
    resolveDestinationBehavior: jest.Mock;
    copyAndSendToDestination: jest.Mock;
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockConfigReader = createMockConfigReader();
    mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
    mockAdapter = createMockVscodeAdapter({
      windowOptions: {
        showErrorMessage: mockShowErrorMessage,
      },
    });
    mockDestinationManager = createMockDestinationManager({ isBound: false });
    mockClipboardRouter = {
      resolveDestinationBehavior: jest.fn(),
      copyAndSendToDestination: jest.fn(),
    };
    paster = new FilePathPaster(
      mockAdapter,
      mockDestinationManager,
      mockConfigReader,
      mockClipboardRouter as any,
      mockLogger,
    );
    formatMessageSpy = spyOnFormatMessage();
  });

  describe('pasteCurrentFilePathToDestination', () => {
    it('shows error when no active editor', async () => {
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(undefined);

      await paster.pasteCurrentFilePathToDestination(PathFormat.Absolute);

      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_PASTE_FILE_PATH_NO_ACTIVE_FILE');
      expect(mockShowErrorMessage).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'FilePathPaster.pasteCurrentFilePath', pathFormat: 'absolute' },
        'No active editor',
      );
    });

    it('delegates to pasteFilePath when active editor exists', async () => {
      const uri = createMockUri('/workspace/src/file.ts');
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(uri);
      mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(undefined);

      await paster.pasteCurrentFilePathToDestination(PathFormat.Absolute);

      expect(mockClipboardRouter.resolveDestinationBehavior).toHaveBeenCalledTimes(1);
    });
  });

  describe('pasteFilePathToDestination', () => {
    it('returns early when picker is cancelled', async () => {
      const uri = createMockUri('/workspace/src/file.ts');
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(undefined);

      await paster.pasteFilePathToDestination(uri, PathFormat.Absolute);

      expect(mockClipboardRouter.copyAndSendToDestination).not.toHaveBeenCalled();
    });

    it('sends file path to destination when resolved', async () => {
      const uri = createMockUri('/workspace/src/file.ts');
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(
        DestinationBehavior.BoundDestination,
      );

      await paster.pasteFilePathToDestination(uri, PathFormat.Absolute);

      expect(mockClipboardRouter.copyAndSendToDestination).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'FilePathPaster.pasteFilePath',
          pathFormat: 'absolute',
          uriSource: 'context-menu',
          filePath: '/workspace/src/file.ts',
        },
        'Resolved file path: /workspace/src/file.ts',
      );
    });

    it('logs when path is quoted for unsafe characters', async () => {
      const uri = createMockUri("/workspace/my project/file's.ts");
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(
        DestinationBehavior.BoundDestination,
      );

      await paster.pasteFilePathToDestination(uri, PathFormat.Absolute);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'FilePathPaster.pasteFilePath',
          pathFormat: 'absolute',
          uriSource: 'context-menu',
          before: "/workspace/my project/file's.ts",
          after: "'/workspace/my project/file'\\''s.ts'",
        },
        'Quoted path for unsafe characters',
      );
    });
  });
});
