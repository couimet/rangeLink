import { createMockLogger } from 'barebone-logger-testing';
import { DEFAULT_DELIMITERS } from 'rangelink-core-ts';

import {
  createMockConfigGetter,
  createMockVscodeAdapter,
  type VscodeAdapterWithTestHooks,
} from '../../__tests__/helpers';
import { DelimiterCache } from '../DelimiterCache';

const CUSTOM_DELIMITERS = {
  hash: '$',
  line: 'LINE',
  position: 'COL',
  range: 'TO',
};

const createCustomConfig = () =>
  createMockConfigGetter({
    delimiterHash: '$',
    delimiterLine: 'LINE',
    delimiterPosition: 'COL',
    delimiterRange: 'TO',
  });

const createDefaultConfig = () =>
  createMockConfigGetter({
    delimiterHash: '#',
    delimiterLine: 'L',
    delimiterPosition: 'C',
    delimiterRange: '-',
  });

const createInvalidConfig = () =>
  createMockConfigGetter({
    delimiterHash: '#',
    delimiterLine: 'L',
    delimiterPosition: 'L',
    delimiterRange: '-',
  });

describe('DelimiterCache', () => {
  let ideAdapter: VscodeAdapterWithTestHooks;

  beforeEach(() => {
    ideAdapter = createMockVscodeAdapter();
  });

  describe('initialization', () => {
    it('loads delimiters from config at construction time', () => {
      const cache = new DelimiterCache(createCustomConfig(), ideAdapter, createMockLogger());

      expect(cache.getDelimiters()).toStrictEqual(CUSTOM_DELIMITERS);
    });

    it('falls back to defaults when config is invalid', () => {
      const cache = new DelimiterCache(createInvalidConfig(), ideAdapter, createMockLogger());

      expect(cache.getDelimiters()).toStrictEqual(DEFAULT_DELIMITERS);
    });

    it('shows error message when config is invalid at startup', () => {
      new DelimiterCache(createInvalidConfig(), ideAdapter, createMockLogger());

      expect(ideAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledTimes(1);
    });

    it('registers exactly one onDidChangeConfiguration listener', () => {
      new DelimiterCache(createDefaultConfig(), ideAdapter, createMockLogger());

      expect(
        ideAdapter.__getVscodeInstance().workspace.onDidChangeConfiguration,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('cache invalidation on config change', () => {
    it('refreshes delimiters when a rangelink setting changes', () => {
      const logger = createMockLogger();
      const cache = new DelimiterCache(createDefaultConfig(), ideAdapter, logger);
      expect(cache.getDelimiters()).toStrictEqual(DEFAULT_DELIMITERS);

      const [capturedListener] =
        ideAdapter.__getVscodeInstance().workspace.onDidChangeConfiguration.mock.calls[0];

      capturedListener({ affectsConfiguration: (ns: string) => ns === 'rangelink' });

      expect(logger.info).toHaveBeenCalledWith(
        { fn: 'DelimiterCache' },
        'rangelink configuration changed — reloading delimiter config',
      );
      expect(cache.getDelimiters()).toStrictEqual(DEFAULT_DELIMITERS);
    });

    it('does not refresh delimiters when an unrelated setting changes', () => {
      const logger = createMockLogger();
      const cache = new DelimiterCache(createDefaultConfig(), ideAdapter, logger);

      const [capturedListener] =
        ideAdapter.__getVscodeInstance().workspace.onDidChangeConfiguration.mock.calls[0];

      // Simulate a non-rangelink change
      capturedListener({ affectsConfiguration: (_ns: string) => false });

      // logger.info would be called by getDelimitersForExtension if it ran again — verify it wasn't
      const infoCallCountAfterInit = (logger.info as jest.Mock).mock.calls.length;
      capturedListener({ affectsConfiguration: (_ns: string) => false });
      expect((logger.info as jest.Mock).mock.calls.length).toBe(infoCallCountAfterInit);

      expect(cache.getDelimiters()).toStrictEqual(DEFAULT_DELIMITERS);
    });

    it('shows error message when updated config is invalid', () => {
      const cache = new DelimiterCache(createInvalidConfig(), ideAdapter, createMockLogger());

      const [capturedListener] =
        ideAdapter.__getVscodeInstance().workspace.onDidChangeConfiguration.mock.calls[0];
      capturedListener({ affectsConfiguration: (ns: string) => ns === 'rangelink' });

      expect(ideAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledTimes(2);
      expect(cache.getDelimiters()).toStrictEqual(DEFAULT_DELIMITERS);
    });
  });

  describe('dispose', () => {
    it('disposes the underlying subscription', () => {
      const mockDisposable = { dispose: jest.fn() };
      ideAdapter
        .__getVscodeInstance()
        .workspace.onDidChangeConfiguration.mockReturnValue(mockDisposable);

      const cache = new DelimiterCache(createDefaultConfig(), ideAdapter, createMockLogger());
      cache.dispose();

      expect(mockDisposable.dispose).toHaveBeenCalledTimes(1);
    });
  });
});
