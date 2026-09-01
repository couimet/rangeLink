import { awaitCapture } from '../../__development-tests__/scenarios';

const CAPTURE_SETTLE_MS = 2000;
const CAPTURE_POLL_MS = 100;

describe('awaitCapture', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves true as soon as capture appears when delivery is expected', async () => {
    let captured = '';
    const promise = awaitCapture(() => captured, true);
    captured = 'sent-link';
    await jest.advanceTimersByTimeAsync(CAPTURE_POLL_MS);
    await expect(promise).resolves.toBe(true);
  });

  it('resolves false after the full window when delivery is expected but capture stays empty', async () => {
    const promise = awaitCapture(() => '', true);
    await jest.advanceTimersByTimeAsync(CAPTURE_SETTLE_MS + CAPTURE_POLL_MS);
    await expect(promise).resolves.toBe(false);
  });

  it('detects capture arriving mid-window for escape cases', async () => {
    let captured = '';
    const promise = awaitCapture(() => captured, false);
    captured = 'delayed-link';
    await jest.advanceTimersByTimeAsync(CAPTURE_SETTLE_MS + CAPTURE_POLL_MS);
    await expect(promise).resolves.toBe(true);
  });

  it('resolves false after the full window when escape produced no capture', async () => {
    const promise = awaitCapture(() => '', false);
    await jest.advanceTimersByTimeAsync(CAPTURE_SETTLE_MS + CAPTURE_POLL_MS);
    await expect(promise).resolves.toBe(false);
  });
});
