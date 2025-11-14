import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import type { DelimiterConfig } from 'rangelink-core-ts';
import { LinkType, SelectionType } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { RangeLinkNavigationHandler } from '../../navigation/RangeLinkNavigationHandler';
import { RangeLinkTerminalProvider } from '../../navigation/RangeLinkTerminalProvider';
import type { RangeLinkTerminalLink } from '../../types';

// Mock vscode module - must be inline due to Jest hoisting
jest.mock('vscode', () => ({
  window: {
    activeTerminal: undefined,
    activeTextEditor: undefined,
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
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
  Position: jest.fn((line: number, character: number) => ({ line, character })),
  Selection: jest.fn(
    (anchor: { line: number; character: number }, active: { line: number; character: number }) => ({
      anchor,
      active,
    }),
  ),
  Range: jest.fn(
    (start: { line: number; character: number }, end: { line: number; character: number }) => ({
      start,
      end,
    }),
  ),
  TextEditorRevealType: {
    InCenterIfOutsideViewport: 2,
  },
}));

describe('RangeLinkTerminalProvider', () => {
  let provider: RangeLinkTerminalProvider;
  let mockLogger: Logger;
  let mockIdeAdapter: any;
  let delimiters: DelimiterConfig;

  beforeEach(() => {
    // Mock logger
    mockLogger = createMockLogger();

    // Mock IDE adapter
    mockIdeAdapter = {
      showWarningMessage: jest.fn(),
      showInformationMessage: jest.fn(),
      showErrorMessage: jest.fn(),
      showTextDocument: jest.fn(),
    };

    // Standard delimiters
    delimiters = {
      line: 'L',
      position: 'C',
      hash: '#',
      range: '-',
    };

    // Create handler and provider
    const handler = new RangeLinkNavigationHandler(delimiters, mockIdeAdapter, mockLogger);
    provider = new RangeLinkTerminalProvider(handler, mockIdeAdapter, mockLogger);
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

      expect(mockIdeAdapter.showWarningMessage).toHaveBeenCalledWith(
        'RangeLink: Cannot navigate - invalid link format: file.ts#L0',
      );

      // Should NOT proceed to navigation
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    // TODO: re-asses this test's scope/coupling
    it.skip('should proceed past safety net when parsed data is present', async () => {
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
          fn: 'RangeLinkNavigationHandler.navigateToLink',
          linkText: 'file.ts#L10',
          parsed: link.parsed,
        },
        'Navigating to RangeLink',
      );

      // Should NOT trigger the safety net warning
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });
});
