import type * as vscode from 'vscode';

/**
 * Null-safe check that a URI exists and points at a local file.
 *
 * Returns false for undefined and for remote/virtual schemes (vscode-remote,
 * vscode-vfs), where filesystem checks like fs.existsSync do not apply.
 */
export const isFileUri = (uri: vscode.Uri | undefined): uri is vscode.Uri => uri !== undefined && uri.scheme === 'file';
