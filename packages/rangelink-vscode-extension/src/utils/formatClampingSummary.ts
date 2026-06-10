import { RangeLinkExtensionError } from '../errors';
import { MessageCode } from '../types';

import type { ConvertedPosition } from './convertRangeLinkPosition';
import { formatMessage } from './formatMessage';

/**
 * Build a localized summary of what was clamped during position conversion.
 *
 * Aggregates clamping flags across start and end positions into a single
 * user-facing string for toast notifications.
 *
 * @param start - Converted start position with clamping flags
 * @param end - Converted end position with clamping flags
 * @returns Localized summary string describing what was clamped
 */
export const formatClampingSummary = (start: ConvertedPosition, end: ConvertedPosition): string => {
  const lineClamped = start.lineClamped || end.lineClamped;
  const characterClamped = start.characterClamped || end.characterClamped;

  if (lineClamped && characterClamped) {
    return formatMessage(MessageCode.WARN_NAVIGATION_CLAMPED_SUMMARY_BOTH);
  }
  if (lineClamped) {
    return formatMessage(MessageCode.WARN_NAVIGATION_CLAMPED_SUMMARY_LINE);
  }
  if (characterClamped) {
    return formatMessage(MessageCode.WARN_NAVIGATION_CLAMPED_SUMMARY_CHARACTER);
  }

  throw RangeLinkExtensionError.forUnexpected(
    'clamping summary state',
    { lineClamped, characterClamped },
    'formatClampingSummary',
  );
};
