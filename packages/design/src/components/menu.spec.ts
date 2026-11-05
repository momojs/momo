import { expect, test } from '../../playwright.fixture';
import type {} from './menu-browser.fixture';

test.use({ fixturePath: 'menu' });

test('keyboard navigation, typeahead, disabled actions and focus return', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Actions' });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByRole('menuitem', { name: 'Edit', exact: true }),
  ).toBeFocused();
  await expect(page.getByRole('group', { name: 'Project' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Archive' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await page.keyboard.press('End');
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(
    page.getByRole('menuitem', { name: 'Edit', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('d');
  await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => window.menuFixture.events))
    .toEqual([true, 'duplicate', false]);
});

test('Escape, outside press and Tab close the menu', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Actions' });
  await trigger.click();
  await expect(page.getByRole('menu')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.evaluate(() => window.menuFixture.basic({ modal: false }));
  await trigger.click();
  await page.getByRole('button', { name: 'Outside' }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('menu')).toHaveCount(0);
});

test('cancellation precedes onChange and controlled requests wait for the caller', async ({
  page,
}) => {
  await page.evaluate(() =>
    window.menuFixture.basic({
      onOpenChange: (open, details) => {
        window.menuFixture.events.push(['request', open]);
        details.cancel();
      },
    }),
  );
  await page.getByRole('button', { name: 'Actions' }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.menuFixture.events))
    .toEqual([['request', true]]);
  await page.evaluate(() => {
    const { mount, h, Menu, MenuItem, events } = window.menuFixture;
    mount(null);
    mount(
      h(
        Menu,
        {
          open: false,
          trigger: h('button', null, 'Controlled'),
          onChange: (next) => events.push(next),
        },
        h(MenuItem, null, 'Action'),
      ),
    );
  });
  await page.getByRole('button', { name: 'Controlled' }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.menuFixture.events.at(-1)))
    .toBe(true);
  await page.evaluate(() => {
    const { mount, h, Menu, MenuItem } = window.menuFixture;
    mount(
      h(
        Menu,
        { open: true, trigger: h('button', null, 'Controlled') },
        h(MenuItem, null, 'Action'),
      ),
    );
  });
  await expect(page.getByRole('menu')).toBeVisible();
});

test('trigger and item render composition retain refs, handlers and state', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { mount, h, Menu, MenuItem, createRef, events } = window.menuFixture;
    const triggerRef = createRef<HTMLButtonElement>();
    const itemRef = createRef<HTMLDivElement>();
    mount(
      h(
        Menu,
        {
          triggerProps: {
            id: 'registered',
            ref: triggerRef,
            onClick: () => events.push('trigger'),
          },
          triggerClassName: 'composed-trigger',
          trigger: h(
            'button',
            {
              id: undefined,
              className: 'original-trigger',
              onClick: () => events.push('element'),
            },
            'Compose',
          ),
          popupProps: {
            ref: () => {
              if (triggerRef.current?.id === 'registered')
                events.push('anchor-ref');
            },
          },
        },
        h(
          MenuItem,
          {
            ref: itemRef,
            className: (state) =>
              state.highlighted ? 'focused-item' : 'idle-item',
            onClick: () => events.push(itemRef.current?.tagName),
            render: (props, state) =>
              h('div', {
                ...props,
                'data-custom-highlighted': state.highlighted,
              }),
          },
          'Custom',
        ),
      ),
    );
  });
  const trigger = page.getByRole('button', { name: 'Compose' });
  await expect(trigger).toHaveAttribute('id', 'registered');
  await expect(trigger).toHaveClass(/original-trigger/);
  await expect(trigger).toHaveClass(/composed-trigger/);
  await trigger.click();
  const item = page.getByRole('menuitem', { name: 'Custom' });
  await item.hover();
  await expect(item).toHaveAttribute('data-custom-highlighted', 'true');
  await expect(item).toHaveClass(/focused-item/);
  await item.click();
  expect(await page.evaluate(() => window.menuFixture.events)).toEqual(
    expect.arrayContaining(['element', 'trigger', 'anchor-ref', 'DIV']),
  );
});

