/** Log and return a fallback when an admin data query fails. */
export async function adminQuery<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[admin] ${label}:`, e);
    return fallback;
  }
}