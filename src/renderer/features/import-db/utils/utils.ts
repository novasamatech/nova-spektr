const IMPORT_FILE_VERSION = 1;
const IMPORT_FORMAT_NAME = 'dexie';
const IMPORT_TABLES = [
  'wallets',
  'accounts',
  'accounts2',
  'notifications',
  'contacts',
  'multisigTransactions',
  'multisigEvents',
];

export function isFileValid(fileContent: string): boolean {
  if (!fileContent) return false;

  const jsonData = JSON.parse(fileContent);
  const tables = jsonData.data?.tables || [];

  const isTablesValid = tables.every((table: { name: string }) => {
    return IMPORT_TABLES.includes(table.name);
  });

  return (
    tables.length === IMPORT_TABLES.length &&
    isTablesValid &&
    jsonData.formatVersion === IMPORT_FILE_VERSION &&
    jsonData.formatName === IMPORT_FORMAT_NAME
  );
}
