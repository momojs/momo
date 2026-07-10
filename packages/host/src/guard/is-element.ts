/**
 * 断言目标值是否为Element对象
 */
export const isElement = (target: unknown): target is Element => {
  return typeof Element !== 'undefined' && target instanceof Element;
};
