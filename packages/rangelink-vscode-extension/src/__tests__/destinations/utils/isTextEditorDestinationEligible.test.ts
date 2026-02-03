import { isTextEditorDestinationEligible } from '../../../destinations/utils';
import {
  createEditorWithScheme,
  createMockTabGroupsWithCount,
  createMockVscodeAdapter,
} from '../../helpers';

describe('isTextEditorDestinationEligible', () => {
  describe('eligible scenarios', () => {
    it('returns eligible with filename when all conditions are met', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createEditorWithScheme('/workspace/src/auth.ts'),
          tabGroups: createMockTabGroupsWithCount(2),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: true,
        filename: 'auth.ts',
        ineligibleReason: undefined,
      });
    });

    it('returns eligible with single tab group (no split required)', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createEditorWithScheme('/project/index.js'),
          tabGroups: createMockTabGroupsWithCount(1),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: true,
        filename: 'index.js',
        ineligibleReason: undefined,
      });
    });

    it('returns "Unknown" filename when fsPath has no filename component', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createEditorWithScheme('/'),
          tabGroups: createMockTabGroupsWithCount(2),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: true,
        filename: 'Unknown',
        ineligibleReason: undefined,
      });
    });

    it('returns eligible for untitled files', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createEditorWithScheme('Untitled-1', 'untitled'),
          tabGroups: createMockTabGroupsWithCount(2),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: true,
        filename: 'Untitled-1',
        ineligibleReason: undefined,
      });
    });
  });

  describe('ineligible: no editor', () => {
    it('returns ineligible with reason no-editor when activeTextEditor is undefined', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: undefined,
          tabGroups: createMockTabGroupsWithCount(2),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: false,
        filename: undefined,
        ineligibleReason: 'no-editor',
      });
    });
  });

  describe('ineligible: read-only scheme', () => {
    it('returns ineligible with reason read-only for git scheme', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createEditorWithScheme('/repo/file.ts', 'git'),
          tabGroups: createMockTabGroupsWithCount(2),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: false,
        filename: undefined,
        ineligibleReason: 'read-only',
      });
    });

    it('returns ineligible with reason read-only for output scheme', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createEditorWithScheme('/output/channel', 'output'),
          tabGroups: createMockTabGroupsWithCount(2),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: false,
        filename: undefined,
        ineligibleReason: 'read-only',
      });
    });

    it('returns ineligible with reason read-only for vscode-settings scheme', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createEditorWithScheme('/settings', 'vscode-settings'),
          tabGroups: createMockTabGroupsWithCount(2),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: false,
        filename: undefined,
        ineligibleReason: 'read-only',
      });
    });
  });

  describe('ineligible: binary file', () => {
    it('returns ineligible with reason binary-file for .png files', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createEditorWithScheme('/project/logo.png'),
          tabGroups: createMockTabGroupsWithCount(2),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: false,
        filename: undefined,
        ineligibleReason: 'binary-file',
      });
    });

    it('returns ineligible with reason binary-file for .pdf files', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createEditorWithScheme('/project/document.pdf'),
          tabGroups: createMockTabGroupsWithCount(2),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: false,
        filename: undefined,
        ineligibleReason: 'binary-file',
      });
    });

    it('returns ineligible with reason binary-file for .exe files', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createEditorWithScheme('/project/app.exe'),
          tabGroups: createMockTabGroupsWithCount(2),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: false,
        filename: undefined,
        ineligibleReason: 'binary-file',
      });
    });
  });

  describe('priority of reasons', () => {
    it('returns no-editor before checking other conditions', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: undefined,
          tabGroups: createMockTabGroupsWithCount(1),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: false,
        filename: undefined,
        ineligibleReason: 'no-editor',
      });
    });

    it('returns read-only before checking binary-file when both apply', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: createEditorWithScheme('/repo/image.png', 'git'),
          tabGroups: createMockTabGroupsWithCount(2),
        },
      });

      expect(isTextEditorDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: false,
        filename: undefined,
        ineligibleReason: 'read-only',
      });
    });
  });
});
