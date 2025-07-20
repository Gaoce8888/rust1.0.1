const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const setItem = (key: string, value: any): void => {
  if (!isLocalStorageAvailable()) {
    console.warn('LocalStorage is not available');
    return;
  }

  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error(`Error setting item ${key} in localStorage:`, error);
  }
};

export const getItem = <T = any>(key: string): T | null => {
  if (!isLocalStorageAvailable()) {
    console.warn('LocalStorage is not available');
    return null;
  }

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error getting item ${key} from localStorage:`, error);
    return null;
  }
};

export const removeItem = (key: string): void => {
  if (!isLocalStorageAvailable()) {
    console.warn('LocalStorage is not available');
    return;
  }

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing item ${key} from localStorage:`, error);
  }
};

export const clear = (): void => {
  if (!isLocalStorageAvailable()) {
    console.warn('LocalStorage is not available');
    return;
  }

  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};