import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode } from '../types';
import type { BindOptions, DestinationKind, TextEditorBindOptions } from '../types';
import { formatMessage } from '../utils/formatMessage';

import type { EligibilityCheckerFactory } from './capabilities/EligibilityCheckerFactory';
import type { FocusCapabilityFactory } from './capabilities/FocusCapabilityFactory';
import type { PasteDestination } from './PasteDestination';

/**
 * Maps destination kinds to their i18n MessageCode for display names.
 *
 * Used by getDisplayNames() to resolve localized strings via formatMessage().
 */
const DISPLAY_NAME_CODES: Record<DestinationKind, MessageCode> = {
  terminal: MessageCode.DESTINATION_DISPLAY_NAME_TERMINAL,
  'text-editor': MessageCode.DESTINATION_DISPLAY_NAME_TEXT_EDITOR,
  'cursor-ai': MessageCode.DESTINATION_DISPLAY_NAME_CURSOR_AI,
  'github-copilot-chat': MessageCode.DESTINATION_DISPLAY_NAME_GITHUB_COPILOT_CHAT,
  'claude-code': MessageCode.DESTINATION_DISPLAY_NAME_CLAUDE_CODE,
};

/**
 * Type-safe options for creating destinations.
 *
 * Derived from BindOptions with text-editor override to require editor reference.
 * TODO(#245): When TextEditorBindOptions gains editor field, simplify to just BindOptions.
 */
export type CreateOptions =
  | Exclude<BindOptions, TextEditorBindOptions>
  | { kind: 'text-editor'; editor: vscode.TextEditor };

/**
 * Factory bundle passed to destination builders.
 *
 * Provides IoC-friendly access to capability factories for building
 * composition-based destinations. Each factory creates capabilities
 * with proper dependency injection.
 */
export interface DestinationBuilderFactories {
  readonly focusCapability: FocusCapabilityFactory;
  readonly eligibilityChecker: EligibilityCheckerFactory;
}

/**
 * Context passed to destination builders.
 *
 * Includes both factory access and infrastructure dependencies
 * needed to construct destinations.
 */
export interface DestinationBuilderContext {
  readonly factories: DestinationBuilderFactories;
  readonly ideAdapter: VscodeAdapter;
  readonly logger: Logger;
}

/**
 * Builder function signature for creating destinations.
 *
 * Receives type-safe options and a context with factories and dependencies.
 * Returns a configured PasteDestination instance.
 *
 * @param options - Type-discriminated options (terminal, editor, or AI type)
 * @param context - Factory bundle and infrastructure dependencies
 * @returns Configured PasteDestination instance
 */
export type DestinationBuilder = (
  options: CreateOptions,
  context: DestinationBuilderContext,
) => PasteDestination;

/**
 * Registry for destination builders supporting IoC pattern.
 *
 * Centralizes destination construction logic and provides factory
 * injection for composition-based destinations. Enables:
 * - Decoupled destination construction from PasteDestinationManager
 * - Easy testing with mock factories
 * - Pluggable destination implementations
 *
 * Design pattern: Registry + Builder
 * - Registry stores builders by destination kind
 * - Builders receive factories and options to create destinations
 * - IoC container provides dependencies at registration time
 */
export class DestinationRegistry {
  private readonly builders = new Map<DestinationKind, DestinationBuilder>();
  private readonly context: DestinationBuilderContext;

  constructor(
    focusCapabilityFactory: FocusCapabilityFactory,
    eligibilityCheckerFactory: EligibilityCheckerFactory,
    ideAdapter: VscodeAdapter,
    logger: Logger,
  ) {
    this.context = {
      factories: {
        focusCapability: focusCapabilityFactory,
        eligibilityChecker: eligibilityCheckerFactory,
      },
      ideAdapter,
      logger,
    };
  }

  /**
   * Register a builder for a destination kind.
   *
   * The builder receives options and context (factories + dependencies)
   * when invoked via create(). Multiple registrations for the same
   * kind will overwrite the previous builder.
   *
   * @param kind - Destination kind identifier
   * @param builder - Function that creates PasteDestination instances
   */
  register(kind: DestinationKind, builder: DestinationBuilder): void {
    this.context.logger.debug(
      { fn: 'DestinationRegistry.register', kind },
      `Registering builder for destination: ${kind}`,
    );
    this.builders.set(kind, builder);
  }

  /**
   * Create a destination instance using the registered builder.
   *
   * Looks up the builder by type and invokes it with options and
   * the factory context. Throws if no builder is registered.
   *
   * @param options - Kind-discriminated creation options
   * @returns Configured PasteDestination instance
   * @throws RangeLinkExtensionError with DESTINATION_NOT_IMPLEMENTED if kind not registered
   */
  create(options: CreateOptions): PasteDestination {
    const kind = options.kind;
    const builder = this.builders.get(kind);

    if (!builder) {
      throw new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.DESTINATION_NOT_IMPLEMENTED,
        message: `No builder registered for destination kind: ${kind}`,
        functionName: 'DestinationRegistry.create',
        details: { kind },
      });
    }

    this.context.logger.debug(
      { fn: 'DestinationRegistry.create', kind },
      `Creating destination: ${kind}`,
    );
    return builder(options, this.context);
  }

  /**
   * Get all registered destination kinds.
   *
   * Returns kinds in registration order (Map iteration order).
   * Empty array if no builders registered.
   *
   * @returns Array of registered destination kind identifiers
   */
  getSupportedKinds(): DestinationKind[] {
    return Array.from(this.builders.keys());
  }

  /**
   * Get display names for all destination kinds.
   *
   * Maps destination identifiers to user-friendly names shown in:
   * - Command palette
   * - Status bar messages
   * - QuickPick menus
   * - Error messages
   *
   * @returns Record mapping destination kinds to display names
   */
  getDisplayNames(): Record<DestinationKind, string> {
    return Object.fromEntries(
      Object.entries(DISPLAY_NAME_CODES).map(([kind, code]) => [kind, formatMessage(code)]),
    ) as Record<DestinationKind, string>;
  }
}
