import type { RangeLinkExtensionError } from '../errors';

import type { RangeLinkError } from 'rangelink-core-ts';

export type ExtensionError = RangeLinkError | RangeLinkExtensionError;