test('checkbox and radio items persist checked state and can cancel selection', async ({
  page,
}) => {
  await page.evaluate(() => {
    const {
      mount,
      h,
      Menu,
      MenuCheckboxItem,
      MenuRadioGroup,
      MenuRadioItem,
      MenuGroupLabel,
    } = window.menuFixture;
    mount(
      h(
        Menu,
        { trigger: h('button', null, 'Preferences') },
        h(MenuCheckboxItem, { defaultChecked: true }, 'Notifications'),
        h(
          MenuCheckboxItem,
          { onCheckedChange: (_, details) => details.cancel() },
          'Locked',
        ),
        h(
          MenuRadioGroup,
          { defaultValue: 0 },
          h(MenuGroupLabel, null, 'Order'),
          h(MenuRadioItem, { value: 0 }, 'Date'),
          h(MenuRadioItem, { value: 1 }, 'Name'),
        ),
      ),
    );
  });
  await page.getByRole('button', { name: 'Preferences' }).click();
  const notifications = page.getByRole('menuitemcheckbox', {
    name: 'Notifications',
  });
  await expect(notifications).toHaveAttribute('aria-checked', 'true');
  await notifications.click();
  await expect(notifications).toHaveAttribute('aria-checked', 'false');
  await expect(notifications.locator('[data-slot="menu-checkmark"]')).toHaveCSS(
    'opacity',
    '0',
  );
  await page.getByRole('menuitemcheckbox', { name: 'Locked' }).click();
  await expect(
    page.getByRole('menuitemcheckbox', { name: 'Locked' }),
  ).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('group', { name: 'Order' })).toBeVisible();
  await page.getByRole('menuitemradio', { name: 'Name' }).click();
  await expect(
    page.getByRole('menuitemradio', { name: 'Name' }),
  ).toHaveAttribute('aria-checked', 'true');
  await expect(
    page.getByRole('menuitemradio', { name: 'Date' }),
  ).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('menu')).toBeVisible();
});

test('submenu arrows navigate and selecting a child closes the whole tree', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { mount, h, Menu, MenuItem, MenuSubmenu, events } =
      window.menuFixture;
    mount(
      h(
        Menu,
        { size: 'lg', trigger: h('button', null, 'Share') },
        h(
          MenuSubmenu,
          { label: 'Export' },
          h(MenuItem, { onClick: () => events.push('pdf') }, 'PDF'),
        ),
      ),
    );
  });
  await page.getByRole('button', { name: 'Share' }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Export' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('menuitem', { name: 'PDF' })).toBeFocused();
  await expect(page.getByRole('menuitem', { name: 'PDF' })).toHaveCSS(
    'min-height',
    '36px',
  );
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('menuitem', { name: 'Export' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('menuitem', { name: 'PDF' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Share' })).toBeFocused();
  expect(await page.evaluate(() => window.menuFixture.events)).toEqual(['pdf']);
});

test('link items retain href and closeOnClick keeps actions open when requested', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { mount, h, Menu, MenuItem, MenuLinkItem } = window.menuFixture;
    mount(
      h(
        Menu,
        { trigger: h('button', null, 'Links') },
        h(MenuItem, { closeOnClick: false }, 'Keep open'),
        h(MenuLinkItem, { href: '#destination' }, 'Documentation'),
      ),
    );
  });
  await page.getByRole('button', { name: 'Links' }).click();
  await page.getByRole('menuitem', { name: 'Keep open' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  const link = page.getByRole('menuitem', { name: 'Documentation' });
  await expect(link).toHaveAttribute('href', '#destination');
  await link.click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  expect(new URL(page.url()).hash).toBe('#destination');
});

test('exit remains mounted without pointer interaction, and rapid reopening reuses one surface', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Actions' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('[data-slot="menu-popup"]')
        .evaluate((node) => node.getAnimations().length),
    )
    .toBe(0);
  const exiting = await page.evaluate(() => {
    document.getElementById('trigger')!.click();
    return new Promise<{ mounted: boolean; inert: boolean }>((resolve) =>
      requestAnimationFrame(() => {
        const positioner = document.querySelector(
          '[data-slot="menu-positioner"]',
        );
        resolve({
          mounted: !!document.querySelector(
            '[data-slot="menu-popup"][data-closed]',
          ),
          inert:
            !!positioner &&
            getComputedStyle(positioner).pointerEvents === 'none',
        });
      }),
    );
  });
  expect(exiting).toEqual({ mounted: true, inert: true });
  await page.evaluate(() => document.getElementById('trigger')!.click());
  await expect(page.getByRole('menu')).toHaveCount(1);
  await expect(page.locator('[data-slot="menu-popup"]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-slot="menu-popup"]')).toHaveCount(0);
});

test('reduced motion removes scale and off mode cleans up immediately', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Actions' }).click();
  const popup = page.locator('[data-slot="menu-popup"]');
  await expect(popup).toHaveCSS('transform', 'none');
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await page.evaluate(() => {
    const { mount, h, Menu, MenuItem } = window.menuFixture;
    mount(
      h(
        Menu,
        { trigger: h('button', null, 'Off') },
        h(MenuItem, null, 'Action'),
      ),
      'off',
    );
  });
  await page.getByRole('button', { name: 'Off' }).click();
  await expect(popup).toHaveCSS('opacity', '1');
  await expect(popup).toHaveCSS('transform', 'none');
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0, { timeout: 500 });
});

