// Lightweight fetch wrapper.

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: any) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: any): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: "include",
    headers: body instanceof FormData ? {} : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  };
  const r = await fetch(url, init);
  const ct = r.headers.get("content-type") ?? "";
  const data = ct.includes("application/json") ? await r.json() : await r.text();
  if (!r.ok) {
    throw new ApiError(r.status, (data && (data.error || data.message)) || r.statusText, data);
  }
  return data as T;
}

export const api = {
  get: <T>(u: string) => request<T>("GET", u),
  post: <T>(u: string, b?: any) => request<T>("POST", u, b),
  patch: <T>(u: string, b?: any) => request<T>("PATCH", u, b),
  put: <T>(u: string, b?: any) => request<T>("PUT", u, b),
  del: <T>(u: string) => request<T>("DELETE", u),
  delete: <T>(u: string) => request<T>("DELETE", u),
};
