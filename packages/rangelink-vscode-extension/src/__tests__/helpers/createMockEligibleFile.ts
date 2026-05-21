import type * as vscode from 'vscode';

import type { EligibleFile } from '../../types';

import { createMockUri } from './createMockUri';

export interface MockEligibleFileOptions {
  readonly filename?: string;
  readonly displayPath?: string;
  readonly viewColumn?: number;
  readonly isCurrentInGroup?: boolean;
  readonly isActiveEditor?: boolean;
  readonly boundState?: EligibleFile['boundState'];
  readonly uri?: vscode.Uri;
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
  const resolvedUri = uri ?? createMockUri(`/workspace/${filename}`);
  return {
    bindOptions: { kind: 'text-editor', uri: resolvedUri, viewColumn },
    filename,
    displayPath: displayPath ?? `src/${filename}`,
    viewColumn,
    isCurrentInGroup,
    isActiveEditor,
    ...(boundState !== undefined && { boundState }),
  };
};