test('collision handling and long menus stay inside a narrow viewport', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 360, height: 480 });
  await page.evaluate(() => {
    const { mount, h, Menu, MenuItem } = window.menuFixture;
    mount(
      h(
        Menu,
        {
          showArrow: true,
          trigger: h(
            'button',
            { style: { position: 'fixed', right: 12, bottom: 12 } },
            'Edge',
          ),
        },
        Array.from({ length: 24 }, (_, index) =>
          h(MenuItem, { key: index }, `Action ${index}`),
        ),
      ),
    );
  });
  await page.getByRole('button', { name: 'Edge' }).click();
  const popup = page.locator('[data-slot="menu-popup"]');
  await expect(popup).toHaveAttribute('data-side', 'top');
  await expect(page.locator('[data-slot="menu-arrow"]')).toHaveAttribute(
    'data-side',
    'top',
  );
  await expect
    .poll(() => popup.evaluate((node) => node.getAnimations().length))
    .toBe(0);
  const bounds = await popup.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const content = node.querySelector('[data-slot="menu-content"]')!;
    return {
      fits:
        box.left >= 0 &&
        box.right <= innerWidth &&
        box.top >= 0 &&
        box.bottom <= innerHeight,
      scrolls: content.scrollHeight > content.clientHeight,
    };
  });
  expect(bounds).toEqual({ fits: true, scrolls: true });
  await page.evaluate(() => {
    window.menuFixture.mount(null);
    window.menuFixture.basic({ showArrow: true, size: 'lg' });
  });
  await page.getByRole('button', { name: 'Actions' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('menuitem', { name: 'Duplicate' }).hover();
  await expect
    .poll(() => popup.evaluate((node) => node.getAnimations().length))
    .toBe(0);
  await page.screenshot({ path: testInfo.outputPath('menu.png') });
});

test('disabled root does not open', async ({ page }) => {
  await page.evaluate(() => window.menuFixture.basic({ disabled: true }));
  await expect(page.getByRole('button', { name: 'Actions' })).toBeDisabled();
  await page.evaluate(() => document.getElementById('trigger')!.click());
  await expect(page.getByRole('menu')).toHaveCount(0);
});

test('initial open, trigger callbacks, group label IDs and controlled choices compose', async ({
  page,
}) => {
  await page.evaluate(() => {
    const {
      mount,
      h,
      Menu,
      MenuCheckboxItem,
      MenuRadioGroup,
      MenuRadioItem,
      MenuGroupLabel,
      events,
    } = window.menuFixture;
    mount(null);
    mount(
      h(
        Menu,
        {
          defaultOpen: true,
          trigger: (props, state) =>
            h('button', { ...props, 'data-expanded': state.open }, 'Settings'),
          onOpenChange: (open, details) => {
            if (!open) details.cancel();
          },
          onChange: (open) => events.push(open),
        },
        h(
          MenuCheckboxItem,
          { checked: true, onCheckedChange: (next) => events.push(next) },
          'Fixed checkbox',
        ),
        h(
          MenuRadioGroup,
          { value: 0, onValueChange: (next) => events.push(next) },
          h(
            MenuGroupLabel,
            { id: 'slot-label', render: h('span', { id: 'custom-label' }) },
            'Order',
          ),
          h(MenuRadioItem, { value: 0 }, 'Date'),
          h(MenuRadioItem, { value: 1 }, 'Name'),
        ),
      ),
    );
  });
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Settings' })).toHaveAttribute(
    'data-expanded',
    'true',
  );
  await expect(page.getByRole('group', { name: 'Order' })).toHaveAttribute(
    'aria-labelledby',
    'custom-label',
  );
  const checkbox = page.getByRole('menuitemcheckbox', {
    name: 'Fixed checkbox',
  });
  await checkbox.click();
  await expect(checkbox).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('menuitemradio', { name: 'Name' }).click();
  await expect(
    page.getByRole('menuitemradio', { name: 'Date' }),
  ).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-slot="menu-popup"]')).toHaveAttribute(
    'data-open',
    '',
  );
  await expect
    .poll(() => page.evaluate(() => window.menuFixture.events))
    .toEqual([false, 1]);
});

test.describe('touch interaction', () => {
  test.use({ hasTouch: true });
  test('tap opens the menu and activates an item', async ({ page }) => {
    await page.getByRole('button', { name: 'Actions' }).tap();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.getByRole('menuitem', { name: 'Edit', exact: true }).tap();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => window.menuFixture.events))
      .toEqual([true, 'edit', false]);
  });
});

