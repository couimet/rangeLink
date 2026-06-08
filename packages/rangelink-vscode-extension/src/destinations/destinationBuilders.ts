/**
 * Destination builder functions for DestinationRegistry.
 *
 * This module contains builder functions that create PasteDestination instances.
 * Each builder is registered with the DestinationRegistry and invoked when
 * PasteDestinationManager needs to create a destination.
 */
import type * as vscode from 'vscode';

import type { CustomAiAssistantConfig } from '../config/parseCustomAiAssistants';
import {
  DEFAULT_DESTINATIONS_CLAUDE_CODE_COLD_REFOCUS_INTERVAL_MS,
  DEFAULT_DESTINATIONS_CLAUDE_CODE_COLD_START_DELAY_MS,
  DEFAULT_DESTINATIONS_GEMINI_COLD_REFOCUS_INTERVAL_MS,
  DEFAULT_DESTINATIONS_GEMINI_COLD_START_DELAY_MS,
} from '../constants/settingDefaults';
import {
  SETTING_DESTINATIONS_CLAUDE_CODE_COLD_REFOCUS_INTERVAL_MS,
  SETTING_DESTINATIONS_CLAUDE_CODE_COLD_START_DELAY_MS,
  SETTING_DESTINATIONS_GEMINI_COLD_REFOCUS_INTERVAL_MS,
  SETTING_DESTINATIONS_GEMINI_COLD_START_DELAY_MS,
} from '../constants/settingKeys';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import {
  AutoPasteResult,
  type AIAssistantDestinationKind,
  type CustomAiAssistantKind,
  type DestinationKind,
  MessageCode,
  RelativePathFormat,
} from '../types';
import {
  formatMessage,
  getUntitledDisplayName,
  isClaudeCodeAvailable,
  isCursorIDEDetected,
  isGeminiCodeAssistAvailable,
  isGitHubCopilotChatAvailable,
} from '../utils';
import {
  EXTENSION_ID_CLAUDE_CODE,
  EXTENSION_ID_GEMINI_CODE_ASSIST,
  EXTENSION_ID_GITHUB_COPILOT_CHAT,
} from '../utils/aiAssistants/';

import {
  CLAUDE_CODE_FOCUS_COMMANDS,
  CURSOR_AI_FOCUS_COMMANDS,
  GEMINI_CODE_ASSIST_FOCUS_COMMANDS,
  GITHUB_COPILOT_CHAT_FOCUS_COMMANDS,
} from './aiAssistantFocusCommands';
import type { ColdRefocusConfig } from './capabilities/ColdRefocusConfig';
import { ComposablePasteDestination } from './ComposablePasteDestination';
import type { DestinationBuilder, DestinationBuilderContext } from './DestinationRegistry';
import { compareEditorsByUri } from './equality/compareEditorsByUri';
import { compareTerminalsByProcessId } from './equality/compareTerminalsByProcessId';
import type { PasteDestination } from './PasteDestination';

// ============================================================================
// Built-in AI assistant lookup
// ============================================================================

interface BuiltinAiAssistantDef {
  readonly kind: AIAssistantDestinationKind;
  readonly focusCommands: readonly string[];
  readonly displayName: string;
  readonly jumpMessageCode: MessageCode;
  readonly userInstructionMessageCode: MessageCode;
  readonly isAvailable: (context: DestinationBuilderContext) => boolean | Promise<boolean>;
  readonly getColdRefocus?: (context: DestinationBuilderContext) => ColdRefocusConfig;
}

