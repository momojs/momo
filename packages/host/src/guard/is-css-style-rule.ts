export const isCSSStyleRule = (data: unknown): data is CSSStyleRule => {
  return typeof CSSStyleRule !== 'undefined' && data instanceof CSSStyleRule;
};
