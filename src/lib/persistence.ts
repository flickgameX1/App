/**
 * Everything lives in this browser, so it is worth asking the browser to keep
 * it. Without a persistence grant, storage is "best-effort" and can be cleared
 * under pressure; on iOS, script-writable storage for a site you have not
 * installed to the home screen is dropped after seven days of not visiting.
 */
export type StorageState = 'persistent' | 'best-effort' | 'unknown';

export async function requestPersistence(): Promise<StorageState> {
  if (!navigator.storage?.persist) return 'unknown';
  try {
    // Already granted? Asking again just returns true.
    if (await navigator.storage.persisted?.()) return 'persistent';
    return (await navigator.storage.persist()) ? 'persistent' : 'best-effort';
  } catch {
    return 'unknown';
  }
}

export async function storageState(): Promise<StorageState> {
  if (!navigator.storage?.persisted) return 'unknown';
  try {
    return (await navigator.storage.persisted()) ? 'persistent' : 'best-effort';
  } catch {
    return 'unknown';
  }
}
