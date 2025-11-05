/* eslint-disable no-undef */
import { getPlatformModifierKey } from '../../utils/getPlatformModifierKey';

describe('getPlatformModifierKey', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    // Restore original platform after each test
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  describe('macOS platform', () => {
    it('should return "Cmd" for darwin platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true,
      });

      expect(getPlatformModifierKey()).toStrictEqual('Cmd');
    });
  });

  describe('Windows platform', () => {
    it('should return "Ctrl" for win32 platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true,
      });

      expect(getPlatformModifierKey()).toStrictEqual('Ctrl');
    });
  });

  describe('Linux platform', () => {
    it('should return "Ctrl" for linux platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true,
      });

      expect(getPlatformModifierKey()).toStrictEqual('Ctrl');
    });
  });

  describe('Other platforms', () => {
    it('should return "Ctrl" for freebsd platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'freebsd',
        writable: true,
        configurable: true,
      });

      expect(getPlatformModifierKey()).toStrictEqual('Ctrl');
    });

    it('should return "Ctrl" for openbsd platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'openbsd',
        writable: true,
        configurable: true,
      });

      expect(getPlatformModifierKey()).toStrictEqual('Ctrl');
    });

    it('should return "Ctrl" for sunos platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'sunos',
        writable: true,
        configurable: true,
      });

      expect(getPlatformModifierKey()).toStrictEqual('Ctrl');
    });
  });
});
