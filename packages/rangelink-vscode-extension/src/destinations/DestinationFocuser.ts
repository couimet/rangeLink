import type { BindOptions, ExtensionResult, StatusBarOptions } from '../types';

import type { FocusSuccessInfo } from './PasteDestinationManager';

export interface DestinationFocuser {
  focusBoundDestination(options?: StatusBarOptions): Promise<ExtensionResult<FocusSuccessInfo>>;
  bindAndFocus(options: BindOptions): Promise<ExtensionResult<FocusSuccessInfo>>;
}
