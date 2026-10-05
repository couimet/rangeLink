import { FIND_RANGE_CASES, FIND_RANGE_DOCUMENT } from '../../fixtures/wpt/findRangeFromTextDirective';

import { describeWptCorpus } from './runWptCases';

describeWptCorpus('web-platform-tests: find a range from a text directive', FIND_RANGE_DOCUMENT, FIND_RANGE_CASES);
