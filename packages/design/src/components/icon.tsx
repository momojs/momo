'use client';

import type { ComponentProps } from 'react';

import type { IconInput } from 'morphicons';

import { useIconPath } from '../shared/icon-path.js';

/** Stroke-based SVG node data or a raw path, with both states on the same grid. */
export type IconData = IconInput;

export interface IconProps
  extends Omit<ComponentProps<'svg'>, 'children' | 'dangerouslySetInnerHTML'> {
  icon: IconData;
  /** Animate subsequent icon changes. The initial icon always renders at rest. */
  morph?: boolean;
  size?: number | string;
  /** Accessible name for a standalone icon. Decorative icons need no label. */
  label?: string;
}

/** A themed stroke icon that morphs when its data changes. */
export function Icon({
  icon,
  morph = true,
  size = 18,
  strokeWidth = 1.8,
  color = 'currentColor',
  label,
  ...props
}: IconProps) {
  const path = useIconPath(icon, morph);
  const named = Boolean(
    label || props['aria-label'] || props['aria-labelledby'],
  );

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      role={named ? 'img' : undefined}
      aria-hidden={named ? undefined : true}
      focusable='false'
      {...props}
      data-slot='icon'
    >
      {label && <title>{label}</title>}
      <path {...path} />
    </svg>
  );
}
