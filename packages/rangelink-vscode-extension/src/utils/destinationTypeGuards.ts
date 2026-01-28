/**
 * Type guards for PasteDestination types.
 *
 * Provides null-safe, type-narrowing utilities for checking destination types.
 * These guards eliminate the need for `instanceof` checks and direct resource
 * access scattered throughout the codebase.
 */
import type * as vscode from 'vscode';

import { ComposablePasteDestination } from '../destinations/ComposablePasteDestination';
import type { PasteDestination } from '../destinations/PasteDestination';
import type { DestinationType } from '../types';

/**
 * Generic null-safe type check for any destination type.
 *
 * Use this when you only need to check the logical destination type
 * without accessing resource-specific data.
 *
 * @param destination - The destination to check (may be undefined)
 * @param type - The expected destination type
 * @returns True if destination exists and matches the type
 */
export const isPasteDestinationType = (
  destination: PasteDestination | undefined,
  type: DestinationType,
): destination is PasteDestination => {
  return destination?.id === type;
};

/**
 * Type guard for terminal destinations with typed resource access.
 *
 * After this guard passes, TypeScript knows:
 * - destination is a ComposablePasteDestination
 * - destination.resource.kind === 'terminal'
 * - destination.resource.terminal is vscode.Terminal
 *
 * @param destination - The destination to check (may be undefined)
 * @returns True if destination is a terminal ComposablePasteDestination
 */
export const isTerminalDestination = (
  destination: PasteDestination | undefined,
): destination is ComposablePasteDestination & {
  resource: { kind: 'terminal'; terminal: vscode.Terminal };
} => {
  return (
    destination instanceof ComposablePasteDestination && destination.resource.kind === 'terminal'
  );
};

/**
 * Type guard for text editor destinations with typed resource access.
 *
 * After this guard passes, TypeScript knows:
 * - destination is a ComposablePasteDestination
 * - destination.resource.kind === 'editor'
 * - destination.resource.editor is vscode.TextEditor
 *
 * @param destination - The destination to check (may be undefined)
 * @returns True if destination is an editor ComposablePasteDestination
 */
export const isEditorDestination = (
  destination: PasteDestination | undefined,
): destination is ComposablePasteDestination & {
  resource: { kind: 'editor'; editor: vscode.TextEditor };
} => {
  return (
    destination instanceof ComposablePasteDestination && destination.resource.kind === 'editor'
  );
};

/**
 * Type guard for singleton destinations (AI assistants).
 *
 * After this guard passes, TypeScript knows:
 * - destination is a ComposablePasteDestination
 * - destination.resource.kind === 'singleton'
 *
 * @param destination - The destination to check (may be undefined)
 * @returns True if destination is a singleton ComposablePasteDestination
 */
export const isSingletonDestination = (
  destination: PasteDestination | undefined,
): destination is ComposablePasteDestination & {
  resource: { kind: 'singleton' };
} => {
  return (
    destination instanceof ComposablePasteDestination && destination.resource.kind === 'singleton'
  );
};
