import * as showFilePickerModule from '../../destinations/utils/showFilePicker';

export const spyOnShowFilePicker = (): jest.SpyInstance =>
  jest.spyOn(showFilePickerModule, 'showFilePicker');