async function expectHighlightAligned(
  region: import('@playwright/test').Locator,
  item: import('@playwright/test').Locator,
) {
  const highlight = region.locator('[data-slot="menu-highlight"]');
  await expect(highlight).toHaveCount(1);
  await expect
    .poll(async () => {
      const [layer, target] = await Promise.all([
        highlight.boundingBox(),
        item.boundingBox(),
      ]);
      if (!layer || !target) return Infinity;
      return Math.max(
        ...(['x', 'y', 'width', 'height'] as const).map((key) =>
          Math.abs(layer[key] - target[key]),
        ),
      );
    })
    .toBeLessThan(1);
}

test('surface slots compose semantic IDs, elements, callbacks, refs and footer actions', async ({
  page,
}, testInfo) => {
  await page.evaluate(() => {
    const { mount, h, Menu, MenuItem, events } = window.menuFixture;
    mount(
      h(
        Menu,
        {
          trigger: h('button', null, 'Open workspace'),
          title: 'Workspace actions',
          description: 'Manage the current project',
          footer: h(MenuItem, { variant: 'danger' }, 'Delete workspace'),
          className: 'w-64',
          slots: {
            header: h('header'),
            title: {
              id: 'slot-title',
              render: h('h3', { id: 'render-title' }),
            },
            description: {
              id: 'description',
              render: h('p', { id: undefined }),
            },
            content: {
              className: 'custom-content',
              ref: (node) => {
                if (node) events.push(node.tagName);
              },
              onClick: () => events.push('content-click'),
              render: (props, state) =>
                h('section', {
                  ...props,
                  'data-state-size': Object.keys(state).length,
                }),
            },
            footer: (props) => h('footer', props),
          },
        },
        h(
          MenuItem,
          {
            closeOnClick: false,
            shortcut: '⌘E',
            description: 'Update project details',
          },
          'Edit project',
        ),
      ),
    );
  });
  await page.getByRole('button', { name: 'Open workspace' }).click();
  const menu = page.getByRole('menu', { name: 'Workspace actions' });
  await expect(menu).toHaveAttribute('aria-labelledby', 'render-title');
  await expect(menu).toHaveAttribute('aria-describedby', 'description');
  await expect(menu).toHaveAccessibleDescription('Manage the current project');
  await expect(menu.locator('header h3')).toHaveText('Workspace actions');
  const content = menu.locator('section[data-slot="menu-content"]');
  await expect(content).toHaveClass(/custom-content/);
  await expect(content).toHaveAttribute('data-state-size', '0');
  const item = menu.getByRole('menuitem', {
    name: 'Edit project Update project details',
  });
  await item.click();
  await expectHighlightAligned(content, item);
  const footer = menu.locator('footer[data-slot="menu-footer"]');
  const action = footer.getByRole('menuitem', { name: 'Delete workspace' });
  await action.hover();
  await expectHighlightAligned(footer, action);
  await expect(content.locator('[data-slot="menu-highlight"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.menuFixture.events)).toEqual(
    expect.arrayContaining(['SECTION', 'content-click']),
  );
  await page.screenshot({
    path: testInfo.outputPath('menu-content-slots.png'),
  });
});

test('empty values and false slots follow shared content rules without dangling ARIA', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { mount, h, Menu } = window.menuFixture;
    mount(null);
    mount(
      h(
        Menu,
        {
          defaultOpen: true,
          trigger: h('button', null, 'Content'),
          title: 0,
          description: '',
          footer: 0,
        },
        0,
      ),
    );
  });
  await expect(page.locator('[data-slot="menu-title"]')).toHaveText('0');
  await expect(page.locator('[data-slot="menu-description"]')).toHaveCount(1);
  await expect(page.locator('[data-slot="menu-content"]')).toHaveText('0');
  await expect(page.locator('[data-slot="menu-footer"]')).toHaveText('0');
  await page.evaluate(() => {
    const { mount, h, Menu, MenuItem } = window.menuFixture;
    mount(
      h(
        Menu,
        {
          defaultOpen: true,
          trigger: h('button', null, 'Content'),
          title: 'Hidden title',
          description: 'Hidden description',
          footer: 'Hidden footer',
          slots: { header: false, content: false, footer: false },
        },
        h(MenuItem, null, 'Hidden action'),
      ),
    );
  });
  await expect(page.getByRole('menu', { name: 'Content' })).toBeVisible();
  await expect(page.getByRole('menu')).not.toHaveAttribute('aria-describedby');
  for (const name of ['header', 'title', 'description', 'content', 'footer']) {
    await expect(page.locator(`[data-slot="menu-${name}"]`)).toHaveCount(0);
  }
  await page.evaluate(() => {
    const { mount, h, Menu } = window.menuFixture;
    mount(
      h(Menu, {
        defaultOpen: true,
        title: false,
        description: null,
        footer: undefined,
      }),
    );
  });
  await expect(page.locator('[data-slot="menu-header"]')).toHaveCount(0);
  await expect(page.locator('[data-slot="menu-content"]')).toHaveCount(0);
  await expect(page.locator('[data-slot="menu-footer"]')).toHaveCount(0);
});