const BUILTIN_AI_ASSISTANTS: Record<string, BuiltinAiAssistantDef> = {
  'cursor.cursor': {
    kind: 'cursor-ai',
    focusCommands: CURSOR_AI_FOCUS_COMMANDS,
    displayName: 'Cursor AI Assistant',
    jumpMessageCode: MessageCode.STATUS_BAR_JUMP_SUCCESS_CURSOR_AI,
    userInstructionMessageCode: MessageCode.INFO_CURSOR_AI_USER_INSTRUCTIONS,
    isAvailable: (ctx) => isCursorIDEDetected(ctx.ideAdapter, ctx.logger),
  },
  [EXTENSION_ID_CLAUDE_CODE]: {
    kind: 'claude-code',
    focusCommands: CLAUDE_CODE_FOCUS_COMMANDS,
    displayName: 'Claude Code Chat',
    jumpMessageCode: MessageCode.STATUS_BAR_JUMP_SUCCESS_CLAUDE_CODE,
    userInstructionMessageCode: MessageCode.INFO_CLAUDE_CODE_USER_INSTRUCTIONS,
    isAvailable: (ctx) => isClaudeCodeAvailable(ctx.ideAdapter, ctx.logger),
    getColdRefocus: (context) => {
      const totalMs = context.configReader.getWithDefault(
        SETTING_DESTINATIONS_CLAUDE_CODE_COLD_START_DELAY_MS,
        DEFAULT_DESTINATIONS_CLAUDE_CODE_COLD_START_DELAY_MS,
      ) as number;
      const intervalMs = context.configReader.getWithDefault(
        SETTING_DESTINATIONS_CLAUDE_CODE_COLD_REFOCUS_INTERVAL_MS,
        DEFAULT_DESTINATIONS_CLAUDE_CODE_COLD_REFOCUS_INTERVAL_MS,
      ) as number;

      if (totalMs <= intervalMs) {
        context.logger.warn(
          { fn: 'claudeCode.getColdRefocus', totalMs, intervalMs },
          'coldStartDelayMs must be greater than coldRefocusIntervalMs, using defaults',
        );
        return {
          totalMs: DEFAULT_DESTINATIONS_CLAUDE_CODE_COLD_START_DELAY_MS,
          intervalMs: DEFAULT_DESTINATIONS_CLAUDE_CODE_COLD_REFOCUS_INTERVAL_MS,
        };
      }

      return { totalMs, intervalMs };
    },
  },
  [EXTENSION_ID_GEMINI_CODE_ASSIST]: {
    kind: 'gemini-code-assist',
    focusCommands: GEMINI_CODE_ASSIST_FOCUS_COMMANDS,
    displayName: 'Gemini Code Assist',
    jumpMessageCode: MessageCode.STATUS_BAR_JUMP_SUCCESS_GEMINI_CODE_ASSIST,
    userInstructionMessageCode: MessageCode.INFO_GEMINI_CODE_ASSIST_USER_INSTRUCTIONS,
    isAvailable: (ctx) => isGeminiCodeAssistAvailable(ctx.ideAdapter, ctx.logger),
    getColdRefocus: (context) => {
      const totalMs = context.configReader.getWithDefault(
        SETTING_DESTINATIONS_GEMINI_COLD_START_DELAY_MS,
        DEFAULT_DESTINATIONS_GEMINI_COLD_START_DELAY_MS,
      ) as number;
      const intervalMs = context.configReader.getWithDefault(
        SETTING_DESTINATIONS_GEMINI_COLD_REFOCUS_INTERVAL_MS,
        DEFAULT_DESTINATIONS_GEMINI_COLD_REFOCUS_INTERVAL_MS,
      ) as number;

      if (totalMs <= intervalMs) {
        context.logger.warn(
          { fn: 'gemini.getColdRefocus', totalMs, intervalMs },
          'coldStartDelayMs must be greater than coldRefocusIntervalMs, using defaults',
        );
        return {
          totalMs: DEFAULT_DESTINATIONS_GEMINI_COLD_START_DELAY_MS,
          intervalMs: DEFAULT_DESTINATIONS_GEMINI_COLD_REFOCUS_INTERVAL_MS,
        };
      }

      return { totalMs, intervalMs };
    },
  },
  [EXTENSION_ID_GITHUB_COPILOT_CHAT]: {
    kind: 'github-copilot-chat',
    focusCommands: GITHUB_COPILOT_CHAT_FOCUS_COMMANDS,
    displayName: 'GitHub Copilot Chat',
    jumpMessageCode: MessageCode.STATUS_BAR_JUMP_SUCCESS_GITHUB_COPILOT_CHAT,
    userInstructionMessageCode: MessageCode.INFO_GITHUB_COPILOT_CHAT_USER_INSTRUCTIONS,
    isAvailable: (ctx) => isGitHubCopilotChatAvailable(ctx.ideAdapter, ctx.logger),
  },
};

