import { createMockLogger } from '@couimet/logger-contract-testing';

import { ManualPasteInsertFactory } from '../../../../destinations/capabilities/insertFactories/manualPasteInsertFactory';

const LINK_TEXT = 'src/app.ts#L10-L20';
const LINK_TEXT_LENGTH = LINK_TEXT.length;

describe('ManualPasteInsertFactory', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('returns true and logs the manual paste instruction', async () => {
    const factory = new ManualPasteInsertFactory(mockLogger);
    const insertFn = factory.forTarget();

    const result = await insertFn(LINK_TEXT);

    expect(result).toBe(true);
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'ManualPasteInsertFactory.insert', textLength: LINK_TEXT_LENGTH },
      'Link ready for manual paste',
    );
  });
});
