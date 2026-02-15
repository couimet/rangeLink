import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import type { DelimiterConfig, DelimiterConfigGetter } from 'rangelink-core-ts';
import { Result } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { JumpToDestinationCommand } from '../commands/JumpToDestinationCommand';
import type { ConfigReader } from '../config';
import type { DestinationPicker } from '../destinations';
import type { PasteDestinationManager } from '../destinations';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import { messagesEn } from '../i18n';
import { DestinationBehavior, PathFormat, RangeLinkService } from '../RangeLinkService';
import { MessageCode, PasteContentType } from '../types';

import {
  createMockClipboard,
  createMockConfigReader,
  createMockDestinationManager,
  createMockDestinationPicker,
  createMockDocument,
  createMockEditor,
  createMockEditorComposablePasteDestination,
  createMockEditorWithSelection,
  createMockFormattedLink,
  createMockPosition,
  createMockSelection,
  createMockTerminal,
  createMockTerminalPasteDestination,
  createMockText,
  createMockUri,
  createMockVscodeAdapter,
  createMockWorkspaceFolder,
  createWindowOptionsForEditor,
  spyOnFormatMessage,
  spyOnGenerateLinkFromSelections,
  type MockClipboard,
  type VscodeAdapterWithTestHooks,
} from './helpers';

let service: RangeLinkService;
let mockVscodeAdapter: VscodeAdapterWithTestHooks;
let mockDestinationManager: PasteDestinationManager;
let mockPickerCommand: jest.Mocked<DestinationPicker>;
let mockConfigReader: jest.Mocked<ConfigReader>;
let mockLogger: Logger;
let mockClipboard: MockClipboard;
let mockSetStatusBarMessage: jest.Mock;
let mockShowWarningMessage: jest.Mock;
let mockShowErrorMessage: jest.Mock;
let mockShowInformationMessage: jest.Mock;

const DELIMITERS: DelimiterConfig = {
  line: 'L',
  position: 'C',
  hash: '#',
  range: '-',
};

const getDelimiters: DelimiterConfigGetter = () => DELIMITERS;

const TEST_WORKSPACE_ROOT = '/workspace';
const TEST_RELATIVE_PATH = 'src/file.ts';
const TEST_ABSOLUTE_PATH = `${TEST_WORKSPACE_ROOT}/${TEST_RELATIVE_PATH}`;
const TEST_WORKSPACE_ROOT_WITH_SPACES = '/my workspace';
const TEST_ABSOLUTE_PATH_WITH_SPACES = `${TEST_WORKSPACE_ROOT_WITH_SPACES}/${TEST_RELATIVE_PATH}`;
const TEST_QUOTED_PATH_WITH_SPACES = `'${TEST_ABSOLUTE_PATH_WITH_SPACES}'`;

