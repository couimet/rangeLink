import { resolveBoundTerminalProcessId } from '../../../destinations/utils/resolveBoundTerminalProcessId';
import { createMockSingletonComposablePasteDestination } from '../../helpers/createMockSingletonComposablePasteDestination';
import { createMockTerminalComposablePasteDestination } from '../../helpers/createMockTerminalComposablePasteDestination';

describe('resolveBoundTerminalProcessId', () => {
  it('returns the processId when bound to a terminal destination', async () => {
    const terminalDest = createMockTerminalComposablePasteDestination({ processId: 42 });

    const result = await resolveBoundTerminalProcessId(() => terminalDest);

    expect(result).toBe(42);
  });

  it('returns undefined when no destination is bound', async () => {
    const result = await resolveBoundTerminalProcessId(() => undefined);

    expect(result).toBeUndefined();
  });

  it('returns undefined when bound to a non-terminal destination', async () => {
    const singletonDest = createMockSingletonComposablePasteDestination({ id: 'claude-code' });

    const result = await resolveBoundTerminalProcessId(() => singletonDest);

    expect(result).toBeUndefined();
  });

  it('returns undefined when terminal processId resolves to undefined', async () => {
    const terminalDest = createMockTerminalComposablePasteDestination();
    (terminalDest as any).resource.terminal.processId = Promise.resolve(undefined);

    const result = await resolveBoundTerminalProcessId(() => terminalDest);

    expect(result).toBeUndefined();
  });
});
