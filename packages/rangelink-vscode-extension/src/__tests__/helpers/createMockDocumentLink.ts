/**
 * Create a mock DocumentLink constructor for testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock DocumentLink constructor.
 *
 * @returns Mock DocumentLink constructor that creates {range, target, tooltip} objects
 */
export const createMockDocumentLink = () =>
  jest.fn(function (this: any, range: vscode.Range, target?: vscode.Uri) {
    this.range = range;
    this.target = target;
    this.tooltip = undefined;
  });
