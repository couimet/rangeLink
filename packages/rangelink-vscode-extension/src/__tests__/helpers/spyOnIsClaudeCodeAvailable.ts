import * as isClaudeCodeAvailableModule from '../../utils/aiAssistants/isClaudeCodeAvailable';

export const spyOnIsClaudeCodeAvailable = (): jest.SpyInstance =>
  jest.spyOn(isClaudeCodeAvailableModule, 'isClaudeCodeAvailable');