test('item slots preserve state, content, event composition and animated selection', async ({
  page,
}) => {
  await page.evaluate(() => {
    const {
      mount,
      h,
      Menu,
      MenuItem,
      MenuCheckboxItem,
      MenuRadioGroup,
      MenuRadioItem,
      events,
    } = window.menuFixture;
    mount(
      h(
        Menu,
        { trigger: h('button', null, 'Slots') },
        h(
          MenuItem,
          {
            closeOnClick: false,
            icon: '★',
            shortcut: '⌘E',
            description: 'Change settings',
            slots: {
              icon: { render: h('span', { className: 'custom-icon' }) },
              content: (props, state) =>
                h('span', { ...props, 'data-focused': state.highlighted }),
              description: { className: 'custom-description' },
              shortcut: {
                render: h('kbd'),
                ref: (node) => {
                  if (node) events.push(node.tagName);
                },
              },
            },
          },
          'Edit',
        ),
        h(
          MenuCheckboxItem,
          {
            slots: {
              content: (props, state) =>
                h('span', { ...props, 'data-checked': state.checked }),
              indicator: (props, state) =>
                h('span', { ...props, 'data-selection': state.checked }),
            },
          },
          'Notifications',
        ),
        h(
          MenuRadioGroup,
          { defaultValue: 'a' },
          h(
            MenuRadioItem,
            {
              value: 'a',
              slots: { indicator: h('span', { className: 'radio-indicator' }) },
            },
            'First',
          ),
          h(
            MenuRadioItem,
            { value: 'b', slots: { indicator: false } },
            'Second',
          ),
        ),
        h(
          MenuItem,
          {
            icon: '★',
            shortcut: '⌘H',
            description: 'Hidden',
            slots: { icon: false, description: false, shortcut: false },
          },
          'Minimal',
        ),
      ),
    );
  });
  await page.getByRole('button', { name: 'Slots' }).click();
  const item = page.getByRole('menuitem', { name: 'Edit Change settings' });
  await item.hover();
  await expect(item.locator('[data-slot="menu-item-content"]')).toHaveAttribute(
    'data-focused',
    'true',
  );
  await expect(item.locator('kbd')).toHaveText('⌘E');
  await expect(item.locator('.custom-icon')).toHaveText('★');
  await expect(item.locator('.custom-description')).toHaveText(
    'Change settings',
  );
  const checkbox = page.getByRole('menuitemcheckbox', {
    name: 'Notifications',
  });
  const mark = checkbox.locator('[data-slot="menu-checkmark"]');
  await expect(mark).toHaveCSS('opacity', '0');
  await checkbox.click();
  await expect(mark).toHaveCSS('opacity', '1');
  await expect(
    checkbox.locator('[data-slot="menu-item-indicator"]'),
  ).toHaveAttribute('data-selection', 'true');
  await expect(
    checkbox.locator('[data-slot="menu-item-content"]'),
  ).toHaveAttribute('data-checked', 'true');
  await page.getByRole('menuitemradio', { name: 'Second' }).click();
  await expect(
    page.locator('.radio-indicator [data-slot="menu-checkmark"]'),
  ).toHaveCSS('opacity', '0');
  await expect(
    page
      .getByRole('menuitemradio', { name: 'Second' })
      .locator('[data-slot="menu-item-indicator"]'),
  ).toHaveCount(0);
  const minimal = page.getByRole('menuitem', { name: 'Minimal' });
  for (const slot of ['icon', 'description', 'shortcut']) {
    await expect(
      minimal.locator(`[data-slot="menu-item-${slot}"]`),
    ).toHaveCount(0);
  }
  expect(await page.evaluate(() => window.menuFixture.events)).toContain('KBD');
});

