import type { RangeLinkError } from 'rangelink-core-ts';

import type { RangeLinkExtensionError } from '../errors';

export type ExtensionError = RangeLinkError | RangeLinkExtensionError;
