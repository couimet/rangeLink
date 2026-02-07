import { createMockLogger } from 'barebone-logger-testing';

import type { DestinationPickerCommand } from '../../commands';
import { JumpToDestinationCommand } from '../../commands';
import type { FocusSuccessInfo, PasteDestinationManager } from '../../destinations';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import type { BindOptions, DestinationPickerResult } from '../../types';
import { ExtensionResult } from '../../types';
import {
  createMockDestinationManager,
  createMockDestinationPickerCommand,
} from '../helpers';

describe('JumpToDestinationCommand', () => {
  let mockDestinationManager: jest.Mocked<PasteDestinationManager>;
  let mockPickerCommand: jest.Mocked<DestinationPickerCommand>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let command: JumpToDestinationCommand;

  beforeEach(() => {
    mockDestinationManager = createMockDestinationManager();
    mockPickerCommand = createMockDestinationPickerCommand();
    mockLogger = createMockLogger();
    command = new JumpToDestinationCommand(mockDestinationManager, mockPickerCommand, mockLogger);
  });

  it('logs initialization in constructor', () => {
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'JumpToDestinationCommand.constructor' },
      'JumpToDestinationCommand initialized',
    );
  });

  describe('when destination is already bound', () => {
    beforeEach(() => {
      mockDestinationManager.isBound.mockReturnValue(true);
    });

    it('focuses bound destination and returns focused result without showing picker', async () => {
      mockDestinationManager.focusBoundDestination.mockResolvedValue(
        ExtensionResult.ok<FocusSuccessInfo>({
          destinationName: 'Terminal ("bash")',
          destinationKind: 'terminal',
        }),
      );

      const result = await command.execute();

      expect(result).toStrictEqual({
        outcome: 'focused',
        destinationName: 'Terminal ("bash")',
      });
      expect(mockPickerCommand.execute).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'JumpToDestinationCommand.execute' },
        'Destination already bound, focusing',
      );
    });

    it('returns focus-failed when focus fails', async () => {
      const focusError = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.DESTINATION_FOCUS_FAILED,
        message: 'Failed to focus destination: Terminal ("bash")',
        functionName: 'PasteDestinationManager.focusBoundDestination',
      });
      mockDestinationManager.focusBoundDestination.mockResolvedValue(
        ExtensionResult.err(focusError),
      );

      const result = await command.execute();

      expect(result).toStrictEqual({ outcome: 'focus-failed', error: focusError });
      expect(mockPickerCommand.execute).not.toHaveBeenCalled();
    });
  });

  describe('when no destination is bound', () => {
    beforeEach(() => {
      mockDestinationManager.isBound.mockReturnValue(false);
    });

    it('shows picker, binds, focuses, and returns focused result', async () => {
      const bindOptions: BindOptions = { kind: 'claude-code' };
      mockPickerCommand.execute.mockResolvedValue({
        outcome: 'selected',
        bindOptions,
      });
      mockDestinationManager.bindAndFocus.mockResolvedValue(
        ExtensionResult.ok<FocusSuccessInfo>({
          destinationName: 'Claude Code Chat',
          destinationKind: 'claude-code',
        }),
      );

      const result = await command.execute();

      expect(result).toStrictEqual({
        outcome: 'focused',
        destinationName: 'Claude Code Chat',
      });
      expect(mockPickerCommand.execute).toHaveBeenCalledWith({
        noDestinationsMessageCode: 'INFO_JUMP_NO_DESTINATIONS_AVAILABLE',
        placeholderMessageCode: 'INFO_JUMP_QUICK_PICK_PLACEHOLDER',
        callerContext: { fn: 'JumpToDestinationCommand.execute' },
      });
      expect(mockDestinationManager.bindAndFocus).toHaveBeenCalledWith(bindOptions);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'JumpToDestinationCommand.execute' },
        'No destination bound, showing picker',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'JumpToDestinationCommand.execute' },
        'Binding selected destination and focusing',
      );
    });

    it('returns no-resource when picker reports no destinations available', async () => {
      mockPickerCommand.execute.mockResolvedValue({
        outcome: 'no-resource',
      } as DestinationPickerResult);

      const result = await command.execute();

      expect(result).toStrictEqual({ outcome: 'no-resource' });
      expect(mockDestinationManager.bindAndFocus).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'JumpToDestinationCommand.execute' },
        'No destination bound, showing picker',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'JumpToDestinationCommand.execute' },
        'No destinations available',
      );
    });

    it('returns cancelled when user cancels picker', async () => {
      mockPickerCommand.execute.mockResolvedValue({
        outcome: 'cancelled',
      } as DestinationPickerResult);

      const result = await command.execute();

      expect(result).toStrictEqual({ outcome: 'cancelled' });
      expect(mockDestinationManager.bindAndFocus).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'JumpToDestinationCommand.execute' },
        'User cancelled picker',
      );
    });

    it('returns focus-failed when bindAndFocus fails after picker selection', async () => {
      const bindError = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.DESTINATION_BIND_FAILED,
        message: 'Terminal bind failed',
        functionName: 'PasteDestinationManager.bindWithOptions',
      });
      const bindOptions: BindOptions = { kind: 'cursor-ai' };
      mockPickerCommand.execute.mockResolvedValue({
        outcome: 'selected',
        bindOptions,
      });
      mockDestinationManager.bindAndFocus.mockResolvedValue(
        ExtensionResult.err<FocusSuccessInfo>(bindError),
      );

      const result = await command.execute();

      expect(result).toStrictEqual({ outcome: 'focus-failed', error: bindError });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'JumpToDestinationCommand.execute' },
        'Bind and focus failed',
      );
    });
  });
});
