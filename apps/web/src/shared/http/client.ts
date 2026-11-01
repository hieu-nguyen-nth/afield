export async function api<T>(
  path: string,
  body?: unknown,
  method = "POST",
  key?: string,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch("/api/v1/" + path, {
    signal,
    method: body === undefined ? "GET" : method,
    headers:
      body === undefined
        ? {}
        : {
            "Content-Type": "application/json",
            ...(key ? { "Idempotency-Key": key } : {}),
          },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error?.message || "This request could not complete.");
  return data as T;
}
