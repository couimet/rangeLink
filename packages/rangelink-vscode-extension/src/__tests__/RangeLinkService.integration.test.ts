/**
 * Integration tests for RangeLinkService i18n message formatting.
 *
 * These tests use the REAL formatMessage() function and messagesEn lookup
 * (not mocked) to verify that status bar messages are correctly assembled
 * with interpolated parameters. The service itself uses mocked dependencies
 * for everything except the i18n pipeline.
 *
 * Purpose: Ensure the i18n integration produces correct user-facing strings.
 */
import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import type { DelimiterConfig, DelimiterConfigGetter } from 'rangelink-core-ts';

import type { ClipboardPreserver } from '../clipboard/ClipboardPreserver';
import type { ConfigReader } from '../config';
import type { DestinationPicker, PasteDestinationManager } from '../destinations';
import { messagesEn } from '../i18n';
import { DestinationBehavior, RangeLinkService } from '../RangeLinkService';
import { MessageCode, PasteContentType } from '../types';

import {
  createMockClipboard,
  createMockClipboardPreserver,
  createMockConfigReader,
  createMockDestinationManager,
  createMockDestinationPicker,
  createMockVscodeAdapter,
  spyOnFormatMessage,
  type MockClipboard,
  type VscodeAdapterWithTestHooks,
} from './helpers';

const DELIMITERS: DelimiterConfig = {
  line: 'L',
  position: 'C',
  hash: '#',
  range: '-',
};

const getDelimiters: DelimiterConfigGetter = () => DELIMITERS;

describe('RangeLinkService i18n integration', () => {
  let service: RangeLinkService;
  let mockVscodeAdapter: VscodeAdapterWithTestHooks;
  let mockDestinationManager: PasteDestinationManager;
  let mockPickerCommand: jest.Mocked<DestinationPicker>;
  let mockConfigReader: jest.Mocked<ConfigReader>;
  let mockClipboardPreserver: jest.Mocked<ClipboardPreserver>;
  let mockLogger: Logger;
  let mockClipboard: MockClipboard;
  let mockSetStatusBarMessage: jest.Mock;
  let formatMessageSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockPickerCommand = createMockDestinationPicker();
    mockClipboard = createMockClipboard();
    mockConfigReader = createMockConfigReader();
    mockClipboardPreserver = createMockClipboardPreserver();
    mockSetStatusBarMessage = jest.fn().mockReturnValue({ dispose: jest.fn() });
    mockVscodeAdapter = createMockVscodeAdapter({
      envOptions: { clipboard: mockClipboard },
      windowOptions: {
        setStatusBarMessage: mockSetStatusBarMessage,
        showWarningMessage: jest.fn().mockResolvedValue(undefined),
        showErrorMessage: jest.fn().mockResolvedValue(undefined),
        showInformationMessage: jest.fn().mockResolvedValue(undefined),
      },
    });

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
      mockClipboardPreserver,
      mockLogger,
    );

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
