import { createMockLogger } from '@couimet/logger-contract-testing';

import { createBindToCustomAiByIdCommand } from '../../commands/createBindToCustomAiByIdCommand';
import type { BindSuccessInfo } from '../../destinations';
import * as destinationBuilders from '../../destinations/destinationBuilders';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import { ExtensionResult } from '../../types';
import { createMockDestinationManager } from '../helpers';

describe('createBindToCustomAiByIdCommand', () => {
  const mockLogger = createMockLogger();

  const createCustomConfig = (extensionId: string) => ({
    kind: `custom-ai:${extensionId}` as const,
    extensionId,
    extensionName: `Custom ${extensionId}`,
    focusCommands: ['test.focusCommand'],
  });

  it('returns error when args is undefined', async () => {
    const mockManager = createMockDestinationManager();

    const handler = createBindToCustomAiByIdCommand([], mockManager, mockLogger);
    const result = await handler(undefined);

    expect(result).toBeRangeLinkExtensionErrorErr('CUSTOM_AI_NOT_FOUND_BY_EXTENSION_ID', {
      message: 'Argument must be { extensionId: string }',
      functionName: 'createBindToCustomAiByIdCommand',
    });

    expect(mockManager.bind).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'createBindToCustomAiByIdCommand' },
      'Invalid or missing arguments for bindToCustomAiById',
    );
  });

  it('returns error when args is null', async () => {
    const mockManager = createMockDestinationManager();

    const handler = createBindToCustomAiByIdCommand([], mockManager, mockLogger);
    const result = await handler(null);

    expect(result).toBeRangeLinkExtensionErrorErr('CUSTOM_AI_NOT_FOUND_BY_EXTENSION_ID', {
      message: 'Argument must be { extensionId: string }',
      functionName: 'createBindToCustomAiByIdCommand',
    });
  });

  it('returns error when args is a string', async () => {
    const mockManager = createMockDestinationManager();

    const handler = createBindToCustomAiByIdCommand([], mockManager, mockLogger);
    const result = await handler('anthropic.claude-code');

    expect(result).toBeRangeLinkExtensionErrorErr('CUSTOM_AI_NOT_FOUND_BY_EXTENSION_ID', {
      message: 'Argument must be { extensionId: string }',
      functionName: 'createBindToCustomAiByIdCommand',
    });
  });

  it('returns error when args is an array', async () => {
    const mockManager = createMockDestinationManager();

    const handler = createBindToCustomAiByIdCommand([], mockManager, mockLogger);
    const result = await handler(['anthropic.claude-code']);

    expect(result).toBeRangeLinkExtensionErrorErr('CUSTOM_AI_NOT_FOUND_BY_EXTENSION_ID', {
      message: 'Argument must be { extensionId: string }',
      functionName: 'createBindToCustomAiByIdCommand',
    });
  });

  it('returns error when extensionId is missing from args', async () => {
    const mockManager = createMockDestinationManager();

    const handler = createBindToCustomAiByIdCommand([], mockManager, mockLogger);
    const result = await handler({});

    expect(result).toBeRangeLinkExtensionErrorErr('CUSTOM_AI_NOT_FOUND_BY_EXTENSION_ID', {
      message: 'Argument must be { extensionId: string }',
      functionName: 'createBindToCustomAiByIdCommand',
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'createBindToCustomAiByIdCommand', argsType: 'object' },
      'Missing or invalid extensionId in args',
    );
  });

  it('returns error when extensionId is an empty string', async () => {
    const mockManager = createMockDestinationManager();

    const handler = createBindToCustomAiByIdCommand([], mockManager, mockLogger);
    const result = await handler({ extensionId: '' });

    expect(result).toBeRangeLinkExtensionErrorErr('CUSTOM_AI_NOT_FOUND_BY_EXTENSION_ID', {
      message: 'Argument must be { extensionId: string }',
      functionName: 'createBindToCustomAiByIdCommand',
    });
  });

  it('returns error when extensionId is a number', async () => {
    const mockManager = createMockDestinationManager();

    const handler = createBindToCustomAiByIdCommand([], mockManager, mockLogger);
    const result = await handler({ extensionId: 123 });

    expect(result).toBeRangeLinkExtensionErrorErr('CUSTOM_AI_NOT_FOUND_BY_EXTENSION_ID', {
      message: 'Argument must be { extensionId: string }',
      functionName: 'createBindToCustomAiByIdCommand',
    });
  });

  it('returns error when resolveKindByExtensionId returns undefined for unknown extensionId', async () => {
    const resolveSpy = jest
      .spyOn(destinationBuilders, 'resolveKindByExtensionId')
      .mockReturnValue(undefined);
    const mockManager = createMockDestinationManager();

    const handler = createBindToCustomAiByIdCommand([], mockManager, mockLogger);
    const result = await handler({ extensionId: 'unknown.missing' });

    expect(result).toBeRangeLinkExtensionErrorErr('CUSTOM_AI_NOT_FOUND_BY_EXTENSION_ID', {
      message: "No AI assistant found with extension ID 'unknown.missing'",
      functionName: 'createBindToCustomAiByIdCommand',
    });

    expect(resolveSpy).toHaveBeenCalledWith('unknown.missing', []);
    expect(mockManager.bind).not.toHaveBeenCalled();
  });

  it('binds a built-in assistant when resolveKindByExtensionId returns a built-in kind', async () => {
    const resolveSpy = jest
      .spyOn(destinationBuilders, 'resolveKindByExtensionId')
      .mockReturnValue('claude-code');

    const bindResult = ExtensionResult.ok<BindSuccessInfo>({
      destinationName: 'Claude Code Chat',
      destinationKind: 'claude-code',
    });
    const mockManager = createMockDestinationManager({ bindResult });

    const handler = createBindToCustomAiByIdCommand([], mockManager, mockLogger);
    const result = await handler({ extensionId: 'anthropic.claude-code' });

    expect(resolveSpy).toHaveBeenCalledWith('anthropic.claude-code', []);
    expect(mockManager.bind).toHaveBeenCalledWith({ kind: 'claude-code' });

    expect(result).toBeOkWith((value: BindSuccessInfo) => {
      expect(value).toStrictEqual({
        destinationName: 'Claude Code Chat',
        destinationKind: 'claude-code',
      });
    });

    expect(mockLogger.debug).toHaveBeenCalledWith(
      {
        fn: 'createBindToCustomAiByIdCommand',
        extensionId: 'anthropic.claude-code',
        kind: 'claude-code',
      },
      'Binding to custom AI by ID',
    );
  });

  it('binds a custom assistant when resolveKindByExtensionId returns a custom kind', async () => {
    const extensionId = 'my-custom.extension';
    const kind = `custom-ai:${extensionId}` as const;
    const customAssistants = [createCustomConfig(extensionId)];

    const resolveSpy = jest
      .spyOn(destinationBuilders, 'resolveKindByExtensionId')
      .mockReturnValue(kind);

    const bindResult = ExtensionResult.ok<BindSuccessInfo>({
      destinationName: 'Custom my-custom.extension',
      destinationKind: kind,
    });

    const mockManager = createMockDestinationManager({ bindResult });

    const handler = createBindToCustomAiByIdCommand(customAssistants, mockManager, mockLogger);
    const result = await handler({ extensionId });

    expect(resolveSpy).toHaveBeenCalledWith(extensionId, customAssistants);
    expect(mockManager.bind).toHaveBeenCalledWith({ kind });

    expect(result).toBeOkWith((value: BindSuccessInfo) => {
      expect(value).toStrictEqual({
        destinationName: 'Custom my-custom.extension',
        destinationKind: kind,
      });
    });

    expect(mockLogger.debug).toHaveBeenCalledWith(
      {
        fn: 'createBindToCustomAiByIdCommand',
        extensionId,
        kind,
      },
      'Binding to custom AI by ID',
    );
  });

  it('passes bind error through when destinationManager.bind returns an error', async () => {
    const resolveSpy = jest
      .spyOn(destinationBuilders, 'resolveKindByExtensionId')
      .mockReturnValue('gemini-code-assist');

    const bindError = new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.DESTINATION_BIND_FAILED,
      message: 'Destination not available',
      functionName: 'PasteDestinationManager.bindGenericDestination',
    });
    const bindResult = ExtensionResult.err<BindSuccessInfo>(bindError);
    const mockManager = createMockDestinationManager({ bindResult });

    const handler = createBindToCustomAiByIdCommand([], mockManager, mockLogger);
    const result = await handler({ extensionId: 'google.geminicodeassist' });

    expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
      message: 'Destination not available',
      functionName: 'PasteDestinationManager.bindGenericDestination',
    });
    expect(resolveSpy).toHaveBeenCalledWith('google.geminicodeassist', []);
    expect(mockManager.bind).toHaveBeenCalledWith({ kind: 'gemini-code-assist' });
  });
});
