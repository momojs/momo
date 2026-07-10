/**
 * 断言目标值是否为HTMLInputElement对象
 */
export const isInputElement = (target: unknown): target is HTMLInputElement => {
  return (
    typeof HTMLInputElement !== 'undefined' &&
    target instanceof HTMLInputElement
  );
};