// ============================================================================
// Terminal & Editor builders
// ============================================================================

/**
 * Build a Terminal destination using ComposablePasteDestination factory method.
 *
 * @param options - Type-discriminated options containing terminal reference
 * @param context - Builder context with factories and dependencies
 * @returns ComposablePasteDestination configured for terminal paste
 */
export const buildTerminalDestination: DestinationBuilder = (options, context) => {
  if (options.kind !== 'terminal') {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_KIND,
      message: `buildTerminalDestination called with wrong kind: ${options.kind}`,
      functionName: 'buildTerminalDestination',
      details: { actualKind: options.kind, expectedKind: 'terminal' },
    });
  }

  const terminal = options.terminal;
  const terminalNameResult = context.ideAdapter.getTerminalName(terminal);
  if (!terminalNameResult.success) {
    throw terminalNameResult.error;
  }
  const terminalName = terminalNameResult.value;

  return ComposablePasteDestination.createTerminal({
    terminal,
    displayName: `Terminal ("${terminalName}")`,
    focusCapability: context.factories.focusCapability.createTerminalCapability(terminal),
    jumpSuccessMessage: formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_TERMINAL, {
      resourceName: terminalName,
    }),
    loggingDetails: { terminalName },
    logger: context.logger,
    compareWith: (other: PasteDestination) => compareTerminalsByProcessId(terminal, other),
  });
};

/**
 * Get resource name from a URI (workspace-relative path or untitled name).
 */
const getResourceName = (context: DestinationBuilderContext, uri: vscode.Uri): string => {
  if (uri.scheme === 'untitled') {
    return getUntitledDisplayName(uri);
  }

  const workspaceFolder = context.ideAdapter.getWorkspaceFolder(uri);
  if (workspaceFolder) {
    return context.ideAdapter.asRelativePath(uri, RelativePathFormat.PathOnly);
  }

  return context.ideAdapter.getFilenameFromUri(uri);
};

/**
 * Build a TextEditor destination using ComposablePasteDestination factory method.
 *
 * @param options - Type-discriminated options containing editor reference
 * @param context - Builder context with factories and dependencies
 * @returns ComposablePasteDestination configured for editor paste
 */
export const buildTextEditorDestination: DestinationBuilder = (options, context) => {
  if (options.kind !== 'text-editor') {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_KIND,
      message: `buildTextEditorDestination called with wrong kind: ${options.kind}`,
      functionName: 'buildTextEditorDestination',
      details: { actualKind: options.kind, expectedKind: 'text-editor' },
    });
  }

  const { uri, viewColumn } = options;
  const resourceName = getResourceName(context, uri);
  const editorPath = uri.toString();

  return ComposablePasteDestination.createEditor({
    uri,
    viewColumn,
    displayName: `Text Editor ("${resourceName}")`,
    focusCapability: context.factories.focusCapability.createEditorCapability(uri, viewColumn),
    eligibilityChecker: context.factories.eligibilityChecker.createContentEligibilityChecker(),
    editorHasActiveSelection: () => context.ideAdapter.editorHasActiveSelection(uri, viewColumn),
    jumpSuccessMessage: formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_EDITOR, {
      resourceName,
    }),
    loggingDetails: { editorName: resourceName, editorPath },
    logger: context.logger,
    compareWith: (other: PasteDestination) => compareEditorsByUri(uri, other),
  });
};

// ============================================================================
// Built-in AI Assistant Builders
// ============================================================================

/**
 * Build a built-in AI assistant destination (Cursor AI, Claude Code, Gemini Code Assist, GitHub Copilot Chat).
 *
 * Uses the standard focus+paste flow via AIAssistantFocusCapability.
 */