let mockEditor: vscode.TextEditor;
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
    mockPickerCommand = createMockDestinationPicker();
    mockClipboard = createMockClipboard();
    mockConfigReader = createMockConfigReader();
    mockSetStatusBarMessage = jest.fn().mockReturnValue({ dispose: jest.fn() });
    mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
    mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
    mockShowInformationMessage = jest.fn().mockResolvedValue(undefined);
    mockVscodeAdapter = createMockVscodeAdapter({
      envOptions: { clipboard: mockClipboard },
      windowOptions: {
        setStatusBarMessage: mockSetStatusBarMessage,
        showWarningMessage: mockShowWarningMessage,
        showErrorMessage: mockShowErrorMessage,
        showInformationMessage: mockShowInformationMessage,
      },
    });
  });

  describe('copyToClipboardAndDestination', () => {
    beforeEach(() => {
      jest.spyOn(mockVscodeAdapter, 'showTextDocument');

      mockDestinationManager = createMockDestinationManager({
        isBound: false,
        sendLinkToDestinationResult: true,
      });

      service = new RangeLinkService(
        getDelimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockPickerCommand,
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
        expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
          2000,
        );
        expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });

      it('should show status message with "copied to clipboard"', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
          2000,
        );
        expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });

      it('should use link type name in status message (RangeLink)', async () => {
        const link = 'src/auth.ts#L10';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
          2000,
        );
        expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });

      it('should use link type name in status message (Portable RangeLink)', async () => {
        const link = 'src/auth.ts#L10{L:LINE,C:COL}';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'Portable RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
          '✓ Portable RangeLink copied to clipboard',
          2000,
        );
        expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });

      it('should not call showWarningMessage', async () => {
        const link = 'src/auth.ts#L10';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
          2000,
        );
        expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });

      it('should not send to terminal', async () => {
        const link = 'src/auth.ts#L10';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockClipboard.writeText).toHaveBeenCalledWith(link);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
          2000,
        );
        expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
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
          getDelimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockPickerCommand,
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
        expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
        expect(mockShowErrorMessage).not.toHaveBeenCalled();
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
        expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
        expect(mockShowErrorMessage).not.toHaveBeenCalled();
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
        expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
        expect(mockShowErrorMessage).not.toHaveBeenCalled();
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
          getDelimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockPickerCommand,
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
        expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
        expect(mockShowErrorMessage).not.toHaveBeenCalled();
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
        expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
        expect(mockShowErrorMessage).not.toHaveBeenCalled();
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
        expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
        expect(mockShowErrorMessage).not.toHaveBeenCalled();
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
          getDelimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockPickerCommand,
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
        expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
          2000,
        );
        expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
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
        expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
          2000,
        );
        expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
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
        expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
          2000,
        );
        expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
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
        expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
          2000,
        );
        expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
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
        expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
          2000,
        );
        expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
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
        expect(mockSetStatusBarMessage).toHaveBeenCalled();
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

        expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
          '✓ Custom <Type> Name copied to clipboard',
          2000,
        );
      });
    });

    describe('i18n integration', () => {
      let formatMessageSpy: jest.SpyInstance;

      beforeEach(() => {
        formatMessageSpy = spyOnFormatMessage();
      });

      it('should call formatMessage with STATUS_BAR_LINK_COPIED_TO_CLIPBOARD and linkTypeName parameter', async () => {
        await (service as any).copyAndSendToDestination({
          control: {
            contentType: PasteContentType.Link,
            destinationBehavior: DestinationBehavior.ClipboardOnly,
          },
          content: {
            clipboard: 'src/file.ts#L1',
            send: 'src/file.ts#L1',
          },
          strategies: {
            sendFn: jest.fn().mockResolvedValue(true),
            isEligibleFn: jest.fn().mockResolvedValue(true),
          },
          contentName: 'RangeLink',
          fnName: 'test',
        });

        expect(formatMessageSpy).toHaveBeenCalledWith(
          MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD,
          { linkTypeName: 'RangeLink' },
        );
      });

      it('should produce correct status message with "RangeLink" parameter', async () => {
        await (service as any).copyAndSendToDestination({
          control: {
            contentType: PasteContentType.Link,
            destinationBehavior: DestinationBehavior.ClipboardOnly,
          },
          content: {
            clipboard: 'src/file.ts#L1',
            send: 'src/file.ts#L1',
          },
          strategies: {
            sendFn: jest.fn().mockResolvedValue(true),
            isEligibleFn: jest.fn().mockResolvedValue(true),
          },
          contentName: 'RangeLink',
          fnName: 'test',
        });

        const expectedMessage = messagesEn[MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD].replace(
          '{linkTypeName}',
          'RangeLink',
        );
        expect(mockSetStatusBarMessage).toHaveBeenCalledWith(expectedMessage, 2000);
      });

      it('should produce correct status message with "Portable RangeLink" parameter', async () => {
        await (service as any).copyAndSendToDestination({
          control: {
            contentType: PasteContentType.Link,
            destinationBehavior: DestinationBehavior.ClipboardOnly,
          },
          content: {
            clipboard: 'src/file.ts#L1',
            send: 'src/file.ts#L1',
          },
          strategies: {
            sendFn: jest.fn().mockResolvedValue(true),
            isEligibleFn: jest.fn().mockResolvedValue(true),
          },
          contentName: 'Portable RangeLink',
          fnName: 'test',
        });

        const expectedMessage = messagesEn[MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD].replace(
          '{linkTypeName}',
          'Portable RangeLink',
        );
        expect(mockSetStatusBarMessage).toHaveBeenCalledWith(expectedMessage, 2000);
      });
    });
  });

  describe('pasteSelectedTextToDestination', () => {
    beforeEach(() => {
      mockDestinationManager = createMockDestinationManager({
        isBound: false,
        sendTextToDestinationResult: true,
      });

      service = new RangeLinkService(
        getDelimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockPickerCommand,
        mockConfigReader,
        mockLogger,
      );
    });

    describe('when no active editor', () => {
      beforeEach(() => {
        mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: undefined,
            showErrorMessage: mockShowErrorMessage,
          },
        });
        service = new RangeLinkService(
          getDelimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockPickerCommand,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should show error message and log diagnostic context', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockShowErrorMessage).toHaveBeenCalledWith('RangeLink: No active editor');
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkService.validateSelectionsAndShowError',
            hasEditor: false,
            selectionCount: 0,
            selections: [],
            documentVersion: undefined,
            documentLineCount: undefined,
            documentIsDirty: undefined,
            documentIsClosed: undefined,
          },
          'Selection validation starting',
        );
        expect(mockLogger.warn).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkService.validateSelectionsAndShowError',
            hasEditor: false,
            errorCode: 'ERROR_NO_ACTIVE_EDITOR',
            selectionCount: 0,
            selections: [],
            documentVersion: undefined,
            documentLineCount: undefined,
            documentIsDirty: undefined,
            documentIsClosed: undefined,
            lineContentAtBoundaries: undefined,
          },
          'Selection validation failed - full diagnostic context',
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
        mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
        const mockDocument = createMockDocument({
          getText: createMockText(''),
          uri: createMockUri('/test/file.ts'),
        });
        const mockEditor = createMockEditor({ document: mockDocument, selections: [] });
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: {
            ...createWindowOptionsForEditor(mockEditor),
            showErrorMessage: mockShowErrorMessage,
          },
        });
        service = new RangeLinkService(
          getDelimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockPickerCommand,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should show error message and log diagnostic context', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockShowErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No text selected. Click in the file, select text, and try again.',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkService.validateSelectionsAndShowError',
            hasEditor: true,
            selectionCount: 0,
            selections: [],
            documentVersion: undefined,
            documentLineCount: undefined,
            documentIsDirty: undefined,
            documentIsClosed: undefined,
          },
          'Selection validation starting',
        );
        expect(mockLogger.warn).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkService.validateSelectionsAndShowError',
            hasEditor: true,
            errorCode: 'ERROR_NO_TEXT_SELECTED',
            selectionCount: 0,
            selections: [],
            documentVersion: undefined,
            documentLineCount: undefined,
            documentIsDirty: undefined,
            documentIsClosed: undefined,
            lineContentAtBoundaries: [],
          },
          'Selection validation failed - full diagnostic context',
        );
      });

      it('should not copy to clipboard', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockClipboard.writeText).not.toHaveBeenCalled();
      });
    });

    describe('when all selections are empty', () => {
      beforeEach(() => {
        mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
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
          windowOptions: {
            ...createWindowOptionsForEditor(mockEditor),
            showErrorMessage: mockShowErrorMessage,
          },
        });
        service = new RangeLinkService(
          getDelimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockPickerCommand,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should show error message and log diagnostic context', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockShowErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No text selected. Click in the file, select text, and try again.',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkService.validateSelectionsAndShowError',
            hasEditor: true,
            selectionCount: 2,
            selections: [
              { index: 0, start: { line: 0, char: 0 }, end: { line: 0, char: 0 }, isEmpty: true },
              { index: 1, start: { line: 1, char: 0 }, end: { line: 1, char: 0 }, isEmpty: true },
            ],
            documentVersion: undefined,
            documentLineCount: undefined,
            documentIsDirty: undefined,
            documentIsClosed: undefined,
          },
          'Selection validation starting',
        );
        expect(mockLogger.warn).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkService.validateSelectionsAndShowError',
            hasEditor: true,
            errorCode: 'ERROR_NO_TEXT_SELECTED',
            selectionCount: 2,
            selections: [
              { index: 0, start: { line: 0, char: 0 }, end: { line: 0, char: 0 }, isEmpty: true },
              { index: 1, start: { line: 1, char: 0 }, end: { line: 1, char: 0 }, isEmpty: true },
            ],
            documentVersion: undefined,
            documentLineCount: undefined,
            documentIsDirty: undefined,
            documentIsClosed: undefined,
            lineContentAtBoundaries: [
              { index: 0, startLineContent: undefined, endLineContent: undefined },
              { index: 1, startLineContent: undefined, endLineContent: undefined },
            ],
          },
          'Selection validation failed - full diagnostic context',
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
        mockSetStatusBarMessage = jest.fn().mockReturnValue({ dispose: jest.fn() });
        const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
        const { adapter } = createMockEditorWithSelection({
          content: 'const foo = "bar";',
          selections: [[0, 0, 0, 18]],
          adapterOptions: {
            envOptions: { clipboard: mockClipboard },
            windowOptions: {
              setStatusBarMessage: mockSetStatusBarMessage,
              showWarningMessage: mockShowWarningMessage,
            },
          },
        });
        mockVscodeAdapter = adapter;
        service = new RangeLinkService(
          getDelimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockPickerCommand,
          mockConfigReader,
          mockLogger,
        );
      });

      describe('when no destination bound', () => {
        it('should invoke picker command to select destination', async () => {
          mockPickerCommand.pick.mockResolvedValue({ outcome: 'cancelled' });

          await service.pasteSelectedTextToDestination();

          expect(mockPickerCommand.pick).toHaveBeenCalledTimes(1);
          expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
        });

        describe('when user cancels quick pick', () => {
          beforeEach(() => {
            mockPickerCommand.pick.mockResolvedValue({ outcome: 'cancelled' });
          });

          it('should NOT copy to clipboard', async () => {
            await service.pasteSelectedTextToDestination();

            expect(mockClipboard.writeText).not.toHaveBeenCalled();
            expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
          });

          it('should NOT attempt to send to destination', async () => {
            await service.pasteSelectedTextToDestination();

            expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
            expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
          });
        });

        it('should copy to clipboard and send to destination after binding via quick pick', async () => {
          const mockTerminal = createMockTerminal();
          const mockDestination = createMockTerminalPasteDestination({
            displayName: 'Terminal',
          });
          mockPickerCommand.pick.mockResolvedValue({
            outcome: 'selected',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
          });
          mockDestinationManager = createMockDestinationManager({
            isBound: false,
            boundDestination: mockDestination,
            sendTextToDestinationResult: true,
            bindResult: Result.ok({ destinationName: 'Terminal', destinationKind: 'terminal' }),
          });
          service = new RangeLinkService(
            getDelimiters,
            mockVscodeAdapter,
            mockDestinationManager,
            mockPickerCommand,
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
          expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
        });

        it('should show error toast and not copy when bind fails via quick pick', async () => {
          const mockTerminal = createMockTerminal();
          const bindError = new RangeLinkExtensionError({
            code: RangeLinkExtensionErrorCodes.DESTINATION_BIND_FAILED,
            message: 'bind failed',
            functionName: 'PasteDestinationManager.bind',
          });
          mockPickerCommand.pick.mockResolvedValue({
            outcome: 'selected',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
          });
          mockDestinationManager = createMockDestinationManager({
            bindResult: Result.err(bindError),
          });
          service = new RangeLinkService(
            getDelimiters,
            mockVscodeAdapter,
            mockDestinationManager,
            mockPickerCommand,
            mockConfigReader,
            mockLogger,
          );

          await service.pasteSelectedTextToDestination();

          const showErrorMock = mockVscodeAdapter.__getVscodeInstance().window
            .showErrorMessage as jest.Mock;
          expect(showErrorMock).toHaveBeenCalledWith('RangeLink: Failed to bind destination');
          expect(mockLogger.error).toHaveBeenCalledWith(
            {
              fn: 'RangeLinkService.showPickerAndBindForPaste',
              error: bindError,
            },
            'Binding failed - no action taken',
          );
          expect(mockClipboard.writeText).not.toHaveBeenCalled();
          expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
          expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
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
            getDelimiters,
            mockVscodeAdapter,
            mockDestinationManager,
            mockPickerCommand,
            mockConfigReader,
            mockLogger,
          );
        });

        it('should copy text to clipboard first (always available fallback)', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockClipboard.writeText).toHaveBeenCalledWith('const foo = "bar";');
          expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
        });

        it('should send selected text to bound destination with basicStatusMessage', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
            'const foo = "bar";',
            '✓ Selected text copied to clipboard',
            'none',
          );
          expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
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
            getDelimiters,
            mockVscodeAdapter,
            mockDestinationManager,
            mockPickerCommand,
            mockConfigReader,
            mockLogger,
          );
        });

        it('should copy text to clipboard', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockClipboard.writeText).toHaveBeenCalledWith('const foo = "bar";');
          expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
          expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
          expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
            2000,
          );
          expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
          expect(mockShowWarningMessage).not.toHaveBeenCalled();
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
          expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
            2000,
          );
          expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
          expect(mockShowWarningMessage).not.toHaveBeenCalled();
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
          expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
            2000,
          );
          expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
          expect(mockShowWarningMessage).not.toHaveBeenCalled();
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
          expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
            2000,
          );
          expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
          expect(mockShowWarningMessage).not.toHaveBeenCalled();
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
          expect(mockSetStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
            2000,
          );
          expect(mockSetStatusBarMessage).toHaveBeenCalledTimes(1);
          expect(mockShowWarningMessage).not.toHaveBeenCalled();
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
        mockSetStatusBarMessage = jest.fn().mockReturnValue({ dispose: jest.fn() });
        const { adapter, document } = createMockEditorWithSelection({
          content: 'first line\nsecond line\nthird line',
          selections: [
            [0, 0, 0, 10],
            [1, 0, 1, 11],
            [2, 0, 2, 10],
          ],
          adapterOptions: {
            envOptions: { clipboard: mockClipboard },
            windowOptions: { setStatusBarMessage: mockSetStatusBarMessage },
          },
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

        const mockDestination = createMockTerminalPasteDestination({ displayName: 'Terminal' });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: true,
          boundDestination: mockDestination,
        });

        service = new RangeLinkService(
          getDelimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockPickerCommand,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should concatenate selections with newlines', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockClipboard.writeText).toHaveBeenCalledWith('first line\nsecond line\nthird line');
        expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
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
          getDelimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockPickerCommand,
          mockConfigReader,
          mockLogger,
        );

        await service.pasteSelectedTextToDestination();

        expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
          'first line\nsecond line\nthird line',
          '✓ Selected text copied to clipboard',
          'none',
        );
        expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
      });

      it('should pass basicStatusMessage to destination manager for status display', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
          'first line\nsecond line\nthird line',
          '✓ Selected text copied to clipboard',
          'none',
        );
        expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
      });
    });

    describe('with mixed empty and non-empty selections', () => {
      beforeEach(() => {
        mockClipboard = createMockClipboard();
        mockSetStatusBarMessage = jest.fn().mockReturnValue({ dispose: jest.fn() });
        const { adapter, document } = createMockEditorWithSelection({
          content: 'valid text',
          selections: [
            [0, 0, 0, 0], // empty (collapsed)
            [1, 0, 1, 10],
            [2, 0, 2, 0], // empty (collapsed)
          ],
          adapterOptions: {
            envOptions: { clipboard: mockClipboard },
            windowOptions: { setStatusBarMessage: mockSetStatusBarMessage },
          },
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
          getDelimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockPickerCommand,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should filter out empty selections', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockClipboard.writeText).toHaveBeenCalledWith('valid text');
        expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
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
          getDelimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockPickerCommand,
          mockConfigReader,
          mockLogger,
        );

        await service.pasteSelectedTextToDestination();

        expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
          'valid text',
          '✓ Selected text copied to clipboard',
          'none',
        );
        expect(mockSetStatusBarMessage).not.toHaveBeenCalled();
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
          getDelimiters,
          adapter,
          boundDestinationManager,
          mockPickerCommand,
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
          getDelimiters,
          adapter,
          boundDestinationManager,
          mockPickerCommand,
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
          getDelimiters,
          adapter,
          boundDestinationManager,
          mockPickerCommand,
          mockConfigReader,
          mockLogger,
        );

        await service.pasteSelectedTextToDestination();

        expect(clipboard.writeText).toHaveBeenCalledWith(unicodeText);
      });
    });
  });

  describe('createLink()', () => {
    let mockGenerateLink: jest.SpyInstance;
    let mockCopyToClipboard: jest.SpyInstance;

    beforeEach(() => {
      mockEditor = createMockEditor();
      mockVscodeAdapter = createMockVscodeAdapter({
        envOptions: { clipboard: mockClipboard },
        windowOptions: {
          activeTextEditor: mockEditor,
          setStatusBarMessage: mockSetStatusBarMessage,
          showWarningMessage: mockShowWarningMessage,
          showErrorMessage: mockShowErrorMessage,
          showInformationMessage: mockShowInformationMessage,
        },
      });
      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        getDelimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockPickerCommand,
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

      expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
      expect(mockCopyToClipboard).toHaveBeenCalledWith(
        mockFormattedLink,
        'RangeLink',
        mockEditor.document.uri,
      );
    });

    it('should not call copyToClipboardAndDestination when generateLinkFromSelection returns null', async () => {
      mockGenerateLink.mockResolvedValue(null);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockCopyToClipboard).not.toHaveBeenCalled();
    });

    describe('when no active editor', () => {
      beforeEach(() => {
        mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: undefined,
            showErrorMessage: mockShowErrorMessage,
          },
        });
        service = new RangeLinkService(
          getDelimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockPickerCommand,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should show error message and log diagnostic context', async () => {
        await service.createLink(PathFormat.WorkspaceRelative);

        expect(mockShowErrorMessage).toHaveBeenCalledWith('RangeLink: No active editor');
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkService.validateSelectionsAndShowError',
            hasEditor: false,
            selectionCount: 0,
            selections: [],
            documentVersion: undefined,
            documentLineCount: undefined,
            documentIsDirty: undefined,
            documentIsClosed: undefined,
          },
          'Selection validation starting',
        );
        expect(mockLogger.warn).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkService.validateSelectionsAndShowError',
            hasEditor: false,
            errorCode: 'ERROR_NO_ACTIVE_EDITOR',
            selectionCount: 0,
            selections: [],
            documentVersion: undefined,
            documentLineCount: undefined,
            documentIsDirty: undefined,
            documentIsClosed: undefined,
            lineContentAtBoundaries: undefined,
          },
          'Selection validation failed - full diagnostic context',
        );
      });

      it('should not copy to clipboard', async () => {
        await service.createLink(PathFormat.WorkspaceRelative);

        expect(mockClipboard.writeText).not.toHaveBeenCalled();
      });
    });
  });

  describe('createPortableLink()', () => {
    let mockGenerateLink: jest.SpyInstance;
    let mockCopyToClipboard: jest.SpyInstance;

    beforeEach(() => {
      mockEditor = createMockEditor();
      mockVscodeAdapter = createMockVscodeAdapter({
        envOptions: { clipboard: mockClipboard },
        windowOptions: {
          activeTextEditor: mockEditor,
          setStatusBarMessage: mockSetStatusBarMessage,
          showWarningMessage: mockShowWarningMessage,
          showErrorMessage: mockShowErrorMessage,
          showInformationMessage: mockShowInformationMessage,
        },
      });
      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        getDelimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockPickerCommand,
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

      expect(mockCopyToClipboard).toHaveBeenCalledWith(
        mockFormattedLink,
        'Portable RangeLink',
        mockEditor.document.uri,
      );
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
    let mockShowErrorMessage: jest.Mock;

    beforeEach(() => {
      mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: createMockUri('/test/file.ts') }),
        selections: [createMockSelection({ isEmpty: false })],
      });

      mockVscodeAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: mockEditor,
          showErrorMessage: mockShowErrorMessage,
        },
        workspaceOptions: {
          getWorkspaceFolder: jest
            .fn()
            .mockReturnValue({ uri: createMockUri('/test'), index: 0, name: 'test' }),
          asRelativePath: jest.fn().mockReturnValue('file.ts'),
        },
      });

      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        getDelimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockPickerCommand,
        mockConfigReader,
        mockLogger,
      );

      mockGenerateLinkFromSelections = spyOnGenerateLinkFromSelections();
    });

    it('should delegate to utility with Regular linkType and return FormattedLink', async () => {
      const mockResult = createMockFormattedLink('file.ts#L10');
      mockGenerateLinkFromSelections.mockReturnValue(Result.ok(mockResult));

      const result = await (service as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        false,
      );

      expect(mockGenerateLinkFromSelections).toHaveBeenCalledWith({
        referencePath: 'file.ts',
        document: mockVscodeAdapter.activeTextEditor!.document,
        selections: mockVscodeAdapter.activeTextEditor!.selections,
        delimiters: DELIMITERS,
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

      const result = await (service as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        true,
      );

      expect(mockGenerateLinkFromSelections).toHaveBeenCalledWith({
        referencePath: 'file.ts',
        document: mockVscodeAdapter.activeTextEditor!.document,
        selections: mockVscodeAdapter.activeTextEditor!.selections,
        delimiters: DELIMITERS,
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

      const result = await (service as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        false,
      );

      expect(result).toBeUndefined();
      expect(mockShowErrorMessage).toHaveBeenCalledWith('RangeLink: Failed to generate link');
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

      const result = await (service as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        true,
      );

      expect(result).toBeUndefined();
      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Failed to generate portable link',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelection', error: testError, linkType: 'portable' },
        'Failed to generate portable link',
      );
    });
  });

  describe('generateLinkFromSelection() - dirty buffer warning', () => {
    let mockGenerateLinkFromSelections: jest.SpyInstance;
    let mockShowWarningMessage: jest.Mock;
    let mockDocumentSave: jest.Mock;

    beforeEach(() => {
      mockShowWarningMessage = jest.fn();
      mockDocumentSave = jest.fn().mockResolvedValue(true);

      mockGenerateLinkFromSelections = spyOnGenerateLinkFromSelections();
      mockGenerateLinkFromSelections.mockReturnValue(
        Result.ok(createMockFormattedLink('file.ts#L10')),
      );
    });

    const createServiceWithDirtyDocument = (isDirty: boolean, warnOnDirtyBuffer: boolean) => {
      const mockDocument = createMockDocument({
        uri: createMockUri('/test/file.ts'),
        isDirty,
        save: mockDocumentSave,
      });
      const mockEditor = createMockEditor({
        document: mockDocument,
        selections: [createMockSelection({ isEmpty: false })],
      });

      const localMockVscodeAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: mockEditor,
          showWarningMessage: mockShowWarningMessage,
        },
        workspaceOptions: {
          getWorkspaceFolder: jest
            .fn()
            .mockReturnValue({ uri: createMockUri('/test'), index: 0, name: 'test' }),
          asRelativePath: jest.fn().mockReturnValue('file.ts'),
        },
      });

      const localMockConfigReader = createMockConfigReader({
        getBoolean: jest.fn((key: string, defaultValue: boolean) => {
          if (key === 'warnOnDirtyBuffer') return warnOnDirtyBuffer;
          return defaultValue;
        }),
      });

      const localService = new RangeLinkService(
        getDelimiters,
        localMockVscodeAdapter,
        createMockDestinationManager({ isBound: false }),
        mockPickerCommand,
        localMockConfigReader,
        mockLogger,
      );

      return { service: localService, mockDocument, mockVscodeAdapter: localMockVscodeAdapter };
    };

    it('should show warning when document is dirty and setting is enabled', async () => {
      const { service: localService } = createServiceWithDirtyDocument(true, true);
      mockShowWarningMessage.mockResolvedValue('Generate Anyway');

      await (localService as any).generateLinkFromSelection(PathFormat.WorkspaceRelative, false);

      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        'File has unsaved changes. Link may point to wrong position after save.',
        'Save & Generate',
        'Generate Anyway',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'handleDirtyBufferWarning', documentUri: 'file:///test/file.ts' },
        'Document has unsaved changes, showing warning',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'handleDirtyBufferWarning' },
        'User chose to generate anyway',
      );
    });

    it('should NOT show warning when document is dirty but setting is disabled', async () => {
      const { service: localService } = createServiceWithDirtyDocument(true, false);

      await (localService as any).generateLinkFromSelection(PathFormat.WorkspaceRelative, false);

      expect(mockShowWarningMessage).not.toHaveBeenCalled();
      expect(mockGenerateLinkFromSelections).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelection', documentUri: 'file:///test/file.ts' },
        'Document has unsaved changes but warning is disabled by setting',
      );
    });

    it('should NOT show warning when document is not dirty', async () => {
      const { service: localService } = createServiceWithDirtyDocument(false, true);

      await (localService as any).generateLinkFromSelection(PathFormat.WorkspaceRelative, false);

      expect(mockShowWarningMessage).not.toHaveBeenCalled();
      expect(mockGenerateLinkFromSelections).toHaveBeenCalled();
    });

    it('should save document and continue when user chooses "Save & Generate"', async () => {
      const { service: localService, mockDocument } = createServiceWithDirtyDocument(true, true);
      mockShowWarningMessage.mockResolvedValue('Save & Generate');

      const result = await (localService as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        false,
      );

      expect(mockDocument.save).toHaveBeenCalled();
      expect(mockGenerateLinkFromSelections).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'handleDirtyBufferWarning' },
        'User chose to save and generate',
      );
    });

    it('should continue without saving when user chooses "Generate Anyway"', async () => {
      const { service: localService, mockDocument } = createServiceWithDirtyDocument(true, true);
      mockShowWarningMessage.mockResolvedValue('Generate Anyway');

      const result = await (localService as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        false,
      );

      expect(mockDocument.save).not.toHaveBeenCalled();
      expect(mockGenerateLinkFromSelections).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'handleDirtyBufferWarning' },
        'User chose to generate anyway',
      );
    });

    it('should abort generation when user dismisses warning', async () => {
      const { service: localService, mockDocument } = createServiceWithDirtyDocument(true, true);
      mockShowWarningMessage.mockResolvedValue(undefined);

      const result = await (localService as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        false,
      );

      expect(mockDocument.save).not.toHaveBeenCalled();
      expect(mockGenerateLinkFromSelections).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'handleDirtyBufferWarning' },
        'User dismissed warning, aborting',
      );
    });

    it('should abort generation and show warning when save fails', async () => {
      mockDocumentSave.mockResolvedValue(false);
      const { service: localService, mockDocument } = createServiceWithDirtyDocument(true, true);
      mockShowWarningMessage.mockResolvedValue('Save & Generate');

      const result = await (localService as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        false,
      );

      expect(mockDocument.save).toHaveBeenCalled();
      expect(mockGenerateLinkFromSelections).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'handleDirtyBufferWarning' },
        'Save operation failed or was cancelled',
      );
      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        'File could not be saved. Link generation aborted.',
      );
    });
  });

  describe('generateLinkFromSelection() - path resolution', () => {
    let mockGenerateLinkFromSelections: jest.SpyInstance;

    beforeEach(() => {
      mockGenerateLinkFromSelections = spyOnGenerateLinkFromSelections();
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
        getDelimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockPickerCommand,
        mockConfigReader,
        mockLogger,
      );

      await (service as any).generateLinkFromSelection(PathFormat.WorkspaceRelative, false);

      expect(mockGenerateLinkFromSelections).toHaveBeenCalledWith({
        referencePath: 'src/file.ts',
        document: mockDocument,
        selections: mockSelections,
        delimiters: DELIMITERS,
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
        getDelimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockPickerCommand,
        mockConfigReader,
        mockLogger,
      );

      await (service as any).generateLinkFromSelection(PathFormat.WorkspaceRelative, false);

      expect(mockGenerateLinkFromSelections).toHaveBeenCalledWith({
        referencePath: '/standalone/file.ts',
        document: mockDocument,
        selections: mockSelections,
        delimiters: DELIMITERS,
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
        getDelimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockPickerCommand,
        mockConfigReader,
        mockLogger,
      );

      await (service as any).generateLinkFromSelection(PathFormat.Absolute, false);

      expect(mockGenerateLinkFromSelections).toHaveBeenCalledWith({
        referencePath: '/workspace/src/file.ts',
        document: mockDocument,
        selections: mockSelections,
        delimiters: DELIMITERS,
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
        getDelimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockPickerCommand,
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

      expect(mockCopyAndSend).toHaveBeenCalledWith({
        control: {
          contentType: 'Link',
          destinationBehavior: 'clipboard-only',
        },
        content: {
          clipboard: mockFormattedLink.link,
          send: mockFormattedLink,
        },
        strategies: {
          sendFn: expect.any(Function),
          isEligibleFn: expect.any(Function),
        },
        contentName: 'RangeLink',
        fnName: 'createLinkOnly',
      });
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

  describe('pasteFilePath (private)', () => {
    let copyAndSendSpy: jest.SpyInstance;

    beforeEach(() => {
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: createMockEditorComposablePasteDestination({ displayName: 'Editor' }),
      });
      service = new RangeLinkService(
        getDelimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockPickerCommand,
        mockConfigReader,
        mockLogger,
      );

      copyAndSendSpy = jest
        .spyOn(service as any, 'copyAndSendToDestination')
        .mockResolvedValue(undefined);
    });

    describe('path resolution', () => {
      it('should delegate to getReferencePath and pass result to copyAndSendToDestination', async () => {
        const getRefPathSpy = jest
          .spyOn(service as any, 'getReferencePath')
          .mockReturnValue('mocked/path.ts');
        const mockUri = createMockUri(TEST_ABSOLUTE_PATH);

        await (service as any).pasteFilePath(mockUri, PathFormat.WorkspaceRelative, 'context-menu');

        expect(getRefPathSpy).toHaveBeenCalledWith(mockUri, PathFormat.WorkspaceRelative);
        expect(copyAndSendSpy).toHaveBeenCalledWith({
          control: {
            contentType: 'Text',
            destinationBehavior: 'bound-destination',
          },
          content: {
            clipboard: 'mocked/path.ts',
            send: 'mocked/path.ts',
            sourceUri: mockUri,
          },
          strategies: {
            sendFn: expect.any(Function),
            isEligibleFn: expect.any(Function),
          },
          contentName: 'File path',
          fnName: 'pasteFilePath',
        });
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkService.pasteFilePath',
            pathFormat: 'workspace-relative',
            uriSource: 'context-menu',
            filePath: 'mocked/path.ts',
          },
          'Resolved file path: mocked/path.ts',
        );
      });
    });

    describe('copyAndSendToDestination callbacks', () => {
      it('should wire sendFn to use paddingMode from config and eligibilityFn to delegate to destination', async () => {
        mockConfigReader.getPaddingMode.mockReturnValue('before');
        const mockUri = createMockUri(TEST_ABSOLUTE_PATH);

        await (service as any).pasteFilePath(mockUri, PathFormat.Absolute, 'context-menu');

        expect(mockConfigReader.getPaddingMode).toHaveBeenCalledWith(
          'smartPadding.pasteFilePath',
          'both',
        );

        const options = copyAndSendSpy.mock.calls[0][0];
        await options.strategies.sendFn('test-text', 'test-message');
        expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
          'test-text',
          'test-message',
          'before',
        );

        const mockDestination = { isEligibleForPasteContent: jest.fn().mockResolvedValue(true) };
        await options.strategies.isEligibleFn(mockDestination, 'eligibility-text');
        expect(mockDestination.isEligibleForPasteContent).toHaveBeenCalledWith('eligibility-text');
      });
    });

    describe('destination binding', () => {
      it('should skip picker when destination is already bound', async () => {
        const mockUri = createMockUri(TEST_ABSOLUTE_PATH);

        await (service as any).pasteFilePath(mockUri, PathFormat.Absolute, 'context-menu');

        expect(mockPickerCommand.pick).not.toHaveBeenCalled();
        expect(copyAndSendSpy).toHaveBeenCalled();
      });

      it('should show picker when not bound and abort when user cancels', async () => {
        mockDestinationManager = createMockDestinationManager({
          isBound: false,
        });
        mockPickerCommand.pick.mockResolvedValue({ outcome: 'cancelled' });
        service = new RangeLinkService(
          getDelimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockPickerCommand,
          mockConfigReader,
          mockLogger,
        );

        copyAndSendSpy = jest
          .spyOn(service as any, 'copyAndSendToDestination')
          .mockResolvedValue(undefined);
        const mockUri = createMockUri(TEST_ABSOLUTE_PATH);

        await (service as any).pasteFilePath(mockUri, PathFormat.Absolute, 'context-menu');

        expect(mockPickerCommand.pick).toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkService.pasteFilePath',
            pathFormat: 'absolute',
            uriSource: 'context-menu',
          },
          'No destination bound, showing quick pick',
        );
        expect(copyAndSendSpy).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkService.pasteFilePath',
            pathFormat: 'absolute',
            uriSource: 'context-menu',
            outcome: 'cancelled',
          },
          'Picker did not bind, aborting',
        );
      });
    });

    describe('path quoting', () => {
      it('should quote path with unsafe characters and log the change', async () => {
        const mockUri = createMockUri(TEST_ABSOLUTE_PATH_WITH_SPACES);

        await (service as any).pasteFilePath(mockUri, PathFormat.Absolute, 'context-menu');

        expect(copyAndSendSpy).toHaveBeenCalledWith({
          control: {
            contentType: 'Text',
            destinationBehavior: 'bound-destination',
          },
          content: {
            clipboard: TEST_ABSOLUTE_PATH_WITH_SPACES,
            send: TEST_QUOTED_PATH_WITH_SPACES,
            sourceUri: mockUri,
          },
          strategies: {
            sendFn: expect.any(Function),
            isEligibleFn: expect.any(Function),
          },
          contentName: 'File path',
          fnName: 'pasteFilePath',
        });
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkService.pasteFilePath',
            pathFormat: 'absolute',
            uriSource: 'context-menu',
            before: TEST_ABSOLUTE_PATH_WITH_SPACES,
            after: TEST_QUOTED_PATH_WITH_SPACES,
          },
          'Quoted path for unsafe characters',
        );
      });

      it('should not quote path when no special characters', async () => {
        const mockUri = createMockUri(TEST_ABSOLUTE_PATH);

        await (service as any).pasteFilePath(mockUri, PathFormat.Absolute, 'context-menu');

        expect(copyAndSendSpy).toHaveBeenCalledWith({
          control: {
            contentType: 'Text',
            destinationBehavior: 'bound-destination',
          },
          content: {
            clipboard: TEST_ABSOLUTE_PATH,
            send: TEST_ABSOLUTE_PATH,
            sourceUri: mockUri,
          },
          strategies: {
            sendFn: expect.any(Function),
            isEligibleFn: expect.any(Function),
          },
          contentName: 'File path',
          fnName: 'pasteFilePath',
        });
      });
    });
  });

  describe('pasteCurrentFilePath (private)', () => {
    let pasteFilePathSpy: jest.SpyInstance;

    it('should resolve URI from active editor and delegate to pasteFilePath', async () => {
      const mockUri = createMockUri(TEST_ABSOLUTE_PATH);
      const mockDocument = createMockDocument({ getText: createMockText('content'), uri: mockUri });
      const mockEditor = createMockEditor({ document: mockDocument, selections: [] });
      mockVscodeAdapter = createMockVscodeAdapter({
        windowOptions: { activeTextEditor: mockEditor, showErrorMessage: mockShowErrorMessage },
      });
      service = new RangeLinkService(
        getDelimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockPickerCommand,
        mockConfigReader,
        mockLogger,
      );

      pasteFilePathSpy = jest.spyOn(service as any, 'pasteFilePath').mockResolvedValue(undefined);

      await (service as any).pasteCurrentFilePath(PathFormat.WorkspaceRelative);

      expect(pasteFilePathSpy).toHaveBeenCalledWith(
        mockUri,
        PathFormat.WorkspaceRelative,
        'command-palette',
      );
    });

    it('should show error and not delegate when no active editor', async () => {
      mockVscodeAdapter = createMockVscodeAdapter({
        windowOptions: { activeTextEditor: undefined, showErrorMessage: mockShowErrorMessage },
      });
      service = new RangeLinkService(
        getDelimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockPickerCommand,
        mockConfigReader,
        mockLogger,
      );

      pasteFilePathSpy = jest.spyOn(service as any, 'pasteFilePath').mockResolvedValue(undefined);

      await (service as any).pasteCurrentFilePath(PathFormat.Absolute);

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'RangeLink: No active file. Open a file and try again.',
      );
      expect(pasteFilePathSpy).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'RangeLinkService.pasteCurrentFilePath', pathFormat: 'absolute' },
        'No active editor',
      );
    });
  });

  describe('getReferencePath (private)', () => {
    const mockUri = { fsPath: TEST_ABSOLUTE_PATH } as vscode.Uri;

    describe('when workspaceFolder is defined', () => {
      beforeEach(() => {
        mockVscodeAdapter.getWorkspaceFolder = jest
          .fn()
          .mockReturnValue({ uri: { fsPath: TEST_WORKSPACE_ROOT } });
        mockVscodeAdapter.asRelativePath = jest.fn().mockReturnValue(TEST_RELATIVE_PATH);
        service = new RangeLinkService(
          getDelimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockPickerCommand,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should return relative path when pathFormat is WorkspaceRelative', () => {
        const result = (service as any).getReferencePath(mockUri, 'workspace-relative');

        expect(result).toBe(TEST_RELATIVE_PATH);
      });

      it('should return absolute path when pathFormat is Absolute', () => {
        const result = (service as any).getReferencePath(mockUri, 'absolute');

        expect(result).toBe(TEST_ABSOLUTE_PATH);
      });
    });

    describe('when workspaceFolder is undefined', () => {
      beforeEach(() => {
        mockVscodeAdapter.getWorkspaceFolder = jest.fn().mockReturnValue(undefined);
        service = new RangeLinkService(
          getDelimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockPickerCommand,
          mockConfigReader,
          mockLogger,
        );
      });

      it('should fall back to absolute path when pathFormat is WorkspaceRelative', () => {
        const result = (service as any).getReferencePath(mockUri, 'workspace-relative');

        expect(result).toBe(TEST_ABSOLUTE_PATH);
      });

      it('should return absolute path when pathFormat is Absolute', () => {
        const result = (service as any).getReferencePath(mockUri, 'absolute');

        expect(result).toBe(TEST_ABSOLUTE_PATH);
      });
    });
  });

  describe('pasteFilePathToDestination', () => {
    it('should delegate to pasteFilePath with Absolute and context-menu', async () => {
      const spy = jest.spyOn(service as any, 'pasteFilePath').mockResolvedValue(undefined);
      const mockUri = createMockUri(TEST_ABSOLUTE_PATH);

      await service.pasteFilePathToDestination(mockUri, PathFormat.Absolute);

      expect(spy).toHaveBeenCalledWith(mockUri, PathFormat.Absolute, 'context-menu');
    });

    it('should delegate to pasteFilePath with WorkspaceRelative and context-menu', async () => {
      const spy = jest.spyOn(service as any, 'pasteFilePath').mockResolvedValue(undefined);
      const mockUri = createMockUri(TEST_ABSOLUTE_PATH);

      await service.pasteFilePathToDestination(mockUri, PathFormat.WorkspaceRelative);

      expect(spy).toHaveBeenCalledWith(mockUri, PathFormat.WorkspaceRelative, 'context-menu');
    });
  });

  describe('pasteCurrentFilePathToDestination', () => {
    it('should delegate to pasteCurrentFilePath with Absolute', async () => {
      const spy = jest.spyOn(service as any, 'pasteCurrentFilePath').mockResolvedValue(undefined);

      await service.pasteCurrentFilePathToDestination(PathFormat.Absolute);

      expect(spy).toHaveBeenCalledWith(PathFormat.Absolute);
    });

    it('should delegate to pasteCurrentFilePath with WorkspaceRelative', async () => {
      const spy = jest.spyOn(service as any, 'pasteCurrentFilePath').mockResolvedValue(undefined);

      await service.pasteCurrentFilePathToDestination(PathFormat.WorkspaceRelative);

      expect(spy).toHaveBeenCalledWith(PathFormat.WorkspaceRelative);
    });
  });

  describe('user feedback accumulation across bind/unbind lifecycle', () => {
    const STATUS_BAR_TIMEOUT = 2000;

    it('tracks cumulative setStatusBarMessage and toast counts through R-L, R-V, R-F, R-J operations', async () => {
      const statusBar = jest.fn().mockReturnValue({ dispose: jest.fn() });
      const infoMsg = jest.fn().mockResolvedValue(undefined);
      const errorMsg = jest.fn().mockResolvedValue(undefined);
      const warningMsg = jest.fn().mockResolvedValue(undefined);
      const clipboard = createMockClipboard();

      const { adapter } = createMockEditorWithSelection({
        content: 'const hello = "world";',
        uri: '/workspace/src/file.ts',
        selections: [[0, 0, 0, 22]],
        adapterOptions: {
          envOptions: { clipboard },
          windowOptions: {
            setStatusBarMessage: statusBar,
            showInformationMessage: infoMsg,
            showErrorMessage: errorMsg,
            showWarningMessage: warningMsg,
          },
          workspaceOptions: {
            getWorkspaceFolder: jest.fn().mockReturnValue(createMockWorkspaceFolder('/workspace')),
            asRelativePath: jest.fn().mockReturnValue('src/file.ts'),
          },
        },
      });

      let bound = false;
      const terminalDest = createMockTerminalPasteDestination({ displayName: 'Terminal' });
      const dm = {
        isBound: jest.fn(() => bound),
        getBoundDestination: jest.fn(() => (bound ? terminalDest : undefined)),
        sendLinkToDestination: jest.fn().mockResolvedValue(true),
        sendTextToDestination: jest.fn().mockResolvedValue(true),
        bind: jest
          .fn()
          .mockResolvedValue(
            Result.ok({ destinationName: 'Terminal', destinationKind: 'terminal' }),
          ),
        unbind: jest.fn(),
        focusBoundDestination: jest
          .fn()
          .mockResolvedValue(Result.ok({ destinationName: 'Terminal' })),
        bindAndFocus: jest.fn().mockResolvedValue(Result.ok({ destinationName: 'Terminal' })),
        dispose: jest.fn(),
      } as unknown as jest.Mocked<PasteDestinationManager>;

      const picker = createMockDestinationPicker();
      const logger = createMockLogger();
      const config = createMockConfigReader();

      const mockGenLink = spyOnGenerateLinkFromSelections();
      mockGenLink.mockReturnValue(Result.ok(createMockFormattedLink('src/file.ts#L1C1-L1C22')));

      const svc = new RangeLinkService(getDelimiters, adapter, dm, picker, config, logger);
      const jumpCmd = new JumpToDestinationCommand(dm, picker, logger);

      // ===== PHASE 1: ALL OPERATIONS WHILE UNBOUND =====

      // R-L: createLink — unbound → clipboard only toast
      await svc.createLink();
      expect(statusBar).toHaveBeenCalledTimes(1);
      expect(statusBar).toHaveBeenNthCalledWith(
        1,
        '✓ RangeLink copied to clipboard',
        STATUS_BAR_TIMEOUT,
      );
      expect(clipboard.writeText).toHaveBeenCalledTimes(1);

      // R-V: pasteSelectedTextToDestination — unbound → picker cancelled → no action
      picker.pick.mockResolvedValue({ outcome: 'cancelled' });
      await svc.pasteSelectedTextToDestination();
      expect(statusBar).toHaveBeenCalledTimes(1);
      expect(clipboard.writeText).toHaveBeenCalledTimes(1);

      // R-F: pasteCurrentFilePathToDestination — unbound → picker cancelled → no action
      picker.pick.mockResolvedValue({ outcome: 'cancelled' });
      await svc.pasteCurrentFilePathToDestination(PathFormat.Absolute);
      expect(statusBar).toHaveBeenCalledTimes(1);
      expect(clipboard.writeText).toHaveBeenCalledTimes(1);

      // R-J: jump — unbound → picker cancelled → no action
      picker.pick.mockResolvedValue({ outcome: 'cancelled' });
      await jumpCmd.execute();
      expect(statusBar).toHaveBeenCalledTimes(1);

      // Unbound phase tally
      expect(infoMsg).not.toHaveBeenCalled();
      expect(errorMsg).not.toHaveBeenCalled();
      expect(warningMsg).not.toHaveBeenCalled();

      // ===== PHASE 2: BIND TO TERMINAL — ALL OPERATIONS WHILE BOUND =====
      bound = true;

      // R-L: createLink — bound → mock manager handles feedback → no statusBar from service
      await svc.createLink();
      expect(statusBar).toHaveBeenCalledTimes(1);
      expect(clipboard.writeText).toHaveBeenCalledTimes(2);

      // R-V: pasteSelectedTextToDestination — bound → mock manager handles
      await svc.pasteSelectedTextToDestination();
      expect(statusBar).toHaveBeenCalledTimes(1);
      expect(clipboard.writeText).toHaveBeenCalledTimes(3);

      // R-F: pasteCurrentFilePathToDestination — bound → mock manager handles
      await svc.pasteCurrentFilePathToDestination(PathFormat.Absolute);
      expect(statusBar).toHaveBeenCalledTimes(1);
      expect(clipboard.writeText).toHaveBeenCalledTimes(4);

      // R-J: jump — bound → focusBoundDestination (manager handles internally)
      const jumpResult = await jumpCmd.execute();
      expect(jumpResult).toStrictEqual({ outcome: 'focused', destinationName: 'Terminal' });
      expect(statusBar).toHaveBeenCalledTimes(1);

      // Bound phase tally: still no toasts from RangeLinkService
      expect(infoMsg).not.toHaveBeenCalled();
      expect(errorMsg).not.toHaveBeenCalled();
      expect(warningMsg).not.toHaveBeenCalled();

      // ===== PHASE 3: UNBIND — BACK TO CLIPBOARD-ONLY =====
      bound = false;

      // R-L: createLink — unbound again → clipboard-only toast
      await svc.createLink();
      expect(statusBar).toHaveBeenCalledTimes(2);
      expect(statusBar).toHaveBeenNthCalledWith(
        2,
        '✓ RangeLink copied to clipboard',
        STATUS_BAR_TIMEOUT,
      );
      expect(clipboard.writeText).toHaveBeenCalledTimes(5);

      // R-V: pasteSelectedTextToDestination — unbound → picker cancelled
      picker.pick.mockResolvedValue({ outcome: 'cancelled' });
      await svc.pasteSelectedTextToDestination();
      expect(statusBar).toHaveBeenCalledTimes(2);

      // ===== PHASE 4: REBIND + INELIGIBLE CONTENT =====
      bound = true;
      terminalDest.isEligibleForPasteContent.mockResolvedValue(false);

      // R-V: bound but ineligible → clipboard-only fallback toast
      await svc.pasteSelectedTextToDestination();
      expect(statusBar).toHaveBeenCalledTimes(3);
      expect(statusBar).toHaveBeenNthCalledWith(
        3,
        '✓ Selected text copied to clipboard',
        STATUS_BAR_TIMEOUT,
      );
      expect(clipboard.writeText).toHaveBeenCalledTimes(6);

      // R-F: bound but ineligible → clipboard-only fallback toast
      await svc.pasteCurrentFilePathToDestination(PathFormat.Absolute);
      expect(statusBar).toHaveBeenCalledTimes(4);
      expect(statusBar).toHaveBeenNthCalledWith(
        4,
        '✓ File path copied to clipboard',
        STATUS_BAR_TIMEOUT,
      );
      expect(clipboard.writeText).toHaveBeenCalledTimes(7);

      // R-L: bound but ineligible link → clipboard-only fallback toast
      terminalDest.isEligibleForPasteLink.mockResolvedValue(false);
      await svc.createLink();
      expect(statusBar).toHaveBeenCalledTimes(5);
      expect(statusBar).toHaveBeenNthCalledWith(
        5,
        '✓ RangeLink copied to clipboard',
        STATUS_BAR_TIMEOUT,
      );
      expect(clipboard.writeText).toHaveBeenCalledTimes(8);

      // Reset eligibility, verify normal bound path resumes
      terminalDest.isEligibleForPasteContent.mockResolvedValue(true);
      terminalDest.isEligibleForPasteLink.mockResolvedValue(true);

      // R-V: bound + eligible again → mock manager handles
      await svc.pasteSelectedTextToDestination();
      expect(statusBar).toHaveBeenCalledTimes(5);
      expect(clipboard.writeText).toHaveBeenCalledTimes(9);

      // ===== FINAL TALLY =====
      // 5 statusBar calls total:
      //   #1: R-L unbound (Phase 1)
      //   #2: R-L unbound (Phase 3)
      //   #3: R-V bound+ineligible (Phase 4)
      //   #4: R-F bound+ineligible (Phase 4)
      //   #5: R-L bound+ineligible (Phase 4)
      expect(statusBar).toHaveBeenCalledTimes(5);
      expect(infoMsg).not.toHaveBeenCalled();
      expect(errorMsg).not.toHaveBeenCalled();
      expect(warningMsg).not.toHaveBeenCalled();
    });
  });
});
