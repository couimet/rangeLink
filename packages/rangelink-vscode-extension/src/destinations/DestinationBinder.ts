import type { BindOptions, ExtensionResult } from '../types';

import type { BindSuccessInfo } from './PasteDestinationManager';

export interface DestinationBinder {
  bind(options: BindOptions): Promise<ExtensionResult<BindSuccessInfo>>;
}
