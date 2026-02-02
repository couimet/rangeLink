import type { Logger, LoggingContext } from 'barebone-logger';
import type { FormattedLink } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import { type AutoPasteResult, PasteContentType } from '../types';
import type { AIAssistantDestinationType, DestinationType } from '../types';
import { applySmartPadding, type PaddingMode } from '../utils';

import { AlwaysEligibleChecker } from './capabilities/AlwaysEligibleChecker';
import type { EligibilityChecker } from './capabilities/EligibilityChecker';
import type { PasteExecutor } from './capabilities/PasteExecutor';
import type { PasteDestination } from './PasteDestination';

// ============================================================================
// Factory Method Parameter Types
// ============================================================================

/**
 * Parameters for creating a terminal destination via factory method.
 *
 * Terminal destinations:
 * - Always eligible for paste (no self-paste checking needed)
 * - Always available (terminal exists at construction time)
 * - Compare equality by process ID
 */
export interface TerminalDestinationParams {
  readonly terminal: vscode.Terminal;
  readonly displayName: string;
  readonly pasteExecutor: PasteExecutor;
  readonly jumpSuccessMessage: string;
  readonly loggingDetails: Record<string, unknown>;
  readonly logger: Logger;
  readonly compareWith: (other: PasteDestination) => Promise<boolean>;
}

/**
 * Parameters for creating an editor destination via factory method.
 *
 * Editor destinations:
 * - Require eligibility checking (prevent self-paste)
 * - Always available (editor exists at construction time)
 * - Compare equality by document URI
 */
export interface EditorDestinationParams {
  readonly editor: vscode.TextEditor;
  readonly displayName: string;
  readonly pasteExecutor: PasteExecutor;
  readonly eligibilityChecker: EligibilityChecker;
  readonly jumpSuccessMessage: string;
  readonly loggingDetails: Record<string, unknown>;
  readonly logger: Logger;
  readonly compareWith: (other: PasteDestination) => Promise<boolean>;
}

/**
 * Parameters for creating an AI assistant destination via factory method.
 *
 * AI assistant destinations:
 * - Always eligible for paste (no self-paste possible)
 * - May require availability checking (extension presence)
 * - Singleton equality (compared by reference)
 * - May provide user instructions for manual paste fallback
 */
export interface AiAssistantDestinationParams {
  readonly id: AIAssistantDestinationType;
  readonly displayName: string;
  readonly pasteExecutor: PasteExecutor;
  readonly isAvailable: () => Promise<boolean>;
  readonly jumpSuccessMessage: string;
  readonly loggingDetails: Record<string, unknown>;
  readonly logger: Logger;
  readonly getUserInstruction?: (autoPasteResult: AutoPasteResult) => string | undefined;
}

/**
 * Discriminated union for destination resources.
 *
 * Terminal and TextEditor destinations bind to VSCode resources.
 * AI assistants are singletons with no bound resource.
 *
 * This provides type-safe access to underlying resources for:
 * - Equality comparison (comparing terminal process IDs, editor URIs)
 * - Logging and debugging
 * - Resource lifecycle management
 */
export type DestinationResource =
  | { readonly kind: 'terminal'; readonly terminal: vscode.Terminal }
  | { readonly kind: 'editor'; readonly editor: vscode.TextEditor }
  | { readonly kind: 'singleton' };

/**
 * Configuration for creating a ComposablePasteDestination instance.
 *
 * Separates required dependencies from optional customization functions to improve
 * readability and make construction explicit about what's required vs optional.
 */
export interface ComposablePasteDestinationConfig {
  /** Unique identifier for this destination type */
  readonly id: DestinationType;

  /** User-friendly display name shown in status messages and UI */
  readonly displayName: string;

  /**
   * The underlying VSCode resource this destination is bound to.
   *
   * This enables type-safe resource access for equality comparison and logging.
   */
  readonly resource: DestinationResource;

  /** Capability for focusing and inserting text into the destination */
  readonly pasteExecutor: PasteExecutor;

  /** Capability for checking eligibility of content */
  readonly eligibilityChecker: EligibilityChecker;

  /** Check if destination is currently available for pasting */
  readonly isAvailable: () => Promise<boolean>;

  /** Success message for jump command (i18n formatted string) */
  readonly jumpSuccessMessage: string;

  /** Destination-specific details for logging (empty object if none) */
  readonly loggingDetails: Record<string, unknown>;

  /** Logger instance for debug/info logging */
  readonly logger: Logger;

