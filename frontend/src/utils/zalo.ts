export const isZalo = Boolean((window as Window & { APP_ID?: string }).APP_ID);
const sessionKey = "vna-customer-session";
let sdk: typeof import("zmp-sdk") | undefined;
let sdkPromise: Promise<typeof import("zmp-sdk")> | undefined;

// Importing the SDK starts its native login handshake. Load it only in Zalo,
// before rendering the customer app so nativeStorage is ready synchronously.
export async function initializeZaloSdk() {
  if (!isZalo) return;
  sdkPromise ??= import("zmp-sdk");
  sdk = await sdkPromise;
}

export function readSession(): string | null {
  try {
    if (isZalo) return sdk?.nativeStorage.getItem(sessionKey) || null;
    return window.sessionStorage.getItem(sessionKey);
  } catch {
    return null;
  }
}
export function storeSession(token: string | null) {
  try {
    if (isZalo) {
      if (token) sdk?.nativeStorage.setItem(sessionKey, token);
      else sdk?.nativeStorage.removeItem(sessionKey);
    } else if (token) window.sessionStorage.setItem(sessionKey, token);
    else window.sessionStorage.removeItem(sessionKey);
  } catch {
    /* The current session can still work without persistent storage. */
  }
}
export async function zaloAccessToken() {
  if (!isZalo)
    throw new Error("Mở Mini App trong Zalo để đăng nhập tài khoản của bạn.");
  await initializeZaloSdk();
  return sdk!.getAccessToken();
}

export async function zaloLoginCredentials() {
  if (!isZalo)
    throw new Error("Mở Mini App trong Zalo để đăng nhập tài khoản của bạn.");
  await initializeZaloSdk();
  let includeProfile = false;
  try {
    const { userInfo } = await sdk!.getUserInfo({
      autoRequestPermission: true,
      avatarType: "normal",
    });
    includeProfile = Boolean(userInfo?.name || userInfo?.avatar);
  } catch {
    // Name/avatar consent is optional; ID-only authentication still works.
  }
  // Obtain the token after consent. The server verifies both identity and profile.
  return { accessToken: await zaloAccessToken(), includeProfile };
}

// Destination bookmarks stay on this device; they are separate from account saved tours.
export function readDestinationBookmarks(key: string): string[] {
  try {
    const raw = isZalo
      ? sdk?.nativeStorage.getItem(key)
      : window.sessionStorage.getItem(key);
    const value: unknown = JSON.parse(raw || "[]");
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}
export function storeDestinationBookmarks(key: string, ids: string[]) {
  try {
    if (isZalo) sdk?.nativeStorage.setItem(key, JSON.stringify(ids));
    else window.sessionStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* Bookmarks can still work for the current screen. */
  }
}
