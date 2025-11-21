import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import type { DelimiterConfig } from 'rangelink-core-ts';
import { LinkType, SelectionType } from 'rangelink-core-ts';

import type { RangeLinkNavigationHandler } from '../../navigation/RangeLinkNavigationHandler';
import { RangeLinkTerminalProvider } from '../../navigation/RangeLinkTerminalProvider';
import type { RangeLinkTerminalLink } from '../../types';
import { createMockVscodeAdapter, type VscodeAdapterWithTestHooks } from '../helpers/mockVSCode';

describe('RangeLinkTerminalProvider', () => {
  let provider: RangeLinkTerminalProvider;
  let mockLogger: Logger;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockHandler: jest.Mocked<RangeLinkNavigationHandler>;

  beforeEach(() => {
    // Mock logger
    mockLogger = createMockLogger();

    mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'showWarningMessage').mockResolvedValue(undefined);

    // Create mock handler - test provider orchestration, not handler implementation
    mockHandler = {
      navigateToLink: jest.fn().mockResolvedValue(undefined),
      getPattern: jest.fn(),
      parseLink: jest.fn(),
      formatTooltip: jest.fn(),
    } as unknown as jest.Mocked<RangeLinkNavigationHandler>;

    provider = new RangeLinkTerminalProvider(mockHandler, mockAdapter, mockLogger);
  });

  describe('handleTerminalLink - Safety Net Validation', () => {
    it('should handle missing parsed data gracefully (safety net)', async () => {
      // Arrange: Create link with undefined parsed data
      // (Should never happen in practice, but testing the safety net)
      const link: RangeLinkTerminalLink = {
        startIndex: 0,
        length: 15,
        tooltip: 'Test link',
        data: 'file.ts#L0',
        parsed: undefined, // Safety net case
      };

      // Act
      await provider.handleTerminalLink(link);

      // Assert: Logger should receive linkText in logCtx plus full link object
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      const warnCall = (mockLogger.warn as jest.Mock).mock.calls[0];
      expect(warnCall[0]).toStrictEqual({
        fn: 'RangeLinkTerminalProvider.handleTerminalLink',
        linkText: 'file.ts#L0',
        link,
      });
      expect(warnCall[1]).toStrictEqual(
        'Terminal link clicked but parse data missing (safety net triggered)',
      );

      expect(mockAdapter.showWarningMessage).toHaveBeenCalledWith(
        'RangeLink: Cannot navigate - invalid link format: file.ts#L0',
      );

      // Should NOT proceed to navigation
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should delegate to handler when parsed data is present', async () => {
      // Arrange: Create valid link with parsed data
      const parsedData = {
        path: 'file.ts',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      const link: RangeLinkTerminalLink = {
        startIndex: 0,
        length: 15,
        tooltip: 'Open file.ts:10',
        data: 'file.ts#L10',
        parsed: parsedData,
      };

      // Act
      await provider.handleTerminalLink(link);

      // Assert: Provider should delegate to handler with correct parameters
      expect(mockHandler.navigateToLink).toHaveBeenCalledWith(parsedData, 'file.ts#L10');
      expect(mockHandler.navigateToLink).toHaveBeenCalledTimes(1);

      // Should NOT trigger the safety net warning
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockAdapter.showWarningMessage).not.toHaveBeenCalled();
    });
  });
});
