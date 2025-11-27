export type AccountIdConflict = {
  imported: { name: string; address: string; accountId: string };
  existing: { id: number; name: string; address: string; accountId: string };
};
