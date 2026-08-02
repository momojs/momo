import { and, asc, desc, eq, gte, lt, max, ne, sql } from 'drizzle-orm';

import { z } from 'zod';

import type { CupType } from '@/databases';
import { DrizzleStampRallyTable, db, isCupType } from '@/databases';
import { CupSizeEnums, CupTypeEnums } from '@/databases/enums';

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .nullable()
    .transform((value) => value || null);

/** 所有数据库写入口共用的运行时领域约束。 */
export const StampRallyWriteSchema = z.object({
  photo: z
    .string()
    .max(255)
    .refine(
      (value) =>
        value !== '.' &&
        value !== '..' &&
        !value.includes('/') &&
        !value.includes('\\'),
      'Photo must be a safe local file name.',
    ),
  cupType: z.enum(CupTypeEnums),
  size: z.enum(CupSizeEnums),
  price: z.number().finite().min(0).max(9999),
  calories: z.number().finite().min(0).max(1000),
  sugar: z.number().finite().min(0).max(100),
  caffeine: z.number().finite().min(0).max(500),
  rating: z.number().int().min(0).max(5),
  brand: optionalText(40),
  note: optionalText(240),
  consumedAt: z.date(),
});

export type StampRallyInsert = z.input<typeof StampRallyWriteSchema>;
export type StampRallyUpdate = StampRallyInsert;

export class StampRallyConflictError extends Error {
  override name = 'StampRallyConflictError';

  constructor(id: string) {
    super(`饮品记录 ${id} 已被修改或删除`);
  }
}

const identitySchema = z.object({
  id: z.string().min(1),
  revision: z.number().int().min(0),
});

function parseRange(from: Date, to: Date) {
  const range = z
    .object({ from: z.date(), to: z.date() })
    .refine(({ from, to }) => from < to, 'Date range must be increasing.')
    .parse({ from, to });
  return range;
}

export const InsertStampRally = async (data: StampRallyInsert) => {
  const values = StampRallyWriteSchema.parse(data);
  return db.insert(DrizzleStampRallyTable).values(values).returning();
};

export const UpdateStampRally = async (
  id: string,
  expectedRevision: number,
  data: StampRallyUpdate,
) => {
  const identity = identitySchema.parse({ id, revision: expectedRevision });
  const values = StampRallyWriteSchema.parse(data);
  const updated = await db
    .update(DrizzleStampRallyTable)
    .set({
      ...values,
      revision: sql`${DrizzleStampRallyTable.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(DrizzleStampRallyTable.id, identity.id),
        eq(DrizzleStampRallyTable.revision, identity.revision),
      ),
    )
    .returning();

  if (updated.length === 0) throw new StampRallyConflictError(identity.id);
  return updated;
};

export const DeleteStampRally = async (
  id: string,
  expectedRevision: number,
) => {
  const identity = identitySchema.parse({ id, revision: expectedRevision });
  const deleted = await db
    .delete(DrizzleStampRallyTable)
    .where(
      and(
        eq(DrizzleStampRallyTable.id, identity.id),
        eq(DrizzleStampRallyTable.revision, identity.revision),
      ),
    )
    .returning();

  if (deleted.length === 0) throw new StampRallyConflictError(identity.id);
  return deleted;
};

/** 检查照片是否仍被其他饮品记录引用，避免清理共享的历史文件。 */
export const HasStampRallyPhotoReference = async (photo: string) => {
  if (!photo) return false;

  const rows = await db
    .select({ id: DrizzleStampRallyTable.id })
    .from(DrizzleStampRallyTable)
    .where(eq(DrizzleStampRallyTable.photo, photo))
    .limit(1);

  return rows.length > 0;
};

export const ListStampRallyPhotos = async (from: Date, to: Date) => {
  const range = parseRange(from, to);
  return db
    .select({
      consumedAt: DrizzleStampRallyTable.consumedAt,
      photo: DrizzleStampRallyTable.photo,
    })
    .from(DrizzleStampRallyTable)
    .where(
      and(
        gte(DrizzleStampRallyTable.consumedAt, range.from),
        lt(DrizzleStampRallyTable.consumedAt, range.to),
      ),
    )
    .orderBy(
      desc(DrizzleStampRallyTable.consumedAt),
      desc(DrizzleStampRallyTable.createdAt),
      desc(DrizzleStampRallyTable.id),
    );
};

export const ListStampRallies = async (from: Date, to: Date) => {
  const range = parseRange(from, to);
  return db
    .select()
    .from(DrizzleStampRallyTable)
    .where(
      and(
        gte(DrizzleStampRallyTable.consumedAt, range.from),
        lt(DrizzleStampRallyTable.consumedAt, range.to),
      ),
    )
    .orderBy(
      desc(DrizzleStampRallyTable.consumedAt),
      desc(DrizzleStampRallyTable.createdAt),
      desc(DrizzleStampRallyTable.id),
    );
};

/**
 * 查询最近使用的饮品类型，按最新消费时间去重排序。
 *
 * @param limit 最多返回数量，默认为 3。
 * @returns 具体饮品类型列表。
 */
export const ListRecentCupTypes = async (limit = 3): Promise<CupType[]> => {
  const normalizedLimit = Number.isFinite(limit)
    ? Math.max(0, Math.floor(limit))
    : 0;

  if (normalizedLimit === 0) return [];

  const latestConsumedAt = max(DrizzleStampRallyTable.consumedAt);
  const rows = await db
    .select({ cupType: DrizzleStampRallyTable.cupType })
    .from(DrizzleStampRallyTable)
    .where(ne(DrizzleStampRallyTable.cupType, 'unknown'))
    .groupBy(DrizzleStampRallyTable.cupType)
    .orderBy(desc(latestConsumedAt), asc(DrizzleStampRallyTable.cupType))
    .limit(normalizedLimit);

  return rows.map(({ cupType }) => cupType).filter(isCupType);
};
