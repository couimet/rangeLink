import type { MessageCode } from '../../types';

import type { DestinationInfo } from './DestinationInfo';

/**
 * Context information for a paste operation.
 *
 * Passed through the send pipeline so feedback providers can generate
 * appropriate status bar and toast messages based on content type and destination.
 */
export interface PasteContext {
  /** The type of content being pasted (references MessageCode for i18n lookup) */
  contentType: MessageCode;
  /** Information about the destination receiving the paste */
  destination: DestinationInfo;
}
