import { MessageCode } from '../../types';

export interface DirtyBufferMessageCodes {
  warning: MessageCode;
  save: MessageCode;
  continueAnyway: MessageCode;
  saveFailed: MessageCode;
}

export const LINK_DIRTY_BUFFER_CODES: DirtyBufferMessageCodes = {
  warning: MessageCode.WARN_LINK_DIRTY_BUFFER,
  save: MessageCode.WARN_LINK_DIRTY_BUFFER_SAVE,
  continueAnyway: MessageCode.WARN_LINK_DIRTY_BUFFER_CONTINUE,
  saveFailed: MessageCode.WARN_LINK_DIRTY_BUFFER_SAVE_FAILED,
};

export const FILE_PATH_DIRTY_BUFFER_CODES: DirtyBufferMessageCodes = {
  warning: MessageCode.WARN_FILE_PATH_DIRTY_BUFFER,
  save: MessageCode.WARN_FILE_PATH_DIRTY_BUFFER_SAVE,
  continueAnyway: MessageCode.WARN_FILE_PATH_DIRTY_BUFFER_CONTINUE,
  saveFailed: MessageCode.WARN_FILE_PATH_DIRTY_BUFFER_SAVE_FAILED,
};