test('one shared highlight follows keyboard and pointer navigation across groups', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Actions' }).focus();
  await page.keyboard.press('ArrowDown');
  const content = page.locator('[data-slot="menu-content"]');
  const highlight = content.locator('[data-slot="menu-highlight"]');
  await expectHighlightAligned(
    content,
    page.getByRole('menuitem', { name: 'Edit', exact: true }),
  );
  await highlight.evaluate((node) =>
    node.setAttribute('data-instance', 'original'),
  );
  await page.keyboard.press('ArrowDown');
  const disabled = page.getByRole('menuitem', { name: 'Archive' });
  await expect(disabled).toBeFocused();
  await expectHighlightAligned(content, disabled);
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.menuFixture.events)).toEqual([true]);
  await page.keyboard.press('ArrowDown');
  const duplicate = page.getByRole('menuitem', { name: 'Duplicate' });
  await expect(duplicate).toBeFocused();
  await expectHighlightAligned(content, duplicate);
  await expect(highlight).toHaveAttribute('data-instance', 'original');
  const neutral = await highlight.evaluate(
    (node) => getComputedStyle(node).backgroundColor,
  );
  const danger = page.getByRole('menuitem', { name: 'Delete' });
  await danger.hover();
  await expectHighlightAligned(content, danger);
  await expect(highlight).toHaveAttribute('data-instance', 'original');
  expect(
    await highlight.evaluate((node) => getComputedStyle(node).backgroundColor),
  ).not.toBe(neutral);
  await page.keyboard.press('Home');
  await expectHighlightAligned(
    content,
    page.getByRole('menuitem', { name: 'Edit', exact: true }),
  );
});

test('submenus inherit surface slots and keep their own highlight while the parent stays active', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { mount, h, Menu, MenuItem, MenuSubmenu } = window.menuFixture;
    mount(
      h(
        Menu,
        { trigger: h('button', null, 'Tree') },
        h(
          MenuSubmenu,
          {
            label: 'Export',
            title: 'File format',
            description: 'Choose a format',
            footer: 'Saved locally',
            slots: { title: h('h4'), footer: h('footer') },
            triggerProps: {
              slots: {
                arrow: (props, state) =>
                  h('span', { ...props, 'data-expanded': state.open }),
              },
            },
          },
          h(MenuItem, null, 'PDF'),
          h(MenuItem, null, 'CSV'),
        ),
        h(MenuItem, null, 'Rename'),
      ),
    );
  });
  await page.getByRole('button', { name: 'Tree' }).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  const root = page.getByRole('menu', { name: 'Tree', exact: true });
  const child = page.getByRole('menu', { name: 'File format', exact: true });
  await expect(child.locator('h4')).toHaveText('File format');
  await expect(child.locator('footer')).toHaveText('Saved locally');
  await expect(child).toHaveAccessibleDescription('Choose a format');
  await expect(
    root.locator('[data-slot="menu-submenu-arrow"]'),
  ).toHaveAttribute('data-expanded', 'true');
  await expectHighlightAligned(
    root.locator('[data-slot="menu-content"]'),
    root.getByRole('menuitem', { name: 'Export' }),
  );
  await expectHighlightAligned(
    child.locator('[data-slot="menu-content"]'),
    child.getByRole('menuitem', { name: 'PDF' }),
  );
  await page.keyboard.press('ArrowDown');
  await expectHighlightAligned(
    child.locator('[data-slot="menu-content"]'),
    child.getByRole('menuitem', { name: 'CSV' }),
  );
  await page.keyboard.press('ArrowLeft');
  await expect(child).toHaveCount(0);
  await expectHighlightAligned(
    root.locator('[data-slot="menu-content"]'),
    root.getByRole('menuitem', { name: 'Export' }),
  );
  await page.keyboard.press('ArrowDown');
  await expectHighlightAligned(
    root.locator('[data-slot="menu-content"]'),
    root.getByRole('menuitem', { name: 'Rename' }),
  );
});

test('highlight follows scroll and resize with a fixed header and footer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 480 });
  await page.evaluate(() => {
    const { mount, h, Menu, MenuItem } = window.menuFixture;
    mount(
      h(
        Menu,
        {
          title: 'Long menu',
          footer: '24 actions',
          className: 'w-56',
          trigger: h('button', null, 'Scroll'),
        },
        Array.from({ length: 24 }, (_, index) =>
          h(MenuItem, { key: index }, `Action ${index}`),
        ),
      ),
    );
  });
  await page.getByRole('button', { name: 'Scroll' }).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  const content = page.locator('[data-slot="menu-content"]');
  const last = page.getByRole('menuitem', { name: 'Action 23' });
  await expect(last).toBeFocused();
  await expectHighlightAligned(content, last);
  expect(await content.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await page.locator('[data-slot="menu-popup"]').evaluate((node) => {
    node.style.width = '280px';
  });
  await expectHighlightAligned(content, last);
  await page.keyboard.press('Home');
  await expectHighlightAligned(
    content,
    page.getByRole('menuitem', { name: 'Action 0', exact: true }),
  );
  await expect(page.locator('[data-slot="menu-title"]')).toBeInViewport();
  await expect(page.locator('[data-slot="menu-footer"]')).toBeInViewport();
});

