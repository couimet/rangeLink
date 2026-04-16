import type { Logger, LoggingContext } from 'barebone-logger';
import { Result } from 'rangelink-core-ts';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { FocusTier, FocusTierLabel } from '../types';

import { FocusErrorReason, type FocusCapability, type FocusResult } from './FocusCapability';
import { ResolvedFocusCapability } from './ResolvedFocusCapability';
import { resolveFocusTier, type TierResolutionResult } from './resolveFocusTier';

/**
 * FocusCapability that resolves the winning tier lazily on first focus() call.
 *
 * The DestinationBuilder is synchronous, so getCommands() (async) cannot be
 * called at construction time. This wrapper defers resolution to the first
 * focus() call, then delegates to a ResolvedFocusCapability for all
 * subsequent calls.
 *
 * The resolution result is cached — getCommands() is called exactly once.
 */
export class LazyResolvedFocusCapability implements FocusCapability {
  private resolved: ResolvedFocusCapability | undefined;
  private resolutionFailed = false;
  private resolutionInFlight: Promise<void> | undefined;

  /**
   * The label of the resolved tier. Available after first focus() call.
   * Returns undefined before resolution or if resolution failed.
   */
  get resolvedTierLabel(): FocusTierLabel | undefined {
    return this.resolved?.resolvedTierLabel;
  }

  private resolutionResult: TierResolutionResult | undefined;

  /**
   * Whether the resolved tier is a fallback (built-in commands).
   * Available after first focus() call.
   */
  get isFallbackResolution(): boolean {
    return this.resolutionResult?.isFallback === true;
  }

  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly tiers: readonly FocusTier[],
    private readonly logger: Logger,
    private readonly logPrefix: string,
    private readonly fallbackTierIndex: number = tiers.length,
  ) {}

  async focus(context: LoggingContext): Promise<FocusResult> {
    if (this.resolutionFailed) {
      return Result.err({ reason: FocusErrorReason.COMMAND_FOCUS_FAILED });
    }

    if (!this.resolved) {
      if (this.resolutionInFlight) {
        await this.resolutionInFlight;
      } else {
        this.resolutionInFlight = this.resolve(context);
        await this.resolutionInFlight;
        this.resolutionInFlight = undefined;
      }
    }

    if (this.resolutionFailed) {
      return Result.err({ reason: FocusErrorReason.COMMAND_FOCUS_FAILED });
    }

    return this.resolved!.focus(context);
  }

  private async resolve(context: LoggingContext): Promise<void> {
    const registeredCommands = await this.ideAdapter.getCommands();
    const result = resolveFocusTier(
      this.tiers,
      registeredCommands,
      this.logger,
      this.logPrefix,
      this.fallbackTierIndex,
    );

    if (!result) {
      this.resolutionFailed = true;
      this.logger.warn(
        { ...context, logPrefix: this.logPrefix },
        `${this.logPrefix}: tier resolution failed — no commands registered`,
      );
      return;
    }

    this.resolutionResult = result;

    if (result.isFallback) {
      this.logger.warn(
        {
          ...context,
          tier: result.resolvedTier.label,
          commands: result.resolvedTier.commands,
          logPrefix: this.logPrefix,
        },
        `${this.logPrefix}: custom commands not registered, falling back to built-in commands`,
      );
    } else {
      this.logger.info(
        {
          ...context,
          tier: result.resolvedTier.label,
          logPrefix: this.logPrefix,
        },
        `${this.logPrefix}: resolved to ${result.resolvedTier.label}`,
      );
    }

    this.resolved = new ResolvedFocusCapability(
      this.ideAdapter,
      result.resolvedTier,
      this.logger,
    );
  }
}
