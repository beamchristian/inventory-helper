// app/actions.ts
"use server";
import { db } from "./../../lib/db/db";

import webPush from "web-push";
import type { PushSubscription as WebPushSubscription } from "web-push";

// Define a type for what we expect from the client-side PushSubscription.toJSON().
interface ClientPushSubscriptionJSON {
  endpoint?: string;
  expirationTime?: number | null;
  // Change 'keys' to match the browser's PushSubscriptionJSON output more accurately
  keys?: Record<string, string>; // This is the key change!
}

// Define a common interface for errors that might have a statusCode,
// which is typical for web-push library errors.
interface WebPushErrorWithStatusCode extends Error {
  statusCode?: number;
}

// Ensure VAPID keys are set (from .env)
if (
  !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  !process.env.VAPID_PRIVATE_KEY
) {
  console.error("VAPID keys are missing. Push notifications might not work.");
  // In a production app, you might want to throw an error or exit if critical
} else {
  webPush.setVapidDetails(
    "mailto:ckbeamsoftware@gmail.com", // Your contact email
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Subscribes a user to push notifications by storing their subscription details in the database.
 * @param sub The push subscription object from the client-side.
 */
export async function subscribeUser(sub: ClientPushSubscriptionJSON) {
  if (!sub.endpoint || !sub.keys?.auth || !sub.keys?.p256dh) {
    console.error("Received invalid push subscription format:", sub);
    throw new Error("Invalid push subscription: missing endpoint or keys.");
  }

  try {
    // Check if subscription already exists to prevent duplicates
    const existingSubscription = await db.pushSubscription.findUnique({
      where: { endpoint: sub.endpoint },
    });

    if (existingSubscription) {
      console.log("Subscription already exists for this endpoint. Updating...");
      // Update existing subscription (e.g., if expirationTime changes or to refresh)
      await db.pushSubscription.update({
        where: { endpoint: sub.endpoint },
        data: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          expirationTime: sub.expirationTime
            ? new Date(sub.expirationTime)
            : null,
        },
      });
    } else {
      // Create a new subscription
      await db.pushSubscription.create({
        data: {
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          expirationTime: sub.expirationTime
            ? new Date(sub.expirationTime)
            : null,
        },
      });
    }

    console.log("User subscribed (or updated) in DB:", sub.endpoint);
    return { success: true };
  } catch (error) {
    console.error("Failed to save push subscription to DB:", error);
    return { success: false, error: "Failed to save subscription." };
  }
}

/**
 * Unsubscribes a user from push notifications by removing their subscription from the database.
 * NOTE: This action currently relies on the *client* knowing its endpoint to remove.
 * For a more robust solution, you might need to pass the endpoint or a user ID from the client.
 * Or, if `sendNotification` fails due to a 404/410, it should remove the subscription.
 */
export async function unsubscribeUser(endpoint: string) {
  // Added endpoint parameter
  if (!endpoint) {
    console.error("Endpoint not provided for unsubscribe action.");
    throw new Error("Endpoint is required to unsubscribe.");
  }

  try {
    const deletedSubscription = await db.pushSubscription.delete({
      where: { endpoint: endpoint },
    });
    console.log("User unsubscribed from DB:", deletedSubscription.endpoint);
    return { success: true };
  } catch (error) {
    console.error("Failed to remove subscription from DB:", error);
    // Handle cases where the subscription might already be gone
    return { success: false, error: "Failed to unsubscribe." };
  }
}

/**
 * Sends a push notification to a specific subscription or (ideally) all active subscriptions.
 * For this example, we'll retrieve all subscriptions and send to them.
 * @param message The message body for the notification.
 */
export async function sendNotification(message: string) {
  // Retrieve ALL active subscriptions from the database
  // In a real app, you might paginate or filter these.
  const subscriptions = await db.pushSubscription.findMany();

  if (subscriptions.length === 0) {
    console.warn(
      "No subscriptions found in the database to send notifications to."
    );
    return { success: false, error: "No active subscriptions found." };
  }

  const notificationPromises = subscriptions.map(async (dbSub) => {
    // Reconstruct WebPushSubscription object from database fields
    console.log(typeof dbSub);
    const subscriptionToSend: WebPushSubscription = {
      endpoint: dbSub.endpoint,
      expirationTime: dbSub.expirationTime?.getTime() || null, // Convert Date object back to number timestamp
      keys: {
        p256dh: dbSub.p256dh,
        auth: dbSub.auth,
      },
    };

    try {
      await webPush.sendNotification(
        subscriptionToSend,
        JSON.stringify({
          title: "Platter Order Update",
          body: message,
          icon: "/icon-192x192.png", // Ensure this path is correct and icon exists
          badge: "/badge.png", // Optional: Ensure this path is correct and icon exists for badges
        })
      );
      console.log(`Notification sent to ${dbSub.endpoint}`);
      return { success: true, endpoint: dbSub.endpoint };
    } catch (error: unknown) {
      console.error(
        `Error sending push notification to ${dbSub.endpoint}:`,
        error
      );

      const webPushError = error as WebPushErrorWithStatusCode;
      // If subscription is expired (410 Gone) or not found (404), remove it from DB
      if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
        console.warn(
          `Removing invalid/expired subscription: ${dbSub.endpoint}`
        );
        try {
          await db.pushSubscription.delete({
            where: { endpoint: dbSub.endpoint },
          });
          return {
            success: false,
            error: "Subscription expired/invalid, removed.",
            endpoint: dbSub.endpoint,
          };
        } catch (dbError) {
          console.error(
            `Failed to remove expired subscription ${dbSub.endpoint} from DB:`,
            dbError
          );
          return {
            success: false,
            error: "Failed to remove expired subscription.",
            endpoint: dbSub.endpoint,
          };
        }
      }
      return {
        success: false,
        error: `Failed to send: ${(error as Error).message}`,
        endpoint: dbSub.endpoint,
      };
    }
  });

  // Wait for all notifications to attempt sending
  const results = await Promise.all(notificationPromises);

  // You can aggregate results here if needed
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.length - successCount;

  if (successCount > 0) {
    console.log(`Sent ${successCount} notifications successfully.`);
  }
  if (failureCount > 0) {
    console.warn(`${failureCount} notifications failed to send.`);
  }

  return {
    success: successCount > 0,
    totalSent: successCount,
    totalFailed: failureCount,
  };
}
