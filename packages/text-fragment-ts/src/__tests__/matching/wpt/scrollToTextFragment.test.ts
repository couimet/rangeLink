import { SCROLL_TO_TEXT_CASES, SCROLL_TO_TEXT_DOCUMENT } from '../../fixtures/wpt/scrollToTextFragment';

import { describeWptCorpus } from './runWptCases';

describeWptCorpus('web-platform-tests: scroll to a text fragment', SCROLL_TO_TEXT_DOCUMENT, SCROLL_TO_TEXT_CASES);