  /**
   * Get user instruction for manual paste action (optional).
   *
   * Clipboard-based destinations should provide this to instruct users on manual paste.
   * Automatic destinations can omit this (will return undefined).
   *
   * @param autoPasteResult - Result of the automatic paste attempt
   * @returns Instruction string for manual paste, or undefined for automatic paste
   */
  readonly getUserInstruction?: (autoPasteResult: AutoPasteResult) => string | undefined;

  /**
   * Custom equality comparison function (optional).
   *
   * Provides destination-specific equality logic (e.g., comparing terminal process IDs,
   * editor URIs). If not provided, uses default singleton comparison (this === other).
   *
   * @param other - The destination to compare against
   * @returns Promise<true> if same destination, Promise<false> otherwise
   */
  readonly compareWith?: (other: PasteDestination) => Promise<boolean>;
}

/**
 * Generic paste destination that composes capabilities.
 *
 * Provides a composition-based alternative to inheritance for implementing PasteDestination.
 * Instead of subclassing and overriding methods, clients inject capability implementations
 * (PasteExecutor, EligibilityChecker) and configuration.
 *
 * Benefits:
 * - **Eliminates duplication**: Shared orchestration logic in one place, not duplicated
 *   across TextEditorDestination, TerminalDestination, etc.
 * - **Testable**: Each capability can be tested independently with focused unit tests
 * - **Flexible**: Mix and match capabilities without rigid inheritance hierarchies
 * - **Clear dependencies**: All dependencies explicit in constructor, no hidden coupling
 *
 * Design pattern: Dependency Injection + Strategy Pattern
 * - Dependencies injected via constructor (IoC)
 * - Strategies (capabilities) swapped at runtime
 * - Orchestration logic stable, implementation details varied
 */
export class ComposablePasteDestination implements PasteDestination {
  readonly id: DestinationType;
  readonly displayName: string;

  /**
   * The underlying VSCode resource this destination is bound to.
   *
   * Exposed as readonly for type-safe access in equality comparison functions.
   * Use discriminated union narrowing to access the specific resource:
   */
  readonly resource: DestinationResource;

  private readonly pasteExecutor: PasteExecutor;
  private readonly eligibilityChecker: EligibilityChecker;
  private readonly isAvailableFn: () => Promise<boolean>;
  private readonly jumpSuccessMessage: string;
  private readonly loggingDetails: Record<string, unknown>;
  private readonly logger: Logger;
  private readonly getUserInstructionFn?: (autoPasteResult: AutoPasteResult) => string | undefined;
  private readonly compareWithFn?: (other: PasteDestination) => Promise<boolean>;

  private constructor(config: ComposablePasteDestinationConfig) {
    this.id = config.id;
    this.displayName = config.displayName;
    this.resource = config.resource;
    this.pasteExecutor = config.pasteExecutor;
    this.eligibilityChecker = config.eligibilityChecker;
    this.isAvailableFn = config.isAvailable;
    this.jumpSuccessMessage = config.jumpSuccessMessage;
    this.loggingDetails = config.loggingDetails;
    this.logger = config.logger;
    this.getUserInstructionFn = config.getUserInstruction;
    this.compareWithFn = config.compareWith;
  }

  /**
   * Check if this destination is currently available for pasting.
   *
   * Delegates to the isAvailable function provided in configuration.
   *
   * @returns Promise resolving to true if pasteLink() can succeed, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    return this.isAvailableFn();
  }

  /**
   * Check if a RangeLink is eligible to be pasted to this destination.
   *
   * Delegates to the eligibility checker capability.
   *
   * @param formattedLink - The formatted RangeLink to check
   * @returns Promise resolving to true if paste should proceed, false to skip
   */
  async isEligibleForPasteLink(formattedLink: FormattedLink): Promise<boolean> {
    const context: LoggingContext = {
      fn: `${this.constructor.name}.isEligibleForPasteLink`,
      ...this.loggingDetails,
    };
    return this.eligibilityChecker.isEligible(formattedLink.link, context);
  }

  /**
   * Check if text content is eligible to be pasted to this destination.
   *
   * Delegates to the eligibility checker capability.
   *
   * @param content - The text content to check
   * @returns Promise resolving to true if paste should proceed, false to skip
   */
  async isEligibleForPasteContent(content: string): Promise<boolean> {
    const context: LoggingContext = {
      fn: `${this.constructor.name}.isEligibleForPasteContent`,
      ...this.loggingDetails,
    };
    return this.eligibilityChecker.isEligible(content, context);
  }

