export interface TokenInfo {
  token: string;
  ws_url: string;
  local_ip?: string;
}

export function generateSecureId(prefix = "user"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).substring(2, 10)}`;
}

export async function fetchLiveKitToken(
  roomName: string,
  identityPrefix = "user",
): Promise<TokenInfo> {
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "localhost";
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  const prodApiUrl = "https://api.alexandermcintosh.com";
  const localCandidates = [`http://${hostname}:8000`, `http://${hostname}:8002`];
  const candidateUrls = isLocalHost
    ? [...localCandidates, prodApiUrl]
    : [import.meta.env.PUBLIC_API_URL || prodApiUrl];

  const identity = generateSecureId(identityPrefix);

  let lastError: unknown = null;
  for (const baseUrl of candidateUrls) {
    try {
      const res = await fetch(
        `${baseUrl}/token?room_name=${encodeURIComponent(
          roomName,
        )}&identity=${encodeURIComponent(identity)}`,
      );
      if (!res.ok) {
        continue;
      }
      const data = await res.json();
      if (data?.token) {
        let wsUrl = data.ws_url || `ws://${hostname}:7880`;
        if (wsUrl.includes("localhost") || wsUrl.includes("127.0.0.1")) {
          if (hostname !== "localhost" && wsUrl.includes("localhost")) {
            wsUrl = wsUrl.replace("localhost", hostname);
          } else if (hostname !== "127.0.0.1" && wsUrl.includes("127.0.0.1")) {
            wsUrl = wsUrl.replace("127.0.0.1", hostname);
          }
        }
        return {
          token: data.token,
          ws_url: wsUrl,
          local_ip: data.local_ip,
        };
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw (
    lastError ||
    new Error("Failed to obtain LiveKit token from any available auth endpoint")
  );
}
