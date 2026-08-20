"use node";

import twilio from "twilio";

function getMessagingClient() {
  return twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
}

export { getMessagingClient };
