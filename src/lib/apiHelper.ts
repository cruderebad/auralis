/**
 * Safe fetch helper that guarantees graceful JSON parsing and robust error handling.
 * Prevents "Unexpected token '<', '<!doctype '... is not valid JSON" errors.
 */

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);
  const text = await res.text();

  let data: any = null;
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      // Response was not JSON
      if (text.includes('<!doctype') || text.includes('<html') || text.includes('<head>')) {
        throw new Error(
          `Server error (${res.status}): The server returned an HTML page instead of JSON. Please check backend service status.`
        );
      }
      if (!res.ok) {
        throw new Error(`Server error (${res.status}): ${text.substring(0, 150)}`);
      }
      throw new Error(
        `Invalid server response format (${res.status}). Expected JSON.`
      );
    }
  }

  if (!res.ok) {
    const errorMsg =
      data?.error ||
      data?.message ||
      `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return (data ?? {}) as T;
}
