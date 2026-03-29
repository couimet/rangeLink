import { createMockLogger } from 'barebone-logger-testing';

import { DefaultClipboardPreserver } from '../../clipboard/DefaultClipboardPreserver';
import { createMockConfigReader, createMockVscodeAdapter } from '../helpers';

describe('DefaultClipboardPreserver', () => {
  const mockLogger = createMockLogger();

  describe("mode 'always'", () => {
    it('saves clipboard before fn executes and restores after success', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockResolvedValue('prior content');
      const writeSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
      const fn = jest.fn().mockResolvedValue('result');
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('always'),
      });

      const preserver = new DefaultClipboardPreserver(mockAdapter, configReader, mockLogger);
      const result = await preserver.preserve(fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(writeSpy).toHaveBeenCalledTimes(1);
      expect(writeSpy).toHaveBeenCalledWith('prior content');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'withClipboardPreservation', restoredLength: 13 },
        'Clipboard restored',
      );
    });
  });

  describe("mode 'never'", () => {
    it('calls fn without saving or restoring clipboard', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const readSpy = jest.spyOn(mockAdapter, 'readTextFromClipboard');
      const fn = jest.fn().mockResolvedValue(undefined);
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('never'),
      });

      const preserver = new DefaultClipboardPreserver(mockAdapter, configReader, mockLogger);
      await preserver.preserve(fn);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(readSpy).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        { fn: 'withClipboardPreservation', restoredLength: 13 },
        'Clipboard restored',
      );
    });
  });
});
