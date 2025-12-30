import { isTextEditorDestinationEligible } from '../../../destinations/utils';
import { createMockVscodeAdapter } from '../../helpers';

describe('isTextEditorDestinationEligible', () => {
  const createMockEditor = () => ({ document: { uri: { fsPath: '/test.ts' } } }) as any;
  const createMockTabGroups = (count: number) => ({
    all: Array(count).fill({ tabs: [] }),
    activeTabGroup: undefined,
    onDidChangeTabGroups: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeTabs: jest.fn(() => ({ dispose: jest.fn() })),
    close: jest.fn(),
  });

  it('returns true when activeTextEditor exists and tabGroupCount >= 2', () => {
    const ideAdapter = createMockVscodeAdapter({
      windowOptions: {
        activeTextEditor: createMockEditor(),
        tabGroups: createMockTabGroups(2),
      },
    });

    expect(isTextEditorDestinationEligible(ideAdapter)).toBe(true);
  });

  it('returns true when tabGroupCount > 2', () => {
    const ideAdapter = createMockVscodeAdapter({
      windowOptions: {
        activeTextEditor: createMockEditor(),
        tabGroups: createMockTabGroups(3),
      },
    });

    expect(isTextEditorDestinationEligible(ideAdapter)).toBe(true);
  });

  it('returns false when activeTextEditor is undefined', () => {
    const ideAdapter = createMockVscodeAdapter({
      windowOptions: {
        activeTextEditor: undefined,
        tabGroups: createMockTabGroups(2),
      },
    });

    expect(isTextEditorDestinationEligible(ideAdapter)).toBe(false);
  });

  it('returns false when tabGroupCount < 2', () => {
    const ideAdapter = createMockVscodeAdapter({
      windowOptions: {
        activeTextEditor: createMockEditor(),
        tabGroups: createMockTabGroups(1),
      },
    });

    expect(isTextEditorDestinationEligible(ideAdapter)).toBe(false);
  });

  it('returns false when tabGroupCount is 0', () => {
    const ideAdapter = createMockVscodeAdapter({
      windowOptions: {
        activeTextEditor: createMockEditor(),
        tabGroups: createMockTabGroups(0),
      },
    });

    expect(isTextEditorDestinationEligible(ideAdapter)).toBe(false);
  });

  it('returns false when both conditions are not met', () => {
    const ideAdapter = createMockVscodeAdapter({
      windowOptions: {
        activeTextEditor: undefined,
        tabGroups: createMockTabGroups(1),
      },
    });

    expect(isTextEditorDestinationEligible(ideAdapter)).toBe(false);
  });
});
