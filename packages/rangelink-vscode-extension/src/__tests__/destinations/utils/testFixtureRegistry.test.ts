import {
  isRangeLinkTestFixture,
  markRangeLinkTestFixture,
} from '../../../destinations/utils/testFixtureRegistry';
import { createMockTerminal } from '../../helpers';

describe('testFixtureRegistry', () => {
  const originalEnv = process.env.RANGELINK_TEST_FIXTURES_ENABLED;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.RANGELINK_TEST_FIXTURES_ENABLED;
    } else {
      process.env.RANGELINK_TEST_FIXTURES_ENABLED = originalEnv;
    }
  });

  describe('production mode (RANGELINK_TEST_FIXTURES_ENABLED not set)', () => {
    beforeEach(() => {
      delete process.env.RANGELINK_TEST_FIXTURES_ENABLED;
    });

    it('isRangeLinkTestFixture returns false', () => {
      const terminal = createMockTerminal({ name: 'any' });
      expect(isRangeLinkTestFixture(terminal)).toBe(false);
    });

    it('markRangeLinkTestFixture throws TEST_FIXTURE_REGISTRY_DISABLED', () => {
      const terminal = createMockTerminal({ name: 'any' });
      expect(() => markRangeLinkTestFixture(terminal)).toThrowRangeLinkExtensionError(
        'TEST_FIXTURE_REGISTRY_DISABLED',
        {
          message: 'markRangeLinkTestFixture requires RANGELINK_TEST_FIXTURES_ENABLED=true',
          functionName: 'markRangeLinkTestFixture',
        },
      );
    });
  });

  describe('test mode (RANGELINK_TEST_FIXTURES_ENABLED=true)', () => {
    beforeEach(() => {
      process.env.RANGELINK_TEST_FIXTURES_ENABLED = 'true';
    });

    it('isRangeLinkTestFixture returns false for unregistered terminal', () => {
      const terminal = createMockTerminal({ name: 'any' });
      expect(isRangeLinkTestFixture(terminal)).toBe(false);
    });

    it('markRangeLinkTestFixture then isRangeLinkTestFixture returns true', () => {
      const terminal = createMockTerminal({ name: 'fixture' });
      markRangeLinkTestFixture(terminal);
      expect(isRangeLinkTestFixture(terminal)).toBe(true);
    });

    it('does not cross-contaminate terminals', () => {
      const terminalA = createMockTerminal({ name: 'a' });
      const terminalB = createMockTerminal({ name: 'b' });
      markRangeLinkTestFixture(terminalA);
      expect(isRangeLinkTestFixture(terminalA)).toBe(true);
      expect(isRangeLinkTestFixture(terminalB)).toBe(false);
    });
  });
});
