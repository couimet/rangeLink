import { PERCENT_ENCODING_CASES, PERCENT_ENCODING_DOCUMENT } from '../../fixtures/wpt/percentEncoding';

import { describeWptCorpus } from './runWptCases';

describeWptCorpus('web-platform-tests: percent-encoding', PERCENT_ENCODING_DOCUMENT, PERCENT_ENCODING_CASES);
