import type { SchemaTypeDefinition } from "sanity";

import { blockContent } from "./blockContent";
import { event } from "./event";

export const schemaTypes: SchemaTypeDefinition[] = [event, blockContent];
