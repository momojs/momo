/** 饮品杯型 */
export const CupSizeEnums = ['short', 'tall', 'grande', 'venti'] as const;

/** 饮品杯型 */
export type CupSize = (typeof CupSizeEnums)[number];

/** 饮品品牌 */
export const CupBrandEnums = [
  'HEYTEA', // 喜茶
  'NAIXUE', // 奈雪的茶
  'CHAGEE', // 霸王茶姬
  'GOODME', // 古茗
  'CHA_PANDA', // 茶百道
  'AUNTEA_JENNY', // 沪上阿姨
  'MIXUE', // 蜜雪冰城
  'ALITTLE_TEA', // 1点点
  'COCO', // CoCo都可
  'CHAYAN', // 茶颜悦色
  'MOLLY_TEA', // 茉莉奶白
  'NO_YEYE_NO_TEA', // 爷爷不泡茶
  'AH_MA_HANDMADE', // 阿嬷手作
  'SHUYI_TEALICIOUS', // 书亦烧仙草
  'YIHETANG', // 益禾堂
  'TIANLALA', // 甜啦啦
  'LINLEE', // LINLEE林里
  'NINGJI_LEMON_TEA', // 柠季
  'GUOYAYA', // 果呀呀
  'LUCKIN_COFFEE', // 瑞幸咖啡
  'COTTI_COFFEE', // 库迪咖啡
  'LUCKY_CUP', // 幸运咖
  'MANNER_COFFEE', // Manner Coffee
  'M_STAND', // M Stand
  'SEESAW_COFFEE', // Seesaw Coffee
  'STARBUCKS', // 星巴克
  'NOWWA_COFFEE', // 挪瓦咖啡
  'GRID_COFFEE', // Grid Coffee
  'TIMS_COFFEE', // Tims天好咖啡
  'PEET_S_COFFEE', // 皮爷咖啡
  'ARABICA', // %Arabica
] as const;

/** 饮品品牌 */
export type CupBrand = (typeof CupBrandEnums)[number];

/** 饮品类型 */
export const CupTypeEnums = [
  'espresso', // 浓缩
  'latte', // 拿铁
  'coffee_special', // 咖啡特调
  'americano', // 美式
  'cappuccino', // 卡布奇诺
  'mocha', // 摩卡
  'caramel_macchiato', // 焦糖玛奇朵
  'flat_white', // 澳白
  'fruit_tea', // 果茶
  'milk_tea', // 奶茶
  'milk', // 纯奶
  'pure_tea', // 纯茶
  'fruit_juice', // 果汁
  'sparkling_water', // 气泡水
  'lemon_tea', // 柠檬茶
  'flower_tea', // 花茶
] as const;

/** 饮品类型 */
export type CupType = (typeof CupTypeEnums)[number];

/**
 * 数据库中可持久化的饮品类型。
 *
 * `unknown` 仅用于兼容无类型的历史记录，不应出现在新增表单中。
 */
export const StoredCupTypeEnums = [...CupTypeEnums, 'unknown'] as const;

/** 数据库中的饮品类型，包含历史兼容值。 */
export type StoredCupType = (typeof StoredCupTypeEnums)[number];

/** 判断已存储的类型是否为用户可选的具体饮品类型。 */
export function isCupType(type: StoredCupType): type is CupType {
  return type !== 'unknown';
}

/** 饮品类型选择页分组；分组 key 仅用于 UI，不写入数据库。 */
export const CupTypeGroups = [
  {
    key: 'coffee',
    types: [
      'espresso',
      'latte',
      'americano',
      'cappuccino',
      'mocha',
      'caramel_macchiato',
      'flat_white',
      'coffee_special',
    ],
  },
  {
    key: 'tea',
    types: ['fruit_tea', 'milk_tea', 'pure_tea', 'lemon_tea', 'flower_tea'],
  },
  {
    key: 'other',
    types: ['milk', 'fruit_juice', 'sparkling_water'],
  },
] as const satisfies readonly {
  key: 'coffee' | 'tea' | 'other';
  types: readonly CupType[];
}[];

/** 饮品类型选择页分组 */
export type CupTypeGroup = (typeof CupTypeGroups)[number]['key'];
