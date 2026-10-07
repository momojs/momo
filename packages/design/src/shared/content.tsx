'use client';

import type { Key, ReactNode } from 'react';
import { isValidElement } from 'react';

import { useRender } from '@base-ui/react/use-render';

/** Content shared by composed surfaces. Values always describe children. */
export interface ContentProps {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

/** Node configuration; content belongs to the component's content props. */
export type ContentSlotProps<Props> = Omit<Props, 'children'>;

/**
 * A props object or shorthand for the node's own render prop. A configured key
 * is concrete; ReactElement's nullable key cannot masquerade as a props object.
 */
export type ContentSlotConfig<Props> =
  | (ContentSlotProps<Props> & { key?: Key })
  | (Props extends { render?: infer Render } ? NonNullable<Render> : never)
  | false;

/** Undefined keeps the default node; false removes an optional node. */
export interface ContentSlotsProps<Slots> {
  slots?: {
    [Name in keyof Slots]?: ContentSlotConfig<Slots[Name]>;
  };
}

type ResolvedContentSlots<Slots> = {
  [Name in keyof Slots]?: ContentSlotProps<Slots[Name]> | false;
};

type ContentNodeProps = { id?: string; render?: unknown };

/** A composable container for headers, bodies, and footers. */
export interface ContentContainerProps extends useRender.ComponentProps<'div'> {
  'data-slot'?: string;
}

export function useContentRender({ render, ...props }: ContentContainerProps) {
  return useRender({ defaultTagName: 'div', render, props });
}

/** Empty strings and zero are content; absent values and false are not. */
export function hasContent(value: ReactNode) {
  return value !== undefined && value !== null && value !== false;
}

/** Normalize render shorthand and keep semantic IDs in sync with render elements. */
function asContentSlot<Props extends ContentNodeProps>(
  slot: ContentSlotConfig<Props> | undefined,
): ContentSlotProps<Props> | false | undefined {
  if (slot === undefined || slot === false) return slot;
  // The conditional render type is constrained by each node's public props.
  const props = (
    isValidElement(slot) || typeof slot === 'function'
      ? { render: slot }
      : { ...slot }
  ) as ContentSlotProps<Props>;
  const id = isValidElement<{ id?: string }>(props.render)
    ? (props.render.props.id ?? props.id)
    : props.id;
  if (id === undefined) delete props.id;
  else props.id = id;
  return props;
}

/** Resolve once before reading slot props or composing semantic nodes. */
export function asContentSlots<
  Slots extends { [Name in keyof Slots]: ContentNodeProps },
>(slots: ContentSlotsProps<Slots>['slots'] = {}): ResolvedContentSlots<Slots> {
  const resolved: ResolvedContentSlots<Slots> = {};
  for (const name of Object.keys(slots) as Array<keyof Slots>) {
    resolved[name] = asContentSlot<Slots[typeof name]>(slots[name]);
  }
  return resolved;
}
