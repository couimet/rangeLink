import { createMockLogger } from 'barebone-logger-testing';
import { type DelimiterConfig, type DelimiterConfigGetter, Result } from 'rangelink-core-ts';

import * as handleDirtyBufferWarningModule from '../../services/handleDirtyBufferWarning';
import { LinkGenerator } from '../../services/LinkGenerator';
import { DestinationBehavior, DirtyBufferWarningResult } from '../../types';
import {
  createMockConfigReader,
  createMockDestinationManager,
  createMockDocument,
  createMockEditor,
  createMockFormattedLink,
  createMockSelection,
  createMockUri,
  createMockVscodeAdapter,
  spyOnFormatMessage,
  spyOnGenerateLinkFromSelections,
  type VscodeAdapterWithTestHooks,
} from '../helpers';

const DELIMITERS: DelimiterConfig = { line: 'L', position: 'C', hash: '#', range: '-' };
const getDelimiters: DelimiterConfigGetter = () => DELIMITERS;

const createValidatedResult = (overrides: { isDirty?: boolean } = {}) => {
  const mockDoc = createMockDocument({
    uri: createMockUri('/workspace/src/file.ts'),
    isDirty: overrides.isDirty ?? false,
  });
  const sel = createMockSelection({ isEmpty: false });
  const mockEditor = createMockEditor({ document: mockDoc, selections: [sel] });
  return {
    mockDoc,
    mockEditor,
    validated: { editor: mockEditor, selections: [sel] },
  };
};

