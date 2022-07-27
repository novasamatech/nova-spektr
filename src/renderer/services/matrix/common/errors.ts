import { ErrorObject, Errors } from './types';

const MATRIX_ERRORS: Record<Errors, ErrorObject> = {
  [Errors.OLM_FAILED]: {
    code: Errors.OLM_FAILED,
    message: 'Olm failed',
  },
  [Errors.ENCRYPTION_STARTED]: {
    code: Errors.ENCRYPTION_STARTED,
    message: 'Encryption has already been initialized',
  },
  [Errors.ENCRYPTION_NOT_STARTED]: {
    code: Errors.ENCRYPTION_NOT_STARTED,
    message: 'Encryption has not been initialized',
  },
  [Errors.IS_LOGGED_IN]: {
    code: Errors.IS_LOGGED_IN,
    message: 'Client is already logged in',
  },
  [Errors.NOT_LOGGED_IN]: {
    code: Errors.NOT_LOGGED_IN,
    message: 'Client is not logged in',
  },
  [Errors.WRONG_HOMESERVER]: {
    code: Errors.WRONG_HOMESERVER,
    message: 'Wrong homeserver URL',
  },
  [Errors.REGISTRATION]: {
    code: Errors.REGISTRATION,
    message: 'Registration failed',
  },
  [Errors.KEY_VERIFICATION]: {
    code: Errors.KEY_VERIFICATION,
    message: 'Verification with security key failed',
  },
  [Errors.PHRASE_VERIFICATION]: {
    code: Errors.PHRASE_VERIFICATION,
    message: 'Verification with security phrase failed',
  },
  [Errors.LOGOUT]: {
    code: Errors.LOGOUT,
    message: 'Logout failed',
  },
  [Errors.LOGIN_CREDS]: {
    code: Errors.LOGIN_CREDS,
    message: 'Login with credentials failed',
  },
  [Errors.LOGIN_CACHE]: {
    code: Errors.LOGIN_CACHE,
    message: 'Login from cache failed',
  },
  [Errors.NO_CREDS_IN_DB]: {
    code: Errors.NO_CREDS_IN_DB,
    message: 'No credentials in DataBase',
  },
  [Errors.START_ROOM]: {
    code: Errors.START_ROOM,
    message: 'Start room creation failed',
  },
  [Errors.FINISH_ROOM]: {
    code: Errors.FINISH_ROOM,
    message: 'Finish room creation failed',
  },
  [Errors.LEAVE_ROOM]: {
    code: Errors.LEAVE_ROOM,
    message: 'Failed to leave room',
  },
  [Errors.JOIN_ROOM]: {
    code: Errors.JOIN_ROOM,
    message: 'Failed to join room',
  },
  [Errors.INVITE_IN_ROOM]: {
    code: Errors.INVITE_IN_ROOM,
    message: 'Failed to invite in room',
  },
  [Errors.JOINED_ROOMS]: {
    code: Errors.JOINED_ROOMS,
    message: 'Failed to load joined rooms',
  },
  [Errors.MESSAGE]: {
    code: Errors.MESSAGE,
    message: 'Message not sent',
  },
  [Errors.MARK_AS_READ]: {
    code: Errors.MARK_AS_READ,
    message: 'Mark as read failed',
  },
  [Errors.MST_INIT]: {
    code: Errors.MST_INIT,
    message: 'Mst init failed',
  },
  [Errors.MST_APPROVE]: {
    code: Errors.MST_APPROVE,
    message: 'Mst approve failed',
  },
  [Errors.MST_FINAL_APPROVE]: {
    code: Errors.MST_FINAL_APPROVE,
    message: 'Mst final approve failed',
  },
  [Errors.MST_CANCEL]: {
    code: Errors.MST_CANCEL,
    message: 'Mst cancel failder',
  },
  [Errors.ROOM_ENCRYPTION]: {
    code: Errors.ROOM_ENCRYPTION,
    message: 'Failed activating room encryption',
  },
  [Errors.ROOM_TOPIC]: {
    code: Errors.ROOM_TOPIC,
    message: "Failed setting room's topic",
  },
  [Errors.OUTSIDE_ROOM]: {
    code: Errors.OUTSIDE_ROOM,
    message: 'Matrix client is outside of room',
  },
  [Errors.INVITE_USERS]: {
    code: Errors.INVITE_USERS,
    message: 'Could not invite users',
  },
  [Errors.MEMBERS_VERIFICATION]: {
    code: Errors.MEMBERS_VERIFICATION,
    message: 'Could not verify members devices in room',
  },
  [Errors.READ_TIMELINE]: {
    code: Errors.READ_TIMELINE,
    message: 'Failed to read the timeline',
  },
};

export default MATRIX_ERRORS;
