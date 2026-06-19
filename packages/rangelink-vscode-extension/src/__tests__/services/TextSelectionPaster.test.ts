import { createMockLogger } from '@couimet/logger-contract-testing';

import { TextSelectionPaster } from '../../services/TextSelectionPaster';
import {
  createMockConfigReader,
  createMockDestinationManager,
  createMockDocument,
  createMockEditor,
  createMockSelection,
  createMockText,
  createMockUri,
} from '../helpers';

describe('TextSelectionPaster', () => {
  let paster: TextSelectionPaster;
  let mockDestinationManager: ReturnType<typeof createMockDestinationManager>;
  let mockConfigReader: ReturnType<typeof createMockConfigReader>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockSendRouter: {
    resolveDestination: jest.Mock;
    sendToDestination: jest.Mock;
  };
  let mockSelectionValidator: {
    validateSelectionsAndShowError: jest.Mock;
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockConfigReader = createMockConfigReader();
    mockDestinationManager = createMockDestinationManager();
    mockSendRouter = {
      resolveDestination: jest.fn(),
      sendToDestination: jest.fn(),
    };
    mockSelectionValidator = {
      validateSelectionsAndShowError: jest.fn(),
    };
    paster = new TextSelectionPaster(
      mockDestinationManager,
      mockConfigReader,
      mockSendRouter as any,
      mockSelectionValidator as any,
      mockLogger,
    );
  });

  it('returns early when validation fails', async () => {
    mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(undefined);

    await paster.pasteSelectedTextToDestination();

    expect(mockSendRouter.resolveDestination).not.toHaveBeenCalled();
  });

  it('extracts text from single selection and sends to destination', async () => {
    const mockDoc = createMockDocument({
      uri: createMockUri('/workspace/file.ts'),
      getText: createMockText('selected text'),
    });
    const sel = createMockSelection({ isEmpty: false });
    const mockEditor = createMockEditor({ document: mockDoc, selections: [sel] });
    mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue({
      editor: mockEditor,
      selections: [sel],
    });
    mockSendRouter.resolveDestination.mockResolvedValue({ canProceed: true, bindPerformed: false });
    mockConfigReader.getPaddingMode.mockReturnValue('both');

    await paster.pasteSelectedTextToDestination();

    expect(mockSendRouter.sendToDestination).toHaveBeenCalledTimes(1);
    expect(mockSendRouter.sendToDestination).toHaveBeenCalledWith(
      {
        control: {
          contentType: 'Text',
        },
        content: {
          clipboard: ' selected text ',
          send: ' selected text ',
          sourceUri: mockDoc.uri,
          sourceViewColumn: mockEditor.viewColumn,
        },
        strategies: {
          sendFn: expect.any(Function) as unknown,
          isEligibleFn: expect.any(Function) as unknown,
        },
        contentNameCode: 'CONTENT_NAME_SELECTED_TEXT',
        fnName: 'pasteSelectedTextToDestination',
        selfPastePolicy: 'block-on-editor-selection',
      },
      undefined,
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      {
        fn: 'TextSelectionPaster.pasteSelectedTextToDestination',
        selectionCount: 1,
        contentLength: 13,
      },
      'Extracted 13 chars from 1 selection(s)',
    );
  });

  it('concatenates multiple selections with newlines', async () => {
    const getText = jest.fn().mockReturnValueOnce('line1').mockReturnValueOnce('line2');
    const mockDoc = createMockDocument({
      uri: createMockUri('/workspace/file.ts'),
      getText,
    });
    const sel1 = createMockSelection({ isEmpty: false });
    const sel2 = createMockSelection({ isEmpty: false });
    const mockEditor = createMockEditor({ document: mockDoc, selections: [sel1, sel2] });
    mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue({
      editor: mockEditor,
      selections: [sel1, sel2],
    });
    mockSendRouter.resolveDestination.mockResolvedValue({ canProceed: true, bindPerformed: false });

    await paster.pasteSelectedTextToDestination();

    expect(mockSendRouter.sendToDestination).toHaveBeenCalledTimes(1);
    expect(mockSendRouter.sendToDestination).toHaveBeenCalledWith(
      {
        control: {
          contentType: 'Text',
        },
        content: {
          clipboard: 'line1\nline2',
          send: 'line1\nline2',
          sourceUri: mockDoc.uri,
          sourceViewColumn: mockEditor.viewColumn,
        },
        strategies: {
          sendFn: expect.any(Function) as unknown,
          isEligibleFn: expect.any(Function) as unknown,
        },
        contentNameCode: 'CONTENT_NAME_SELECTED_TEXT',
        fnName: 'pasteSelectedTextToDestination',
        selfPastePolicy: 'block-on-editor-selection',
      },
      undefined,
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      {
        fn: 'TextSelectionPaster.pasteSelectedTextToDestination',
        selectionCount: 2,
        contentLength: 11,
      },
      'Extracted 11 chars from 2 selection(s)',
    );
  });

  it('returns early when picker is cancelled', async () => {
    const mockDoc = createMockDocument({
      uri: createMockUri('/workspace/file.ts'),
      getText: createMockText('text'),
    });
    const sel = createMockSelection({ isEmpty: false });
    const mockEditor = createMockEditor({ document: mockDoc, selections: [sel] });
    mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue({
      editor: mockEditor,
      selections: [sel],
    });
    mockSendRouter.resolveDestination.mockResolvedValue({ canProceed: false });

    await paster.pasteSelectedTextToDestination();

    expect(mockSendRouter.sendToDestination).not.toHaveBeenCalled();
  });

  it('uses CONTENT_NAME_SELECTED_TEXT as content name', async () => {
    const mockDoc = createMockDocument({
      uri: createMockUri('/workspace/file.ts'),
      getText: createMockText('text'),
    });
    const sel = createMockSelection({ isEmpty: false });
    const mockEditor = createMockEditor({ document: mockDoc, selections: [sel] });
    mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue({
      editor: mockEditor,
      selections: [sel],
    });
    mockSendRouter.resolveDestination.mockResolvedValue({ canProceed: true, bindPerformed: false });

    await paster.pasteSelectedTextToDestination();

    expect(mockSendRouter.sendToDestination).toHaveBeenCalledTimes(1);
    expect(mockSendRouter.sendToDestination).toHaveBeenCalledWith(
      {
        control: {
          contentType: 'Text',
        },
        content: {
          clipboard: 'text',
          send: 'text',
          sourceUri: mockDoc.uri,
          sourceViewColumn: mockEditor.viewColumn,
        },
        strategies: {
          sendFn: expect.any(Function) as unknown,
          isEligibleFn: expect.any(Function) as unknown,
        },
        contentNameCode: 'CONTENT_NAME_SELECTED_TEXT',
        fnName: 'pasteSelectedTextToDestination',
        selfPastePolicy: 'block-on-editor-selection',
      },
      undefined,
    );
  });
});
