import { createMockLogger } from 'barebone-logger-testing';
import {
  LinkType,
  RangeLinkError,
  RangeLinkErrorCodes,
  Result,
  SelectionType,
} from 'rangelink-core-ts';
import type { ParsedLink } from 'rangelink-core-ts';

import { NavigateToRangeLinkCommand } from '../../commands/NavigateToRangeLinkCommand';
import { createMockNavigationHandler, createMockVscodeAdapter } from '../helpers';

describe('NavigateToRangeLinkCommand', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockNavigationHandler: ReturnType<typeof createMockNavigationHandler>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockNavigationHandler = createMockNavigationHandler();
  });

  describe('constructor', () => {
    it('logs initialization', () => {
      const mockAdapter = createMockVscodeAdapter();

      new NavigateToRangeLinkCommand(mockAdapter, mockNavigationHandler, mockLogger);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'NavigateToRangeLinkCommand.constructor' },
        'NavigateToRangeLinkCommand initialized',
      );
    });
  });

  describe('execute()', () => {
    describe('user cancels input box', () => {
      it('returns early without navigation when user cancels', async () => {
        const mockShowInputBox = jest.fn().mockResolvedValue(undefined);
        const mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showInputBox: mockShowInputBox,
          },
        });
        const command = new NavigateToRangeLinkCommand(
          mockAdapter,
          mockNavigationHandler,
          mockLogger,
        );

        await command.execute();

        expect(mockShowInputBox).toHaveBeenCalledWith({
          prompt: 'Enter RangeLink to navigate',
          placeHolder: 'src/magic/RangeLink.ts#L3C14-L15C9',
        });
        expect(mockNavigationHandler.parseLink).not.toHaveBeenCalled();
        expect(mockNavigationHandler.navigateToLink).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'NavigateToRangeLinkCommand.execute' },
          'User cancelled input',
        );
      });
    });

    describe('user enters empty input', () => {
      it('shows error message when input is empty string', async () => {
        const mockShowInputBox = jest.fn().mockResolvedValue('');
        const mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
        const mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showInputBox: mockShowInputBox,
            showErrorMessage: mockShowErrorMessage,
          },
        });
        const command = new NavigateToRangeLinkCommand(
          mockAdapter,
          mockNavigationHandler,
          mockLogger,
        );

        await command.execute();

        expect(mockShowErrorMessage).toHaveBeenCalledWith(
          'RangeLink: Please enter a link to navigate',
        );
        expect(mockNavigationHandler.parseLink).not.toHaveBeenCalled();
        expect(mockNavigationHandler.navigateToLink).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'NavigateToRangeLinkCommand.execute' },
          'Empty input provided',
        );
      });

      it('shows error message when input is whitespace only', async () => {
        const mockShowInputBox = jest.fn().mockResolvedValue('   \t  ');
        const mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
        const mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showInputBox: mockShowInputBox,
            showErrorMessage: mockShowErrorMessage,
          },
        });
        const command = new NavigateToRangeLinkCommand(
          mockAdapter,
          mockNavigationHandler,
          mockLogger,
        );

        await command.execute();

        expect(mockShowErrorMessage).toHaveBeenCalledWith(
          'RangeLink: Please enter a link to navigate',
        );
        expect(mockNavigationHandler.parseLink).not.toHaveBeenCalled();
        expect(mockNavigationHandler.navigateToLink).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'NavigateToRangeLinkCommand.execute' },
          'Empty input provided',
        );
      });
    });

    describe('user enters invalid link', () => {
      const mockError = new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_INVALID_RANGE_FORMAT,
        message: 'Invalid link format',
        functionName: 'parseLink',
      });

      it('shows error message with input when parseLink fails', async () => {
        const invalidInput = 'not-a-valid-link';
        const mockShowInputBox = jest.fn().mockResolvedValue(invalidInput);
        const mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
        const mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showInputBox: mockShowInputBox,
            showErrorMessage: mockShowErrorMessage,
          },
        });
        mockNavigationHandler.parseLink.mockReturnValue(Result.err(mockError));
        const command = new NavigateToRangeLinkCommand(
          mockAdapter,
          mockNavigationHandler,
          mockLogger,
        );

        await command.execute();

        expect(mockNavigationHandler.parseLink).toHaveBeenCalledWith(invalidInput);
        expect(mockShowErrorMessage).toHaveBeenCalledWith(
          "RangeLink: Invalid link format: 'not-a-valid-link'",
        );
        expect(mockNavigationHandler.navigateToLink).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'NavigateToRangeLinkCommand.execute',
            input: invalidInput,
            trimmedInput: invalidInput,
            error: mockError,
          },
          'Invalid link format',
        );
      });

      it('trims whitespace before parsing and uses trimmed value in error', async () => {
        const inputWithWhitespace = '  invalid-link  ';
        const trimmedInput = 'invalid-link';
        const mockShowInputBox = jest.fn().mockResolvedValue(inputWithWhitespace);
        const mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
        const mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showInputBox: mockShowInputBox,
            showErrorMessage: mockShowErrorMessage,
          },
        });
        mockNavigationHandler.parseLink.mockReturnValue(Result.err(mockError));
        const command = new NavigateToRangeLinkCommand(
          mockAdapter,
          mockNavigationHandler,
          mockLogger,
        );

        await command.execute();

        expect(mockNavigationHandler.parseLink).toHaveBeenCalledWith(trimmedInput);
        expect(mockShowErrorMessage).toHaveBeenCalledWith(
          "RangeLink: Invalid link format: 'invalid-link'",
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'NavigateToRangeLinkCommand.execute',
            input: inputWithWhitespace,
            trimmedInput,
            error: mockError,
          },
          'Invalid link format',
        );
      });
    });

    describe('user enters valid link', () => {
      const validLink = 'src/file.ts#L10C5-L20C15';
      const mockParsedLink: ParsedLink = {
        path: 'src/file.ts',
        start: { line: 10, char: 5 },
        end: { line: 20, char: 15 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      it('parses link, navigates, and logs each step', async () => {
        const mockShowInputBox = jest.fn().mockResolvedValue(validLink);
        const mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showInputBox: mockShowInputBox,
          },
        });
        mockNavigationHandler.parseLink.mockReturnValue(Result.ok(mockParsedLink));
        const command = new NavigateToRangeLinkCommand(
          mockAdapter,
          mockNavigationHandler,
          mockLogger,
        );

        await command.execute();

        expect(mockNavigationHandler.parseLink).toHaveBeenCalledWith(validLink);
        expect(mockNavigationHandler.navigateToLink).toHaveBeenCalledWith(mockParsedLink, validLink);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'NavigateToRangeLinkCommand.execute' },
          'Showing input box for RangeLink',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'NavigateToRangeLinkCommand.execute', input: validLink },
          'Parsing RangeLink',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'NavigateToRangeLinkCommand.execute', parsed: mockParsedLink },
          'Navigating to link',
        );
      });

      it('trims whitespace from input before parsing', async () => {
        const inputWithWhitespace = '  src/file.ts#L10C5-L20C15  ';
        const trimmedLink = 'src/file.ts#L10C5-L20C15';
        const mockShowInputBox = jest.fn().mockResolvedValue(inputWithWhitespace);
        const mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showInputBox: mockShowInputBox,
          },
        });
        mockNavigationHandler.parseLink.mockReturnValue(Result.ok(mockParsedLink));
        const command = new NavigateToRangeLinkCommand(
          mockAdapter,
          mockNavigationHandler,
          mockLogger,
        );

        await command.execute();

        expect(mockNavigationHandler.parseLink).toHaveBeenCalledWith(trimmedLink);
        expect(mockNavigationHandler.navigateToLink).toHaveBeenCalledWith(
          mockParsedLink,
          trimmedLink,
        );
      });
    });
  });
});
