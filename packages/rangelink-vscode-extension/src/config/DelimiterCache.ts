import type { Logger } from 'barebone-logger';
import type { DelimiterConfig } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';

import { getDelimitersForExtension } from './getDelimitersForExtension';
import type { ConfigGetter } from './types';

/**
 * Caches the active delimiter configuration and refreshes it automatically
 * whenever a `rangelink.*` setting changes.
 *
 * Encapsulates the mutable cache and its invalidation subscription so that
 * `activate()` can treat delimiter access as a single disposable concern.
 */
export class DelimiterCache implements vscode.Disposable {
  private delimiters: DelimiterConfig;
  private readonly subscription: vscode.Disposable;

  constructor(config: ConfigGetter, ideAdapter: VscodeAdapter, logger: Logger) {
    this.delimiters = getDelimitersForExtension(config, ideAdapter, logger);
    this.subscription = ideAdapter.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('rangelink')) {
        this.delimiters = getDelimitersForExtension(config, ideAdapter, logger);
      }
    });
  }

  getDelimiters = (): DelimiterConfig => this.delimiters;

  dispose(): void {
    this.subscription.dispose();
  }
}
