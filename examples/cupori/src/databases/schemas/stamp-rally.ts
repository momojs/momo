import { sql } from 'drizzle-orm';

import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

import { CupSizeEnums, StoredCupTypeEnums } from '../enums';
import { SharedIdSchema, SharedTimeSchema } from './shared';

function sqlStringList(values: readonly string[]) {
  return sql.raw(
    values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', '),
  );
}

const cupTypeValuesSql = sqlStringList(StoredCupTypeEnums);
const cupSizeValuesSql = sqlStringList(CupSizeEnums);

export const DrizzleStampRallyTable = sqliteTable(
  'stamp_rally',
  {
    ...SharedIdSchema,
    // 照片
    photo: text('photo').notNull(),
    // 饮品类型
    cupType: text('cup_type', { enum: StoredCupTypeEnums }).notNull(),
    // 杯型
    size: text('size', { enum: CupSizeEnums }).notNull(),
    // 价格
    price: real('price').notNull().default(0),
    // 卡路里
    calories: real('calories').notNull().default(0),
    // 糖分
    sugar: real('sugar').notNull().default(0),
    // 咖啡因
    caffeine: real('caffeine').notNull().default(0),
    // 评分
    rating: integer('rating').notNull().default(0),
    // 品牌
    brand: text('brand'),
    // 备注
    note: text('note'),
    // 消费时间
    consumedAt: integer('consumed_at', { mode: 'timestamp_ms' }).notNull(),
    ...SharedTimeSchema,
    // 乐观并发版本
    revision: integer('revision').notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    check('stamp_rally_id_length_check', sql`length(${table.id}) > 0`),
    check('stamp_rally_photo_length_check', sql`length(${table.photo}) <= 255`),
    check(
      'stamp_rally_cup_type_check',
      sql`${table.cupType} in (${cupTypeValuesSql})`,
    ),
    check(
      'stamp_rally_size_check',
      sql`${table.size} in (${cupSizeValuesSql})`,
    ),
    check('stamp_rally_price_check', sql`${table.price} between 0 and 9999`),
    check(
      'stamp_rally_calories_check',
      sql`${table.calories} between 0 and 1000`,
    ),
    check('stamp_rally_sugar_check', sql`${table.sugar} between 0 and 100`),
    check(
      'stamp_rally_caffeine_check',
      sql`${table.caffeine} between 0 and 500`,
    ),
    check(
      'stamp_rally_rating_check',
      sql`typeof(${table.rating}) = 'integer' and ${table.rating} between 0 and 5`,
    ),
    check(
      'stamp_rally_brand_length_check',
      sql`${table.brand} is null or length(${table.brand}) <= 40`,
    ),
    check(
      'stamp_rally_note_length_check',
      sql`${table.note} is null or length(${table.note}) <= 240`,
    ),
    check(
      'stamp_rally_consumed_at_type_check',
      sql`typeof(${table.consumedAt}) = 'integer'`,
    ),
    check(
      'stamp_rally_created_at_type_check',
      sql`typeof(${table.createdAt}) = 'integer'`,
    ),
    check(
      'stamp_rally_updated_at_type_check',
      sql`typeof(${table.updatedAt}) = 'integer'`,
    ),
    check(
      'stamp_rally_revision_check',
      sql`typeof(${table.revision}) = 'integer' and ${table.revision} >= 0`,
    ),
    index('stamp_rally_consumed_at_idx').on(sql`${table.consumedAt} desc`),
    index('stamp_rally_photo_idx').on(table.photo),
    index('stamp_rally_cup_type_consumed_at_idx').on(
      table.cupType,
      sql`${table.consumedAt} desc`,
    ),
  ],
);

export type DrizzleStampRallyTableRow =
  typeof DrizzleStampRallyTable.$inferSelect;

export type DrizzleStampRallyTableInsert =
  typeof DrizzleStampRallyTable.$inferInsert;
