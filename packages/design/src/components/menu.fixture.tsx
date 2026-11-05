import type React from 'react';

import { Button } from './button.js';
import {
  Menu as BaseMenu,
  MenuCheckboxItem as BaseMenuCheckboxItem,
  MenuGroup as BaseMenuGroup,
  MenuItem as BaseMenuItem,
  MenuRadioGroup as BaseMenuRadioGroup,
  MenuRadioItem as BaseMenuRadioItem,
  MenuSeparator as BaseMenuSeparator,
} from './menu.js';

export {
  BaseMenuCheckboxItem as MenuCheckboxItem,
  BaseMenuGroup as MenuGroup,
  BaseMenuItem as MenuItem,
  BaseMenuRadioGroup as MenuRadioGroup,
  BaseMenuRadioItem as MenuRadioItem,
  BaseMenuSeparator as MenuSeparator,
};

export function Menu({
  children,
  ...props
}: React.ComponentProps<typeof BaseMenu>) {
  return (
    <BaseMenu trigger={<Button>Open Menu</Button>} {...props}>
      {children}
    </BaseMenu>
  );
}
