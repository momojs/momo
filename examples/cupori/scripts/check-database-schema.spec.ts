import { expect, test } from 'bun:test';

import { parseDrizzleGenerateResult } from './check-database-schema';

test('parses the machine-readable Drizzle Kit schema result', () => {
  expect(
    parseDrizzleGenerateResult('{"status":"no_changes","dialect":"sqlite"}\n'),
  ).toEqual({ status: 'no_changes', dialect: 'sqlite' });
});

test('rejects malformed Drizzle Kit schema results', () => {
  expect(() => parseDrizzleGenerateResult('not json')).toThrow(
    'returned invalid JSON',
  );
  expect(() => parseDrizzleGenerateResult('{}')).toThrow('returned no status');
});
