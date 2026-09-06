import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { detectEnv } from "./inapp";

const env = import.meta.env as Record<string, string | undefined>;

const appId = env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID"];
const vapidKey = env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY"];

const firebaseConfig = {
  apiKey: env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY"] ?? "",
  projectId: env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID"] ?? "",
  appId: appId ?? "",
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushStatus =
  | "registered"
  | "not-configured"
  | "unsupported"
  | "in-app-browser"
  | "ios-install-required"
  | "open-in-new-tab"
  | "denied"
  | "error";

export type PushResult =
  | { status: "registered"; token: string }
  | { status: Exclude<PushStatus, "registered">; detail?: string };

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    window.matchMedia?.("(display-mode: fullscreen)").matches === true
  );
}

/** Diagnóstico sem pedir permissão — usado para mostrar a instrução certa. */
export function pushBlocker(): Exclude<PushStatus, "registered" | "error"> | null {
  if (typeof window === "undefined") return "unsupported";
  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.projectId ||
    !firebaseConfig.appId ||
    !vapidKey ||
    !firebaseConfig.messagingSenderId
  ) {
    return "not-configured";
  }
  if (window.top !== window.self) return "open-in-new-tab";

  const { inApp, platform } = detectEnv(navigator.userAgent);
  const hasApis = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

  if (platform === "ios" && !isStandalone()) return "ios-install-required";
  if (!hasApis) return inApp ? "in-app-browser" : "unsupported";
  if (inApp && platform === "android" && !isStandalone()) {
    // WebViews do Instagram/TikTok no Android costumam expor as APIs mas falhar no getToken.
    return null;
  }
  return null;
}

/** Deve ser chamado a partir de um clique do usuário. */
export async function enablePush(): Promise<PushResult> {
  const blocker = pushBlocker();
  if (blocker) return { status: blocker };

  try {
    if (!(await isSupported())) {
      const { inApp } = detectEnv(navigator.userAgent);
      return { status: inApp ? "in-app-browser" : "unsupported" };
    }

    const permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") return { status: "denied" };

    const query = new URLSearchParams(firebaseConfig).toString();
    const serviceWorkerRegistration =
      (await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js")) ??
      (await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`, {
        scope: "/",
      }));
    await navigator.serviceWorker.ready;

    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
    if (!token) return { status: "denied" };

    onMessage(messaging, (payload) => {
      const title = payload.notification?.title;
      if (title && "Notification" in window) {
        new Notification(title, { body: payload.notification?.body ?? "" });
      }
    });

    return { status: "registered", token };
  } catch (error) {
    const { inApp } = detectEnv(navigator.userAgent);
    if (inApp) return { status: "in-app-browser" };
    return { status: "error", detail: error instanceof Error ? error.message : undefined };
  }
}

export function pushPermission(): NotificationPermission | "unavailable" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unavailable";
  return Notification.permission;
}
