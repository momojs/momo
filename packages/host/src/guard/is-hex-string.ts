/**
 * #RGB        // 三值语法
 * #RGBA       // 四值语法
 * #RRGGBB     // 六值语法
 * #RRGGBBAA   // 八值语法
 * @param val
 * @returns
 */
export function isHexString(val: string): boolean {
  return /^#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})$/.test(
    val,
  );
}
