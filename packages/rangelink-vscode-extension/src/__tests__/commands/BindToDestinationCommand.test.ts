import { createMockLogger } from 'barebone-logger-testing';

import { BindToDestinationCommand } from '../../commands';
import type { BindSuccessInfo } from '../../destinations';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import type { BindOptions } from '../../types';
import { ExtensionResult } from '../../types';
import { createMockDestinationManager, createMockDestinationPicker } from '../helpers';

describe('BindToDestinationCommand', () => {
  let mockDestinationManager: ReturnType<typeof createMockDestinationManager>;
  let mockDestinationPicker: ReturnType<typeof createMockDestinationPicker>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let command: BindToDestinationCommand;

  beforeEach(() => {
    mockDestinationManager = createMockDestinationManager();
    mockDestinationPicker = createMockDestinationPicker();
    mockLogger = createMockLogger();
    command = new BindToDestinationCommand(mockDestinationManager, mockDestinationPicker, mockLogger);
  });

  it('logs initialization in constructor', () => {
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'BindToDestinationCommand.constructor' },
      'BindToDestinationCommand initialized',
    );
  });

  it('shows picker with bind-specific message codes and returns bound on successful selection', async () => {
    const bindOptions: BindOptions = { kind: 'claude-code' };
    const bindResult = ExtensionResult.ok<BindSuccessInfo>({
      destinationName: 'Claude Code Chat',
      destinationKind: 'claude-code',
    });
    mockDestinationPicker = createMockDestinationPicker({
      pick: jest.fn().mockResolvedValue({ outcome: 'selected', bindOptions }),
    });
    mockDestinationManager = createMockDestinationManager({ bindResult });
    command = new BindToDestinationCommand(mockDestinationManager, mockDestinationPicker, mockLogger);

    const result = await command.execute();

    expect(result).toStrictEqual({
      outcome: 'bound',
      bindInfo: { destinationName: 'Claude Code Chat', destinationKind: 'claude-code' },
    });
    expect(mockDestinationPicker.pick).toHaveBeenCalledWith({
      noDestinationsMessageCode: 'INFO_BIND_NO_DESTINATIONS_AVAILABLE',
      placeholderMessageCode: 'INFO_BIND_QUICK_PICK_PLACEHOLDER',
    });
    expect(mockDestinationManager.bind).toHaveBeenCalledWith(bindOptions);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'BindToDestinationCommand.execute' },
      'Showing destination picker for binding',
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'BindToDestinationCommand.execute' },
      'Binding selected destination',
    );
  });

  it('returns no-resource when picker reports no destinations available', async () => {
    mockDestinationPicker = createMockDestinationPicker({
      pick: jest.fn().mockResolvedValue({ outcome: 'no-resource' }),
    });
    command = new BindToDestinationCommand(mockDestinationManager, mockDestinationPicker, mockLogger);

    const result = await command.execute();

    expect(result).toStrictEqual({ outcome: 'no-resource' });
    expect(mockDestinationManager.bind).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'BindToDestinationCommand.execute' },
      'Showing destination picker for binding',
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'BindToDestinationCommand.execute' },
      'No destinations available',
    );
  });

  it('returns cancelled when user cancels picker', async () => {
    mockDestinationPicker = createMockDestinationPicker({
      pick: jest.fn().mockResolvedValue({ outcome: 'cancelled' }),
    });
    command = new BindToDestinationCommand(mockDestinationManager, mockDestinationPicker, mockLogger);

    const result = await command.execute();

    expect(result).toStrictEqual({ outcome: 'cancelled' });
    expect(mockDestinationManager.bind).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'BindToDestinationCommand.execute' },
      'User cancelled picker',
    );
  });

  it('returns bind-failed when bind fails after picker selection', async () => {
    const bindError = new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.DESTINATION_BIND_FAILED,
      message: 'Terminal bind failed',
      functionName: 'PasteDestinationManager.bind',
    });
    const bindOptions: BindOptions = { kind: 'cursor-ai' };
    mockDestinationPicker = createMockDestinationPicker({
      pick: jest.fn().mockResolvedValue({ outcome: 'selected', bindOptions }),
    });
    mockDestinationManager = createMockDestinationManager({
      bindResult: ExtensionResult.err<BindSuccessInfo>(bindError),
    });
    command = new BindToDestinationCommand(mockDestinationManager, mockDestinationPicker, mockLogger);

    const result = await command.execute();

    expect(result).toStrictEqual({ outcome: 'bind-failed', error: bindError });
    expect(mockDestinationManager.bind).toHaveBeenCalledWith(bindOptions);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'BindToDestinationCommand.execute' },
      'Bind failed',
    );
  });
});
