// Fixture for dirty-buffer-warning-023:
// Each declaration below has trailing whitespace (5 spaces) before the
// newline. With `files.trimTrailingWhitespace` enabled, VS Code trims those
// on save — shifting the end-of-line character offset for any selection
// that extends to the trailing-whitespace region. This is built-in VS Code
// behavior (no formatter required), so it reproduces deterministically in
// any test host.
//
// This file is listed in .prettierignore so the trailing whitespace is
// preserved across formatter runs.
export const targetLine = 'shift me';     
export const referenceLine = 'no trim';     
