import * as isCursorIDEDetectedModule from '../../utils/aiAssistants/isCursorIDEDetected';

export const spyOnIsCursorIDEDetected = (): jest.SpyInstance =>
  jest.spyOn(isCursorIDEDetectedModule, 'isCursorIDEDetected');