for (const direction of ['ltr', 'rtl'] as const) {
  test(`aligns all item types and keeps selection stable in ${direction}`, async ({
    page,
  }) => {
    await page.evaluate((direction) => {
      const {
        h,
        mount,
        DirectionProvider,
        Menu,
        MenuGroup,
        MenuGroupLabel,
        MenuItem,
        MenuLinkItem,
        MenuCheckboxItem,
        MenuRadioGroup,
        MenuRadioItem,
        MenuSubmenu,
      } = window.menuFixture;
      mount(
        h(
          DirectionProvider,
          { direction },
          h(
            'div',
            { dir: direction },
            h(
              Menu,
              {
                trigger: h('button', null, 'Layout'),
                popupProps: { style: { width: 320 } },
              },
              h(
                MenuGroup,
                null,
                h(MenuGroupLabel, { id: 'layout-label' }, 'Settings'),
                h(
                  MenuItem,
                  { id: 'with-icon', icon: '★', closeOnClick: false },
                  'Edit',
                ),
                h(
                  MenuItem,
                  { id: 'without-icon', closeOnClick: false },
                  'Duplicate',
                ),
                h(
                  MenuLinkItem,
                  { id: 'link', href: '#layout' },
                  'Documentation',
                ),
                h(
                  MenuCheckboxItem,
                  {
                    id: 'toggle',
                    shortcut: '⌘N',
                    extra: 0,
                    slots: {
                      shortcut: h('kbd'),
                      extra: (props, state) =>
                        h('span', { ...props, 'data-checked': state.checked }),
                    },
                  },
                  'Notifications',
                ),
                h(
                  MenuRadioGroup,
                  { defaultValue: 'a' },
                  h(
                    MenuRadioItem,
                    { id: 'radio', value: 'a', disabled: true },
                    'Automatic',
                  ),
                  h(
                    MenuRadioItem,
                    {
                      id: 'hidden-indicator',
                      value: 'b',
                      slots: { indicator: false },
                    },
                    'Manual',
                  ),
                ),
                h(
                  MenuSubmenu,
                  {
                    label: 'Sort',
                    triggerProps: {
                      id: 'submenu',
                      extra: 'Date',
                      slots: { extra: h('em') },
                    },
                  },
                  h(MenuItem, null, 'Nested action'),
                ),
              ),
            ),
          ),
        ),
        'off',
      );
    }, direction);
    await page.getByRole('button', { name: 'Layout' }).click();
    const popup = page.locator('[data-slot="menu-popup"]').first();
    await expect
      .poll(() => popup.evaluate((node) => getComputedStyle(node).transform))
      .toBe('none');
    await expect(popup).toHaveCSS('direction', direction);
    const measure = () =>
      page.evaluate((direction) => {
        const ids = [
          'with-icon',
          'without-icon',
          'link',
          'toggle',
          'radio',
          'hidden-indicator',
          'submenu',
        ];
        const edge = (rect: DOMRect) =>
          direction === 'ltr' ? rect.left : rect.right;
        const rows = ids.map((id) => {
          const row = document.getElementById(id)!;
          const content = row
            .querySelector('[data-slot="menu-item-content"]')!
            .getBoundingClientRect();
          const indicator = row
            .querySelector(
              '[data-slot="menu-item-indicator"], [data-slot="menu-submenu-arrow"]',
            )
            ?.getBoundingClientRect();
          const auxiliary = row
            .querySelector('[data-slot="menu-item-auxiliary"]')
            ?.getBoundingClientRect();
          return {
            start: edge(content),
            width: content.width,
            height: content.height,
            indicator: indicator && { x: indicator.x, width: indicator.width },
            auxiliary: auxiliary && {
              left: auxiliary.left,
              right: auxiliary.right,
            },
          };
        });
        const label = document.getElementById('layout-label')!;
        const padding = parseFloat(getComputedStyle(label).paddingInlineStart);
        return {
          rows,
          labelStart:
            edge(label.getBoundingClientRect()) +
            (direction === 'ltr' ? padding : -padding),
          popupWidth: document
            .querySelector('[data-slot="menu-popup"]')!
            .getBoundingClientRect().width,
        };
      }, direction);
    const before = await measure();
    for (const row of before.rows)
      expect(row.start).toBeCloseTo(before.labelStart, 1);
    const toggle = page.locator('#toggle');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(toggle.locator('kbd')).toHaveText('⌘N');
    await expect(toggle.locator('[data-slot="menu-item-extra"]')).toHaveText(
      '0',
    );
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(
      toggle.locator('[data-slot="menu-item-extra"]'),
    ).toHaveAttribute('data-checked', 'true');
    await expect(toggle.locator('[data-slot="menu-checkmark"]')).toHaveCSS(
      'opacity',
      '1',
    );
    expect(await measure()).toEqual(before);
    const indicators = before.rows.flatMap((row) =>
      row.indicator ? [row.indicator] : [],
    );
    for (const indicator of indicators) {
      expect(indicator.width).toBe(16);
      expect(indicator.x).toBeCloseTo(indicators[0]!.x, 1);
    }
    const auxiliary = before.rows[3]!.auxiliary!;
    const indicator = before.rows[3]!.indicator!;
    if (direction === 'ltr') expect(auxiliary.right).toBeLessThan(indicator.x);
    else expect(auxiliary.left).toBeGreaterThan(indicator.x + indicator.width);
    await expect(page.locator('#radio')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.locator('#radio [data-slot="menu-checkmark"]')).toHaveCSS(
      'opacity',
      '1',
    );
    await expect(
      page.locator('#hidden-indicator [data-slot="menu-item-indicator"]'),
    ).toHaveCount(0);
    const submenu = page.locator('#submenu');
    await expect(submenu.locator('em')).toHaveText('Date');
    await expect(
      submenu.locator('[data-slot="menu-item-indicator"]'),
    ).toHaveCount(0);
    const arrow = submenu.locator('[data-slot="menu-submenu-arrow"]');
    const scale = await arrow.evaluate(
      (node) => new DOMMatrix(getComputedStyle(node).transform).a,
    );
    // Tailwind uses the independent rotate property when supported.
    if (direction === 'rtl') {
      expect(
        await arrow.evaluate(
          (node) =>
            getComputedStyle(node).rotate === '180deg' ||
            new DOMMatrix(getComputedStyle(node).transform).a === -1,
        ),
      ).toBe(true);
    } else expect(scale).toBe(1);
    await submenu.focus();
    await page.keyboard.press(direction === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
    await expect(
      page.getByRole('menuitem', { name: 'Nested action' }),
    ).toBeFocused();
    await page.keyboard.press(direction === 'ltr' ? 'ArrowLeft' : 'ArrowRight');
    await expect(submenu).toBeFocused();
    await expect(page.getByRole('menu')).toHaveCount(1);
  });
}

test('constrains long content and auxiliary information without losing the end indicator', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.evaluate(() => {
    const { h, mount, Menu, MenuCheckboxItem, MenuItem } = window.menuFixture;
    mount(
      h(
        Menu,
        {
          trigger: h('button', null, 'Narrow'),
          popupProps: { style: { width: 240 } },
        },
        h(
          MenuCheckboxItem,
          {
            id: 'long-row',
            defaultChecked: true,
            icon: '★',
            description:
              'description-with-an-unbroken-word-that-must-wrap-inside-the-content-column',
            extra: 'A very long current value',
            shortcut: 'Ctrl+Shift+Alt+N',
          },
          'A long title that wraps to several lines',
        ),
        h(
          MenuItem,
          {
            id: 'minimal-row',
            icon: '★',
            extra: 0,
            shortcut: '⌘N',
            slots: { icon: false, extra: false, shortcut: false },
          },
          'Minimal',
        ),
      ),
      'off',
    );
  });
  await page.getByRole('button', { name: 'Narrow' }).click();
  const row = page.locator('#long-row');
  await expect(row).toBeVisible();
  const geometry = await row.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const content = node.querySelector('[data-slot="menu-item-content"]')!;
    const aux = node.querySelector('[data-slot="menu-item-auxiliary"]')!;
    const indicator = node.querySelector('[data-slot="menu-item-indicator"]')!;
    return {
      row: { width: node.clientWidth, scroll: node.scrollWidth },
      content: {
        width: content.clientWidth,
        scroll: content.scrollWidth,
        height: content.clientHeight,
      },
      aux: aux.getBoundingClientRect().width,
      indicatorEnd: indicator.getBoundingClientRect().right,
      right: box.right,
    };
  });
  expect(geometry.row.scroll).toBeLessThanOrEqual(geometry.row.width);
  expect(geometry.content.scroll).toBeLessThanOrEqual(geometry.content.width);
  expect(geometry.content.height).toBeGreaterThan(40);
  expect(geometry.aux).toBeLessThanOrEqual(geometry.row.width * 0.4);
  expect(geometry.indicatorEnd).toBeLessThan(geometry.right);
  await expect(
    page.locator('#minimal-row [data-slot="menu-item-icon"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('#minimal-row [data-slot="menu-item-auxiliary"]'),
  ).toHaveCount(0);
});
