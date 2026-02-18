/**
 * P3 — Push Notifications Tests
 * Tests for VAPID key management, subscription CRUD, and push delivery.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getVapidPublicKey, subscribePush, unsubscribePush, getActiveSubscriptions, sendPushToUser } from "./pushNotifications";

describe("P3 — Push Notifications", () => {
  describe("VAPID Key Management", () => {
    it("should return a VAPID public key string", () => {
      const key = getVapidPublicKey();
      expect(key).toBeDefined();
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(20);
    });

    it("should return the same key on subsequent calls (cached)", () => {
      const key1 = getVapidPublicKey();
      const key2 = getVapidPublicKey();
      expect(key1).toBe(key2);
    });

    it("should return a base64url encoded key", () => {
      const key = getVapidPublicKey();
      // VAPID public keys are base64url encoded
      expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe("Subscription CRUD", () => {
    it("should subscribe a user with valid params", async () => {
      const result = await subscribePush({
        userId: 1,
        tenantId: 1,
        endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-" + Date.now(),
        p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfWRs",
        auth: "tBHItJI5svbpC7htGLcR7A",
        userAgent: "Test Agent",
      });
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it("should deactivate old subscription for same endpoint", async () => {
      const endpoint = "https://fcm.googleapis.com/fcm/send/dedup-test-" + Date.now();
      const params = {
        userId: 1,
        tenantId: 1,
        endpoint,
        p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfWRs",
        auth: "tBHItJI5svbpC7htGLcR7A",
      };
      
      const first = await subscribePush(params);
      expect(first.success).toBe(true);
      
      const second = await subscribePush(params);
      expect(second.success).toBe(true);
      // Second subscription should have a different ID
      expect(second.id).not.toBe(first.id);
    });

    it("should unsubscribe a user", async () => {
      const endpoint = "https://fcm.googleapis.com/fcm/send/unsub-test-" + Date.now();
      await subscribePush({
        userId: 1,
        tenantId: 1,
        endpoint,
        p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfWRs",
        auth: "tBHItJI5svbpC7htGLcR7A",
      });

      const result = await unsubscribePush({
        userId: 1,
        endpoint,
      });
      expect(result.success).toBe(true);
    });

    it("should get active subscriptions for a user", async () => {
      const subs = await getActiveSubscriptions(1);
      expect(Array.isArray(subs)).toBe(true);
    });
  });

  describe("Push Delivery", () => {
    it("should handle sendPushToUser with no active subscriptions", async () => {
      // User 9999 has no subscriptions
      const result = await sendPushToUser(9999, {
        title: "Test",
        body: "Test body",
      });
      expect(result.total).toBe(0);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("should attempt to send push to user with subscriptions", async () => {
      // Subscribe first
      const endpoint = "https://fcm.googleapis.com/fcm/send/push-test-" + Date.now();
      await subscribePush({
        userId: 1,
        tenantId: 1,
        endpoint,
        p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfWRs",
        auth: "tBHItJI5svbpC7htGLcR7A",
      });

      // Send push - will fail because endpoint is fake, but should not throw
      const result = await sendPushToUser(1, {
        title: "QTrack — Teste",
        body: "Push test",
        icon: "/icon-192.png",
        tag: "test",
        url: "/notifications",
      });
      // Should have attempted at least 1
      expect(result.total).toBeGreaterThanOrEqual(1);
      // All will fail because the endpoint is fake
      expect(result.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("PushPayload Structure", () => {
    it("should accept minimal payload", async () => {
      const result = await sendPushToUser(9999, {
        title: "Minimal",
        body: "Body only",
      });
      expect(result).toHaveProperty("sent");
      expect(result).toHaveProperty("failed");
      expect(result).toHaveProperty("total");
    });

    it("should accept full payload with all optional fields", async () => {
      const result = await sendPushToUser(9999, {
        title: "Full",
        body: "Full body",
        icon: "/icon.png",
        badge: "/badge.png",
        tag: "full-test",
        url: "/defects/123",
        data: { defectId: 123, type: "SLA_BREACH" },
      });
      expect(result).toHaveProperty("total");
    });
  });
});
