import type { BindOptions, ExtensionResult, StatusBarOptions } from '../types';

import type { BindSuccessInfo } from './PasteDestinationManager';

export interface DestinationBinder {
  bind(
    options: BindOptions,
    statusBarOptions?: StatusBarOptions,
  ): Promise<ExtensionResult<BindSuccessInfo>>;
}
