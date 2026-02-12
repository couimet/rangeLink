import * as toInputSelectionModule from '../../utils/toInputSelection';

export const spyOnToInputSelection = (): jest.SpyInstance =>
  jest.spyOn(toInputSelectionModule, 'toInputSelection');
