const THREAD_ID_COOKIE_NAME = "ag_ui_thread_id";

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const val = c.substring(nameEQ.length, c.length);
      console.log(`[Session] Found cookie ${name}=${val}`);
      return val;
    }
  }
  console.log(`[Session] Cookie ${name} not found`);
  return null;
}

export function setCookie(name: string, value: string, days?: number): void {
  if (typeof document === "undefined") return;
  console.log(`[Session] Setting cookie ${name}=${value} for ${days} days`);
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; expires=${date.toUTCString()}`;
  }
  // biome-ignore lint/suspicious/noDocumentCookie: cookie synchronization is required for tracking chat thread sessions
  document.cookie = `${name}=${value || ""}${expires}; path=/`;
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  // biome-ignore lint/suspicious/noDocumentCookie: cookie deletion is required for clearing chat thread sessions
  document.cookie = `${name}=; Max-Age=-99999999; path=/`;
}

export function getOrRetrieveThreadId(): string {
  let threadId = getCookie(THREAD_ID_COOKIE_NAME);
  if (!threadId) {
    threadId = crypto.randomUUID();
    setCookie(THREAD_ID_COOKIE_NAME, threadId, 30); // Persist for 30 days
  }
  return threadId;
}

export function clearThreadId(): string {
  const newThreadId = crypto.randomUUID();
  setCookie(THREAD_ID_COOKIE_NAME, newThreadId, 30);
  return newThreadId;
}
