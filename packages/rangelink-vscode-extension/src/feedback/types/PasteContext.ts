import type { MessageCode } from '../../types';

import type { DestinationInfo } from './DestinationInfo';

export interface PasteContext {
  contentType: MessageCode;
  destination: DestinationInfo;
}
