import { DelimiterConfig } from '../../types/DelimiterConfig';
import { FormattedLink } from '../../types/FormattedLink';
import { HashMode } from '../../types/HashMode';
import { LinkType } from '../../types/LinkType';
import { RangeFormat } from '../../types/RangeFormat';
import { RangeLinkMessageCode } from '../../types/RangeLinkMessageCode';
import { Result } from '../../types/Result';
import { SelectionMode } from '../../types/SelectionMode';

/**
 * Expected FormattedLink for the custom matcher
 */
interface ExpectedFormattedLink {
  link: string;
  linkType: LinkType;
  delimiters: DelimiterConfig;
  rangeFormat: RangeFormat;
  hashMode: HashMode;
  selectionMode: SelectionMode;
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeSuccessWithFormattedLink(expected: ExpectedFormattedLink): R;
    }
  }
}

expect.extend({
  toBeSuccessWithFormattedLink(
    received: Result<FormattedLink, RangeLinkMessageCode>,
    expected: ExpectedFormattedLink,
  ) {
    // Check if result is successful
    if (!received.success) {
      return {
        pass: false,
        message: () =>
          `Expected result to be successful, but it failed with error: ${received.error}`,
      };
    }

    const actual = received.value;

    // Compare each field
    const failures: string[] = [];

    if (actual.link !== expected.link) {
      failures.push(`  link: expected "${expected.link}", received "${actual.link}"`);
    }

    if (actual.linkType !== expected.linkType) {
      failures.push(`  linkType: expected "${expected.linkType}", received "${actual.linkType}"`);
    }

    if (actual.rangeFormat !== expected.rangeFormat) {
      failures.push(
        `  rangeFormat: expected "${expected.rangeFormat}", received "${actual.rangeFormat}"`,
      );
    }

    if (actual.hashMode !== expected.hashMode) {
      failures.push(`  hashMode: expected "${expected.hashMode}", received "${actual.hashMode}"`);
    }

    if (actual.selectionMode !== expected.selectionMode) {
      failures.push(
        `  selectionMode: expected "${expected.selectionMode}", received "${actual.selectionMode}"`,
      );
    }

    // Deep compare delimiters
    if (JSON.stringify(actual.delimiters) !== JSON.stringify(expected.delimiters)) {
      failures.push(
        `  delimiters: expected ${JSON.stringify(expected.delimiters)}, received ${JSON.stringify(actual.delimiters)}`,
      );
    }

    if (failures.length > 0) {
      return {
        pass: false,
        message: () => `FormattedLink mismatch:\n${failures.join('\n')}`,
      };
    }

    return {
      pass: true,
      message: () => 'FormattedLink matches expected values',
    };
  },
});

export {};