describe('LinkGenerator', () => {
  let generator: LinkGenerator;
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
  let mockSelectionValidator: {
    validateSelectionsAndShowError: jest.Mock;
  };
  let mockGenLink: jest.SpyInstance;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockConfigReader = createMockConfigReader();
    mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
    mockAdapter = createMockVscodeAdapter({
      windowOptions: { showErrorMessage: mockShowErrorMessage },
    });
    mockDestinationManager = createMockDestinationManager({ isBound: false });
    mockClipboardRouter = {
      resolveDestinationBehavior: jest.fn(),
      copyAndSendToDestination: jest.fn(),
    };
    mockSelectionValidator = {
      validateSelectionsAndShowError: jest.fn(),
    };
    generator = new LinkGenerator(
      getDelimiters,
      mockAdapter,
      mockDestinationManager,
      mockConfigReader,
      mockClipboardRouter as any,
      mockSelectionValidator as any,
      mockLogger,
    );
    formatMessageSpy = spyOnFormatMessage();
    mockGenLink = spyOnGenerateLinkFromSelections();
  });

  describe('createLink', () => {
    it('generates Regular link and sends to destination when bound', async () => {
      const { mockDoc, validated } = createValidatedResult();
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(validated);
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockGenLink.mockReturnValue(Result.ok(createMockFormattedLink('src/file.ts#L1')));
      mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(
        DestinationBehavior.BoundDestination,
      );

      await generator.createLink();

      expect(mockClipboardRouter.copyAndSendToDestination).toHaveBeenCalledTimes(1);
      expect(formatMessageSpy).toHaveBeenCalledWith('CONTENT_NAME_RANGELINK');
    });

    it('aborts when generateLinkFromSelection returns undefined', async () => {
      const { mockDoc, validated } = createValidatedResult();
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(validated);
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockGenLink.mockReturnValue(Result.err(new Error('generation failed')));

      await generator.createLink();

      expect(mockClipboardRouter.resolveDestinationBehavior).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'LinkGenerator.createLinkCore', linkType: 'regular' },
        'generateLinkFromSelection returned undefined, aborting',
      );
    });

    it('aborts when active editor URI unavailable after link generation', async () => {
      const { mockDoc, validated } = createValidatedResult();
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(validated);
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockGenLink.mockReturnValue(Result.ok(createMockFormattedLink('src/file.ts#L1')));
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(undefined);

      await generator.createLink();

      expect(mockClipboardRouter.resolveDestinationBehavior).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'LinkGenerator.createLinkCore', linkType: 'regular' },
        'Active editor URI unavailable, aborting',
      );
    });

    it('aborts when picker is cancelled', async () => {
      const { mockDoc, validated } = createValidatedResult();
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(validated);
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockGenLink.mockReturnValue(Result.ok(createMockFormattedLink('src/file.ts#L1')));
      mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(undefined);

      await generator.createLink();

      expect(mockClipboardRouter.copyAndSendToDestination).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'generateLinkFromSelection',
          formattedLink: createMockFormattedLink('src/file.ts#L1'),
        },
        'Generated link: src/file.ts#L1',
      );
    });
  });

  describe('createLinkOnly', () => {
    it('sends to clipboard only when link generated', async () => {
      const { mockDoc, validated } = createValidatedResult();
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(validated);
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockGenLink.mockReturnValue(Result.ok(createMockFormattedLink('src/file.ts#L1')));

      await generator.createLinkOnly();

      expect(mockClipboardRouter.copyAndSendToDestination).toHaveBeenCalledTimes(1);
      expect(mockClipboardRouter.resolveDestinationBehavior).not.toHaveBeenCalled();
    });

    it('does nothing when no link generated', async () => {
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(undefined);

      await generator.createLinkOnly();

      expect(mockClipboardRouter.copyAndSendToDestination).not.toHaveBeenCalled();
    });
  });

  describe('createPortableLink', () => {
    it('generates Portable link type', async () => {
      const { mockDoc, validated } = createValidatedResult();
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(validated);
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockGenLink.mockReturnValue(Result.ok(createMockFormattedLink('src/file.ts#L1')));
      mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(
        DestinationBehavior.BoundDestination,
      );

      await generator.createPortableLink();

      expect(formatMessageSpy).toHaveBeenCalledWith('CONTENT_NAME_PORTABLE_RANGELINK');
    });
  });

  describe('generateLinkFromSelection', () => {
    it('returns undefined when validation fails', async () => {
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(undefined);

      await generator.createLink();

      expect(mockGenLink).not.toHaveBeenCalled();
    });

    it('aborts when dirty buffer warning returns Dismissed', async () => {
      const mockDoc = createMockDocument({
        uri: createMockUri('/workspace/src/file.ts'),
        isDirty: true,
      });
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue({
        editor: { document: mockDoc, selections: [createMockSelection({ isEmpty: false })] },
        selections: [createMockSelection({ isEmpty: false })],
      });
      jest
        .spyOn(handleDirtyBufferWarningModule, 'handleDirtyBufferWarning')
        .mockResolvedValue(DirtyBufferWarningResult.Dismissed);

      await generator.createLink();

      expect(mockGenLink).not.toHaveBeenCalled();
    });

    it('aborts when dirty buffer warning returns SaveFailed', async () => {
      const mockDoc = createMockDocument({
        uri: createMockUri('/workspace/src/file.ts'),
        isDirty: true,
      });
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue({
        editor: { document: mockDoc, selections: [createMockSelection({ isEmpty: false })] },
        selections: [createMockSelection({ isEmpty: false })],
      });
      jest
        .spyOn(handleDirtyBufferWarningModule, 'handleDirtyBufferWarning')
        .mockResolvedValue(DirtyBufferWarningResult.SaveFailed);

      await generator.createLink();

      expect(mockGenLink).not.toHaveBeenCalled();
    });

    it('shows error when link generation fails', async () => {
      const { mockDoc, validated } = createValidatedResult();
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(validated);
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockGenLink.mockReturnValue(Result.err(new Error('generation failed')));

      await generator.createLink();

      expect(mockShowErrorMessage).toHaveBeenCalledTimes(1);
      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_LINK_GENERATION_FAILED', {
        linkTypeName: 'link',
      });
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    it('uses "portable link" in error message for Portable type', async () => {
      const { mockDoc, validated } = createValidatedResult();
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(validated);
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockGenLink.mockReturnValue(Result.err(new Error('generation failed')));

      await generator.createPortableLink();

      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_LINK_GENERATION_FAILED', {
        linkTypeName: 'portable link',
      });
    });

    it('logs generated link on success', async () => {
      const { mockDoc, validated } = createValidatedResult();
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(validated);
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      const link = createMockFormattedLink('src/file.ts#L1C1-L5C10');
      mockGenLink.mockReturnValue(Result.ok(link));
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(undefined);

      await generator.createLink();

      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelection', formattedLink: link },
        `Generated link: ${link.link}`,
      );
    });
  });

  describe('copyToClipboardAndDestination', () => {
    it('logs and sends link with padding mode', async () => {
      const { mockDoc, validated } = createValidatedResult();
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(validated);
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      const link = createMockFormattedLink('src/file.ts#L1');
      mockGenLink.mockReturnValue(Result.ok(link));
      mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(
        DestinationBehavior.BoundDestination,
      );

      await generator.createLink();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'LinkGenerator.copyToClipboardAndDestination',
          link: link.link,
          rawLink: link.rawLink,
        },
        'Sending link to destination',
      );
      expect(mockClipboardRouter.copyAndSendToDestination).toHaveBeenCalledTimes(1);
    });
  });
});