const buildBuiltinAiAssistantDestination = (
  def: BuiltinAiAssistantDef,
  context: DestinationBuilderContext,
): ComposablePasteDestination =>
  ComposablePasteDestination.createAiAssistant({
    id: def.kind,
    displayName: def.displayName,
    focusCapability: context.factories.focusCapability.createAIAssistantCapability(
      [...def.focusCommands],
      def.getColdRefocus !== undefined ? () => def.getColdRefocus!(context) : undefined,
    ),
    isAvailable: async () => def.isAvailable(context),
    jumpSuccessMessage: formatMessage(def.jumpMessageCode),
    loggingDetails: {},
    logger: context.logger,
    getUserInstruction: (autoPasteResult) =>
      autoPasteResult === AutoPasteResult.Success
        ? undefined
        : formatMessage(def.userInstructionMessageCode),
  });

/**
 * Create a builder for a built-in AI assistant (no user override).
 */
const createBuiltinAiAssistantBuilder =
  (def: BuiltinAiAssistantDef): DestinationBuilder =>
  (_options, context) =>
    buildBuiltinAiAssistantDestination(def, context);

// ============================================================================
// Custom AI Assistant Builders
// ============================================================================

/**
 * Create a builder for a user-defined custom AI assistant (no built-in match).
 *
 * Returns a DestinationBuilder that creates a ComposablePasteDestination
 * configured with the user's extensionId, displayName, and three-tier commands.
 * Tier resolution happens lazily on first focus() call via LazyResolvedFocusCapability.
 */
export const createCustomAiAssistantBuilder = (
  config: CustomAiAssistantConfig,
): DestinationBuilder => {
  const { kind, extensionId, extensionName } = config;
  const allCommands = [
    ...(config.insertCommands ?? []).map((e) => e.command),
    ...(config.focusAndPasteCommands ?? []),
    ...(config.focusCommands ?? []),
  ];

  return (_options, context) => {
    const tiers = context.factories.focusCapability.buildCustomAIAssistantTiers(config);
    const lazyCapability = context.factories.focusCapability.createLazyResolvedCapability(
      tiers,
      extensionName,
    );

    return ComposablePasteDestination.createAiAssistant({
      id: kind,
      displayName: extensionName,
      focusCapability: lazyCapability,
      shouldPreserveClipboard: () => lazyCapability.resolvedTierLabel !== 'focusCommands',
      isAvailable: async () => {
        const extension = context.ideAdapter.getExtension(extensionId);
        const extensionFound = extension !== undefined;
        const extensionActive = extension?.isActive === true;

        const commands = await context.ideAdapter.getCommands();
        const commandAvailable = allCommands.some((cmd) => commands.includes(cmd));

        const available = extensionActive || commandAvailable;
        context.logger.debug(
          {
            fn: 'customAiAssistant.isAvailable',
            extensionId,
            extensionFound,
            extensionActive,
            commandAvailable,
            checkedCommands: allCommands,
            available,
          },
          `Custom AI assistant '${extensionName}' available: ${available}`,
        );
        return available;
      },
      jumpSuccessMessage: formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_CUSTOM_AI, {
        extensionName,
      }),
      loggingDetails: { extensionId },
      logger: context.logger,
      getUserInstruction: (autoPasteResult) => {
        if (autoPasteResult === AutoPasteResult.Success) {
          if (lazyCapability.resolvedTierLabel === 'focusCommands') {
            return formatMessage(MessageCode.INFO_CUSTOM_AI_USER_INSTRUCTIONS, { extensionName });
          }
          return undefined;
        }
        return formatMessage(MessageCode.INFO_CUSTOM_AI_USER_INSTRUCTIONS, { extensionName });
      },
    });
  };
};

// ============================================================================
// Built-in Override Builder
// ============================================================================

