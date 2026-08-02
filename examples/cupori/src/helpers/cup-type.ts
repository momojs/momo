import type { CupType, StoredCupType } from '@/databases';
import { m } from '@/paraglide/messages.js';

const CUP_TYPE_LABELS = {
  espresso: m.cup_type_espresso,
  latte: m.cup_type_latte,
  coffee_special: m.cup_type_coffee_special,
  americano: m.cup_type_americano,
  cappuccino: m.cup_type_cappuccino,
  mocha: m.cup_type_mocha,
  caramel_macchiato: m.cup_type_caramel_macchiato,
  flat_white: m.cup_type_flat_white,
  fruit_tea: m.cup_type_fruit_tea,
  milk_tea: m.cup_type_milk_tea,
  milk: m.cup_type_milk,
  pure_tea: m.cup_type_pure_tea,
  fruit_juice: m.cup_type_fruit_juice,
  sparkling_water: m.cup_type_sparkling_water,
  lemon_tea: m.cup_type_lemon_tea,
  flower_tea: m.cup_type_flower_tea,
} as const satisfies Record<CupType, () => string>;

/** Returns the localized label for a persisted beverage type. */
export function formatCupType(type: StoredCupType) {
  return type === 'unknown' ? m.cup_type_unknown() : CUP_TYPE_LABELS[type]();
}
