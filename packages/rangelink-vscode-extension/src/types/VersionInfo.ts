/**
 * Version info structure loaded from version.json at build time.
 */
export interface VersionInfo {
  version: string;
  commit: string;
  commitFull: string;
  branch: string;
  buildDate: string;
  isDirty: boolean;
}
