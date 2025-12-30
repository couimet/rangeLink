import { isTextEditorDestinationEligible } from '../../../destinations/utils';
import { createMockVscodeAdapter } from '../../helpers';

describe('isTextEditorDestinationEligible', () => {
  const createMockEditor = (fsPath = '/test/file.ts') =>
    ({ document: { uri: { fsPath } } }) as any;
  const createMockTabGroups = (count: number) => ({
    all: Array(count).fill({ tabs: [] }),
    activeTabGroup: undefined,
    onDidChangeTabGroups: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeTabs: jest.fn(() => ({ dispose: jest.fn() })),
    close: jest.fn(),
  });

  describe('eligible scenarios', () => {
    it('returns eligible with filename when activeTextEditor exists and tabGroupCount >= 2', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createMockEditor('/workspace/src/auth.ts'),
          tabGroups: createMockTabGroups(2),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: true,
        filename: 'auth.ts',
      });
    });

    it('returns eligible with filename when tabGroupCount > 2', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createMockEditor('/project/index.js'),
          tabGroups: createMockTabGroups(3),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: true,
        filename: 'index.js',
      });
    });

    it('returns "Unknown" filename when fsPath has no filename component', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createMockEditor('/'),
          tabGroups: createMockTabGroups(2),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: true,
        filename: 'Unknown',
      });
    });
  });

  describe('ineligible scenarios', () => {
    it('returns ineligible with undefined filename when activeTextEditor is undefined', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: undefined,
          tabGroups: createMockTabGroups(2),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: false,
        filename: undefined,
      });
    });

    it('returns ineligible with undefined filename when tabGroupCount < 2', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createMockEditor(),
          tabGroups: createMockTabGroups(1),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: false,
        filename: undefined,
      });
    });

    it('returns ineligible with undefined filename when tabGroupCount is 0', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createMockEditor(),
          tabGroups: createMockTabGroups(0),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: false,
        filename: undefined,
      });
    });

    it('returns ineligible with undefined filename when both conditions are not met', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: undefined,
          tabGroups: createMockTabGroups(1),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: false,
        filename: undefined,
      });
    });
  });
});
