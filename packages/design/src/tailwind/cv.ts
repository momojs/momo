import { isCSSStyleRule } from '@momots/host';
import type { Target } from 'motion/react';
import { isEmptyish, isNot, pipe, toCamelCase } from 'remeda';

// ── CSS class → motion Target ───────────────────────────────────────────────

type RuleSource = CSSStyleSheet | (CSSRule & { cssRules?: CSSRuleList });

/** Target 合并：后者覆盖前者（monoid）。 */
const append = (left: Target, right: Target): Target => ({
  ...left,
  ...right,
});

/**
 * @description 获取 CSSRuleList
 * @param source - CSSStyleSheet or CSSRule with cssRules
 * @param href - href of the sheet
 * @returns CSSRuleList or undefined
 */
const rulesOf = (
  source: RuleSource,
  href: string | null = null,
): CSSRuleList | undefined => {
  if (!('cssRules' in source)) return;
  try {
    return source.cssRules;
  } catch (error) {
    console.warn(
      `TailwindCSS: Failed to read styles from sheets@${href ?? 'inline'}\n`,
      error,
    );
  }
};

const isSameOriginSheet = (sheet: CSSStyleSheet): boolean =>
  !sheet.href || new URL(sheet.href, location.href).origin === location.origin;

const matches = (className: string) => (selector: string) =>
  selector.startsWith(`.${className}`);

/**
 * @description 扁平化 CSSRuleList
 * @param rules - CSSRuleList
 * @param href - href of the sheet
 * @returns CSSStyleRule[]
 */
const flatten = (
  rules: CSSRuleList,
  href: string | null = null,
): CSSStyleRule[] =>
  Array.from(rules).flatMap((rule) => {
    const nested = rulesOf(rule, href);
    const nestedRules = nested ? flatten(nested, href) : [];
    return isCSSStyleRule(rule) ? [...nestedRules, rule] : nestedRules;
  });

/**
 * @description 解析类名
 * @param className - class name
 * @returns class names
 */
const parse = (className: string): string[] =>
  className
    .split(' ')
    .map((token) => token.trim())
    .filter(isNot(isEmptyish));

/**
 * @description 获取样式规则
 * @param classNames - class names
 * @param sheets - style sheets
 * @param debug - debug mode
 * @returns CSSStyleRule[]
 */
const toRules = (
  classNames: readonly string[],
  sheets: StyleSheetList,
  debug = false,
): CSSStyleRule[] =>
  Array.from(sheets)
    .filter(isSameOriginSheet)
    .flatMap((sheet) => {
      const rules = rulesOf(sheet, sheet.href);
      if (debug) console.log(sheet.href, rules);
      if (!rules) return [];
      return flatten(rules, sheet.href).filter(({ selectorText }) =>
        classNames.some((name) => matches(name)(selectorText)),
      );
    });

/**
 * @description 获取 motion target from CSSStyleDeclaration
 * @param style - CSSStyleDeclaration
 * @param resolved - resolved CSSStyleDeclaration
 * @returns Target
 */
const toTarget = (
  style: CSSStyleDeclaration,
  resolved?: CSSStyleDeclaration,
): Target =>
  Array.from(style).reduce<Target>((target, property) => {
    if (!(property in style)) return target;
    const key = property as keyof CSSStyleDeclaration;
    return append(target, {
      [toCamelCase(String(property))]: (resolved ?? style)[key],
    } as Target);
  }, {});

const reduceRules = (
  rules: CSSStyleRule[],
  resolved?: CSSStyleDeclaration,
): Target =>
  rules.reduce(
    (target, { style }) => append(target, toTarget(style, resolved)),
    {} as Target,
  );

const toStyle = (className: string, parent: Element): CSSStyleDeclaration => {
  const { ownerDocument: doc } = parent;
  const probe = doc.createElement('div');
  probe.className = className;
  probe.style.position = 'fixed';
  parent.append(probe);
  const computed = getComputedStyle(probe);
  probe.remove();
  return computed;
};

/** 将 Tailwind 类名解析为 motion `variant`（供 `animate` / `initial` 等使用）。 */
export const toVariant = (
  className: string,
  cover: Target = {},
  {
    parent,
    sheets = document.styleSheets,
    debug = false,
  }: {
    parent?: Element;
    sheets?: StyleSheetList;
    debug?: boolean;
  } = {},
): Target =>
  pipe(
    parse(className),
    (classNames) => toRules(classNames, sheets, debug),
    (rules) => reduceRules(rules, parent && toStyle(className, parent)),
    (target) => append(target, cover),
  );
