export const PERMISSIONS = {
  ADDRESS_BOOK_READ: 'address-book:read',
  ADDRESS_BOOK_WRITE: 'address-book:write',
  ADDRESS_BOOK_DELETE: 'address-book:delete',
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  OPERATION_DRAFT_READ: 'operation-draft:read',
  OPERATION_DRAFT_WRITE: 'operation-draft:write',
  OPERATION_DRAFT_DELETE: 'operation-draft:delete',
  OPERATION_READ: 'operation:read',
  OPERATION_WRITE: 'operation:write',
  OPERATION_DELETE: 'operation:delete',
  APP_SUPERADMIN: 'app:superadmin',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
