/**
 * Test helpers and utilities
 *
 * Re-exports all test helper modules for convenient importing.
 */

// Export individual mock factories
export { createMockCancellationToken } from './createMockCancellationToken';
export { createMockDocument } from './createMockDocument';
export { createMockDocumentLink } from './createMockDocumentLink';
export { createMockEditor } from './createMockEditor';
export { createMockPosition } from './createMockPosition';
export { createMockRange } from './createMockRange';
export { createMockSelection } from './createMockSelection';
export { createMockTerminal } from './createMockTerminal';
export { createMockUriInstance } from './createMockUriInstance';
export { createMockWorkspaceFolder } from './createMockWorkspaceFolder';

// Export complex utilities and types from mockVSCode
export * from './mockVSCode';

// Export destination test helpers
export * from './destinationTestHelpers';
