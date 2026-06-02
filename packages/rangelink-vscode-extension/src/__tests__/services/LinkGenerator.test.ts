import { createMockLogger } from 'barebone-logger-testing';
import { type DelimiterConfig, type DelimiterConfigGetter, Result } from 'rangelink-core-ts';

import * as handleDirtyBufferWarningModule from '../../services/handleDirtyBufferWarning';
import { LinkGenerator } from '../../services/LinkGenerator';
import { DirtyBufferWarningResult } from '../../types';
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
  let mockSendRouter: {
    resolveDestination: jest.Mock;
    sendToDestination: jest.Mock;
  };
  let mockFeedbackProvider: {
    provideCopyFeedback: jest.Mock;
    provideSendFeedback: jest.Mock;
    showError: jest.Mock;
  };
  let mockSelectionValidator: {
    validateSelectionsAndShowError: jest.Mock;
    mapSelectionsForLogging: jest.Mock;
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
    mockSendRouter = {
      resolveDestination: jest.fn(),
      sendToDestination: jest.fn(),
    };
    mockFeedbackProvider = {
      provideCopyFeedback: jest.fn(),
      provideSendFeedback: jest.fn(),
      showError: jest.fn(),
    };
    mockSelectionValidator = {
      validateSelectionsAndShowError: jest.fn(),
      mapSelectionsForLogging: jest.fn((selections) =>
        selections.map((s: any, i: number) => ({
          index: i,
          start: { line: s.start?.line, char: s.start?.character },
          end: { line: s.end?.line, char: s.end?.character },
          isEmpty: s.isEmpty,
        })),
      ),
    };
    generator = new LinkGenerator(
      getDelimiters,
      mockAdapter,
      mockDestinationManager,
      mockConfigReader,
      mockSendRouter as any,
      mockSelectionValidator as any,
      mockFeedbackProvider as any,
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
      mockSendRouter.resolveDestination.mockResolvedValue(true);

      await generator.createLink();

      expect(mockSendRouter.sendToDestination).toHaveBeenCalledTimes(1);
    });

    it('aborts when generateLinkFromSelection returns undefined', async () => {
      const { mockDoc, validated } = createValidatedResult();
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(validated);
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockGenLink.mockReturnValue(Result.err(new Error('generation failed')));

      await generator.createLink();

      expect(mockSendRouter.resolveDestination).not.toHaveBeenCalled();
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

      expect(mockSendRouter.resolveDestination).not.toHaveBeenCalled();
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
      mockSendRouter.resolveDestination.mockResolvedValue(false);

      await generator.createLink();

      expect(mockSendRouter.sendToDestination).not.toHaveBeenCalled();
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
      const clipboardSpy = jest
        .spyOn(mockAdapter, 'writeTextToClipboard')
        .mockResolvedValue(undefined);
      mockGenLink.mockReturnValue(Result.ok(createMockFormattedLink('src/file.ts#L1')));

      await generator.createLinkOnly();

      expect(clipboardSpy).toHaveBeenCalledWith('src/file.ts#L1');
      expect(mockFeedbackProvider.provideCopyFeedback).toHaveBeenCalledWith(
        'CONTENT_NAME_RANGELINK',
      );
      expect(mockSendRouter.sendToDestination).not.toHaveBeenCalled();
      expect(mockSendRouter.resolveDestination).not.toHaveBeenCalled();
    });

    it('does nothing when no link generated', async () => {
      const clipboardSpy = jest
        .spyOn(mockAdapter, 'writeTextToClipboard')
        .mockResolvedValue(undefined);
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(undefined);

      await generator.createLinkOnly();

      expect(clipboardSpy).not.toHaveBeenCalled();
      expect(mockFeedbackProvider.provideCopyFeedback).not.toHaveBeenCalled();
      expect(mockSendRouter.sendToDestination).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'LinkGenerator.createLinkOnly' },
        'generateLinkFromSelection returned undefined, aborting',
      );
    });
  });

  describe('createPortableLink', () => {
    it('generates Portable link type', async () => {
      const { mockDoc, validated } = createValidatedResult();
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(validated);
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockGenLink.mockReturnValue(Result.ok(createMockFormattedLink('src/file.ts#L1')));
      mockSendRouter.resolveDestination.mockResolvedValue(true);

      await generator.createPortableLink();

      expect(mockSendRouter.sendToDestination).toHaveBeenCalledTimes(1);
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
      const warningSpy = jest
        .spyOn(handleDirtyBufferWarningModule, 'handleDirtyBufferWarning')
        .mockResolvedValue(DirtyBufferWarningResult.Dismissed);

      await generator.createLink();

      expect(warningSpy).toHaveBeenCalledTimes(1);
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
      const warningSpy = jest
        .spyOn(handleDirtyBufferWarningModule, 'handleDirtyBufferWarning')
        .mockResolvedValue(DirtyBufferWarningResult.SaveFailed);

      await generator.createLink();

      expect(warningSpy).toHaveBeenCalledTimes(1);
      expect(mockGenLink).not.toHaveBeenCalled();
    });

    it('shows error when link generation fails', async () => {
      const { mockDoc, validated } = createValidatedResult();
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(validated);
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockGenLink.mockReturnValue(Result.err(new Error('generation failed')));

      await generator.createLink();

      expect(mockFeedbackProvider.showError).toHaveBeenCalledTimes(1);
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
      mockSendRouter.resolveDestination.mockResolvedValue(false);

      await generator.createLink();

      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelection', formattedLink: link },
        `Generated link: ${link.link}`,
      );
    });

    it('re-validates selections and uses post-save selections when warning returns SaveAndContinue', async () => {
      const preSaveSel = createMockSelection({
        isEmpty: false,
        start: { line: 4, character: 0 } as any,
        end: { line: 4, character: 10 } as any,
      });
      const postSaveSel = createMockSelection({
        isEmpty: false,
        start: { line: 3, character: 0 } as any,
        end: { line: 3, character: 10 } as any,
      });
      const mockDoc = createMockDocument({
        uri: createMockUri('/workspace/src/file.ts'),
        isDirty: true,
      });
      const mockEditor = createMockEditor({ document: mockDoc, selections: [postSaveSel] });
      mockSelectionValidator.validateSelectionsAndShowError
        .mockReturnValueOnce({ editor: mockEditor, selections: [preSaveSel] })
        .mockReturnValueOnce({ editor: mockEditor, selections: [postSaveSel] });
      jest
        .spyOn(handleDirtyBufferWarningModule, 'handleDirtyBufferWarning')
        .mockResolvedValue(DirtyBufferWarningResult.SaveAndContinue);
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockGenLink.mockReturnValue(Result.ok(createMockFormattedLink('src/file.ts#L4C1-L4C11')));
      mockSendRouter.resolveDestination.mockResolvedValue(false);

      await generator.createLink();

      expect(mockSelectionValidator.validateSelectionsAndShowError).toHaveBeenCalledTimes(2);
      expect(mockGenLink).toHaveBeenCalledWith({
        referencePath: '/workspace/src/file.ts',
        document: mockDoc,
        selections: [postSaveSel],
        delimiters: DELIMITERS,
        linkType: 'regular',
        logger: mockLogger,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'generateLinkFromSelection',
          preSaveSelections: [
            { index: 0, start: { line: 4, char: 0 }, end: { line: 4, char: 10 }, isEmpty: false },
          ],
          postSaveSelections: [
            { index: 0, start: { line: 3, char: 0 }, end: { line: 3, char: 10 }, isEmpty: false },
          ],
        },
        'Re-read selections after Save & Continue to account for possible format-on-save shifts',
      );
    });

    it('aborts when post-save re-validation returns undefined', async () => {
      const mockDoc = createMockDocument({
        uri: createMockUri('/workspace/src/file.ts'),
        isDirty: true,
      });
      const mockEditor = createMockEditor({
        document: mockDoc,
        selections: [createMockSelection({ isEmpty: false })],
      });
      mockSelectionValidator.validateSelectionsAndShowError
        .mockReturnValueOnce({
          editor: mockEditor,
          selections: [createMockSelection({ isEmpty: false })],
        })
        .mockReturnValueOnce(undefined);
      jest
        .spyOn(handleDirtyBufferWarningModule, 'handleDirtyBufferWarning')
        .mockResolvedValue(DirtyBufferWarningResult.SaveAndContinue);

      await generator.createLink();

      expect(mockSelectionValidator.validateSelectionsAndShowError).toHaveBeenCalledTimes(2);
      expect(mockGenLink).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelection' },
        'Post-save re-validation returned no selections, aborting',
      );
    });

    it('does NOT re-validate selections when warning returns ContinueAnyway', async () => {
      const mockDoc = createMockDocument({
        uri: createMockUri('/workspace/src/file.ts'),
        isDirty: true,
      });
      const sel = createMockSelection({ isEmpty: false });
      const mockEditor = createMockEditor({ document: mockDoc, selections: [sel] });
      mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue({
        editor: mockEditor,
        selections: [sel],
      });
      jest
        .spyOn(handleDirtyBufferWarningModule, 'handleDirtyBufferWarning')
        .mockResolvedValue(DirtyBufferWarningResult.ContinueAnyway);
      jest.spyOn(mockAdapter, 'getActiveTextEditorUri').mockReturnValue(mockDoc.uri);
      jest.spyOn(mockAdapter, 'getWorkspaceFolder').mockReturnValue(undefined);
      mockGenLink.mockReturnValue(Result.ok(createMockFormattedLink('src/file.ts#L1')));
      mockSendRouter.resolveDestination.mockResolvedValue(false);

      await generator.createLink();

      expect(mockSelectionValidator.validateSelectionsAndShowError).toHaveBeenCalledTimes(1);
      expect(mockSelectionValidator.mapSelectionsForLogging).not.toHaveBeenCalled();
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
      mockSendRouter.resolveDestination.mockResolvedValue(true);

      await generator.createLink();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'LinkGenerator.copyToClipboardAndDestination',
          link: link.link,
          rawLink: link.rawLink,
        },
        'Sending link to destination',
      );
      expect(mockSendRouter.sendToDestination).toHaveBeenCalledTimes(1);
      const expectedViewColumn = mockAdapter.getActiveEditorViewColumn();
      expect(mockSendRouter.sendToDestination).toHaveBeenCalledWith({
        control: {
          contentType: 'Link',
        },
        content: {
          clipboard: ' src/file.ts#L1 ',
          send: { ...link, link: ' src/file.ts#L1 ' },
          sourceUri: mockDoc.uri,
          sourceViewColumn: expectedViewColumn,
        },
        strategies: {
          sendFn: expect.any(Function) as unknown,
          isEligibleFn: expect.any(Function) as unknown,
        },
        contentNameCode: 'CONTENT_NAME_RANGELINK',
        fnName: 'copyToClipboardAndDestination',
        selfPastePolicy: 'block-on-uri',
        writeClipboardOnSelfPasteBlock: true,
      });
    });
  });
});
