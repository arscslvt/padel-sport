import type { SchemaTypeDefinition } from "sanity";

import { blockContent } from "./blockContent";
import { event } from "./event";
import { rsvpForm } from "./rsvpForm";

export const schemaTypes: SchemaTypeDefinition[] = [
  event,
  blockContent,
  rsvpForm,
];
