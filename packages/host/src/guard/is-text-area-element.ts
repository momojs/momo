/**
 * 断言目标值是否为HTMLTextAreaElement对象
 */
export const isTextAreaElement = (
  target: unknown,
): target is HTMLTextAreaElement => {
  return (
    typeof HTMLTextAreaElement !== 'undefined' &&
    target instanceof HTMLTextAreaElement
  );
};
