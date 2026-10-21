import type { RangeLinkExtensionError } from '../errors';

import type { PercentCodecError } from 'percent-codec-ts';
import type { RangeLinkError } from 'rangelink-core-ts';
import type { TextFragmentError } from 'text-fragment-ts';

/**
 * Every error an extension operation can surface.
 *
 * `TextFragmentError` and `PercentCodecError` are here because the text fragment
 * codec's Result carries both: its error type is a union across the parse
 * boundary, so a caller that propagates that Result needs both members even
 * though only the parser can produce a codec error.
 */
export type ExtensionError = RangeLinkError | RangeLinkExtensionError | TextFragmentError | PercentCodecError;
