/**
 * Test helpers and utilities
 *
 * Re-exports all test helper modules for convenient importing.
 */

// Export individual mock factories
export { createMockCancellationToken } from './createMockCancellationToken';
export { createMockCommands } from './createMockCommands';
export { createMockDocument } from './createMockDocument';
export { createMockDocumentLink } from './createMockDocumentLink';
export { createMockEditor } from './createMockEditor';
export { createMockEnv } from './createMockEnv';
export { createMockExtensions } from './createMockExtensions';
export { createMockPosition } from './createMockPosition';
export { createMockRange } from './createMockRange';
export { createMockSelection } from './createMockSelection';
export { createMockTerminal } from './createMockTerminal';
export { createMockUri } from './createMockUri';
export { createMockUriInstance } from './createMockUriInstance';
export { createMockWindow } from './createMockWindow';
export { createMockWorkspaceFolder } from './createMockWorkspaceFolder';

// Export complex utilities and types from mockVSCode
export * from './mockVSCode';

// Export destination test helpers
export * from './destinationTestHelpers';
