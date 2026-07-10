import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

import {
  ButtonPlayground,
  CalendarPlayground,
  IconPlayground,
  PickerDatePlayground,
  PickerTimePlayground,
  SegmentedPlayground,
  SelectPlayground,
  SliderPlayground,
  SwitchPlayground,
  TabsPlayground,
  ToggleGroupPlayground,
  TweenNumberPlayground,
} from '@/components/design/playgrounds';
import { Mermaid } from '@/components/mdx/mermaid';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ButtonPlayground,
    CalendarPlayground,
    IconPlayground,
    Mermaid,
    PickerDatePlayground,
    PickerTimePlayground,
    SegmentedPlayground,
    SelectPlayground,
    SliderPlayground,
    SwitchPlayground,
    TabsPlayground,
    ToggleGroupPlayground,
    TweenNumberPlayground,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
