/**
 * Logs technical backend/API errors cleanly to console while returning
 * safe, user-friendly UI error messages (never leaking raw DB/SQL/RPC errors).
 */
export function logAndGetFriendlyError(
  err: unknown,
  fallbackMessage = 'Something went wrong. Please try again.',
  context = 'Admin'
): string {
  console.error(`[${context}] Error details:`, err);

  const msg =
    typeof err === 'string'
      ? err
      : (err as any)?.message || '';

  const lower = msg.toLowerCase();

  if (lower.includes('session expired') || lower.includes('invalid or expired session')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('abort')) {
    return 'Network connection error. Please check your internet and try again.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials.';
  }

  return fallbackMessage;
}
