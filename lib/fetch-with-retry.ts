/**
 * Fetch utility with automatic retry for transient failures
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number; // Base delay in ms
  retryOn?: number[]; // HTTP status codes to retry on
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  retryOn: [408, 429, 500, 502, 503, 504], // Timeout, rate limit, server errors
};

/**
 * Fetch with automatic retry on transient failures
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries!; attempt++) {
    try {
      const response = await fetch(url, init);

      // If response is OK or not a retryable status, return it
      if (response.ok || !opts.retryOn!.includes(response.status)) {
        return response;
      }

      // If it's a retryable status and we have retries left
      if (attempt < opts.maxRetries!) {
        const delay = opts.retryDelay! * Math.pow(2, attempt); // Exponential backoff
        opts.onRetry?.(attempt + 1, new Error(`HTTP ${response.status}`));
        await sleep(delay);
        continue;
      }

      // No retries left, return the response as-is
      return response;
    } catch (error) {
      lastError = error as Error;

      // Network errors are always retryable
      if (attempt < opts.maxRetries!) {
        const delay = opts.retryDelay! * Math.pow(2, attempt);
        opts.onRetry?.(attempt + 1, lastError);
        await sleep(delay);
        continue;
      }

      throw lastError;
    }
  }

  // Should not reach here, but just in case
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Convenience wrapper for JSON API calls
 */
export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<T> {
  const response = await fetchWithRetry(url, init, options);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * POST JSON with retry
 */
export async function postJson<T>(
  url: string,
  body: unknown,
  options?: RetryOptions
): Promise<T> {
  return fetchJson<T>(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    options
  );
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

