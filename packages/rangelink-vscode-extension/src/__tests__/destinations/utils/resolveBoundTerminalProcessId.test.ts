import { resolveBoundTerminalProcessId } from '../../../destinations/utils/resolveBoundTerminalProcessId';
import { createMockDestinationManager } from '../../helpers/createMockDestinationManager';
import { createMockSingletonComposablePasteDestination } from '../../helpers/createMockSingletonComposablePasteDestination';
import { createMockTerminalComposablePasteDestination } from '../../helpers/createMockTerminalComposablePasteDestination';

describe('resolveBoundTerminalProcessId', () => {
  it('returns the processId when bound to a terminal destination', async () => {
    const terminalDest = createMockTerminalComposablePasteDestination({ processId: 42 });
    const manager = createMockDestinationManager({
      isBound: true,
      boundDestination: terminalDest,
    });

    const result = await resolveBoundTerminalProcessId(manager);

    expect(result).toBe(42);
  });

  it('returns undefined when no destination is bound', async () => {
    const manager = createMockDestinationManager();

    const result = await resolveBoundTerminalProcessId(manager);

    expect(result).toBeUndefined();
  });

  it('returns undefined when bound to a non-terminal destination', async () => {
    const singletonDest = createMockSingletonComposablePasteDestination({ id: 'claude-code' });
    const manager = createMockDestinationManager({
      isBound: true,
      boundDestination: singletonDest,
    });

    const result = await resolveBoundTerminalProcessId(manager);

    expect(result).toBeUndefined();
  });

  it('returns undefined when terminal processId resolves to undefined', async () => {
    const terminalDest = createMockTerminalComposablePasteDestination();
    (terminalDest as any).resource.terminal.processId = Promise.resolve(undefined);
    const manager = createMockDestinationManager({
      isBound: true,
      boundDestination: terminalDest,
    });

    const result = await resolveBoundTerminalProcessId(manager);

    expect(result).toBeUndefined();
  });
});
