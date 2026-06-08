/**
 * Thin adapter that TerminalPasteService needs from the IDE layer.
 *
 * VscodeAdapter implements this directly so FocusCapabilityFactory can
 * wire the service without an extra wrapper object.
 */
export interface TerminalPasteAdapter {
  executeCommand(command: string): Promise<void>;
}
