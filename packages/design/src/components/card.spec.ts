import { expect, test } from '../../playwright.fixture';

test('composed root merges refs, events and styles and cleans up on unmount', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { h, mount, Card, createRef, slot, click } = window.designFixture;
    const rootRef = createRef<HTMLDivElement>();
    const elementRef = createRef<HTMLDivElement>();
    const titleRef = createRef<HTMLHeadingElement>();
    const events: string[] = [];
    mount(
      h(Card, {
        ref: rootRef,
        className: 'outer-card',
        style: { maxWidth: 320 },
        onClick: () => events.push('root'),
        render: h('div', {
          ref: elementRef,
          className: 'render-card',
          style: { color: 'rgb(255, 0, 0)' },
          onClick: () => events.push('render'),
        }),
        title: 'Workspace',
        slots: { title: { ref: titleRef, render: h('h2') } },
      }),
    );
    const card = slot('card');
    click(card);
    const mounted = {
      refs:
        rootRef.current === card &&
        elementRef.current === card &&
        titleRef.current === slot('card-title'),
      width: card.style.maxWidth,
      color: card.style.color,
      classes:
        card.classList.contains('outer-card') &&
        card.classList.contains('render-card'),
      heading: titleRef.current?.tagName,
      events,
    };
    mount(null);
    return {
      ...mounted,
      cleaned:
        rootRef.current === null &&
        elementRef.current === null &&
        titleRef.current === null,
    };
  });
  expect(result).toEqual({
    refs: true,
    width: '320px',
    color: 'rgb(255, 0, 0)',
    classes: true,
    heading: 'H2',
    events: ['render', 'root'],
    cleaned: true,
  });
});

test('a rendered anchor retains native keyboard activation and explicit labeling', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { h, mount, Card } = window.designFixture;
    mount(
      h(Card, {
        title: 'Project overview',
        children: 'Recent activity',
        slots: { title: { id: 'project-title' } },
        render: h('a', {
          href: '#project',
          'aria-labelledby': 'project-title',
          onClick: (event) => {
            event.preventDefault();
            event.currentTarget.setAttribute('data-activated', 'true');
          },
        }),
      }),
    );
  });
  const link = page.getByRole('link', { name: 'Project overview' });
  // WebKit's macOS tab preference can skip links; activation is native once focused.
  await link.focus();
  await expect(link).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(link).toHaveAttribute('data-activated', 'true');
  await expect(link).toHaveAttribute('href', '#project');
  await expect(
    page.getByRole('heading', { name: 'Project overview' }),
  ).toHaveAttribute('id', 'project-title');
});

test('size controls actual spacing in composed and manual cards, including nested cards', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const {
      h,
      mount,
      Card,
      CardRoot,
      CardHeader,
      CardTitle,
      CardContent,
      CardFooter,
      slot,
    } = window.designFixture;
    const sizes = (['sm', 'md', 'lg'] as const).map((size) => {
      mount(
        h(
          Card,
          {
            size,
            title: 'Title',
            description: 'Description',
            footer: 'Footer',
          },
          'Body',
        ),
      );
      const card = getComputedStyle(slot('card'));
      return {
        padding: card.paddingTop,
        gap: card.rowGap,
        header: getComputedStyle(slot('card-header')).paddingLeft,
        content: getComputedStyle(slot('card-content')).paddingLeft,
        footer: getComputedStyle(slot('card-footer')).paddingLeft,
      };
    });
    mount(
      h(
        CardRoot,
        { size: 'lg' },
        h(CardHeader, null, h(CardTitle, null, 'Outer')),
        h(
          CardContent,
          null,
          h(Card, { id: 'nested', size: 'sm', title: 'Inner' }),
        ),
        h(CardFooter, null, 'Actions'),
      ),
    );
    return {
      sizes,
      manualOrder: [...slot('card').children].map((node) =>
        node.getAttribute('data-slot'),
      ),
      outerPadding: getComputedStyle(slot('card-header')).paddingLeft,
      innerPadding: getComputedStyle(
        document.querySelector('#nested [data-slot="card-header"]')!,
      ).paddingLeft,
    };
  });
  expect(result.sizes).toEqual(
    ['12px', '16px', '24px'].map((value) => ({
      padding: value,
      gap: value,
      header: value,
      content: value,
      footer: value,
    })),
  );
  expect(result.manualOrder).toEqual([
    'card-header',
    'card-content',
    'card-footer',
  ]);
  expect(result.outerPadding).toBe('24px');
  expect(result.innerPadding).toBe('12px');
});

test('narrow cards wrap long content and optional sections do not reserve gaps', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 360, height: 700 });
  const result = await page.evaluate(() => {
    const { h, mount, Card, slot } = window.designFixture;
    mount(
      h(
        Card,
        {
          title: 'A long project title that should wrap across multiple lines',
          description: 'Project details for the team.',
          footer: h('button', { type: 'button' }, 'View project'),
        },
        'project_identifier_'.repeat(12),
      ),
    );
    const card = slot('card');
    const fits = card.scrollWidth <= card.clientWidth;
    mount(
      h(
        Card,
        { title: 'Hidden', slots: { header: false }, footer: null },
        'Body',
      ),
    );
    const body = slot('card-content');
    const box = slot('card').getBoundingClientRect();
    const bodyBox = body.getBoundingClientRect();
    const onlyBody = {
      count: slot('card').children.length,
      top: bodyBox.top - box.top,
      bottom: box.bottom - bodyBox.bottom,
    };
    mount(
      h(
        Card,
        {
          title: 'Team workspace',
          description: 'Projects, people and shared resources.',
          footer: h('button', { type: 'button' }, 'View projects'),
        },
        h('p', null, '12 projects · 8 members'),
      ),
    );
    return { fits, onlyBody };
  });
  expect(result.fits).toBe(true);
  expect(result.onlyBody).toEqual({ count: 1, top: 17, bottom: 17 });
  await page.screenshot({ path: testInfo.outputPath('card.png') });
});
