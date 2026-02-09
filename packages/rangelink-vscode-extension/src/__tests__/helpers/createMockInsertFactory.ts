import type * as vscode from 'vscode';

import type { InsertFactory } from '../../destinations/capabilities/insertFactories';

/**
 * Create a mock InsertFactory<vscode.TextEditor> for testing.
 *
 * Returns a jest-mocked factory whose forTarget returns a resolved insert function.
 */
export const createMockInsertFactory = (): jest.Mocked<InsertFactory<vscode.TextEditor>> => ({
  forTarget: jest.fn(() => jest.fn().mockResolvedValue(true)),
});
