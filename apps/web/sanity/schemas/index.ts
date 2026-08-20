import type { SchemaTypeDefinition } from "sanity";

import { blockContent } from "./blockContent";
import { emailContent } from "./emailContent";
import { event } from "./event";
import { eventCommunication } from "./eventCommunication";
import { rsvpForm } from "./rsvpForm";

export const schemaTypes: SchemaTypeDefinition[] = [
  event,
  eventCommunication,
  blockContent,
  emailContent,
  rsvpForm,
];
