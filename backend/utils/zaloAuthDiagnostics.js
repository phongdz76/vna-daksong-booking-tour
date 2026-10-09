// Log the provider's error explanation, never its raw response/profile.
export function safeZaloErrorMessage(message, credentials = []) {
  if (typeof message !== "string") return null;
  let safe = message.slice(0, 2000);
  for (const credential of credentials) {
    if (!credential) continue;
    for (const value of [credential, encodeURIComponent(credential)]) {
      safe = safe.replaceAll(value, "[redacted]");
    }
  }
  return safe
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/(?:access_token|appsecret_proof|app_secret|token|secret)\s*[:=]\s*["']?[^\s,;"']+/gi, "[credential]")
    .replace(/[A-Za-z0-9_./+=-]{16,}/g, "[redacted]")
    .replace(/\d{8,}/g, "[redacted]")
    .replace(/[\r\n\t]/g, " ")
    .slice(0, 300);
}
