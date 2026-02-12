import * as showTerminalPickerModule from '../../destinations/utils/showTerminalPicker';

export const spyOnShowTerminalPicker = (): jest.SpyInstance =>
  jest.spyOn(showTerminalPickerModule, 'showTerminalPicker');
