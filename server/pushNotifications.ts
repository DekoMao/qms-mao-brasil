/**
 * P3 — Push Notifications (Web Push)
 * Server-side helpers for VAPID key management, subscription CRUD, and push delivery.
 */
import webpush from "web-push";
import crypto from "crypto";
import { getDb } from "./db";
import { pushSubscriptions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── VAPID Key Management ──────────────────────────────────────
// Generate VAPID keys once and cache them in memory.
// In production, store these in env vars; here we auto-generate if missing.
let vapidKeys: { publicKey: string; privateKey: string } | null = null;

function getVapidKeys() {
  if (vapidKeys) return vapidKeys;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    vapidKeys = { publicKey, privateKey };
  } else {
    // Auto-generate for dev/demo environments
    const generated = webpush.generateVAPIDKeys();
    vapidKeys = generated;
    // Log so admin can persist them
    console.log("[Push] Generated VAPID keys (persist these in env vars):");
    console.log(`  VAPID_PUBLIC_KEY=${generated.publicKey}`);
    console.log(`  VAPID_PRIVATE_KEY=${generated.privateKey}`);
  }

  webpush.setVapidDetails(
    "mailto:admin@qtrack.app",
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  return vapidKeys;
}

// ─── Public Key Getter ─────────────────────────────────────────
export function getVapidPublicKey(): string {
  return getVapidKeys().publicKey;
}

// ─── Subscription CRUD ─────────────────────────────────────────
export async function subscribePush(params: {
  userId: number;
  tenantId?: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not initialized");

  // Upsert: deactivate existing subscriptions for same endpoint
  await db
    .update(pushSubscriptions)
    .set({ isActive: false })
    .where(eq(pushSubscriptions.endpoint, params.endpoint));

  const [result] = await db.insert(pushSubscriptions).values({
    userId: params.userId,
    tenantId: params.tenantId || null,
    endpoint: params.endpoint,
    p256dh: params.p256dh,
    auth: params.auth,
    userAgent: params.userAgent || null,
    isActive: true,
  });

  return { id: result.insertId, success: true };
}

export async function unsubscribePush(params: {
  userId: number;
  endpoint: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not initialized");

  await db
    .update(pushSubscriptions)
    .set({ isActive: false })
    .where(
      and(
        eq(pushSubscriptions.userId, params.userId),
        eq(pushSubscriptions.endpoint, params.endpoint)
      )
    );

  return { success: true };
}

export async function getActiveSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.isActive, true)
      )
    );
}

export async function getActiveSubscriptionsForTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.tenantId, tenantId),
        eq(pushSubscriptions.isActive, true)
      )
    );
}

// ─── Push Delivery ─────────────────────────────────────────────
export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string; // deep-link URL
  data?: Record<string, unknown>;
}

export async function sendPushToUser(userId: number, payload: PushPayload) {
  getVapidKeys(); // ensure VAPID is configured
  const subs = await getActiveSubscriptions(userId);
  const results = await Promise.allSettled(
    subs.map((sub: any) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
        { TTL: 86400 }
      )
    )
  );

  // Deactivate failed subscriptions (410 Gone)
  const db = await getDb();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected") {
      const err = (r as PromiseRejectedResult).reason as any;
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        if (db) {
          await db
            .update(pushSubscriptions)
            .set({ isActive: false })
            .where(eq(pushSubscriptions.id, subs[i].id));
        }
      }
    }
  }

  return {
    sent: results.filter((r: PromiseSettledResult<any>) => r.status === "fulfilled").length,
    failed: results.filter((r: PromiseSettledResult<any>) => r.status === "rejected").length,
    total: results.length,
  };
}

export async function sendPushToTenant(tenantId: number, payload: PushPayload) {
  getVapidKeys();
  const subs = await getActiveSubscriptionsForTenant(tenantId);
  const results = await Promise.allSettled(
    subs.map((sub: any) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
        { TTL: 86400 }
      )
    )
  );

  const db = await getDb();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected") {
      const err = (r as PromiseRejectedResult).reason as any;
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        if (db) {
          await db
            .update(pushSubscriptions)
            .set({ isActive: false })
            .where(eq(pushSubscriptions.id, subs[i].id));
        }
      }
    }
  }

  return {
    sent: results.filter((r: PromiseSettledResult<any>) => r.status === "fulfilled").length,
    failed: results.filter((r: PromiseSettledResult<any>) => r.status === "rejected").length,
    total: results.length,
  };
}
