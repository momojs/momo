import { expect, test } from '../../playwright.fixture';
import type {} from './combobox.fixture';

test.use({ fixturePath: 'combobox', readySelector: '#fruit' });

test('filters JSX labels, keeps focus on input and selects with the keyboard', async ({
  page,
}) => {
  const input = page.getByRole('combobox', { name: 'Fruit' });
  await input.fill('che');
  await expect(page.getByRole('option')).toHaveCount(1);
  await expect(page.getByRole('option')).toHaveText('Cherry');
  await input.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', /.+/);
  await expect(input).toBeFocused();
  await input.press('Enter');
  await expect(input).toHaveValue('Cherry');
  await expect(page.locator('#value')).toHaveText('"cherry"');
  await expect(page.locator('[data-slot=combobox-popup]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.locator('#submitted')).toHaveText('["cherry"]');
});

test('announces an empty result and clears to null, preserving numeric values', async ({
  page,
}) => {
  const input = page.getByRole('combobox');
  await input.fill('not found');
  await expect(page.locator('[data-slot=combobox-empty]')).toHaveText(
    'No results found.',
  );
  await expect(page.getByRole('option')).toHaveCount(0);
  await input.fill('Zero');
  await page.getByRole('option', { name: 'Zero', exact: true }).click();
  await expect(page.locator('#value')).toHaveText('0');
  await page.getByRole('button', { name: 'Clear selection' }).click();
  await expect(input).toHaveValue('');
  await expect(page.locator('#value')).toHaveText('null');
  await input.fill('String');
  await page.getByRole('option', { name: 'String zero', exact: true }).click();
  await expect(page.locator('#value')).toHaveText('"0"');
});

test('disabled items cannot be selected and indicators only mark selected values', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Show options' }).click();
  await expect(page.getByRole('option', { name: 'Banana' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  const input = page.getByRole('combobox');
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(page.locator('#value')).toHaveText('null');
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(input).toHaveValue('Cherry');
  await input.click();
  await expect(page.getByRole('option', { name: 'Cherry' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(
    page
      .getByRole('option', { name: 'Apple' })
      .locator('[data-slot=combobox-item-indicator]'),
  ).toBeHidden();
  await expect(
    page
      .getByRole('option', { name: 'Cherry' })
      .locator('[data-slot=combobox-item-indicator]'),
  ).toBeVisible();
});

test('multiple selection renders removable chips and submits each value', async ({
  page,
}) => {
  await page.goto('/combobox?case=multiple');
  const input = page.getByRole('combobox');
  await expect(page.locator('[data-slot=combobox-chip]')).toHaveText(['Apple']);
  await input.fill('che');
  await page.getByRole('option', { name: 'Cherry' }).click();
  await expect(page.locator('[data-slot=combobox-chip]')).toHaveText([
    'Apple',
    'Cherry',
  ]);
  await input.press('Escape');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.locator('#submitted')).toHaveText('["apple","cherry"]');
  await page.getByRole('button', { name: 'Remove Apple' }).click();
  await expect(page.locator('#value')).toHaveText('["cherry"]');
  await page.getByRole('button', { name: 'Clear selection' }).click();
  await expect(page.locator('#value')).toHaveText('[]');
});

test('canceled selection and opening do not update state or simplified callbacks', async ({
  page,
}) => {
  await page.evaluate(() =>
    window.comboboxFixture.configure({ cancelValue: true }),
  );
  await page.getByRole('combobox').fill('app');
  await page.getByRole('option', { name: 'Apple' }).click();
  expect(await page.evaluate(() => window.comboboxFixture.changes)).toEqual([]);
  expect(await page.evaluate(() => window.comboboxFixture.requests)).toContain(
    'apple',
  );
  await page.getByRole('combobox').press('Escape');
  await expect(page.locator('[data-slot=combobox-popup]')).toHaveCount(0);
  await page.evaluate(() =>
    window.comboboxFixture.configure({ cancelOpen: true }),
  );
  await page.getByRole('button', { name: 'Show options' }).click();
  await expect(page.getByRole('combobox')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

test('controlled selection waits for the caller; defaultValue works without a controller', async ({
  page,
}) => {
  await page.goto('/combobox?case=fixed');
  await page.getByRole('combobox').fill('app');
  await page.getByRole('option', { name: 'Apple' }).click();
  expect(await page.evaluate(() => window.comboboxFixture.changes)).toEqual([
    'apple',
  ]);
  await expect(page.locator('#value')).toHaveText('null');
  await page.goto('/combobox?case=default');
  await expect(page.getByRole('combobox')).toHaveValue('Zero');
  await page.getByRole('combobox').fill('che');
  await page.getByRole('option', { name: 'Cherry' }).click();
  await expect(page.getByRole('combobox')).toHaveValue('Cherry');
});

test('disabled and readonly controls reject edits', async ({ page }) => {
  await page.evaluate(() =>
    window.comboboxFixture.configure({ disabled: true }),
  );
  await expect(page.getByRole('combobox')).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Show options' }),
  ).toBeDisabled();
  await page.evaluate(() =>
    window.comboboxFixture.configure({ disabled: false, readOnly: true }),
  );
  await expect(page.getByRole('combobox')).toHaveAttribute('readonly', '');
  await page.getByRole('combobox').focus();
  await page.getByRole('combobox').press('ArrowDown');
  await expect(page.getByRole('combobox')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

test('controlled query and external filtering are independent of selection', async ({
  page,
}) => {
  await page.goto('/combobox?case=query');
  await expect(page.getByRole('combobox')).toHaveValue('che');
  await expect(page.locator('#value')).toHaveText('null');
  await page.getByRole('combobox').fill('apple');
  await expect(page.getByRole('combobox')).toHaveValue('che');
  await page.goto('/combobox?case=filtered');
  await page.getByRole('combobox').fill('apple');
  await expect(page.getByRole('option')).toHaveCount(1);
  await expect(page.getByRole('option')).toHaveText('Cherry');
});

test('Escape retains the exiting surface before unmount and reduced motion disables scaling', async ({
  page,
}) => {
  const input = page.getByRole('combobox');
  await input.fill('app');
  const popup = page.locator('[data-slot=combobox-popup]');
  await expect(popup).toBeVisible();
  await expect(popup).toHaveCSS('opacity', '1');
  await input.press('Escape');
  await expect(input).toBeFocused();
  await expect(popup).toHaveAttribute('data-closed', '');
  await expect(popup).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await input.fill('che');
  await expect(popup).toBeVisible();
  await expect(popup).toHaveCSS('transform', 'none');
});

test('popup follows the full input group width and forwards slot props', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Show options' }).click();
  const control = await page
    .locator('[data-slot=combobox-control]')
    .boundingBox();
  const popup = page.locator('[data-slot=combobox-popup]');
  await expect(popup).toHaveCSS('opacity', '1');
  const box = await popup.boundingBox();
  expect(Math.abs(box!.width - control!.width)).toBeLessThan(2);
  await expect(page.getByRole('combobox')).toHaveAttribute('data-open', 'true');
  await expect(page.getByRole('option').first()).toHaveClass(/custom-item/);
});

test('keyboard and pointer highlights move the shared highlight layer', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Show options' }).click();
  const highlight = page.locator(
    '[data-slot=combobox-list] > [data-slot=highlight]',
  );
  // Measure both boxes per poll; the popup itself is still settling.
  const offset = (name: string) => async () => {
    const target = await page.getByRole('option', { name }).boundingBox();
    const layer = await highlight.boundingBox();
    return target && layer ? Math.abs(target.y - layer.y) : Infinity;
  };
  await expect(highlight).toHaveCount(0);
  await page.getByRole('combobox').press('ArrowDown');
  await expect(highlight).toHaveCount(1);
  await expect.poll(offset('Apple')).toBeLessThan(1);
  await page.getByRole('option', { name: 'Cherry' }).hover();
  await expect.poll(offset('Cherry')).toBeLessThan(1);
  await expect(page.getByRole('option', { name: 'Apple' })).not.toHaveClass(
    /bg-momo-bg-surface-muted/,
  );
});

test('the suffix shows the open-state arrow and empty text keeps a mounted region', async ({
  page,
}) => {
  const suffix = page.locator('[data-slot=combobox-suffix]');
  // The open popup hides outside nodes from the accessibility tree.
  const trigger = page.locator('[data-slot=combobox-trigger]');
  await trigger.click();
  await expect(trigger).toHaveAttribute('data-popup-open', '');
  await expect(suffix).toHaveAttribute('data-action', 'trigger');
  await expect(suffix.locator('[data-slot=icon]')).toHaveCount(1);
  await page.getByRole('combobox').fill('not found');
  await expect(page.locator('[data-slot=combobox-empty]')).toHaveClass(
    /text-momo-fg-muted/,
  );
});

test('the single suffix becomes clear only while a valued control is hovered or focused', async ({
  page,
}) => {
  await page.goto('/combobox?case=default');
  const control = page.locator('[data-slot=combobox-control]');
  const suffix = page.locator('[data-slot=combobox-suffix]');
  const clear = page.getByRole('button', { name: 'Clear selection' });
  const trigger = page.getByRole('button', { name: 'Show options' });
  await expect(suffix).toHaveCount(1);
  await expect(suffix).toHaveAttribute('data-action', 'trigger');
  await expect(clear).toHaveCount(0);

  // The icon node survives the switch, so Icon can morph between shapes.
  await suffix
    .locator('[data-slot=icon]')
    .evaluate((node) => node.setAttribute('data-probe', ''));
  await control.hover();
  await expect(suffix).toHaveAttribute('data-action', 'clear');
  await expect(clear).toBeVisible();
  // Base UI's default "x" text must not render beside the shared icon.
  await expect(clear).toHaveText('');
  await expect(trigger).toHaveCount(0);
  await expect(suffix.locator('[data-slot=icon][data-probe]')).toHaveCount(1);

  await page.mouse.move(0, 0);
  await expect(suffix).toHaveAttribute('data-action', 'trigger');
  await page.getByRole('combobox').focus();
  await expect(suffix).toHaveAttribute('data-action', 'clear');
  await clear.click();
  await expect(page.locator('#value')).toHaveText('null');
  await expect(page.getByRole('combobox')).toBeFocused();
  // Without a value the suffix returns to the arrow even while focused.
  await expect(suffix).toHaveAttribute('data-action', 'trigger');
  await page.getByRole('button', { name: 'Outside' }).click();
  await expect(suffix).toHaveAttribute('data-action', 'trigger');
});

test('readonly and disabled controls keep the arrow even with a value', async ({
  page,
}) => {
  await page.goto('/combobox?case=default');
  const suffix = page.locator('[data-slot=combobox-suffix]');
  await page.evaluate(() =>
    window.comboboxFixture.configure({ readOnly: true }),
  );
  await page.locator('[data-slot=combobox-control]').hover();
  await page.getByRole('combobox').focus();
  await expect(suffix).toHaveAttribute('data-action', 'trigger');
  await page.evaluate(() =>
    window.comboboxFixture.configure({ readOnly: false, disabled: true }),
  );
  await expect(suffix).toHaveAttribute('data-action', 'trigger');
  await expect(
    page.getByRole('button', { name: 'Clear selection' }),
  ).toHaveCount(0);
});
