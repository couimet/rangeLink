import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import type { DelimiterConfig } from 'rangelink-core-ts';
import { Result } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { ConfigReader } from '../config/ConfigReader';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import { messagesEn } from '../i18n/messages.en';
import { PathFormat, RangeLinkService } from '../RangeLinkService';
import { MessageCode, QuickPickBindResult } from '../types';
import * as formatMessageModule from '../utils/formatMessage';
import * as generateLinkModule from '../utils/generateLinkFromSelections';

import {
  createMockAsRelativePath,
  createMockClipboard,
  createMockConfigReader,
  createMockDestinationManager,
  createMockDocument,
  createMockEditor,
  createMockEditorWithSelection,
  createMockFormattedLink,
  createMockGetWorkspaceFolder,
  createMockPosition,
  createMockSelection,
  createMockTerminalPasteDestination,
  createMockText,
  createMockUri,
  createMockVscodeAdapter,
  createMockWorkspaceFolder,
  createWindowOptionsForEditor,
  type MockClipboard,
  type VscodeAdapterWithTestHooks,
} from './helpers';

let service: RangeLinkService;
let mockVscodeAdapter: VscodeAdapterWithTestHooks;
let mockDestinationManager: PasteDestinationManager;
let mockConfigReader: jest.Mocked<ConfigReader>;
let mockLogger: Logger;
let mockClipboard: MockClipboard;

const delimiters: DelimiterConfig = {
  line: 'L',
  position: 'C',
  hash: '#',
  range: '-',
};

/**
 * Helper to create a mock selection with simplified syntax.
 * For non-reversed selections, anchor=start and active=end.
 */
const mockSelection = (
  startLine: number,
  startChar: number,
  endLine: number,
  endChar: number,
): vscode.Selection => {
  const anchor = createMockPosition({ line: startLine, character: startChar });
  const active = createMockPosition({ line: endLine, character: endChar });
  const isEmpty = startLine === endLine && startChar === endChar;
  return createMockSelection({
    anchor,
    active,
    start: anchor,
    end: active,
    isReversed: false,
    isEmpty,
  });
};

