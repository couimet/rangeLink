import { createIsoTimestamp } from '../createIsoTimestamp';

describe('createIsoTimestamp', () => {
  it('returns an ISO 8601 UTC timestamp for the current moment', () => {
    const timestamp = createIsoTimestamp();

    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
