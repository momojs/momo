/**
 * 断言目标值是否为FormData对象
 */
export function isFormData(data: unknown): data is FormData {
  return typeof FormData !== 'undefined' && data instanceof FormData;
}