  /**
   * Paste a RangeLink to this destination with appropriate padding and focus.
   *
   * @param formattedLink - The formatted RangeLink with metadata
   * @param paddingMode - How to apply smart padding (both, before, after, none)
   * @returns Promise resolving to true if paste succeeded, false otherwise
   */
  async pasteLink(formattedLink: FormattedLink, paddingMode: PaddingMode): Promise<boolean> {
    const context: LoggingContext = {
      fn: `${this.constructor.name}.pasteLink`,
      formattedLink,
      linkLength: formattedLink.link.length,
      paddingMode,
      ...this.loggingDetails,
    };

    return this.performPaste(
      formattedLink.link,
      context,
      () => this.isEligibleForPasteLink(formattedLink),
      PasteContentType.Link,
      paddingMode,
    );
  }

  /**
   * Paste text content to this destination with appropriate padding and focus.
   *
   * @param content - The text content to paste
   * @param paddingMode - How to apply smart padding (both, before, after, none)
   * @returns Promise resolving to true if paste succeeded, false otherwise
   */
  async pasteContent(content: string, paddingMode: PaddingMode): Promise<boolean> {
    const context: LoggingContext = {
      fn: `${this.constructor.name}.pasteContent`,
      contentLength: content.length,
      paddingMode,
      ...this.loggingDetails,
    };

    return this.performPaste(
      content,
      context,
      () => this.isEligibleForPasteContent(content),
      PasteContentType.Text,
      paddingMode,
    );
  }

  /**
   * Core paste orchestration logic shared by pasteLink() and pasteContent().
   *
   * Coordinates capabilities in order:
   * 1. Check availability
   * 2. Check eligibility
   * 3. Apply smart padding based on provided mode
   * 4. Focus destination
   * 5. Insert text
   *
   * @param text - The text to paste
   * @param context - Logging context with operation details
   * @param eligibilityCheck - Function to check if content is eligible
   * @param contentType - Type of content being pasted (for log messages)
   * @param paddingMode - How to apply smart padding (both, before, after, none)
   * @returns Promise resolving to true if paste succeeded, false otherwise
   */
  private async performPaste(
    text: string,
    context: LoggingContext,
    eligibilityCheck: () => Promise<boolean>,
    contentType: PasteContentType,
    paddingMode: PaddingMode,
  ): Promise<boolean> {
    const contentLabel = contentType === PasteContentType.Link ? 'link' : 'content';

    // Check availability
    const available = await this.isAvailable();
    if (!available) {
      this.logger.info(context, `Cannot paste ${contentLabel}: ${this.displayName} not available`);
      return false;
    }

    // Check eligibility
    const eligible = await eligibilityCheck();
    if (!eligible) {
      this.logger.info(
        context,
        `Skipping paste: ${contentLabel} not eligible for ${this.displayName}`,
      );
      return false;
    }

    const paddedText = applySmartPadding(text, paddingMode);

    const focusResult = await this.pasteExecutor.focus(context);

    if (!focusResult.success) {
      this.logger.warn(
        { ...context, reason: focusResult.error.reason },
        `Focus failed, cannot paste ${contentLabel}`,
      );
      return false;
    }

    const success = await focusResult.value.insert(paddedText, context);

    if (success) {
      this.logger.info(context, `Pasted ${contentLabel} to ${this.displayName}`);
    } else {
      this.logger.info(context, `Failed to paste ${contentLabel} to ${this.displayName}`);
    }

    return success;
  }

  /**
   * Get user instruction for manual paste action.
   *
   * Delegates to the optional getUserInstruction function if provided.
   * Returns undefined if no instruction function configured (automatic destinations).
   *
   * @param autoPasteResult - Result of the automatic paste attempt
   * @returns Instruction string for manual paste, or undefined for automatic paste
   */
  getUserInstruction(autoPasteResult: AutoPasteResult): string | undefined {
    if (this.getUserInstructionFn === undefined) {
      return undefined;
    }
    return this.getUserInstructionFn(autoPasteResult);
  }

  /**
   * Focus this destination without performing a paste operation.
   *
   * Delegates to the focus manager capability.
   *
   * @returns Promise resolving to true if focus succeeded, false otherwise
   */
  async focus(): Promise<boolean> {
    const context: LoggingContext = {
      fn: `${this.constructor.name}.focus`,
      ...this.loggingDetails,
    };

    const available = await this.isAvailable();
    if (!available) {
      this.logger.info(context, `Cannot focus: ${this.displayName} not available`);
      return false;
    }

    const result = await this.pasteExecutor.focus(context);
    return result.success;
  }

  /**
   * Get success message for jump command.
   *
   * Returns the jump success message provided in configuration.
   *
   * @returns Formatted i18n message for status bar display
   */
  getJumpSuccessMessage(): string {
    return this.jumpSuccessMessage;
  }

