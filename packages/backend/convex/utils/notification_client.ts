"use node";

import twilio from "twilio";

function getMessagingClient() {
  return twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
}

export interface AlertRequest {
  title: string;
  message: string;
  tags?: string[];
  cta?: {
    label: string;
    url: string;
  };
  clickUrl?: string;
  imageUrl?: string;
  priority?: "min" | "low" | "default" | "high" | "urgent";
}

async function sendAlert(request: AlertRequest) {
  if (!process.env.NTFY_TOPIC_URL) {
    console.warn(
      "NTFY_TOPIC_URL non configurato, impossibile inviare notifiche.",
    );
    return;
  }

  const headers: Record<string, string> = {
    Title: request.title,
  };

  if (request.priority) {
    headers.Priority = request.priority;
  }

  if (request.tags && request.tags.length > 0) {
    headers.Tags = request.tags.join(",");
  }

  if (request.clickUrl) {
    headers.Click = request.clickUrl;
  }

  await fetch(process.env.NTFY_TOPIC_URL, {
    method: "POST", // PUT works too
    body: request.message,
    headers,
  });
}

export { getMessagingClient, sendAlert };
