const IMPORT_FILE_VERSION = 1;
const IMPORT_FORMAT_NAME = 'dexie';
const REQUIRED_TABLES = ['wallets', 'accounts2', 'notifications', 'contacts'];
const OPTIONAL_TABLES = ['connections'];
const IMPORT_TABLES = [...REQUIRED_TABLES, ...OPTIONAL_TABLES];

export function isFileValid(fileContent: string): boolean {
  if (!fileContent) return false;

  const jsonData = JSON.parse(fileContent);
  const tables = jsonData.data?.tables || [];

  const isTablesValid = IMPORT_TABLES.every((tableName) => {
    return tables.find((table: { name: string }) => table.name === tableName) !== undefined;
  });

  const hasRequiredTables = REQUIRED_TABLES.every((requiredTable) =>
    tables.some((table: { name: string }) => table.name === requiredTable),
  );

  return (
    hasRequiredTables &&
    isTablesValid &&
    jsonData.formatVersion === IMPORT_FILE_VERSION &&
    jsonData.formatName === IMPORT_FORMAT_NAME
  );
}
