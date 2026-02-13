import { buildTerminalPickerItems } from '../../../destinations/utils/buildTerminalPickerItems';
import { createMockTerminal, createMockTerminalQuickPickItem } from '../../helpers';

describe('buildTerminalPickerItems', () => {
  const identityLabel = (info: { name: string }): string => info.name;

  it('sets description to "bound \u00b7 active" when terminal is bound and active', () => {
    const items = [
      createMockTerminalQuickPickItem(createMockTerminal({ name: 'zsh' }), true, 'bound'),
    ];

    const result = buildTerminalPickerItems(items, identityLabel);

    expect(result[0].description).toBe('bound \u00b7 active');
  });

  it('sets description to "bound" when terminal is bound but not active', () => {
    const items = [
      createMockTerminalQuickPickItem(createMockTerminal({ name: 'zsh' }), false, 'bound'),
    ];

    const result = buildTerminalPickerItems(items, identityLabel);

    expect(result[0].description).toBe('bound');
  });

  it('sets description to "active" when terminal is active but not bound', () => {
    const items = [
      createMockTerminalQuickPickItem(createMockTerminal({ name: 'zsh' }), true, 'not-bound'),
    ];

    const result = buildTerminalPickerItems(items, identityLabel);

    expect(result[0].description).toBe('active');
  });

  it('sets description to undefined when terminal is neither bound nor active', () => {
    const items = [
      createMockTerminalQuickPickItem(createMockTerminal({ name: 'zsh' }), false, 'not-bound'),
    ];

    const result = buildTerminalPickerItems(items, identityLabel);

    expect(result[0].description).toBeUndefined();
  });

  it('sets description to undefined when boundState is absent and not active', () => {
    const items = [createMockTerminalQuickPickItem(createMockTerminal({ name: 'zsh' }))];

    const result = buildTerminalPickerItems(items, identityLabel);

    expect(result[0].description).toBeUndefined();
  });

  it('sets description to "active" when boundState is absent but active', () => {
    const items = [createMockTerminalQuickPickItem(createMockTerminal({ name: 'zsh' }), true)];

    const result = buildTerminalPickerItems(items, identityLabel);

    expect(result[0].description).toBe('active');
  });

  it('applies label builder to each item', () => {
    const items = [
      createMockTerminalQuickPickItem(createMockTerminal({ name: 'bash' })),
      createMockTerminalQuickPickItem(createMockTerminal({ name: 'zsh' })),
    ];

    const result = buildTerminalPickerItems(items, (info) => `prefix-${info.name}`);

    expect(result[0].label).toBe('prefix-bash');
    expect(result[1].label).toBe('prefix-zsh');
  });

  it('propagates boundState to output items', () => {
    const items = [
      createMockTerminalQuickPickItem(createMockTerminal({ name: 'bash' }), false, 'bound'),
      createMockTerminalQuickPickItem(createMockTerminal({ name: 'zsh' }), false, 'not-bound'),
    ];

    const result = buildTerminalPickerItems(items, identityLabel);

    expect(result[0].boundState).toBe('bound');
    expect(result[1].boundState).toBe('not-bound');
  });

  it('returns complete item structure', () => {
    const terminal = createMockTerminal({ name: 'bash' });
    const items = [createMockTerminalQuickPickItem(terminal, true, 'bound')];

    const result = buildTerminalPickerItems(items, identityLabel);

    expect(result).toStrictEqual([
      {
        label: 'bash',
        description: 'bound \u00b7 active',
        displayName: 'bash',
        bindOptions: { kind: 'terminal', terminal },
        itemKind: 'bindable',
        isActive: true,
        boundState: 'bound',
        terminalInfo: { terminal, name: 'bash', isActive: true, boundState: 'bound' },
      },
    ]);
  });
});