  /**
   * Get destination-specific details for logging.
   *
   * Returns the logging details provided in configuration.
   *
   * @returns Record with destination-specific logging details (empty object if none)
   */
  getLoggingDetails(): Record<string, unknown> {
    return this.loggingDetails;
  }

  /**
   * Check if this destination equals another destination.
   *
   * Uses custom compareWith function if provided, otherwise falls back to
   * singleton comparison (this === other).
   *
   * @param other - The destination to compare against (may be undefined)
   * @returns Promise<true> if same destination, Promise<false> otherwise
   */
  async equals(other: PasteDestination | undefined): Promise<boolean> {
    if (other === undefined) {
      return false;
    }

    if (this.compareWithFn !== undefined) {
      return this.compareWithFn(other);
    }

    // Default: singleton comparison
    return this === other;
  }

  // ============================================================================
  // Static Factory Methods
  // ============================================================================

  /**
   * Create a terminal destination.
   *
   * Terminal destinations:
   * - Use AlwaysEligibleChecker (terminals accept all content)
   * - Are always available (terminal exists at construction)
   * - Compare equality by process ID
   *
   * @param params - Terminal-specific parameters
   * @returns ComposablePasteDestination configured for terminal paste
   */
  static createTerminal(params: TerminalDestinationParams): ComposablePasteDestination {
    return new ComposablePasteDestination({
      id: 'terminal',
      displayName: params.displayName,
      resource: { kind: 'terminal', terminal: params.terminal },
      pasteExecutor: params.pasteExecutor,
      eligibilityChecker: new AlwaysEligibleChecker(params.logger),
      isAvailable: async () => true,
      jumpSuccessMessage: params.jumpSuccessMessage,
      loggingDetails: params.loggingDetails,
      logger: params.logger,
      getUserInstruction: undefined,
      compareWith: params.compareWith,
    });
  }

  /**
   * Create a text editor destination.
   *
   * Editor destinations:
   * - Require eligibility checking (prevent self-paste)
   * - Are always available (editor exists at construction)
   * - Compare equality by document URI
   *
   * @param params - Editor-specific parameters
   * @returns ComposablePasteDestination configured for editor paste
   */
  static createEditor(params: EditorDestinationParams): ComposablePasteDestination {
    return new ComposablePasteDestination({
      id: 'text-editor',
      displayName: params.displayName,
      resource: { kind: 'editor', editor: params.editor },
      pasteExecutor: params.pasteExecutor,
      eligibilityChecker: params.eligibilityChecker,
      isAvailable: async () => true,
      jumpSuccessMessage: params.jumpSuccessMessage,
      loggingDetails: params.loggingDetails,
      logger: params.logger,
      getUserInstruction: undefined,
      compareWith: params.compareWith,
    });
  }

  /**
   * Create an AI assistant destination (Claude Code, Cursor AI, GitHub Copilot Chat).
   *
   * AI assistant destinations:
   * - Use AlwaysEligibleChecker (no self-paste possible)
   * - May require availability checking (extension presence)
   * - Singleton equality (compared by reference)
   * - May provide user instructions for manual paste fallback
   *
   * @param params - AI assistant-specific parameters
   * @returns ComposablePasteDestination configured for AI assistant paste
   */
  static createAiAssistant(params: AiAssistantDestinationParams): ComposablePasteDestination {
    return new ComposablePasteDestination({
      id: params.id,
      displayName: params.displayName,
      resource: { kind: 'singleton' },
      pasteExecutor: params.pasteExecutor,
      eligibilityChecker: new AlwaysEligibleChecker(params.logger),
      isAvailable: params.isAvailable,
      jumpSuccessMessage: params.jumpSuccessMessage,
      loggingDetails: params.loggingDetails,
      logger: params.logger,
      getUserInstruction: params.getUserInstruction,
      compareWith: undefined, // Singleton comparison (this === other)
    });
  }

  /**
   * Create a destination with full config injection (for testing only).
   *
   * **WARNING: This method is for unit tests only.**
   *
   * Production code should use:
   * - `createTerminal()` - for terminal destinations
   * - `createEditor()` - for editor destinations
   * - `createAiAssistant()` - for AI assistant destinations
   *
   * This method is exposed for unit tests that need to:
   * - Inject mocked capabilities (TextInserter, EligibilityChecker, etc.)
   * - Test specific orchestration scenarios
   * - Create destinations with non-standard configurations
   *
   * @param config - Full configuration object (all fields required)
   * @returns ComposablePasteDestination with injected config
   */
  static createForTesting(config: ComposablePasteDestinationConfig): ComposablePasteDestination {
    return new ComposablePasteDestination(config);
  }
}
