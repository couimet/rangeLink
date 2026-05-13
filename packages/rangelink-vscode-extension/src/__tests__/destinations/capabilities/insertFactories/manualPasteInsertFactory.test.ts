import { createMockLogger } from 'barebone-logger-testing';

import { ManualPasteInsertFactory } from '../../../../destinations/capabilities/insertFactories/manualPasteInsertFactory';
import { createMockVscodeAdapter } from '../../../helpers';

const LINK_TEXT = 'src/app.ts#L10-L20';
const LINK_TEXT_LENGTH = LINK_TEXT.length;

describe('ManualPasteInsertFactory', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('returns true without touching the clipboard or executing commands', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const clipboardSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard');
    const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand');

    const factory = new ManualPasteInsertFactory(mockLogger);
    const insertFn = factory.forTarget();

    const result = await insertFn(LINK_TEXT);

    expect(result).toBe(true);
    expect(clipboardSpy).not.toHaveBeenCalled();
    expect(executeCommandSpy).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'ManualPasteInsertFactory.insert', textLength: LINK_TEXT_LENGTH },
      'Link ready for manual paste',
    );
  });
});
