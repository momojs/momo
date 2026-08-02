import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

import {
  AccordionPlayground,
  BadgePlayground,
  ButtonPlayground,
  CheckboxPlayground,
  ControlTypesPlayground,
  DialogPlayground,
  DrawerPlayground,
  HighlightPlayground,
  IconPlayground,
  InputPlayground,
  NumericPlayground,
  PickerCorePlayground,
  PickerDatePlayground,
  PickerTimePlayground,
  RatingPlayground,
  SelectPlayground,
  SliderPlayground,
  SlotCompositionPlayground,
  SwitchPlayground,
  TabsPlayground,
  ToggleGroupPlayground,
  TweenNumberPlayground,
  UseControllableValuePlayground,
  UsePresenceGatePlayground,
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
    ControlTypesPlayground,
    DialogPlayground,
    DrawerPlayground,
    HighlightPlayground,
    IconPlayground,
    InputPlayground,
    Mermaid,
    NumericPlayground,
    PickerCorePlayground,
    PickerDatePlayground,
    PickerTimePlayground,
    RatingPlayground,
    SelectPlayground,
    SliderPlayground,
    SlotCompositionPlayground,
    SwitchPlayground,
    TabsPlayground,
    ThemeColorTokens,
    ToggleGroupPlayground,
    TweenNumberPlayground,
    UseControllableValuePlayground,
    UsePresenceGatePlayground,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
