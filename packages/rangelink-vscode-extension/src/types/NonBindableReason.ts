/**
 * Why a terminal is visible in the destination list but cannot be bound to.
 *
 * - `extension-managed`: the terminal was created by an extension via the
 *   `Pseudoterminal` API (Jest's task runner, debug consoles, custom output
 *   terminals). Sending text to these is either dropped or routed to the
 *   owning extension rather than executed as a shell command.
 */
export type NonBindableReason = 'extension-managed';
