import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';

import type { EligibilityCheckerFactory } from './capabilities/EligibilityCheckerFactory';
import type { PasteExecutorFactory } from './capabilities/PasteExecutorFactory';
import type {
  AIAssistantDestinationType,
  DestinationType,
  PasteDestination,
} from './PasteDestination';

/**
 * Display names for destination types
 *
 * Used for UI components (command palette, status bar, QuickPick menus, error messages).
 */
const DISPLAY_NAMES: Record<DestinationType, string> = {
  terminal: 'Terminal',
  'text-editor': 'Text Editor',
  'cursor-ai': 'Cursor AI Assistant',
  'github-copilot-chat': 'GitHub Copilot Chat',
  'claude-code': 'Claude Code Chat',
};

/**
 * Type-safe options for creating destinations
 *
 * Terminal and text-editor destinations require resources at construction.
 * AI assistant destinations only need availability checks (no resource required).
 */
export type CreateOptions =
  | { type: 'terminal'; terminal: vscode.Terminal }
  | { type: 'text-editor'; editor: vscode.TextEditor }
  | { type: AIAssistantDestinationType };

/**
 * Factory bundle passed to destination builders.
 *
 * Provides IoC-friendly access to capability factories for building
 * composition-based destinations. Each factory creates capabilities
 * with proper dependency injection.
 */
export interface DestinationBuilderFactories {
  readonly pasteExecutor: PasteExecutorFactory;
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
 * - Registry stores builders by destination type
 * - Builders receive factories and options to create destinations
 * - IoC container provides dependencies at registration time
 */
export class DestinationRegistry {
  private readonly builders = new Map<DestinationType, DestinationBuilder>();
  private readonly context: DestinationBuilderContext;

  constructor(
    pasteExecutorFactory: PasteExecutorFactory,
    eligibilityCheckerFactory: EligibilityCheckerFactory,
    ideAdapter: VscodeAdapter,
    logger: Logger,
  ) {
    this.context = {
      factories: {
        pasteExecutor: pasteExecutorFactory,
        eligibilityChecker: eligibilityCheckerFactory,
      },
      ideAdapter,
      logger,
    };
  }

  /**
   * Register a builder for a destination type.
   *
   * The builder receives options and context (factories + dependencies)
   * when invoked via create(). Multiple registrations for the same
   * type will overwrite the previous builder.
   *
   * @param type - Destination type identifier
   * @param builder - Function that creates PasteDestination instances
   */
  register(type: DestinationType, builder: DestinationBuilder): void {
    this.context.logger.debug(
      { fn: 'DestinationRegistry.register', type },
      `Registering builder for destination: ${type}`,
    );
    this.builders.set(type, builder);
  }

  /**
   * Create a destination instance using the registered builder.
   *
   * Looks up the builder by type and invokes it with options and
   * the factory context. Throws if no builder is registered.
   *
   * @param options - Type-discriminated creation options
   * @returns Configured PasteDestination instance
   * @throws RangeLinkExtensionError with DESTINATION_NOT_IMPLEMENTED if type not registered
   */
  create(options: CreateOptions): PasteDestination {
    const type = options.type;
    const builder = this.builders.get(type);

    if (!builder) {
      throw new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.DESTINATION_NOT_IMPLEMENTED,
        message: `No builder registered for destination type: ${type}`,
        functionName: 'DestinationRegistry.create',
        details: { destinationType: type },
      });
    }

    this.context.logger.debug(
      { fn: 'DestinationRegistry.create', type },
      `Creating destination: ${type}`,
    );
    return builder(options, this.context);
  }

  /**
   * Get all registered destination types.
   *
   * Returns types in registration order (Map iteration order).
   * Empty array if no builders registered.
   *
   * @returns Array of registered destination type identifiers
   */
  getSupportedTypes(): DestinationType[] {
    return Array.from(this.builders.keys());
  }

  /**
   * Get display names for all destination types.
   *
   * Maps destination identifiers to user-friendly names shown in:
   * - Command palette
   * - Status bar messages
   * - QuickPick menus
   * - Error messages
   *
   * @returns Record mapping destination types to display names
   */
  getDisplayNames(): Record<DestinationType, string> {
    return DISPLAY_NAMES;
  }
}
