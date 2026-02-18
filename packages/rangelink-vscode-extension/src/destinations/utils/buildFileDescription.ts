import type { EligibleFile } from '../../types';
import { MessageCode } from '../../types';
import { formatMessage } from '../../utils';

/**
 * Build a description string for a file QuickPick item.
 * Combines disambiguator and badges (bound, active) separated by " · ".
 *
 * Tab group labels are rendered as QuickPick separators, not as part of the description.
 *
 * @param file - Eligible file with metadata
 * @param disambiguator - VSCode-style disambiguator string (e.g., '…/src', './', or '')
 * @returns Description string, or undefined if no segments to show
 */
export const buildFileDescription = (
  file: EligibleFile,
  disambiguator: string,
): string | undefined => {
  const segments: string[] = [];

  if (disambiguator !== '') {
    segments.push(disambiguator);
  }

  if (file.boundState === 'bound') {
    segments.push(formatMessage(MessageCode.FILE_PICKER_BOUND_BADGE));
  }
  if (file.isActiveEditor) {
    segments.push(formatMessage(MessageCode.FILE_PICKER_ACTIVE_BADGE));
  }

  return segments.length > 0 ? segments.join(' · ') : undefined;
};
