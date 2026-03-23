import { createMockLogger } from 'barebone-logger-testing';

import { TextSelectionPaster } from '../../services/TextSelectionPaster';
import { DestinationBehavior } from '../../types';
import {
  createMockConfigReader,
  createMockDestinationManager,
  createMockDocument,
  createMockEditor,
  createMockSelection,
  createMockText,
  createMockUri,
  spyOnFormatMessage,
} from '../helpers';

describe('TextSelectionPaster', () => {
  let paster: TextSelectionPaster;
  let mockDestinationManager: ReturnType<typeof createMockDestinationManager>;
  let mockConfigReader: ReturnType<typeof createMockConfigReader>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let formatMessageSpy: jest.SpyInstance;
  let mockClipboardRouter: {
    resolveDestinationBehavior: jest.Mock;
    copyAndSendToDestination: jest.Mock;
  };
  let mockSelectionValidator: {
    validateSelectionsAndShowError: jest.Mock;
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockConfigReader = createMockConfigReader();
    mockDestinationManager = createMockDestinationManager({ isBound: false });
    mockClipboardRouter = {
      resolveDestinationBehavior: jest.fn(),
      copyAndSendToDestination: jest.fn(),
    };
    mockSelectionValidator = {
      validateSelectionsAndShowError: jest.fn(),
    };
    paster = new TextSelectionPaster(
      mockDestinationManager,
      mockConfigReader,
      mockClipboardRouter as any,
      mockSelectionValidator as any,
      mockLogger,
    );
    formatMessageSpy = spyOnFormatMessage();
  });

  it('returns early when validation fails', async () => {
    mockSelectionValidator.validateSelectionsAndShowError.mockReturnValue(undefined);

    await paster.pasteSelectedTextToDestination();

    expect(mockClipboardRouter.resolveDestinationBehavior).not.toHaveBeenCalled();
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
    mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(
      DestinationBehavior.BoundDestination,
    );

    await paster.pasteSelectedTextToDestination();

    expect(mockClipboardRouter.copyAndSendToDestination).toHaveBeenCalledTimes(1);
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
    mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(
      DestinationBehavior.BoundDestination,
    );

    await paster.pasteSelectedTextToDestination();

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
    mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(undefined);

    await paster.pasteSelectedTextToDestination();

    expect(mockClipboardRouter.copyAndSendToDestination).not.toHaveBeenCalled();
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
    mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(
      DestinationBehavior.BoundDestination,
    );

    await paster.pasteSelectedTextToDestination();

    expect(formatMessageSpy).toHaveBeenCalledWith('CONTENT_NAME_SELECTED_TEXT');
  });
});
