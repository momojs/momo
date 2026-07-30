import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

import {
  AccordionPlayground,
  BadgePlayground,
  ButtonPlayground,
  CheckboxPlayground,
  DialogPlayground,
  IconPlayground,
  InputPlayground,
  NumericPlayground,
  PickerDatePlayground,
  PickerTimePlayground,
  RatingPlayground,
  SelectPlayground,
  SliderPlayground,
  SwitchPlayground,
  TabsPlayground,
  ToggleGroupPlayground,
  TweenNumberPlayground,
} from '@/components/design/playgrounds';
import { ThemeColorTokens } from '@/components/design/theme-tokens';
import { Mermaid } from '@/components/mdx/mermaid';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    AccordionPlayground,
    BadgePlayground,
    ButtonPlayground,
    CheckboxPlayground,
    DialogPlayground,
    IconPlayground,
    InputPlayground,
    Mermaid,
    NumericPlayground,
    PickerDatePlayground,
    PickerTimePlayground,
    RatingPlayground,
    SelectPlayground,
    SliderPlayground,
    SwitchPlayground,
    TabsPlayground,
    ThemeColorTokens,
    ToggleGroupPlayground,
    TweenNumberPlayground,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
