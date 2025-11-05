import type { DelimiterConfig, Logger } from 'rangelink-core-ts';
import { LinkType, SelectionType } from 'rangelink-core-ts';

import { RangeLinkTerminalProvider } from '../../navigation/RangeLinkTerminalProvider';
import type { RangeLinkTerminalLink } from '../../types';

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showTextDocument: jest.fn(),
  },
  workspace: {
    workspaceFolders: [],
    openTextDocument: jest.fn(),
    fs: {
      stat: jest.fn(),
    },
  },
  Uri: {
    file: jest.fn(),
    parse: jest.fn(),
  },
  Selection: jest.fn(),
  Position: jest.fn(),
  Range: jest.fn(),
}));

describe('RangeLinkTerminalProvider', () => {
  let provider: RangeLinkTerminalProvider;
  let mockLogger: Logger;
  let delimiters: DelimiterConfig;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Standard delimiters
    delimiters = {
      line: 'L',
      position: 'C',
      hash: '#',
      range: '-',
    };

    provider = new RangeLinkTerminalProvider(delimiters, mockLogger);

    // Reset mocks
    jest.clearAllMocks();
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

      const vscode = require('vscode');

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

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'RangeLink: Cannot navigate - invalid link format: file.ts#L0',
      );

      // Should NOT proceed to navigation
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should proceed past safety net when parsed data is present', async () => {
      // Arrange: Create valid link with parsed data
      const link: RangeLinkTerminalLink = {
        startIndex: 0,
        length: 15,
        tooltip: 'Open file.ts:10',
        data: 'file.ts#L10',
        parsed: {
          path: 'file.ts',
          start: { line: 10 },
          end: { line: 10 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        },
      };

      // Act
      await provider.handleTerminalLink(link);

      // Assert: Should pass the safety net check and attempt navigation
      // Logger should now include linkText in logCtx
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkTerminalProvider.handleTerminalLink',
          linkText: 'file.ts#L10',
          parsed: link.parsed,
        },
        'Terminal link clicked - attempting navigation',
      );

      // Should NOT trigger the safety net warning
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });
});