/**
 * Create a builder for a built-in AI assistant overridden by user config.
 *
 * Merges user-defined tiers with built-in fallback commands. At bind time,
 * tier resolution walks user tiers first; if none have registered commands,
 * falls back to the built-in's hardcoded focus commands.
 *
 * Uses the built-in's kind, availability detection, i18n messages, and
 * display name — only the focus strategy is overridden.
 */
const createOverriddenBuiltinBuilder =
  (config: CustomAiAssistantConfig, builtin: BuiltinAiAssistantDef): DestinationBuilder =>
  (_options, context) => {
    const userTiers = context.factories.focusCapability.buildCustomAIAssistantTiers(config);
    const fallbackTier = context.factories.focusCapability.buildBuiltinFallbackTier(
      builtin.focusCommands,
    );

    const allTiers = [...userTiers, fallbackTier];
    const fallbackTierIndex = userTiers.length;

    const lazyCapability = context.factories.focusCapability.createLazyResolvedCapability(
      allTiers,
      builtin.displayName,
      fallbackTierIndex,
    );

    return ComposablePasteDestination.createAiAssistant({
      id: builtin.kind,
      displayName: builtin.displayName,
      focusCapability: lazyCapability,
      shouldPreserveClipboard: () => lazyCapability.resolvedTierLabel !== 'focusCommands',
      isAvailable: async () => builtin.isAvailable(context),
      jumpSuccessMessage: formatMessage(builtin.jumpMessageCode),
      loggingDetails: { extensionId: config.extensionId, overridden: true },
      logger: context.logger,
      getUserInstruction: (autoPasteResult) => {
        if (autoPasteResult === AutoPasteResult.Success) {
          const tierLabel = lazyCapability.resolvedTierLabel;
          if (tierLabel === 'focusCommands') {
            return formatMessage(builtin.userInstructionMessageCode);
          }
          return undefined;
        }
        return formatMessage(builtin.userInstructionMessageCode);
      },
    });
  };

// ============================================================================
// Lookup
// ============================================================================

/**
 * Resolve an extension ID to a destination kind.
 * Searches built-in assistants by extensionId map key first, then custom configs by extensionId field.
 */
export const resolveKindByExtensionId = (
  extensionId: string,
  customAssistants: CustomAiAssistantConfig[],
): AIAssistantDestinationKind | CustomAiAssistantKind | undefined => {
  const builtin = BUILTIN_AI_ASSISTANTS[extensionId];
  if (builtin) return builtin.kind;

  const custom = customAssistants.find((c) => c.extensionId === extensionId);
  if (custom) return custom.kind;

  return undefined;
};

// ============================================================================
// Registration
// ============================================================================

/**
 * Register all destination builders with the registry.
 *
 * Called from extension.ts during activation to set up all destination kinds.
 * When a custom assistant's extensionId matches a built-in, the custom config
 * is merged with the built-in as an override (user tiers + built-in fallback).
 *
 * @param registry - DestinationRegistry to register builders with
 * @param customAssistants - Optional custom AI assistant configs from user settings
 */
export const registerAllDestinationBuilders = (
  registry: {
    register: (kind: DestinationKind, builder: DestinationBuilder) => void;
  },
  customAssistants: CustomAiAssistantConfig[] = [],
): void => {
  registry.register('terminal', buildTerminalDestination);
  registry.register('text-editor', buildTextEditorDestination);

  const overriddenKinds = new Set<AIAssistantDestinationKind>();

  for (const config of customAssistants) {
    const builtin = BUILTIN_AI_ASSISTANTS[config.extensionId];

    if (builtin) {
      registry.register(builtin.kind, createOverriddenBuiltinBuilder(config, builtin));
      overriddenKinds.add(builtin.kind);
    } else {
      registry.register(config.kind, createCustomAiAssistantBuilder(config));
    }
  }

  for (const [, def] of Object.entries(BUILTIN_AI_ASSISTANTS)) {
    if (!overriddenKinds.has(def.kind)) {
      registry.register(def.kind, createBuiltinAiAssistantBuilder(def));
    }
  }
};
