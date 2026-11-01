import { expect, test } from '../../playwright.fixture';

test('renders zero for omitted and invalid initial values', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { h, mount, TweenNumber } = window.designFixture;
    return [undefined, '', 'invalid', Number.NaN, Number.POSITIVE_INFINITY].map(
      (value, index) => {
        mount(
          h(TweenNumber, {
            key: index,
            value,
            id: 'tween-number',
          }),
        );
        return document.getElementById('tween-number')?.textContent;
      },
    );
  });
  expect(result).toEqual(['0', '0', '0', '0', '0']);
});

test('passes zero to the formatter for invalid controlled updates', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, TweenNumber, waitFor } = window.designFixture;
    const values: number[] = [];
    const formatter = (value: number) => {
      values.push(value);
      return value.toFixed(1);
    };
    const render = async (value: number | string | undefined, text: string) => {
      mount(
        h(TweenNumber, {
          value,
          duration: 0,
          formatter,
          id: 'tween-number',
        }),
      );
      await waitFor(
        () => document.getElementById('tween-number')?.textContent === text,
      );
      return document.getElementById('tween-number')?.textContent;
    };
    return {
      text: [
        await render(12.5, '12.5'),
        await render(undefined, '0.0'),
        await render(-3.5, '-3.5'),
        await render('invalid', '0.0'),
      ],
      finite: values.every(Number.isFinite),
    };
  });
  expect(result).toEqual({
    text: ['12.5', '0.0', '-3.5', '0.0'],
    finite: true,
  });
});

test('animates invalid controlled values back to zero', async ({ page }) => {
  await page.evaluate(() => {
    const { h, mount, TweenNumber } = window.designFixture;
    const render = (value: number | string) =>
      mount(
        h(TweenNumber, {
          value,
          duration: 0.08,
          id: 'tween-number',
        }),
      );
    render(24);
    render('invalid');
  });
  await expect(page.locator('#tween-number')).toHaveText('0');
});
