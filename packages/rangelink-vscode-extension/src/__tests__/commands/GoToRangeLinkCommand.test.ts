import { GoToRangeLinkCommand } from '../../commands/GoToRangeLinkCommand';
import { createMockNavigationHandler, createMockVscodeAdapter } from '../helpers';

import { DetailedResult } from '@couimet/detailed-result';
import { createMockLogger } from '@couimet/logger-contract-testing';
import { LinkType, ParsedLink, RangeLinkError, RangeLinkErrorCodes, SelectionType } from 'rangelink-core-ts';
import { ParsedTextFragment, TextFragmentError, TextFragmentErrorCodes, TextFragmentResult } from 'text-fragment-ts';

describe('GoToRangeLinkCommand', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockNavigationHandler: ReturnType<typeof createMockNavigationHandler>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockNavigationHandler = createMockNavigationHandler();
  });

  describe('constructor', () => {
    it('logs initialization', () => {
      const mockAdapter = createMockVscodeAdapter();

      new GoToRangeLinkCommand(mockAdapter, mockNavigationHandler, mockLogger);

      expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'GoToRangeLinkCommand.constructor' }, 'GoToRangeLinkCommand initialized');
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
        const command = new GoToRangeLinkCommand(mockAdapter, mockNavigationHandler, mockLogger);

        await command.execute();

        expect(mockShowInputBox).toHaveBeenCalledWith({
          prompt: 'Enter RangeLink to navigate',
          placeHolder: 'recipes/baking/chickenpie.ts#L3C14-L15C9',
        });
        expect(mockNavigationHandler.parseLink).not.toHaveBeenCalled();
        expect(mockNavigationHandler.navigateToRangeLink).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'GoToRangeLinkCommand.execute' }, 'User cancelled input');
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
        const command = new GoToRangeLinkCommand(mockAdapter, mockNavigationHandler, mockLogger);

        await command.execute();

        expect(mockShowErrorMessage).toHaveBeenCalledWith('Please enter a link to navigate');
        expect(mockNavigationHandler.parseLink).not.toHaveBeenCalled();
        expect(mockNavigationHandler.navigateToRangeLink).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'GoToRangeLinkCommand.execute' }, 'Empty input provided');
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
        const command = new GoToRangeLinkCommand(mockAdapter, mockNavigationHandler, mockLogger);

        await command.execute();

        expect(mockShowErrorMessage).toHaveBeenCalledWith('Please enter a link to navigate');
        expect(mockNavigationHandler.parseLink).not.toHaveBeenCalled();
        expect(mockNavigationHandler.navigateToRangeLink).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'GoToRangeLinkCommand.execute' }, 'Empty input provided');
      });
    });

    describe('user enters invalid link', () => {
      const mockError = new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_INVALID_RANGE_FORMAT,
        message: 'Invalid link format',
        functionName: 'parseLink',
      });
      const mockTextError = new TextFragmentError({
        code: TextFragmentErrorCodes.PARSE_TEXT_FRAGMENT_NO_SEPARATOR,
        message: 'Link must contain :~:text= separator',
        functionName: 'parseTextFragment',
      });

      it('shows error message with input when both numeric and text parsing fail', async () => {
        const invalidInput = 'not-a-valid-link';
        const mockShowInputBox = jest.fn().mockResolvedValue(invalidInput);
        const mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
        const mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showInputBox: mockShowInputBox,
            showErrorMessage: mockShowErrorMessage,
          },
        });
        mockNavigationHandler.parseLink.mockReturnValue(DetailedResult.failure(mockError));
        mockNavigationHandler.parseTextFragment.mockReturnValue(TextFragmentResult.err(mockTextError));
        const command = new GoToRangeLinkCommand(mockAdapter, mockNavigationHandler, mockLogger);

        await command.execute();

        expect(mockNavigationHandler.parseLink).toHaveBeenCalledWith(invalidInput);
        expect(mockNavigationHandler.parseTextFragment).toHaveBeenCalledWith(invalidInput);
        expect(mockShowErrorMessage).toHaveBeenCalledWith("Invalid link format: 'not-a-valid-link'");
        expect(mockNavigationHandler.navigateToRangeLink).not.toHaveBeenCalled();
        expect(mockNavigationHandler.navigateToTextFragmentLink).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'GoToRangeLinkCommand.execute',
            input: invalidInput,
            trimmedInput: invalidInput,
            error: mockTextError,
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
        mockNavigationHandler.parseLink.mockReturnValue(DetailedResult.failure(mockError));
        mockNavigationHandler.parseTextFragment.mockReturnValue(TextFragmentResult.err(mockTextError));
        const command = new GoToRangeLinkCommand(mockAdapter, mockNavigationHandler, mockLogger);

        await command.execute();

        expect(mockNavigationHandler.parseLink).toHaveBeenCalledWith(trimmedInput);
        expect(mockShowErrorMessage).toHaveBeenCalledWith("Invalid link format: 'invalid-link'");
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'GoToRangeLinkCommand.execute',
            input: inputWithWhitespace,
            trimmedInput,
            error: mockTextError,
          },
          'Invalid link format',
        );
      });
    });

    describe('user enters valid link', () => {
      const validLink = 'src/file.ts#L10C5-L20C15';
      const mockParsedLink: ParsedLink = {
        path: 'src/file.ts',
        quotedPath: 'src/file.ts',
        start: { line: 10, character: 5 },
        end: { line: 20, character: 15 },
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
        mockNavigationHandler.parseLink.mockReturnValue(DetailedResult.success(mockParsedLink));
        const command = new GoToRangeLinkCommand(mockAdapter, mockNavigationHandler, mockLogger);

        await command.execute();

        expect(mockNavigationHandler.parseLink).toHaveBeenCalledWith(validLink);
        expect(mockNavigationHandler.navigateToRangeLink).toHaveBeenCalledWith(mockParsedLink, validLink);
        expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'GoToRangeLinkCommand.execute' }, 'Showing input box for RangeLink');
        expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'GoToRangeLinkCommand.execute', input: validLink }, 'Parsing RangeLink');
        expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'GoToRangeLinkCommand.execute', parsed: mockParsedLink }, 'Navigating to link');
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
        mockNavigationHandler.parseLink.mockReturnValue(DetailedResult.success(mockParsedLink));
        const command = new GoToRangeLinkCommand(mockAdapter, mockNavigationHandler, mockLogger);

        await command.execute();

        expect(mockNavigationHandler.parseLink).toHaveBeenCalledWith(trimmedLink);
        expect(mockNavigationHandler.navigateToRangeLink).toHaveBeenCalledWith(mockParsedLink, trimmedLink);
        expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'GoToRangeLinkCommand.execute', input: trimmedLink }, 'Parsing RangeLink');
        expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'GoToRangeLinkCommand.execute', parsed: mockParsedLink }, 'Navigating to link');
      });
    });

    describe('user enters valid text fragment link', () => {
      const textFragmentLink = 'src/file.ts:~:text=function';
      const mockParsedTextFragment: ParsedTextFragment = {
        path: 'src/file.ts',
        directive: { start: 'function' },
      };

      it('falls back to text parsing and navigates when numeric parsing fails', async () => {
        const mockShowInputBox = jest.fn().mockResolvedValue(textFragmentLink);
        const mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showInputBox: mockShowInputBox,
          },
        });
        mockNavigationHandler.parseLink.mockReturnValue(
          DetailedResult.failure(
            new RangeLinkError({
              code: RangeLinkErrorCodes.PARSE_NO_HASH_SEPARATOR,
              message: 'Link must contain # separator',
              functionName: 'parseLink',
            }),
          ),
        );
        mockNavigationHandler.parseTextFragment.mockReturnValue(TextFragmentResult.ok(mockParsedTextFragment));
        const command = new GoToRangeLinkCommand(mockAdapter, mockNavigationHandler, mockLogger);

        await command.execute();

        expect(mockNavigationHandler.parseLink).toHaveBeenCalledWith(textFragmentLink);
        expect(mockNavigationHandler.parseTextFragment).toHaveBeenCalledWith(textFragmentLink);
        expect(mockNavigationHandler.navigateToTextFragmentLink).toHaveBeenCalledWith(mockParsedTextFragment, textFragmentLink);
        expect(mockNavigationHandler.navigateToRangeLink).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'GoToRangeLinkCommand.execute', parsed: mockParsedTextFragment },
          'Navigating to text fragment link',
        );
      });

      it('trims whitespace from a text fragment link before parsing', async () => {
        const inputWithWhitespace = '  src/file.ts:~:text=function  ';
        const trimmedLink = 'src/file.ts:~:text=function';
        const mockShowInputBox = jest.fn().mockResolvedValue(inputWithWhitespace);
        const mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showInputBox: mockShowInputBox,
          },
        });
        mockNavigationHandler.parseLink.mockReturnValue(
          DetailedResult.failure(
            new RangeLinkError({
              code: RangeLinkErrorCodes.PARSE_NO_HASH_SEPARATOR,
              message: 'Link must contain # separator',
              functionName: 'parseLink',
            }),
          ),
        );
        mockNavigationHandler.parseTextFragment.mockReturnValue(TextFragmentResult.ok(mockParsedTextFragment));
        const command = new GoToRangeLinkCommand(mockAdapter, mockNavigationHandler, mockLogger);

        await command.execute();

        expect(mockNavigationHandler.parseLink).toHaveBeenCalledWith(trimmedLink);
        expect(mockNavigationHandler.parseTextFragment).toHaveBeenCalledWith(trimmedLink);
        expect(mockNavigationHandler.navigateToTextFragmentLink).toHaveBeenCalledWith(mockParsedTextFragment, trimmedLink);
        expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'GoToRangeLinkCommand.execute', input: trimmedLink }, 'Parsing RangeLink');
      });
    });
  });
});
