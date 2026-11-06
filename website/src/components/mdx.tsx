import type { ComponentProps } from 'react';

import { useI18n } from 'fumadocs-ui/contexts/i18n';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

import * as playgrounds from '@/components/design/playgrounds';
import { ThemeColorTokens } from '@/components/design/theme-tokens';
import { Mermaid } from '@/components/mdx/mermaid';
import { localizeHref } from '@/lib/i18n';

function LocalizedLink({
  href,
  ...props
}: ComponentProps<typeof defaultMdxComponents.a>) {
  const { locale } = useI18n();
  return (
    <defaultMdxComponents.a
      {...props}
      href={href ? localizeHref(href, locale) : href}
    />
  );
}

function LocalizedCard({
  href,
  ...props
}: ComponentProps<typeof defaultMdxComponents.Card>) {
  const { locale } = useI18n();
  return (
    <defaultMdxComponents.Card
      {...props}
      href={href ? localizeHref(href, locale) : href}
    />
  );
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    a: LocalizedLink,
    Card: LocalizedCard,
    ...playgrounds,
    Mermaid,
    ThemeColorTokens,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
