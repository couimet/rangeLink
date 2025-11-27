/**
 * Create a mock DestinationFactory for testing PasteDestinationManager.
 *
 * Provides a factory that returns pre-configured mock destinations,
 * eliminating coupling to factory's internal dependencies (ChatPasteHelperFactory).
 */

import type { DestinationFactory } from '../../destinations/DestinationFactory';
import type { PasteDestination } from '../../destinations/PasteDestination';

import { createMockClaudeCodeDestination } from './createMockClaudeCodeDestination';
import { createMockCursorAIDestination } from './createMockCursorAIDestination';
import { createMockTerminalDestination } from './createMockTerminalDestination';
import { createMockTextEditorDestination } from './createMockTextEditorDestination';

/**
 * Options for configuring mock destination factory behavior.
 */
export interface MockDestinationFactoryOptions {
  /**
   * Pre-configured destinations to return from create().
   * Factory will return the appropriate destination based on type.
   */
  destinations?: {
    terminal?: jest.Mocked<PasteDestination>;
    'text-editor'?: jest.Mocked<PasteDestination>;
    'cursor-ai'?: jest.Mocked<PasteDestination>;
    'claude-code'?: jest.Mocked<PasteDestination>;
  };

  /**
   * Custom implementation for create() method.
   * If provided, overrides default destination lookup behavior.
   */
  createImpl?: (options: {
    type: string;
    terminal?: any;
    editor?: any;
  }) => PasteDestination | undefined;
}

/**
 * Create a mock DestinationFactory for testing.
 *
 * The factory's create() method returns pre-configured mock destinations
 * based on the requested type. This eliminates test coupling to factory's
 * internal dependencies (e.g., ChatPasteHelperFactory).
 *
 * @param options - Configuration for mock factory behavior
 * @returns Mock DestinationFactory with jest.Mocked type
 *
 * @example
 * ```typescript
 * // Use default mock destinations
 * const mockFactory = createMockDestinationFactory();
 * const manager = new PasteDestinationManager(context, mockFactory, adapter, logger);
 *
 * // Verify manager delegated to factory
 * await manager.bind('terminal');
 * expect(mockFactory.create).toHaveBeenCalledWith({ type: 'terminal', terminal: mockTerminal });
 * ```
 *
 * @example
 * ```typescript
 * // Provide custom mock destinations
 * const mockTerminalDest = createMockTerminalDestination({ displayName: 'Custom Terminal' });
 * const mockFactory = createMockDestinationFactory({
 *   destinations: {
 *     terminal: mockTerminalDest,
 *   },
 * });
 *
 * // Verify destination behavior
 * await manager.bind('terminal');
 * expect(mockTerminalDest.pasteLink).toHaveBeenCalled();
 * ```
 *
 * @example
 * ```typescript
 * // Custom create() implementation
 * const mockFactory = createMockDestinationFactory({
 *   createImpl: (options) => {
 *     if (options.type === 'terminal') return mockTerminalDest;
 *     throw new Error('Unsupported type');
 *   },
 * });
 * ```
 */
export const createMockDestinationFactory = (
  options?: MockDestinationFactoryOptions,
): jest.Mocked<DestinationFactory> => {
  const destinations = options?.destinations ?? {
    terminal: createMockTerminalDestination(),
    'text-editor': createMockTextEditorDestination(),
    'cursor-ai': createMockCursorAIDestination(),
    'claude-code': createMockClaudeCodeDestination(),
  };

  const defaultCreateImpl = (createOptions: {
    type: string;
    terminal?: any;
    editor?: any;
  }): PasteDestination | undefined => {
    return destinations[createOptions.type as keyof typeof destinations];
  };

  const createImpl = options?.createImpl ?? defaultCreateImpl;

  return {
    create: jest.fn().mockImplementation(createImpl),
  } as unknown as jest.Mocked<DestinationFactory>;
};
