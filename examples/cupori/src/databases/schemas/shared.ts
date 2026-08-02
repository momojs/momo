import { sql } from 'drizzle-orm';

import { integer, text } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

export const SharedIdSchema = {
  id: text('id')
    .notNull()
    .$defaultFn(() => nanoid()),
} as const;

export const SharedTimeSchema = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
} as const;
