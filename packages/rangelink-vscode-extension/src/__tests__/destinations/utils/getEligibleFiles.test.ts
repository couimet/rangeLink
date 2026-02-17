import * as vscode from 'vscode';

import { getEligibleFiles } from '../../../destinations/utils';
import {
  createMockTab,
  createMockTabGroup,
  createMockUri,
  createMockVscodeAdapter,
} from '../../helpers';

const createNonTextTab = (): vscode.Tab => ({ input: { uri: undefined } }) as unknown as vscode.Tab;

describe('getEligibleFiles', () => {
  let uri: vscode.Uri;
  let tab: vscode.Tab;
  let group: vscode.TabGroup;

  beforeEach(() => {
    uri = createMockUri('/workspace/src/app.ts');
    tab = createMockTab(uri);
    group = createMockTabGroup([tab]);
  });

  it('returns eligible files from a single tab group', () => {
    const adapter = createMockVscodeAdapter({
      windowOptions: { tabGroups: { all: [group] } },
    });

    const result = getEligibleFiles(adapter);

    expect(result).toHaveLength(1);
    expect(result[0]).toStrictEqual({
      uri,
      filename: 'app.ts',
      tabGroupIndex: 1,
      isCurrentInGroup: true,
      isActiveEditor: false,
    });
  });

  it('returns files from multiple tab groups with correct 1-based indices', () => {
    const uri2 = createMockUri('/workspace/src/utils.ts');
    const tab2 = createMockTab(uri2);
    const group2 = createMockTabGroup([tab2]);
    const adapter = createMockVscodeAdapter({
      windowOptions: { tabGroups: { all: [group, group2] } },
    });

    const result = getEligibleFiles(adapter);

    expect(result).toStrictEqual([
      {
        uri,
        filename: 'app.ts',
        tabGroupIndex: 1,
        isCurrentInGroup: true,
        isActiveEditor: false,
      },
      {
        uri: uri2,
        filename: 'utils.ts',
        tabGroupIndex: 2,
        isCurrentInGroup: true,
        isActiveEditor: false,
      },
    ]);
  });

  it('filters out non-text-editor tabs', () => {
    const nonTextTab = createNonTextTab();
    group = createMockTabGroup([tab, nonTextTab]);
    const adapter = createMockVscodeAdapter({
      windowOptions: { tabGroups: { all: [group] } },
    });

    const result = getEligibleFiles(adapter);

    expect(result).toStrictEqual([
      {
        uri,
        filename: 'app.ts',
        tabGroupIndex: 1,
        isCurrentInGroup: true,
        isActiveEditor: false,
      },
    ]);
  });

  it('filters out binary files', () => {
    const pngUri = createMockUri('/workspace/assets/logo.png');
    const pngTab = createMockTab(pngUri);
    group = createMockTabGroup([tab, pngTab]);
    const adapter = createMockVscodeAdapter({
      windowOptions: { tabGroups: { all: [group] } },
    });

    const result = getEligibleFiles(adapter);

    expect(result).toStrictEqual([
      {
        uri,
        filename: 'app.ts',
        tabGroupIndex: 1,
        isCurrentInGroup: true,
        isActiveEditor: false,
      },
    ]);
  });

  it('filters out read-only scheme tabs', () => {
    const gitUri = createMockUri('/workspace/src/app.ts', { scheme: 'git' });
    const gitTab = createMockTab(gitUri);
    group = createMockTabGroup([tab, gitTab]);
    const adapter = createMockVscodeAdapter({
      windowOptions: { tabGroups: { all: [group] } },
    });

    const result = getEligibleFiles(adapter);

    expect(result).toStrictEqual([
      {
        uri,
        filename: 'app.ts',
        tabGroupIndex: 1,
        isCurrentInGroup: true,
        isActiveEditor: false,
      },
    ]);
  });

  it('tracks isCurrentInGroup correctly', () => {
    const uri2 = createMockUri('/workspace/src/utils.ts');
    const tab2 = createMockTab(uri2);
    group = createMockTabGroup([tab, tab2], { activeTab: tab2 });
    const adapter = createMockVscodeAdapter({
      windowOptions: { tabGroups: { all: [group] } },
    });

    const result = getEligibleFiles(adapter);

    expect(result).toStrictEqual([
      {
        uri,
        filename: 'app.ts',
        tabGroupIndex: 1,
        isCurrentInGroup: false,
        isActiveEditor: false,
      },
      {
        uri: uri2,
        filename: 'utils.ts',
        tabGroupIndex: 1,
        isCurrentInGroup: true,
        isActiveEditor: false,
      },
    ]);
  });

  it('tracks isActiveEditor when active editor matches a tab', () => {
    const mockEditor = { document: { uri } } as unknown as vscode.TextEditor;
    const adapter = createMockVscodeAdapter({
      windowOptions: {
        activeTextEditor: mockEditor,
        tabGroups: { all: [group] },
      },
    });

    const result = getEligibleFiles(adapter);

    expect(result).toStrictEqual([
      {
        uri,
        filename: 'app.ts',
        tabGroupIndex: 1,
        isCurrentInGroup: true,
        isActiveEditor: true,
      },
    ]);
  });

  it('sets isActiveEditor to false when active editor does not match', () => {
    const otherUri = createMockUri('/workspace/src/other.ts');
    const mockEditor = { document: { uri: otherUri } } as unknown as vscode.TextEditor;
    const adapter = createMockVscodeAdapter({
      windowOptions: {
        activeTextEditor: mockEditor,
        tabGroups: { all: [group] },
      },
    });

    const result = getEligibleFiles(adapter);

    expect(result).toStrictEqual([
      {
        uri,
        filename: 'app.ts',
        tabGroupIndex: 1,
        isCurrentInGroup: true,
        isActiveEditor: false,
      },
    ]);
  });

  it('sets isActiveEditor to false when no active editor', () => {
    const adapter = createMockVscodeAdapter({
      windowOptions: { tabGroups: { all: [group] } },
    });

    const result = getEligibleFiles(adapter);

    expect(result).toStrictEqual([
      {
        uri,
        filename: 'app.ts',
        tabGroupIndex: 1,
        isCurrentInGroup: true,
        isActiveEditor: false,
      },
    ]);
  });

  it('returns empty array for no tab groups', () => {
    const adapter = createMockVscodeAdapter({
      windowOptions: { tabGroups: { all: [] } },
    });

    const result = getEligibleFiles(adapter);

    expect(result).toStrictEqual([]);
  });

  it('returns empty array when all tabs are ineligible', () => {
    const pngUri = createMockUri('/workspace/logo.png');
    const gitUri = createMockUri('/workspace/src/app.ts', { scheme: 'git' });
    const pngTab = createMockTab(pngUri);
    const gitTab = createMockTab(gitUri);
    const nonTextTab = createNonTextTab();
    group = createMockTabGroup([pngTab, gitTab, nonTextTab]);
    const adapter = createMockVscodeAdapter({
      windowOptions: { tabGroups: { all: [group] } },
    });

    const result = getEligibleFiles(adapter);

    expect(result).toStrictEqual([]);
  });

  it('skips empty tab groups', () => {
    const emptyGroup = createMockTabGroup([]);
    const adapter = createMockVscodeAdapter({
      windowOptions: { tabGroups: { all: [emptyGroup, group] } },
    });

    const result = getEligibleFiles(adapter);

    expect(result).toStrictEqual([
      {
        uri,
        filename: 'app.ts',
        tabGroupIndex: 2,
        isCurrentInGroup: true,
        isActiveEditor: false,
      },
    ]);
  });
});
