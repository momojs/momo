import { describe, expect, test } from 'bun:test';

import { StampRallyConflictError, StampRallyWriteSchema } from './stamp';

const validRecord = {
  photo: '20260802123000123-safe_id',
  cupType: 'latte' as const,
  size: 'tall' as const,
  price: 18.5,
  calories: 120,
  sugar: 8,
  caffeine: 90,
  rating: 4,
  brand: '  Cupori  ',
  note: '  午后的一杯  ',
  consumedAt: new Date(2026, 7, 2, 12, 30),
};

describe('StampRallyWriteSchema', () => {
  test('normalizes optional text at every write boundary', () => {
    expect(StampRallyWriteSchema.parse(validRecord)).toMatchObject({
      brand: 'Cupori',
      note: '午后的一杯',
    });
    expect(
      StampRallyWriteSchema.parse({
        ...validRecord,
        brand: '   ',
        note: '',
      }),
    ).toMatchObject({ brand: null, note: null });
  });

  test.each([
    { field: 'price', value: -1 },
    { field: 'calories', value: 1001 },
    { field: 'sugar', value: 101 },
    { field: 'caffeine', value: 501 },
    { field: 'rating', value: 2.5 },
    { field: 'rating', value: 6 },
    { field: 'brand', value: 'b'.repeat(41) },
    { field: 'note', value: 'n'.repeat(241) },
    { field: 'photo', value: '../outside.webp' },
    { field: 'photo', value: 'photos/nested.webp' },
  ])('rejects invalid $field values', ({ field, value }) => {
    expect(() =>
      StampRallyWriteSchema.parse({ ...validRecord, [field]: value }),
    ).toThrow();
  });

  test('uses a dedicated optimistic concurrency error', () => {
    const error = new StampRallyConflictError('record-id');
    expect(error.name).toBe('StampRallyConflictError');
    expect(error.message).toContain('record-id');
  });
});