describe('RangeLinkService', () => {
  beforeEach(() => {
    mockLogger = createMockLogger();
    mockClipboard = createMockClipboard();
    mockConfigReader = createMockConfigReader();
    mockVscodeAdapter = createMockVscodeAdapter({
      envOptions: { clipboard: mockClipboard },
    });
  });

  describe('copyToClipboardAndDestination', () => {
    beforeEach(() => {
      jest.spyOn(mockVscodeAdapter, 'setStatusBarMessage').mockReturnValue({ dispose: jest.fn() });
      jest.spyOn(mockVscodeAdapter, 'showWarningMessage').mockResolvedValue(undefined);
      jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
      jest.spyOn(mockVscodeAdapter, 'showInformationMessage').mockResolvedValue(undefined);
      jest.spyOn(mockVscodeAdapter, 'showTextDocument');

      // Create mock destination manager
      mockDestinationManager = createMockDestinationManager({
        isBound: false,
        sendLinkToDestinationResult: true,
      });

      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockConfigReader,
        mockLogger,
      );
    });

    describe('when no destination is bound', () => {
      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        // Access private method via any cast for testing
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });

      it('should show status message with "copied to clipboard"', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });

      it('should use link type name in status message (RangeLink)', async () => {
        const link = 'src/auth.ts#L10';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });

      it('should use link type name in status message (Portable RangeLink)', async () => {
        const link = 'src/auth.ts#L10{L:LINE,C:COL}';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'Portable RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ Portable RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });

      it('should not call showWarningMessage', async () => {
        const link = 'src/auth.ts#L10';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });

      it('should not send to terminal', async () => {
        const link = 'src/auth.ts#L10';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });
    });

    describe('when destination is bound and paste succeeds', () => {
      beforeEach(() => {
        const mockDestination = createMockTerminalPasteDestination({ displayName: 'bash' });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendLinkToDestinationResult: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledWith(
          formattedLink,
          '✓ RangeLink copied to clipboard',
          'both',
        );
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showErrorMessage).not.toHaveBeenCalled();
      });

      it('should send link to terminal with basicStatusMessage', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledWith(
          formattedLink,
          '✓ RangeLink copied to clipboard',
          'both',
        );
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showErrorMessage).not.toHaveBeenCalled();
      });

      it('should call methods in correct order: clipboard then manager', async () => {
        const link = 'src/auth.ts#L10';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledWith(
          formattedLink,
          '✓ RangeLink copied to clipboard',
          'both',
        );
        // Verify call order (service handles clipboard, manager handles destination + feedback)
        const clipboardCall = (mockClipboard.writeText as jest.Mock).mock.invocationCallOrder[0];
        const managerCall = (mockDestinationManager.sendLinkToDestination as jest.Mock).mock
          .invocationCallOrder[0];
        expect(clipboardCall).toBeLessThan(managerCall);
        expect(mockVscodeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showErrorMessage).not.toHaveBeenCalled();
      });
    });

    describe('when destination is bound but paste fails', () => {
      beforeEach(() => {
        const terminalDest = createMockTerminalPasteDestination({
          displayName: 'Terminal',
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendLinkToDestinationResult: false,
          boundDestination: terminalDest,
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledWith(
          formattedLink,
          '✓ RangeLink copied to clipboard',
          'both',
        );
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showErrorMessage).not.toHaveBeenCalled();
      });

      it('should attempt to send to destination with basicStatusMessage', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledWith(
          formattedLink,
          '✓ RangeLink copied to clipboard',
          'both',
        );
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showErrorMessage).not.toHaveBeenCalled();
      });

      it('should pass correct basicStatusMessage for Portable RangeLink', async () => {
        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'Portable RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts#L1');
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledWith(
          formattedLink,
          '✓ Portable RangeLink copied to clipboard',
          'both',
        );
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showErrorMessage).not.toHaveBeenCalled();
      });
    });

    describe('when destination is bound but content not eligible', () => {
      beforeEach(() => {
        const mockDestination = createMockTerminalPasteDestination({
          displayName: 'Terminal',
          isEligibleForPasteLink: jest.fn().mockResolvedValue(false),
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'copyToClipboardAndDestination', boundDestination: 'Terminal' },
          'Content not eligible for paste - skipping auto-paste',
        );
        const mockDestination = mockDestinationManager.getBoundDestination()!;
        expect(mockDestination.isEligibleForPasteLink).toHaveBeenCalledWith(formattedLink);
        expect(mockDestination.isEligibleForPasteLink).toHaveBeenCalledTimes(1);
      });

      it('should NOT send to destination when link not eligible', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'copyToClipboardAndDestination', boundDestination: 'Terminal' },
          'Content not eligible for paste - skipping auto-paste',
        );
        const mockDestination = mockDestinationManager.getBoundDestination()!;
        expect(mockDestination.isEligibleForPasteLink).toHaveBeenCalledWith(formattedLink);
      });

      it('should show clipboard-only status message', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'copyToClipboardAndDestination', boundDestination: 'Terminal' },
          'Content not eligible for paste - skipping auto-paste',
        );
        const mockDestination = mockDestinationManager.getBoundDestination()!;
        expect(mockDestination.isEligibleForPasteLink).toHaveBeenCalledWith(formattedLink);
      });

      it('should log debug message about skipping auto-paste', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'copyToClipboardAndDestination', boundDestination: 'Terminal' },
          'Content not eligible for paste - skipping auto-paste',
        );
        const mockDestination = mockDestinationManager.getBoundDestination()!;
        expect(mockDestination.isEligibleForPasteLink).toHaveBeenCalledWith(formattedLink);
      });

      it('should verify isEligibleForPasteLink was called with correct link', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);
        const mockDestination = mockDestinationManager.getBoundDestination()!;

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'copyToClipboardAndDestination', boundDestination: 'Terminal' },
          'Content not eligible for paste - skipping auto-paste',
        );
        expect(mockDestination.isEligibleForPasteLink).toHaveBeenCalledWith(formattedLink);
        expect(mockDestination.isEligibleForPasteLink).toHaveBeenCalledTimes(1);
      });
    });

    describe('edge cases', () => {
      it('should handle empty link string', async () => {
        const formattedLink = createMockFormattedLink('');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith('');
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalled();
      });

      it('should handle very long link strings', async () => {
        const longLink = 'src/' + 'a'.repeat(500) + '.ts#L1000-L2000';
        const formattedLink = createMockFormattedLink(longLink);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(longLink);
      });

      it('should handle special characters in link', async () => {
        const specialLink = 'src/file#123.ts##L10C5-L20C10';
        const formattedLink = createMockFormattedLink(specialLink);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(specialLink);
      });

      it('should handle special characters in link type name', async () => {
        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'Custom <Type> Name');

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ Custom <Type> Name copied to clipboard',
        );
      });
    });

    describe('i18n integration', () => {
      let formatMessageSpy: jest.SpyInstance;

      beforeEach(() => {
        formatMessageSpy = jest.spyOn(formatMessageModule, 'formatMessage');
      });

      it('should call formatMessage with STATUS_BAR_LINK_COPIED_TO_CLIPBOARD and linkTypeName parameter', async () => {
        const mockSendFn = jest.fn().mockResolvedValue(true);
        const mockIsEligibleFn = jest.fn().mockResolvedValue(true);

        await (service as any).copyAndSendToDestination(
          'src/file.ts#L1',
          'src/file.ts#L1',
          mockSendFn,
          mockIsEligibleFn,
          'RangeLink',
          'test',
        );

        expect(formatMessageSpy).toHaveBeenCalledWith(
          MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD,
          { linkTypeName: 'RangeLink' },
        );
      });

      it('should produce correct status message with "RangeLink" parameter', async () => {
        const mockSendFn = jest.fn().mockResolvedValue(true);
        const mockIsEligibleFn = jest.fn().mockResolvedValue(true);

        await (service as any).copyAndSendToDestination(
          'src/file.ts#L1',
          'src/file.ts#L1',
          mockSendFn,
          mockIsEligibleFn,
          'RangeLink',
          'test',
        );

        const expectedMessage = messagesEn[MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD].replace(
          '{linkTypeName}',
          'RangeLink',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(expectedMessage);
      });

      it('should produce correct status message with "Portable RangeLink" parameter', async () => {
        const mockSendFn = jest.fn().mockResolvedValue(true);
        const mockIsEligibleFn = jest.fn().mockResolvedValue(true);

        await (service as any).copyAndSendToDestination(
          'src/file.ts#L1',
          'src/file.ts#L1',
          mockSendFn,
          mockIsEligibleFn,
          'Portable RangeLink',
          'test',
        );

        const expectedMessage = messagesEn[MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD].replace(
          '{linkTypeName}',
          'Portable RangeLink',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(expectedMessage);
      });
    });
  });

  describe('pasteSelectedTextToDestination', () => {
    beforeEach(() => {
      // Spy on adapter methods used in these tests
      jest.spyOn(mockVscodeAdapter, 'setStatusBarMessage').mockReturnValue({ dispose: jest.fn() });
      jest.spyOn(mockVscodeAdapter, 'showWarningMessage').mockResolvedValue(undefined);
      jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
      jest.spyOn(mockVscodeAdapter, 'showInformationMessage').mockResolvedValue(undefined);

      // Create mock destination manager
      mockDestinationManager = createMockDestinationManager({
        isBound: false,
        sendTextToDestinationResult: true,
      });

      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockConfigReader,
        mockLogger,
      );
    });

    describe('when no active editor', () => {
      beforeEach(() => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should show error message', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No active editor',
        );
      });

      it('should not copy to clipboard', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockClipboard.writeText).not.toHaveBeenCalled();
      });

      it('should not attempt to send to destination', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
      });
    });

    describe('when no selections', () => {
      beforeEach(() => {
        const mockDocument = createMockDocument({
          getText: createMockText(''),
          uri: createMockUri('/test/file.ts'),
        });
        const mockEditor = createMockEditor({ document: mockDocument, selections: [] });
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: createWindowOptionsForEditor(mockEditor),
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should show error message', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No text selected. Select text and try again.',
        );
      });

      it('should not copy to clipboard', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockClipboard.writeText).not.toHaveBeenCalled();
      });
    });

    describe('when all selections are empty', () => {
      beforeEach(() => {
        const selection1 = mockSelection(0, 0, 0, 0); // empty
        const selection2 = mockSelection(1, 0, 1, 0); // empty
        const mockDocument = createMockDocument({
          getText: createMockText(''),
        });
        const mockEditor = createMockEditor({
          document: mockDocument,
          selections: [selection1, selection2],
        });
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: createWindowOptionsForEditor(mockEditor),
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should show error message', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No text selected. Select text and try again.',
        );
      });

      it('should not copy to clipboard', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockClipboard.writeText).not.toHaveBeenCalled();
      });
    });

    describe('with single selection', () => {
      beforeEach(() => {
        mockClipboard = createMockClipboard();
        const { adapter } = createMockEditorWithSelection({
          content: 'const foo = "bar";',
          selections: [[0, 0, 0, 18]],
          adapterOptions: { envOptions: { clipboard: mockClipboard } },
        });
        mockVscodeAdapter = adapter;
        jest
          .spyOn(mockVscodeAdapter, 'setStatusBarMessage')
          .mockReturnValue({ dispose: jest.fn() });
        jest.spyOn(mockVscodeAdapter, 'showWarningMessage').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );
      });

      describe('when no destination bound', () => {
        it('should show quick pick to select destination', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockDestinationManager.showDestinationQuickPickForPaste).toHaveBeenCalledTimes(1);
        });

        describe('when user cancels quick pick', () => {
          it('should NOT copy to clipboard', async () => {
            await service.pasteSelectedTextToDestination();

            expect(mockClipboard.writeText).not.toHaveBeenCalled();
          });

          it('should NOT attempt to send to destination', async () => {
            await service.pasteSelectedTextToDestination();

            expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
          });
        });

        it('should copy to clipboard and send to destination after binding via quick pick', async () => {
          const mockDestination = createMockTerminalPasteDestination({
            displayName: 'Terminal',
          });
          mockDestinationManager = createMockDestinationManager({
            isBound: false,
            showDestinationQuickPickForPasteResult: QuickPickBindResult.Bound,
          });
          (mockDestinationManager.isBound as jest.Mock)
            .mockReturnValueOnce(false)
            .mockReturnValue(true);
          (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(
            mockDestination,
          );
          service = new RangeLinkService(
            delimiters,
            mockVscodeAdapter,
            mockDestinationManager,
            mockConfigReader,
            mockLogger,
          );

          await service.pasteSelectedTextToDestination();

          expect(mockClipboard.writeText).toHaveBeenCalledWith('const foo = "bar";');
          expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
            'const foo = "bar";',
            '✓ Selected text copied to clipboard',
            'none',
          );
        });
      });

      describe('when destination is bound', () => {
        let mockDestination: any;

        beforeEach(() => {
          mockDestination = createMockTerminalPasteDestination({
            displayName: 'Terminal',
          });
          mockDestinationManager = createMockDestinationManager({
            isBound: true,
            sendTextToDestinationResult: true,
            boundDestination: mockDestination,
          });
          service = new RangeLinkService(
            delimiters,
            mockVscodeAdapter,
            mockDestinationManager,
            mockConfigReader,
            mockLogger,
          );
        });

        it('should copy text to clipboard first (always available fallback)', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockClipboard.writeText).toHaveBeenCalledWith('const foo = "bar";');
        });

        it('should send selected text to bound destination with basicStatusMessage', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
            'const foo = "bar";',
            '✓ Selected text copied to clipboard',
            'none',
          );
        });
      });

      describe('when destination is bound but text content not eligible', () => {
        let mockDestination: any;

        beforeEach(() => {
          mockDestination = createMockTerminalPasteDestination({
            displayName: 'Terminal',
            isEligibleForPasteContent: jest.fn().mockResolvedValue(false),
          });
          mockDestinationManager = createMockDestinationManager({
            isBound: true,
            boundDestination: mockDestination,
          });
          service = new RangeLinkService(
            delimiters,
            mockVscodeAdapter,
            mockDestinationManager,
            mockConfigReader,
            mockLogger,
          );
        });

        it('should copy text to clipboard', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockClipboard.writeText).toHaveBeenCalledWith('const foo = "bar";');
          expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
          expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
          );
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
          expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
          expect(mockLogger.debug).toHaveBeenCalledWith(
            { fn: 'pasteSelectedTextToDestination', boundDestination: 'Terminal' },
            'Content not eligible for paste - skipping auto-paste',
          );
          expect(mockDestination.isEligibleForPasteContent).toHaveBeenCalledWith(
            'const foo = "bar";',
          );
        });

        it('should NOT send to destination when text content not eligible', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockClipboard.writeText).toHaveBeenCalledWith('const foo = "bar";');
          expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
          expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
          );
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
          expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
          expect(mockLogger.debug).toHaveBeenCalledWith(
            { fn: 'pasteSelectedTextToDestination', boundDestination: 'Terminal' },
            'Content not eligible for paste - skipping auto-paste',
          );
          expect(mockDestination.isEligibleForPasteContent).toHaveBeenCalledWith(
            'const foo = "bar";',
          );
        });

        it('should show clipboard-only status message', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockClipboard.writeText).toHaveBeenCalledWith('const foo = "bar";');
          expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
          expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
          );
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
          expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
          expect(mockLogger.debug).toHaveBeenCalledWith(
            { fn: 'pasteSelectedTextToDestination', boundDestination: 'Terminal' },
            'Content not eligible for paste - skipping auto-paste',
          );
          expect(mockDestination.isEligibleForPasteContent).toHaveBeenCalledWith(
            'const foo = "bar";',
          );
        });

        it('should log debug message about skipping auto-paste', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockClipboard.writeText).toHaveBeenCalledWith('const foo = "bar";');
          expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
          expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
          );
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
          expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
          expect(mockLogger.debug).toHaveBeenCalledWith(
            { fn: 'pasteSelectedTextToDestination', boundDestination: 'Terminal' },
            'Content not eligible for paste - skipping auto-paste',
          );
          expect(mockDestination.isEligibleForPasteContent).toHaveBeenCalledWith(
            'const foo = "bar";',
          );
        });

        it('should verify isEligibleForPasteContent was called with correct text', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockClipboard.writeText).toHaveBeenCalledWith('const foo = "bar";');
          expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
          expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
          );
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
          expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
          expect(mockLogger.debug).toHaveBeenCalledWith(
            { fn: 'pasteSelectedTextToDestination', boundDestination: 'Terminal' },
            'Content not eligible for paste - skipping auto-paste',
          );
          expect(mockDestination.isEligibleForPasteContent).toHaveBeenCalledWith(
            'const foo = "bar";',
          );
          expect(mockDestination.isEligibleForPasteContent).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('with multi-selection', () => {
      beforeEach(() => {
        mockClipboard = createMockClipboard();
        const { adapter, document } = createMockEditorWithSelection({
          content: 'first line\nsecond line\nthird line',
          selections: [
            [0, 0, 0, 10],
            [1, 0, 1, 11],
            [2, 0, 2, 10],
          ],
          adapterOptions: { envOptions: { clipboard: mockClipboard } },
        });

        // Override getText to return different text per selection (test requirement)
        const selection1 = adapter.activeTextEditor!.selections[0];
        const selection2 = adapter.activeTextEditor!.selections[1];
        const selection3 = adapter.activeTextEditor!.selections[2];
        document.getText = jest.fn((selection?: vscode.Range) => {
          if (selection === selection1) return 'first line';
          if (selection === selection2) return 'second line';
          if (selection === selection3) return 'third line';
          return '';
        });

        mockVscodeAdapter = adapter;
        jest
          .spyOn(mockVscodeAdapter, 'setStatusBarMessage')
          .mockReturnValue({ dispose: jest.fn() });

        const mockDestination = createMockTerminalPasteDestination({ displayName: 'Terminal' });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: true,
          boundDestination: mockDestination,
        });

        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should concatenate selections with newlines', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockClipboard.writeText).toHaveBeenCalledWith('first line\nsecond line\nthird line');
      });

      it('should send concatenated text to destination', async () => {
        const mockDestination = createMockTerminalPasteDestination({
          displayName: 'Terminal',
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );

        await service.pasteSelectedTextToDestination();

        expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
          'first line\nsecond line\nthird line',
          '✓ Selected text copied to clipboard',
          'none',
        );
      });

      it('should pass basicStatusMessage to destination manager for status display', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
          'first line\nsecond line\nthird line',
          '✓ Selected text copied to clipboard',
          'none',
        );
      });
    });

    describe('with mixed empty and non-empty selections', () => {
      beforeEach(() => {
        mockClipboard = createMockClipboard();
        const { adapter, document } = createMockEditorWithSelection({
          content: 'valid text',
          selections: [
            [0, 0, 0, 0], // empty (collapsed)
            [1, 0, 1, 10],
            [2, 0, 2, 0], // empty (collapsed)
          ],
          adapterOptions: { envOptions: { clipboard: mockClipboard } },
        });

        // Override getText to return text only for second selection (test requirement)
        const selection2 = adapter.activeTextEditor!.selections[1];
        document.getText = jest.fn((selection?: vscode.Range) => {
          if (selection === selection2) return 'valid text';
          return '';
        });

        mockVscodeAdapter = adapter;

        const mockDestination = createMockTerminalPasteDestination({ displayName: 'Terminal' });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: true,
          boundDestination: mockDestination,
        });

        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should filter out empty selections', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockClipboard.writeText).toHaveBeenCalledWith('valid text');
      });

      it('should send only non-empty selections to destination', async () => {
        const mockDestination = createMockTerminalPasteDestination({
          displayName: 'Terminal',
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );

        await service.pasteSelectedTextToDestination();

        expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
          'valid text',
          '✓ Selected text copied to clipboard',
          'none',
        );
      });
    });

    describe('edge cases', () => {
      it('should handle very long selection', async () => {
        const longText = 'a'.repeat(10000);
        const clipboard = createMockClipboard();
        const { adapter } = createMockEditorWithSelection({
          content: longText,
          selections: [[0, 0, 0, 10000]],
          adapterOptions: { envOptions: { clipboard } },
        });
        const mockDestination = createMockTerminalPasteDestination({ displayName: 'Terminal' });
        const boundDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(
          delimiters,
          adapter,
          boundDestinationManager,
          mockConfigReader,
          mockLogger,
        );

        await service.pasteSelectedTextToDestination();

        expect(clipboard.writeText).toHaveBeenCalledWith(longText);
        expect(boundDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
          longText,
          '✓ Selected text copied to clipboard',
          'none',
        );
      });

      it('should handle special characters in selection', async () => {
        const specialText = 'const regex = /\\d+/g;\n"quotes" & <tags>';
        const clipboard = createMockClipboard();
        const { adapter } = createMockEditorWithSelection({
          content: specialText,
          selections: [[0, 0, 0, 40]],
          adapterOptions: { envOptions: { clipboard } },
        });
        const mockDestination = createMockTerminalPasteDestination({ displayName: 'Terminal' });
        const boundDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(
          delimiters,
          adapter,
          boundDestinationManager,
          mockConfigReader,
          mockLogger,
        );

        await service.pasteSelectedTextToDestination();

        expect(clipboard.writeText).toHaveBeenCalledWith(specialText);
      });

      it('should handle unicode characters in selection', async () => {
        const unicodeText = '你好世界 🚀 émojis';
        const clipboard = createMockClipboard();
        const { adapter } = createMockEditorWithSelection({
          content: unicodeText,
          selections: [[0, 0, 0, 20]],
          adapterOptions: { envOptions: { clipboard } },
        });
        const mockDestination = createMockTerminalPasteDestination({ displayName: 'Terminal' });
        const boundDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(
          delimiters,
          adapter,
          boundDestinationManager,
          mockConfigReader,
          mockLogger,
        );

        await service.pasteSelectedTextToDestination();

        expect(clipboard.writeText).toHaveBeenCalledWith(unicodeText);
      });
    });
  });

  describe('validateSelectionsAndShowError', () => {
    beforeEach(() => {
      // Configure adapter state for this describe block
      mockVscodeAdapter = createMockVscodeAdapter({
        windowOptions: { activeTextEditor: undefined },
      });

      // Spy on adapter methods used in these tests
      jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);

      // Create mock destination manager
      mockDestinationManager = createMockDestinationManager({
        isBound: false,
      });

      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockConfigReader,
        mockLogger,
      );
    });

    describe('integration with generateLinkFromSelection', () => {
      beforeEach(() => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should show consistent error message when no editor', async () => {
        const result = await (service as any).generateLinkFromSelection(
          'workspace-relative',
          false,
        );

        expect(result).toBeUndefined();
        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No active editor',
        );
        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });

      it('should return undefined early when no editor', async () => {
        const result = await (service as any).generateLinkFromSelection(
          'workspace-relative',
          false,
        );

        expect(result).toBeUndefined();
        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });
    });

    describe('integration with pasteSelectedTextToDestination', () => {
      beforeEach(() => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should show consistent error message when no editor', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No active editor',
        );
        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });

      it('should return early when no editor', async () => {
        await service.pasteSelectedTextToDestination();

        // Verify we bailed early (no clipboard or destination operations)
        expect(mockClipboard.writeText).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });
    });

    describe('error message consistency', () => {
      beforeEach(() => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should show "No active editor" via generateLinkFromSelection', async () => {
        await (service as any).generateLinkFromSelection('workspace-relative', false);

        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No active editor',
        );
      });

      it('should show "No active editor" via pasteSelectedTextToDestination', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No active editor',
        );
      });
    });

    describe('DEBUG logging for empty selection edge case', () => {
      it('should log DEBUG message when no editor exists', async () => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).generateLinkFromSelection('workspace-relative', false);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'validateSelectionsAndShowError',
            hasEditor: false,
            errorMsg: 'RangeLink: No active editor',
          },
          'Empty selection detected - should be prevented by command enablement',
        );
      });

      it('should log DEBUG message when editor exists but selections are empty', async () => {
        const mockEditor = createMockEditor({
          document: createMockDocument({
            getText: createMockText(''),
            uri: createMockUri('/test/file.ts'),
          }),
          selection: { isEmpty: true } as any,
          selections: [{ isEmpty: true } as any],
        });
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: createWindowOptionsForEditor(mockEditor),
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).generateLinkFromSelection('workspace-relative', false);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'validateSelectionsAndShowError',
            hasEditor: true,
            errorMsg: 'RangeLink: No text selected. Select text and try again.',
          },
          'Empty selection detected - should be prevented by command enablement',
        );
      });

      it('should log DEBUG via pasteSelectedTextToDestination', async () => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );

        await service.pasteSelectedTextToDestination();

        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'validateSelectionsAndShowError',
            hasEditor: false,
            errorMsg: 'RangeLink: No active editor',
          },
          'Empty selection detected - should be prevented by command enablement',
        );
      });

      it('should include hasEditor:false in DEBUG log when no editor', async () => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).generateLinkFromSelection('workspace-relative', false);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'validateSelectionsAndShowError',
            hasEditor: false,
            errorMsg: 'RangeLink: No active editor',
          },
          'Empty selection detected - should be prevented by command enablement',
        );
      });

      it('should include hasEditor:true in DEBUG log when editor exists with empty selection', async () => {
        const mockEditor = createMockEditor({
          document: createMockDocument({
            getText: createMockText(''),
            uri: createMockUri('/test/file.ts'),
          }),
          selection: { isEmpty: true } as any,
          selections: [{ isEmpty: true } as any],
        });
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: createWindowOptionsForEditor(mockEditor),
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).generateLinkFromSelection('workspace-relative', false);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'validateSelectionsAndShowError',
            hasEditor: true,
            errorMsg: 'RangeLink: No text selected. Select text and try again.',
          },
          'Empty selection detected - should be prevented by command enablement',
        );
      });

      it('should not log DEBUG when validation succeeds', async () => {
        const mockDocument = createMockDocument({
          getText: createMockText('line content'),
          uri: createMockUri('/test/file.ts'),
        });

        const mockEditor = createMockEditor({
          document: mockDocument,
          selection: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 5 },
            isEmpty: false,
          } as any,
          selections: [
            {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 5 },
              isEmpty: false,
            } as any,
          ],
        });

        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: createWindowOptionsForEditor(mockEditor),
        });
        jest
          .spyOn(mockVscodeAdapter, 'getWorkspaceFolder')
          .mockImplementation(createMockGetWorkspaceFolder('/test'));
        jest
          .spyOn(mockVscodeAdapter, 'asRelativePath')
          .mockImplementation(createMockAsRelativePath('file.ts'));
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockConfigReader,
          mockLogger,
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).generateLinkFromSelection('workspace-relative', false);

        // Should not log DEBUG when validation succeeds
        // Verify neither possible context was logged (hasEditor: true or false)
        expect(mockLogger.debug).not.toHaveBeenCalledWith(
          {
            fn: 'validateSelectionsAndShowError',
            hasEditor: true,
            errorMsg: expect.any(String),
          },
          'Empty selection detected - should be prevented by command enablement',
        );
        expect(mockLogger.debug).not.toHaveBeenCalledWith(
          {
            fn: 'validateSelectionsAndShowError',
            hasEditor: false,
            errorMsg: expect.any(String),
          },
          'Empty selection detected - should be prevented by command enablement',
        );
      });
    });
  });

  describe('createLink()', () => {
    let mockGenerateLink: jest.SpyInstance;
    let mockCopyToClipboard: jest.SpyInstance;

    beforeEach(() => {
      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockConfigReader,
        mockLogger,
      );

      // Spy on private methods (auto-restored by jest.config.js restoreMocks: true)
      mockGenerateLink = jest.spyOn(service as any, 'generateLinkFromSelection');
      mockCopyToClipboard = jest.spyOn(service as any, 'copyToClipboardAndDestination');
    });

    it('should call generateLinkFromSelection with WorkspaceRelative and portable=false', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10-L20');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.WorkspaceRelative, false);
      expect(mockGenerateLink).toHaveBeenCalledTimes(1);
    });

    it('should call generateLinkFromSelection with Absolute and portable=false', async () => {
      const mockFormattedLink = createMockFormattedLink('/workspace/src/file.ts#L10-L20');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createLink(PathFormat.Absolute);

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.Absolute, false);
      expect(mockGenerateLink).toHaveBeenCalledTimes(1);
    });

    it('should use default PathFormat.WorkspaceRelative when not specified', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createLink(); // No argument

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.WorkspaceRelative, false);
    });

    it('should call copyToClipboardAndDestination when link generated', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10-L20');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockCopyToClipboard).toHaveBeenCalledWith(mockFormattedLink, 'RangeLink');
      expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
    });

    it('should not call copyToClipboardAndDestination when generateLinkFromSelection returns null', async () => {
      mockGenerateLink.mockResolvedValue(null);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockCopyToClipboard).not.toHaveBeenCalled();
    });
  });

  describe('createPortableLink()', () => {
    let mockGenerateLink: jest.SpyInstance;
    let mockCopyToClipboard: jest.SpyInstance;

    beforeEach(() => {
      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockConfigReader,
        mockLogger,
      );

      // Spy on private methods (auto-restored by jest.config.js restoreMocks: true)
      mockGenerateLink = jest.spyOn(service as any, 'generateLinkFromSelection');
      mockCopyToClipboard = jest.spyOn(service as any, 'copyToClipboardAndDestination');
    });

    it('should call generateLinkFromSelection with WorkspaceRelative and portable=true', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10-L20{L:LINE,C:COL}');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createPortableLink(PathFormat.WorkspaceRelative);

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.WorkspaceRelative, true);
      expect(mockGenerateLink).toHaveBeenCalledTimes(1);
    });

    it('should call generateLinkFromSelection with Absolute and portable=true', async () => {
      const mockFormattedLink = createMockFormattedLink(
        '/workspace/src/file.ts#L10-L20{L:LINE,C:COL}',
      );
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createPortableLink(PathFormat.Absolute);

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.Absolute, true);
      expect(mockGenerateLink).toHaveBeenCalledTimes(1);
    });

    it('should use default PathFormat.WorkspaceRelative when not specified', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10{L:LINE,C:COL}');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createPortableLink(); // No argument

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.WorkspaceRelative, true);
    });

    it('should call copyToClipboardAndDestination with Portable RangeLink label', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10-L20{L:LINE,C:COL}');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createPortableLink(PathFormat.WorkspaceRelative);

      expect(mockCopyToClipboard).toHaveBeenCalledWith(mockFormattedLink, 'Portable RangeLink');
      expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
    });

    it('should not call copyToClipboardAndDestination when generateLinkFromSelection returns null', async () => {
      mockGenerateLink.mockResolvedValue(null);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createPortableLink(PathFormat.WorkspaceRelative);

      expect(mockCopyToClipboard).not.toHaveBeenCalled();
    });
  });

  describe('generateLinkFromSelection() - delegation to utility', () => {
    let mockGenerateLinkFromSelections: jest.SpyInstance;

    beforeEach(() => {
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: createMockUri('/test/file.ts') }),
        selections: [createMockSelection({ isEmpty: false })],
      });

      mockVscodeAdapter = createMockVscodeAdapter({
        windowOptions: { activeTextEditor: mockEditor },
        workspaceOptions: {
          getWorkspaceFolder: jest
            .fn()
            .mockReturnValue({ uri: createMockUri('/test'), index: 0, name: 'test' }),
          asRelativePath: jest.fn().mockReturnValue('file.ts'),
        },
      });

      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockConfigReader,
        mockLogger,
      );

      mockGenerateLinkFromSelections = jest.spyOn(generateLinkModule, 'generateLinkFromSelections');
      jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
    });

    it('should delegate to utility with Regular linkType and return FormattedLink', async () => {
      const mockResult = createMockFormattedLink('file.ts#L10');
      mockGenerateLinkFromSelections.mockReturnValue(Result.ok(mockResult));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (service as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        false,
      );

      expect(mockGenerateLinkFromSelections).toHaveBeenCalledWith({
        referencePath: 'file.ts',
        document: mockVscodeAdapter.activeTextEditor!.document,
        selections: mockVscodeAdapter.activeTextEditor!.selections,
        delimiters,
        linkType: 'regular',
        logger: mockLogger,
      });
      expect(result).toStrictEqual(mockResult);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelection', formattedLink: mockResult },
        `Generated link: ${mockResult.link}`,
      );
    });

    it('should delegate to utility with Portable linkType and return FormattedLink', async () => {
      const mockResult = createMockFormattedLink('file.ts#L10~L~C~#~-~');
      mockGenerateLinkFromSelections.mockReturnValue(Result.ok(mockResult));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (service as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        true,
      );

      expect(mockGenerateLinkFromSelections).toHaveBeenCalledWith({
        referencePath: 'file.ts',
        document: mockVscodeAdapter.activeTextEditor!.document,
        selections: mockVscodeAdapter.activeTextEditor!.selections,
        delimiters,
        linkType: 'portable',
        logger: mockLogger,
      });
      expect(result).toStrictEqual(mockResult);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelection', formattedLink: mockResult },
        `Generated link: ${mockResult.link}`,
      );
    });

    it('should show error and return undefined when utility returns error for regular link', async () => {
      const testError = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.GENERATE_LINK_FORMAT_FAILED,
        message: 'Test error',
        functionName: 'generateLinkFromSelections',
      });
      mockGenerateLinkFromSelections.mockReturnValue(Result.err(testError));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (service as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        false,
      );

      expect(result).toBeUndefined();
      expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Failed to generate link',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelection', error: testError, linkType: 'regular' },
        'Failed to generate link',
      );
    });

    it('should show error and return undefined when utility returns error for portable link', async () => {
      const testError = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.GENERATE_LINK_FORMAT_FAILED,
        message: 'Test error',
        functionName: 'generateLinkFromSelections',
      });
      mockGenerateLinkFromSelections.mockReturnValue(Result.err(testError));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (service as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        true,
      );

      expect(result).toBeUndefined();
      expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Failed to generate portable link',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelection', error: testError, linkType: 'portable' },
        'Failed to generate portable link',
      );
    });
  });

  describe('generateLinkFromSelection() - path resolution', () => {
    let mockGenerateLinkFromSelections: jest.SpyInstance;

    beforeEach(() => {
      mockGenerateLinkFromSelections = jest.spyOn(generateLinkModule, 'generateLinkFromSelections');
      mockGenerateLinkFromSelections.mockReturnValue(
        Result.ok(createMockFormattedLink('file.ts#L10')),
      );
    });

    it('should use workspace-relative path when workspace exists and PathFormat.WorkspaceRelative', async () => {
      const mockDocument = createMockDocument({ uri: createMockUri('/workspace/src/file.ts') });
      const mockSelections = [createMockSelection({ isEmpty: false })];
      const mockEditor = createMockEditor({
        document: mockDocument,
        selections: mockSelections,
      });

      mockVscodeAdapter = createMockVscodeAdapter({
        windowOptions: { activeTextEditor: mockEditor },
        workspaceOptions: {
          getWorkspaceFolder: jest.fn().mockReturnValue(createMockWorkspaceFolder('/workspace')),
          asRelativePath: jest.fn().mockReturnValue('src/file.ts'),
        },
      });

      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockConfigReader,
        mockLogger,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).generateLinkFromSelection(PathFormat.WorkspaceRelative, false);

      expect(mockGenerateLinkFromSelections).toHaveBeenCalledWith({
        referencePath: 'src/file.ts',
        document: mockDocument,
        selections: mockSelections,
        delimiters,
        linkType: 'regular',
        logger: mockLogger,
      });
    });

    it('should use absolute path when no workspace exists', async () => {
      const mockDocument = createMockDocument({ uri: createMockUri('/standalone/file.ts') });
      const mockSelections = [createMockSelection({ isEmpty: false })];
      const mockEditor = createMockEditor({
        document: mockDocument,
        selections: mockSelections,
      });

      mockVscodeAdapter = createMockVscodeAdapter({
        windowOptions: { activeTextEditor: mockEditor },
        workspaceOptions: {
          getWorkspaceFolder: jest.fn().mockReturnValue(undefined),
          asRelativePath: jest.fn().mockReturnValue('/standalone/file.ts'),
        },
      });

      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockConfigReader,
        mockLogger,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).generateLinkFromSelection(PathFormat.WorkspaceRelative, false);

      expect(mockGenerateLinkFromSelections).toHaveBeenCalledWith({
        referencePath: '/standalone/file.ts',
        document: mockDocument,
        selections: mockSelections,
        delimiters,
        linkType: 'regular',
        logger: mockLogger,
      });
    });

    it('should use absolute path when PathFormat.Absolute is specified', async () => {
      const mockDocument = createMockDocument({ uri: createMockUri('/workspace/src/file.ts') });
      const mockSelections = [createMockSelection({ isEmpty: false })];
      const mockEditor = createMockEditor({
        document: mockDocument,
        selections: mockSelections,
      });

      mockVscodeAdapter = createMockVscodeAdapter({
        windowOptions: { activeTextEditor: mockEditor },
        workspaceOptions: {
          getWorkspaceFolder: jest.fn().mockReturnValue(createMockWorkspaceFolder('/workspace')),
          asRelativePath: jest.fn().mockReturnValue('src/file.ts'),
        },
      });

      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockConfigReader,
        mockLogger,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).generateLinkFromSelection(PathFormat.Absolute, false);

      expect(mockGenerateLinkFromSelections).toHaveBeenCalledWith({
        referencePath: '/workspace/src/file.ts',
        document: mockDocument,
        selections: mockSelections,
        delimiters,
        linkType: 'regular',
        logger: mockLogger,
      });
    });
  });

  describe('createLinkOnly (clipboard-only commands - Issue #117)', () => {
    let mockGenerateLink: jest.SpyInstance;
    let mockCopyAndSend: jest.SpyInstance;

    beforeEach(() => {
      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockConfigReader,
        mockLogger,
      );

      // Spy on private methods (auto-restored by jest.config.js restoreMocks: true)
      mockGenerateLink = jest.spyOn(service as any, 'generateLinkFromSelection');
      mockCopyAndSend = jest.spyOn(service as any, 'copyAndSendToDestination');
    });

    it('should call generateLinkFromSelection with correct parameters', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10-L20');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyAndSend.mockResolvedValue(undefined);

      await service.createLinkOnly(PathFormat.WorkspaceRelative);

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.WorkspaceRelative, false);
      expect(mockGenerateLink).toHaveBeenCalledTimes(1);
    });

    it('should call copyAndSendToDestination with ClipboardOnly behavior', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10-L20');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyAndSend.mockResolvedValue(undefined);

      await service.createLinkOnly(PathFormat.WorkspaceRelative);

      expect(mockCopyAndSend).toHaveBeenCalledWith(
        mockFormattedLink.link, // content
        mockFormattedLink, // formattedLink
        expect.any(Function), // isEligibleFn (no-op callback)
        expect.any(Function), // sendFn (no-op callback)
        'RangeLink', // linkTypeName
        'createLinkOnly', // functionName
        'clipboard-only', // DestinationBehavior.ClipboardOnly
      );
      expect(mockCopyAndSend).toHaveBeenCalledTimes(1);
    });

    it('should not call copyAndSendToDestination when generateLinkFromSelection returns undefined', async () => {
      mockGenerateLink.mockResolvedValue(undefined);
      mockCopyAndSend.mockResolvedValue(undefined);

      await service.createLinkOnly(PathFormat.WorkspaceRelative);

      expect(mockCopyAndSend).not.toHaveBeenCalled();
    });

    it('should use default PathFormat.WorkspaceRelative when not specified', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyAndSend.mockResolvedValue(undefined);

      await service.createLinkOnly(); // No argument

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.WorkspaceRelative, false);
    });
  });
});
