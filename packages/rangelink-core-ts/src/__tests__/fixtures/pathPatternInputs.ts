/**
 * Shared test inputs for buildLinkPattern and buildFilePathPattern tests.
 *
 * Groups reflect the scenario being tested, not which function uses them.
 * Where both functions exercise the same scenario, they import from the same
 * constant — the assertions differ but the input is identical.
 *
 * URL groups provide _NO_HASH and _WITH_RANGELINK variants:
 * - buildFilePathPattern tests use _NO_HASH (no #L suffix expected)
 * - buildLinkPattern tests use _WITH_RANGELINK (requires #L suffix to match)
 */

// ---------------------------------------------------------------------------
// URL false positives — should NOT match in either function
// ---------------------------------------------------------------------------

export const URL_INPUTS = {
  HTTPS_NO_HASH: 'See https://example.com/path/file.ts for info',
  HTTPS_WITH_RANGELINK: 'Check https://github.com/org/repo/file.ts#L10',
  HTTPS_WITH_QUERY_PARAM_AND_RANGELINK:
    'https://github.com/nextjs/deploy-github-pages/blob/main/README.md?plain=1#L3-L9',
  HTTPS_UPPERCASE_WITH_RANGELINK: 'Check HTTPS://GITHUB.COM/FILE.TS#L10',
  HTTP_NO_HASH: 'See http://example.com/file.ts for details',
  HTTP_WITH_RANGELINK: 'See http://example.com/file.ts#L5 for details',
  FTP_NO_HASH: 'Download ftp://server.com/path/file.ts',
  FTP_WITH_RANGELINK: 'Download from ftp://server.com/file.ts#L10',
  LOCALHOST_NO_HASH: 'Check http://localhost:3000/api/handler.ts',
  LOCALHOST_WITH_RANGELINK: 'Check http://localhost:3000/file.ts#L10',
  HTTPS_CDN_NO_HASH: 'See https://cdn.example.com/assets/app.js for details',

  // Domain-like paths without scheme — should NOT match because the dot before
  // the slash triggers NOT_AFTER_URL_CHAR
  DOMAIN_PREFIXED_NO_HASH: 'github.com/owner/repo/file.ts',
  DOMAIN_PREFIXED_WITH_RANGELINK: 'Check github.com/org/repo/file.ts#L10',
} as const;

// ---------------------------------------------------------------------------
// Prose with apostrophes — primarily for buildFilePathPattern
// (buildLinkPattern is architecturally protected via PATH_CHAR excluding \x27)
// ---------------------------------------------------------------------------

export const PROSE_INPUTS = {
  // Two possessives with backtick-surrounded code between them
  POSSESSIVES_WITH_BACKTICK_CODE:
    "The handler branch's `checkout_globaldb_reads_enabled?` predicate is incompatible with the user_default_asset base's one-shot boundary pattern.",

  // Two possessives; mid-span has an extension-like word but a SPACE follows
  // it, not the closing quote — the closing quote requirement prevents a match
  POSSESSIVES_SPACE_AFTER_EXTENSION: "branch's handleKeypress.ts file and base's",

  // Apostrophe contraction before a legitimately matchable unquoted path
  CONTRACTION_WITH_VALID_RELATIVE_PATH: "can't load ./src/component.tsx for now",

  // Lone possessive with no second apostrophe on the same line
  LONE_POSSESSIVE: "it's a nice day",

  // Possessive immediately before a RangeLink — PATH_CHAR stops at the quote
  POSSESSIVE_BEFORE_RANGELINK: "The component's file.ts#L10 is the entry point",

  // Possessive immediately after a RangeLink — path capture must stop at the quote
  POSSESSIVE_AFTER_RANGELINK: "file.ts#L10's error is in the renderer",

  // Backtick-wrapped RangeLink adjacent to backtick-wrapped non-link code
  RANGELINK_AND_BACKTICK_CODE: 'See `file.ts#L10` and also `checkout_enabled?` for the flag',
} as const;

// ---------------------------------------------------------------------------
// Quoted path inputs — false positives (should NOT match)
// ---------------------------------------------------------------------------

export const QUOTED_FALSE_POSITIVES = {
  SINGLE_QUESTION_MARK: "'checkout_enabled?' is the flag name",
  DOUBLE_GLOB_PATTERN: 'run "*.ts" files',
  SINGLE_NO_EXTENSION: "'hello world'",
  DOUBLE_NO_EXTENSION: '"output directory"',

  // Newline between two apostrophes — the newline exclusion prevents cross-line spanning;
  // the second line's valid path should still match
  NEWLINE_BETWEEN_POSSESSIVES_WITH_VALID_SECOND_LINE: "branch's\n'/path/to/file.ts'",
} as const;

// ---------------------------------------------------------------------------
// Quoted path inputs — true positives (should match)
// ---------------------------------------------------------------------------

