/**
 * 断言目标值是否为URLSearchParams对象
 */
export function isURLSearchParams(data: unknown): data is URLSearchParams {
  return (
    typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams
  );
}
