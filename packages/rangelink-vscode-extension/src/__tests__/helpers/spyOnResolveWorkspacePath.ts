import * as resolveWorkspacePathModule from '../../utils/resolveWorkspacePath';

export const spyOnResolveWorkspacePath = (): jest.SpyInstance =>
  jest.spyOn(resolveWorkspacePathModule, 'resolveWorkspacePath');
