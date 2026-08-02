import { describe, expect, test } from 'bun:test';

import { CupTypeEnums, CupTypeGroups, isCupType, StoredCupTypeEnums } from '.';

describe('CupTypeGroups', () => {
  test('groups every concrete cup type exactly once', () => {
    const groupedTypes = CupTypeGroups.flatMap(({ types }) => types);

    expect(new Set(groupedTypes).size).toBe(groupedTypes.length);
    expect([...groupedTypes].sort()).toEqual([...CupTypeEnums].sort());
  });

  test('does not persist category names as cup types', () => {
    expect(CupTypeEnums).not.toContain('coffee' as never);
    expect(CupTypeEnums).not.toContain('tea' as never);
    expect(CupTypeEnums).not.toContain('other' as never);
  });

  test('uses concrete semantic names for ambiguous legacy values', () => {
    expect(CupTypeEnums).toContain('coffee_special');
    expect(CupTypeEnums).toContain('pure_tea');
    expect(CupTypeEnums).toContain('fruit_juice');
    expect(CupTypeEnums).not.toContain('special' as never);
    expect(CupTypeEnums).not.toContain('juice' as never);
  });

  test('keeps unknown as a storage-only compatibility value', () => {
    expect(StoredCupTypeEnums).toContain('unknown');
    expect(CupTypeGroups.flatMap(({ types }) => types)).not.toContain(
      'unknown' as never,
    );
    expect(isCupType('unknown')).toBe(false);
    expect(isCupType('latte')).toBe(true);
  });
});
