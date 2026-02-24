import type { EligibleFile } from '../../types';

import { createMockUri } from './createMockUri';

export interface MockEligibleFileOptions {
  readonly filename?: string;
  readonly displayPath?: string;
  readonly viewColumn?: number;
  readonly isCurrentInGroup?: boolean;
  readonly isActiveEditor?: boolean;
  readonly boundState?: EligibleFile['boundState'];
  readonly uri?: EligibleFile['uri'];
}

export const createMockEligibleFile = (options: MockEligibleFileOptions = {}): EligibleFile => {
  const {
    filename = 'file.ts',
    displayPath,
    viewColumn = 1,
    isCurrentInGroup = false,
    isActiveEditor = false,
    boundState,
    uri,
  } = options;
  return {
    uri: uri ?? createMockUri(`/workspace/${filename}`),
    filename,
    displayPath: displayPath ?? `src/${filename}`,
    viewColumn,
    isCurrentInGroup,
    isActiveEditor,
    ...(boundState !== undefined && { boundState }),
  };
};
