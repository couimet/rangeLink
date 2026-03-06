import type { Logger } from 'barebone-logger';

import type { ConfigReader } from '../config/ConfigReader';
import type { ClipboardProvider } from '../ide/ClipboardProvider';
import { withClipboardPreservation } from '../utils';

import type { ClipboardPreserver } from './ClipboardPreserver';

export class DefaultClipboardPreserver implements ClipboardPreserver {
  constructor(
    private readonly clipboard: ClipboardProvider,
    private readonly configReader: ConfigReader,
    private readonly logger: Logger,
  ) {}

  preserve<T>(fn: () => Promise<T>): Promise<T> {
    return withClipboardPreservation(this.clipboard, this.configReader, this.logger, fn);
  }
}
