import type { InsertFactory } from '../capabilities/insertFactories';

/**
 * A tier in the tiered focus strategy.
 *
 * Each tier pairs a set of VS Code commands with an InsertFactory that
 * determines how text is delivered after focus succeeds.
 */
export interface FocusTier {
  readonly commands: readonly string[];
  readonly insertFactory: InsertFactory<void>;
  readonly label: string;
}
