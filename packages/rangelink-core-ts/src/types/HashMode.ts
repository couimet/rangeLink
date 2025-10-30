/**
 * Specifies the hash delimiter mode for the link.
 * - Normal: Single hash delimiter (e.g., path#L10)
 * - ColumnMode: Double hash delimiter for rectangular selections (e.g., path##L10C5-L20C10)
 */
export enum HashMode {
  Normal = 'Normal',
  ColumnMode = 'ColumnMode',
}

