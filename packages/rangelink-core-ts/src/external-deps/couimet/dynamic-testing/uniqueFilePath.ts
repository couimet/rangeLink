import { getRandomAlphaString, getRandomInt, getUniqueInt } from '@couimet/dynamic-testing';

// Error codes — plain Error pattern matching rabbit-maximizer incubation style.
// Converted to DetailedError when contributed upstream.
const FILENAME_BASENAME_CONFLICT = 'FILENAME_BASENAME_CONFLICT';
const UNIQUE_PATH_NO_DIRECTORY = 'UNIQUE_PATH_NO_DIRECTORY';
const MAXLENGTH_TOO_SMALL = 'MAXLENGTH_TOO_SMALL';

const DEFAULT_DEPTH = 3;
const DEFAULT_SEPARATOR = '/';
const DEFAULT_ROOT = '/home/user/project';

const CURATED_FOLDERS = [
  'src',
  'lib',
  'utils',
  'helpers',
  'components',
  'services',
  'hooks',
  'types',
  'config',
  'tests',
  '__tests__',
  'docs',
  'assets',
  'styles',
  'data',
  'models',
  'views',
  'controllers',
  'middleware',
  'routes',
  'handlers',
  'validators',
  'formatters',
  'parsers',
  'adapters',
  'repositories',
];

const CURATED_EXTENSIONS = ['ts', 'js', 'json', 'tsx', 'jsx', 'css', 'html', 'md', 'txt'];

export interface UniqueFilePathOptions {
  depth?: number;
  folders?: string[];
  upLevels?: number;
  filename?: string;
  basename?: string;
  extension?: string;
  maxLength?: number;
  unique?: boolean;
  separator?: string;
  root?: string;
}

const normalizeExtension = (ext: string): string => (ext.startsWith('.') ? ext : `.${ext}`);

const pickRandom = <T>(arr: readonly T[]): T => arr[getRandomInt(0, arr.length - 1)];

const generateUniqueSuffix = (): string => `${getRandomAlphaString(6)}-${getUniqueInt()}`;

const buildFolders = (explicit: string[] | undefined, depth: number): string[] => {
  if (explicit !== undefined) return explicit;
  return Array.from({ length: depth }, () => pickRandom(CURATED_FOLDERS));
};

const buildFilename = (
  filename: string | undefined,
  basename: string | undefined,
  extension: string | undefined,
  maxLength: number | undefined,
  unique: boolean,
): { value: string; isExplicit: boolean } => {
  if (filename !== undefined) {
    return { value: filename, isExplicit: true };
  }

  if (basename !== undefined) {
    const ext = extension !== undefined ? normalizeExtension(extension) : getUniqueFileExtension();
    return { value: `${basename}${ext}`, isExplicit: true };
  }

  // Auto-generated
  const ext = extension !== undefined ? normalizeExtension(extension) : getUniqueFileExtension();

  if (!unique) {
    const len = maxLength !== undefined ? Math.max(1, maxLength - ext.length) : 6;
    return { value: `${getRandomAlphaString(len)}${ext}`, isExplicit: false };
  }

  const suffix = `-${getUniqueInt()}`;
  const maxPrefixLen = maxLength !== undefined ? maxLength - suffix.length - ext.length : 6;
  if (maxLength !== undefined && maxPrefixLen < 1) {
    throw new Error(
      `${MAXLENGTH_TOO_SMALL}: maxLength (${maxLength}) too small for minimum filename (suffix + extension = ${suffix.length + ext.length} chars)`,
    );
  }
  const prefix = getRandomAlphaString(Math.max(1, maxPrefixLen));
  return { value: `${prefix}${suffix}${ext}`, isExplicit: false };
};

/** Returns a random file extension (with leading dot) from the curated common list. */
export const getUniqueFileExtension = (): string => `.${pickRandom(CURATED_EXTENSIONS)}`;

/** Returns a unique relative file path. */
export const getUniqueRelativePath = (options: UniqueFilePathOptions = {}): string => {
  const {
    depth = DEFAULT_DEPTH,
    folders: explicitFolders,
    upLevels = 0,
    filename,
    basename,
    extension,
    maxLength,
    unique = true,
    separator = DEFAULT_SEPARATOR,
  } = options;

  if (filename !== undefined && (basename !== undefined || extension !== undefined)) {
    throw new Error(`${FILENAME_BASENAME_CONFLICT}: filename cannot be combined with basename or extension`);
  }

  const { value: finalName, isExplicit: nameIsExplicit } = buildFilename(filename, basename, extension, maxLength, unique);

  if (unique && nameIsExplicit && depth === 0 && explicitFolders === undefined) {
    throw new Error(`${UNIQUE_PATH_NO_DIRECTORY}: depth must be at least 1 when filename/basename is explicit and unique is true; received depth=0`);
  }

  let folders = buildFolders(explicitFolders, depth);

  if (unique) {
    if (nameIsExplicit) {
      // Suffix goes into the folder portion — either replace last auto folder
      // or inject a new folder when all folders are caller-specified.
      if (explicitFolders !== undefined) {
        folders = [...folders, generateUniqueSuffix()];
      } else {
        folders = [...folders.slice(0, -1), generateUniqueSuffix()];
      }
    }
    // When name is auto-generated, the suffix is already baked into finalName by buildFilename().
  }

  const upPrefix = upLevels > 0 ? `${'..' + separator}`.repeat(upLevels) : '';
  const dirPart = folders.length > 0 ? folders.join(separator) + separator : '';
  return `${upPrefix}${dirPart}${finalName}`;
};

/** Returns a unique absolute file path. */
export const getUniqueAbsolutePath = (options: UniqueFilePathOptions = {}): string => {
  const { root = DEFAULT_ROOT, separator = DEFAULT_SEPARATOR, ...rest } = options;
  const relative = getUniqueRelativePath({ ...rest, separator });
  const normalizedRoot = root.endsWith(separator) ? root.slice(0, -separator.length) : root;
  return `${normalizedRoot}${separator}${relative}`;
};

/** Returns `count` unique relative file paths. */
export const getUniqueRelativePaths = (count: number, options?: UniqueFilePathOptions): string[] => {
  if (count < 1) {
    throw new Error(`COUNT_NOT_POSITIVE_INTEGER: count must be a positive integer, received ${count}`);
  }
  return Array.from({ length: count }, () => getUniqueRelativePath(options));
};

/** Returns an object mapping each key to a unique relative file path. */
export const getUniqueRelativePathsNamed = <K extends string>(keys: readonly K[], options?: UniqueFilePathOptions): Record<K, string> => {
  if (keys.length === 0) {
    throw new Error('KEYS_ARRAY_EMPTY: keys must not be empty');
  }
  return Object.fromEntries(keys.map((k) => [k, getUniqueRelativePath(options)])) as Record<K, string>;
};

/** Returns `count` unique absolute file paths. */
export const getUniqueAbsolutePaths = (count: number, options?: UniqueFilePathOptions): string[] => {
  if (count < 1) {
    throw new Error(`COUNT_NOT_POSITIVE_INTEGER: count must be a positive integer, received ${count}`);
  }
  return Array.from({ length: count }, () => getUniqueAbsolutePath(options));
};

/** Returns an object mapping each key to a unique absolute file path. */
export const getUniqueAbsolutePathsNamed = <K extends string>(keys: readonly K[], options?: UniqueFilePathOptions): Record<K, string> => {
  if (keys.length === 0) {
    throw new Error('KEYS_ARRAY_EMPTY: keys must not be empty');
  }
  return Object.fromEntries(keys.map((k) => [k, getUniqueAbsolutePath(options)])) as Record<K, string>;
};
