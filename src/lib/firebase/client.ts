"use client";

import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const isCloudClientEnabled = () =>
  process.env.NEXT_PUBLIC_CLOUD_SERVICES_ENABLED === "true";

export function getFirebaseClient() {
  if (typeof window === "undefined" || !isCloudClientEnabled()) return null;
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (
    !config.apiKey ||
    !config.authDomain ||
    !config.projectId ||
    !config.appId
  )
    return null;
  const app =
    getApps().find((entry) => entry.name === "modujeju") ??
    initializeApp(config, "modujeju");
  return { app, auth: getAuth(app), db: getFirestore(app) };
}

export function isInAppBrowser(userAgent: string): boolean {
  return /KAKAOTALK|NAVER\(|Instagram|FBAN|FBAV|Line\//i.test(userAgent);
}

export async function syncServerSession(user: User): Promise<void> {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ idToken: await user.getIdToken() }),
  });
  if (!response.ok)
    throw new Error(
      response.status === 503 ? "CLOUD_DISABLED" : "SESSION_FAILED",
    );
}

/** Call only in response to an explicit login button, never during rendering. */
export async function signInWithGoogle(): Promise<User | null> {
  const client = getFirebaseClient();
  if (!client) throw new Error("CLOUD_DISABLED");
  if (isInAppBrowser(navigator.userAgent)) throw new Error("IN_APP_BROWSER");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    const result = await signInWithPopup(client.auth, provider);
    await syncServerSession(result.user);
    return result.user;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment"
    ) {
      await signInWithRedirect(client.auth, provider);
      return null;
    }
    throw error;
  }
}

export async function finishGoogleRedirect(): Promise<User | null> {
  const client = getFirebaseClient();
  if (!client) return null;
  const result = await getRedirectResult(client.auth);
  if (result) await syncServerSession(result.user);
  return result?.user ?? null;
}

export async function signOutFromApp(): Promise<void> {
  const response = await fetch("/api/session", {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("SESSION_FAILED");
  const client = getFirebaseClient();
  if (client) await signOut(client.auth);
}