export const QUOTED_TRUE_POSITIVES = {
  SINGLE_ABSOLUTE: "Check '/path/to/file.ts' for details",
  DOUBLE_ABSOLUTE: 'Check "/path/to/file.ts" for details',
  DOUBLE_WITH_SPACES: 'Open "/path/with spaces/file.ts" now',
  SINGLE_WITH_SPACES: "Open '/path/with spaces/file.ts' now",
  SINGLE_BARE_FILENAME: "Edit 'component.ts' directly",
  DOUBLE_BARE_FILENAME: 'Edit "component.ts" directly',
  DOUBLE_MULTI_EXTENSION: '"/path/to/file.test.ts"',

  // Possessive earlier in the same sentence must not interfere with the quoted path
  POSSESSIVE_BEFORE_SINGLE_QUOTED_PATH: "The component's output is '/path/to/out.ts'",
  POSSESSIVES_SURROUNDING_DOUBLE_QUOTED_PATH: 'It\'s in "/path/to/file.ts", isn\'t it?',
} as const;

// ---------------------------------------------------------------------------
// Special characters in path segments — bare paths (no wrapping, no #L suffix)
// Tests using these append wrappers or #L suffix as needed
// ---------------------------------------------------------------------------

export const SPECIAL_CHAR_PATHS = {
  AT_IN_COMPONENT: '/home/user@hostname/project/file.ts',
  DOT_IN_DIRECTORY: '/path/to/v1.2/config.ts',
  DOT_IN_DIRECTORY_RELATIVE: './src/v1.2/utils/helper.ts',
  NUMBERS_IN_FILENAME: '/path/to/script2.sh',
  NUMERIC_EXTENSION: 'output/report.123',
  DOTFILE_ABSOLUTE: '/repo/.eslintrc.js',
  DOTFILE_SINGLE_QUOTED: "'/path/.gitignore'",
  SHELL_SCRIPT_RELATIVE: './deploy.sh',
  YAML_TILDE: '~/config/settings.yaml',
  EXTENSION_DIGITS: '/path/to/output.mp4',
  MULTI_EXTENSION: '/path/to/my-file.test.ts',
  HYPHEN_AND_UNDERSCORE: 'src/foo-bar_baz.test.ts',
} as const;

// ---------------------------------------------------------------------------
// Boundary / context inputs — how surrounding characters interact with detection
// ---------------------------------------------------------------------------

export const BOUNDARY_INPUTS = {
  // Comma is NOT in NOT_AFTER_URL_CHAR exclusion set → path should match
  PATH_AFTER_COMMA: ', /path/to/file.ts — see details',

  // Space after "error:" is not a URL char → path should match
  PATH_AFTER_COLON_LABEL: 'error: /path/to/file.ts is missing',

  // Backtick wraps but is not part of the path — NOT_AFTER_URL_CHAR does not
  // fire on backtick so the enclosed absolute path should match
  ABS_PATH_IN_BACKTICKS: '`/path/to/file.ts`',

  // Rangelink variants of the above for buildLinkPattern
  RANGELINK_AFTER_COMMA: ', src/file.ts#L10 — see details',
  RANGELINK_AFTER_COLON_LABEL: 'error: src/file.ts#L10 is the source',
} as const;

// ---------------------------------------------------------------------------
// Multiple-match inputs — lines containing more than one detectable path
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// RangeLink coexistence — paths that must NOT match buildFilePathPattern
// because RangeLinkDocumentProvider / RangeLinkTerminalProvider own the full link
// ---------------------------------------------------------------------------

export const RANGELINK_COEXISTENCE = {
  RELATIVE_WITH_RANGELINK: './src/a.ts#L10',
  ABSOLUTE_WITH_RANGELINK: '/abs/file.ts#L5',
  TILDE_WITH_RANGELINK: '~/config.ts#L1',
  CLEAN_RELATIVE: './src/a.ts',
} as const;

// ---------------------------------------------------------------------------
// Multiple-match inputs — lines containing more than one detectable path
// ---------------------------------------------------------------------------

export const MULTI_MATCH_INPUTS = {
  TWO_RELATIVE_PATHS: 'From ./src/a.ts to ./src/b.ts',
  TWO_RANGELINKS: 'Compare file1.ts#L10 with file2.ts#L20',
  ABS_AND_RELATIVE: '/abs/file.ts and ./rel/file.ts',
  ABS_AND_RELATIVE_RANGELINKS: 'Compare /abs/file.ts#L10 with ./rel/file.ts#L20',
  QUOTED_AND_UNQUOTED: 'Copy "/src/a.ts" to /dst/b.ts',
  TWO_DOUBLE_QUOTED: '"/src/a.ts" and "/src/b.ts"',
  URL_AND_LOCAL_RANGELINK: 'Compare https://github.com/file.ts#L5 with local.ts#L10',
} as const;
