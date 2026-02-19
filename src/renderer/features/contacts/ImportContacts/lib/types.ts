export type AccountIdConflict = {
  imported: { name: string; address: string; accountId: string };
  existing: { id: string; name: string; address: string; accountId: string };
};
