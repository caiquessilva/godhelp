import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

const env = import.meta.env as Record<string, string | undefined>;

const appId = env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID"];
const vapidKey = env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY"];

const firebaseConfig = {
  apiKey: env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY"] ?? "",
  projectId: env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID"] ?? "",
  appId: appId ?? "",
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushResult =
  | { status: "registered"; token: string }
  | { status: "not-configured" | "unsupported" | "open-in-new-tab" | "denied" };

/** Deve ser chamado a partir de um clique do usuário. */
export async function enablePush(): Promise<PushResult> {
  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.projectId ||
    !firebaseConfig.appId ||
    !vapidKey ||
    !firebaseConfig.messagingSenderId
  ) {
    return { status: "not-configured" };
  }
  if (typeof window === "undefined" || !("Notification" in window) || !(await isSupported())) {
    return { status: "unsupported" };
  }
  if (window.top !== window.self) {
    return { status: "open-in-new-tab" };
  }

  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const query = new URLSearchParams(firebaseConfig).toString();
  const serviceWorkerRegistration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${query}`,
  );
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
}

export function pushPermission(): NotificationPermission | "unavailable" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unavailable";
  return Notification.permission;
}
