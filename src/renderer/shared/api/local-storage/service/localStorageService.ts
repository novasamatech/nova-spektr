export const localStorageService = {
  getFromStorage,
  saveToStorage,
};

function getFromStorage<T>(key: string, defaultValue: T): T {
  const storageItem = localStorage.getItem(key);

  if (!storageItem) return defaultValue;

  try {
    return storageItem ? JSON.parse(storageItem) : defaultValue;
  } catch {
    console.error(`🔸LocalStorageService - Could not retrieve item by key - ${key}`);

    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): T {
  localStorage.setItem(key, JSON.stringify(value));

  return value;
}
