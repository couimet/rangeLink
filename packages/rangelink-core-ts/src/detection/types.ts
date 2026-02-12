/**
 * Minimal cancellation interface — avoids importing vscode.CancellationToken.
 *
 * Any object with an `isCancellationRequested` boolean satisfies this,
 * including vscode.CancellationToken.
 */
export interface Cancellable {
  readonly isCancellationRequested: boolean;
}

/**
 * A range in the source text already claimed by a detected link.
 * Used internally to prevent overlapping detections between passes.
 */
export interface OccupiedRange {
  readonly start: number;
  readonly end: number;
}
