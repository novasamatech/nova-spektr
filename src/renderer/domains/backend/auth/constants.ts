// Mirrors `packages/backend/src/auth/constants.ts` in address-book-backend.
// The dedicated `:delete` permissions were removed there (RemoveDeletePermissions
// migration) — destructive endpoints are write-gated now.
export const PERMISSIONS = {
  ADDRESS_BOOK_READ: 'address-book:read',
  ADDRESS_BOOK_WRITE: 'address-book:write',
  ADDRESS_BOOK_READ_ALL: 'address-book:read-all',
  ADDRESS_BOOK_WRITE_ALL: 'address-book:write-all',
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  OPERATION_DRAFT_READ: 'operation-draft:read',
  OPERATION_DRAFT_READ_ALL: 'operation-draft:read-all',
  OPERATION_DRAFT_WRITE: 'operation-draft:write',
  OPERATION_DRAFT_WRITE_ALL: 'operation-draft:write-all',
  OPERATION_READ: 'operation:read',
  OPERATION_READ_ALL: 'operation:read-all',
  OPERATION_WRITE: 'operation:write',
  OPERATION_WRITE_ALL: 'operation:write-all',
  AUDIT_LOGS_READ: 'audit-logs:read',
  APP_ADMIN_PORTAL: 'app:admin-portal',
  APP_MATRIX_BOT: 'app:matrix-bot',
  APP_SUPERADMIN: 'app:superadmin',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
