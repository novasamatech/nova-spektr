import { type ErrorObject, MatrixError } from './types';

const MATRIX_ERRORS: Record<MatrixError, ErrorObject> = {
  [MatrixError.OLM_FAILED]: {
    code: MatrixError.OLM_FAILED,
    message: 'Olm failed',
  },
  [MatrixError.ENCRYPTION_STARTED]: {
    code: MatrixError.ENCRYPTION_STARTED,
    message: 'Encryption has already been initialized',
  },
  [MatrixError.ENCRYPTION_NOT_STARTED]: {
    code: MatrixError.ENCRYPTION_NOT_STARTED,
    message: 'Encryption has not been initialized',
  },
  [MatrixError.IS_LOGGED_IN]: {
    code: MatrixError.IS_LOGGED_IN,
    message: 'Client is already logged in',
  },
  [MatrixError.CREATE_MATRIX_CLIENT]: {
    code: MatrixError.CREATE_MATRIX_CLIENT,
    message: 'Error while creating matrix client',
  },
  [MatrixError.INIT_WITH_CREDENTIALS]: {
    code: MatrixError.INIT_WITH_CREDENTIALS,
    message: 'Failed to init client with credentials',
  },
  [MatrixError.INIT_WITH_SSO]: {
    code: MatrixError.INIT_WITH_SSO,
    message: 'Failed to init client with sso',
  },
  [MatrixError.NOT_LOGGED_IN]: {
    code: MatrixError.NOT_LOGGED_IN,
    message: 'Client is not logged in',
  },
  [MatrixError.WRONG_HOMESERVER]: {
    code: MatrixError.WRONG_HOMESERVER,
    message: 'Wrong homeserver URL',
  },
  [MatrixError.REGISTRATION]: {
    code: MatrixError.REGISTRATION,
    message: 'Registration failed',
  },
  [MatrixError.KEY_VERIFICATION]: {
    code: MatrixError.KEY_VERIFICATION,
    message: 'Verification with security key failed',
  },
  [MatrixError.FILE_VERIFICATION]: {
    code: MatrixError.FILE_VERIFICATION,
    message: 'Verification with security file failed',
  },
  [MatrixError.PHRASE_VERIFICATION]: {
    code: MatrixError.PHRASE_VERIFICATION,
    message: 'Verification with security phrase failed',
  },
  [MatrixError.LOGOUT]: {
    code: MatrixError.LOGOUT,
    message: 'Logout failed',
  },
  [MatrixError.LOGIN_CREDS]: {
    code: MatrixError.LOGIN_CREDS,
    message: 'Login with credentials failed',
  },
  [MatrixError.LOGIN_FLOWS]: {
    code: MatrixError.LOGIN_FLOWS,
    message: 'Failed getting available login methods',
  },
  [MatrixError.LOGIN_CACHE]: {
    code: MatrixError.LOGIN_CACHE,
    message: 'Login from cache failed',
  },
  [MatrixError.NO_CREDS_IN_DB]: {
    code: MatrixError.NO_CREDS_IN_DB,
    message: 'No credentials in DataBase',
  },
  [MatrixError.CREATE_ROOM]: {
    code: MatrixError.CREATE_ROOM,
    message: 'Room creation failed',
  },
  [MatrixError.LEAVE_ROOM]: {
    code: MatrixError.LEAVE_ROOM,
    message: 'Failed to leave room',
  },
  [MatrixError.JOIN_ROOM]: {
    code: MatrixError.JOIN_ROOM,
    message: 'Failed to join room',
  },
  [MatrixError.INVITE_IN_ROOM]: {
    code: MatrixError.INVITE_IN_ROOM,
    message: 'Failed to invite in room',
  },
  [MatrixError.JOINED_ROOMS]: {
    code: MatrixError.JOINED_ROOMS,
    message: 'Failed to load joined rooms',
  },
  [MatrixError.MESSAGE]: {
    code: MatrixError.MESSAGE,
    message: 'Message not sent',
  },
  [MatrixError.MARK_AS_READ]: {
    code: MatrixError.MARK_AS_READ,
    message: 'Mark as read failed',
  },
  [MatrixError.MST_UPDATE]: {
    code: MatrixError.MST_UPDATE,
    message: 'Mst update failed',
  },
  [MatrixError.MST_APPROVE]: {
    code: MatrixError.MST_APPROVE,
    message: 'Mst approve failed',
  },
  [MatrixError.MST_FINAL_APPROVE]: {
    code: MatrixError.MST_FINAL_APPROVE,
    message: 'Mst final approve failed',
  },
  [MatrixError.MST_CANCEL]: {
    code: MatrixError.MST_CANCEL,
    message: 'Mst cancel failder',
  },
  [MatrixError.ROOM_ENCRYPTION]: {
    code: MatrixError.ROOM_ENCRYPTION,
    message: 'Failed activating room encryption',
  },
  [MatrixError.ROOM_TOPIC]: {
    code: MatrixError.ROOM_TOPIC,
    message: "Failed setting room's topic",
  },
  [MatrixError.OUTSIDE_ROOM]: {
    code: MatrixError.OUTSIDE_ROOM,
    message: 'Matrix client is outside of room',
  },
  [MatrixError.INVITE_USERS]: {
    code: MatrixError.INVITE_USERS,
    message: 'Could not invite users',
  },
  [MatrixError.MEMBERS_VERIFICATION]: {
    code: MatrixError.MEMBERS_VERIFICATION,
    message: 'Could not verify members devices in room',
  },
  [MatrixError.VERIFY_FILE_MAX_SIZE]: {
    code: MatrixError.VERIFY_FILE_MAX_SIZE,
    message: 'File exceeded max size limit',
  },
  [MatrixError.READ_VERIFY_FILE]: {
    code: MatrixError.READ_VERIFY_FILE,
    message: 'Failed to read verification file',
  },
  [MatrixError.VERIFY_FILE_BAD_CONTENT]: {
    code: MatrixError.VERIFY_FILE_BAD_CONTENT,
    message: 'Verification file has bad content',
  },
  [MatrixError.TIMELINE_PAGINATION]: {
    code: MatrixError.TIMELINE_PAGINATION,
    message: 'Paginating timeline failed',
  },
};

export default MATRIX_ERRORS;
