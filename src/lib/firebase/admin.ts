import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { assertCloudEnabled, ServiceError } from "@/lib/server/errors";

/** Never initialize a billable service simply because credentials are present. */
export function getAdminServices() {
  assertCloudEnabled();
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  if (
    !projectId ||
    !clientEmail ||
    !privateKey?.startsWith("-----BEGIN PRIVATE KEY-----")
  ) {
    throw new ServiceError(
      "SERVER_CONFIGURATION",
      503,
      "Cloud configuration is incomplete.",
    );
  }
  const name = "modujeju-admin";
  const app =
    getApps().find((entry) => entry.name === name) ??
    initializeApp(
      {
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      },
      name,
    );
  return { app, auth: getAuth(app), db: getFirestore(app) };
}
