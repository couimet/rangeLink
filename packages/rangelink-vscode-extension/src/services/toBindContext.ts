import type { BindContext } from '../types';

import type { ResolveResult } from './types';

export const toBindContext = (result: ResolveResult): BindContext | undefined =>
  result.canProceed && result.bindPerformed
    ? { destinationName: result.destinationName }
    : undefined;
