"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getFirebaseClient } from "./client";

function currentUser() {
  const client = getFirebaseClient();
  if (!client) throw new Error("CLOUD_DISABLED");
  if (!client.auth.currentUser) throw new Error("UNAUTHORIZED");
  return { ...client, uid: client.auth.currentUser.uid };
}

export async function getCloudSavedPlaceIds(): Promise<string[]> {
  const { db, uid } = currentUser();
  const snapshot = await getDocs(collection(db, "users", uid, "saved"));
  return snapshot.docs.map((entry) => entry.id);
}

export async function saveCloudPlace(
  placeId: string,
  snapshotUpdatedAt: string,
): Promise<void> {
  const { db, uid } = currentUser();
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(placeId) || snapshotUpdatedAt.length > 40)
    throw new Error("INVALID_INPUT");
  await setDoc(doc(db, "users", uid, "saved", placeId), {
    placeId,
    savedAt: serverTimestamp(),
    snapshotUpdatedAt,
  });
}

export async function removeCloudSavedPlace(placeId: string): Promise<void> {
  const { db, uid } = currentUser();
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(placeId)) throw new Error("INVALID_INPUT");
  await deleteDoc(doc(db, "users", uid, "saved", placeId));
}
