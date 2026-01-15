/**
 * Mock VscodeAdapter factory for testing
 *
 * Provides the recommended way to create VscodeAdapter instances in tests.
 * Use createMockVscodeAdapter() for all test files except VscodeAdapter.test.ts.
 */

import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';

import { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import { createMockVscode, type MockVscodeOptions } from './createMockVscode';

/**
 * Extended options for createMockVscodeAdapter that includes logger.
 */
export interface MockVscodeAdapterOptions extends MockVscodeOptions {
  /** Logger instance - defaults to createMockLogger() if not provided */
  logger?: Logger;
}

/**
 * Test-only extension of VscodeAdapter that exposes the underlying vscode instance.
 *
 * This allows tests to mutate the mock vscode instance for test scenarios without
 * polluting the production VscodeAdapter class or breaking encapsulation.
 */
export interface VscodeAdapterWithTestHooks extends VscodeAdapter {
  /**
   * Test-only accessor to the underlying vscode instance.
   *
   * Use only for mutating vscode state (e.g., setting activeTextEditor to undefined).
   * VscodeAdapter properties are readonly, so use this to simulate IDE state changes.
   */
  __getVscodeInstance(): any;
}

/**
 * Create a mock VscodeAdapter instance for testing.
 *
 * This creates a **real VscodeAdapter instance** backed by a mocked VSCode API,
 * not a mock object. This ensures tests verify actual adapter behavior and
 * maintain type safety with the production VscodeAdapter class.
 *
 * **Test-only feature:** The returned adapter includes `__getVscodeInstance()` for
 * mutating underlying vscode state (readonly properties):
 *
 * @param options - Optional configuration for environment and VSCode API overrides
 * @returns Real VscodeAdapter instance with test hooks for accessing underlying mock
 */
export const createMockVscodeAdapter = (
  options?: MockVscodeAdapterOptions,
): VscodeAdapterWithTestHooks => {
  const vscodeInstance = createMockVscode(options);
  const logger = options?.logger ?? createMockLogger();
  const adapter = new VscodeAdapter(vscodeInstance, logger) as VscodeAdapterWithTestHooks;

  // Add test-only hook to access the underlying vscode instance
  adapter.__getVscodeInstance = () => vscodeInstance;

  return adapter;
};
