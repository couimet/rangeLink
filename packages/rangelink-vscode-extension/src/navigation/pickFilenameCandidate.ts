import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode, RelativePathFormat } from '../types';
import { formatMessage } from '../utils';

import type { Logger } from '@couimet/logger-contract';
import * as path from 'node:path';
import * as vscode from 'vscode';

interface FilenameCandidateItem extends vscode.QuickPickItem {
  description: string;
  uri: vscode.Uri;
}

const compareFilenameCandidates = (a: FilenameCandidateItem, b: FilenameCandidateItem): number => {
  const byDescription = a.description.localeCompare(b.description);
  return byDescription !== 0 ? byDescription : a.label.localeCompare(b.label);
};

/**
 * Let the user pick which of several same-named files to navigate to.
 *
 * Presents the candidates in a QuickPick labeled with the file's basename and
 * described by its workspace-relative path, sorted by relative path so the
 * ordering is deterministic. Returns undefined when the user dismisses the
 * picker (no-op).
 *
 * @param ideAdapter - VSCode adapter for QuickPick and relative-path formatting
 * @param candidates - Same-named file URIs to choose from
 * @param logger - Logger instance for structured logging
 * @returns The picked URI, or undefined if the user dismissed the picker
 */
export const pickFilenameCandidate = async (ideAdapter: VscodeAdapter, candidates: vscode.Uri[], logger: Logger): Promise<vscode.Uri | undefined> => {
  const items: FilenameCandidateItem[] = candidates
    .map((uri) => ({
      label: path.basename(uri.fsPath),
      description: ideAdapter.asRelativePath(uri, RelativePathFormat.WithWorkspaceFolder),
      uri,
    }))
    .sort(compareFilenameCandidates);

  const picked = await ideAdapter.showQuickPick(items, {
    placeHolder: formatMessage(MessageCode.INFO_NAVIGATION_FILENAME_PICKER_PLACEHOLDER),
  });

  if (picked === undefined) {
    logger.debug({ fn: 'pickFilenameCandidate', candidateCount: candidates.length }, 'Filename picker dismissed, navigation cancelled');
    return undefined;
  }

  logger.info({ fn: 'pickFilenameCandidate', uri: picked.uri.fsPath, candidateCount: candidates.length }, 'User picked a filename candidate');

  return picked.uri;
};
