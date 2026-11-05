import { expect, test } from '../../playwright.fixture';

test('composed root merges refs, events and styles and cleans up on unmount', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { h, mount, Section, createRef, slot, click } = window.designFixture;
    const rootRef = createRef<HTMLElement>();
    const elementRef = createRef<HTMLElement>();
    const titleRef = createRef<HTMLHeadingElement>();
    const events: string[] = [];
    mount(
      h(Section, {
        ref: rootRef,
        className: 'outer-section',
        style: { maxWidth: 320 },
        onClick: () => events.push('root'),
        render: h('div', {
          ref: elementRef,
          className: 'render-section',
          style: { color: 'rgb(255, 0, 0)' },
          onClick: () => events.push('render'),
        }),
        title: 'Workspace',
        slots: { title: { ref: titleRef, render: h('h2') } },
      }),
    );
    const section = slot('section');
    click(section);
    const mounted = {
      refs:
        rootRef.current === section &&
        elementRef.current === section &&
        titleRef.current === slot('section-title'),
      width: section.style.maxWidth,
      color: section.style.color,
      classes:
        section.classList.contains('outer-section') &&
        section.classList.contains('render-section'),
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

test('titles name composed and manual sections as page regions', async ({
  page,
}) => {
  await page.evaluate(() => {
    const {
      h,
      mount,
      Section,
      SectionRoot,
      SectionHeader,
      SectionTitle,
      SectionContent,
    } = window.designFixture;
    mount(
      h(
        'main',
        null,
        h(Section, { title: 'Notifications' }, 'Daily reminders'),
        h(
          SectionRoot,
          { variant: 'ghost' },
          h(SectionHeader, null, h(SectionTitle, { id: 'privacy' }, 'Privacy')),
          h(SectionContent, null, 'Photo access'),
        ),
        h(
          Section,
          { title: 'Hidden title', 'aria-label': 'Account' },
          'Sign out',
        ),
      ),
    );
  });
  await expect(
    page.getByRole('region', { name: 'Notifications' }),
  ).toContainText('Daily reminders');
  await expect(page.getByRole('region', { name: 'Privacy' })).toHaveAttribute(
    'aria-labelledby',
    'privacy',
  );
  await expect(page.getByRole('region', { name: 'Account' })).toContainText(
    'Sign out',
  );
  await page.evaluate(() => {
    const { h, mount, SectionRoot, SectionContent } = window.designFixture;
    mount(h(SectionRoot, null, h(SectionContent, null, 'Untitled')));
  });
  await expect(page.getByRole('region')).toHaveCount(0);
  await expect(page.locator('[data-slot="section"]')).not.toHaveAttribute(
    'aria-labelledby',
    /.*/,
  );
});

test('size controls actual spacing in composed and manual sections, including nested sections', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const {
      h,
      mount,
      Section,
      SectionRoot,
      SectionHeader,
      SectionTitle,
      SectionContent,
      SectionFooter,
      slot,
    } = window.designFixture;
    const sizes = (['sm', 'md', 'lg'] as const).map((size) => {
      mount(
        h(
          Section,
          {
            size,
            title: 'Title',
            description: 'Description',
            footer: 'Footer',
          },
          'Body',
        ),
      );
      const section = getComputedStyle(slot('section'));
      return {
        padding: section.paddingTop,
        gap: section.rowGap,
        header: getComputedStyle(slot('section-header')).paddingLeft,
        content: getComputedStyle(slot('section-content')).paddingLeft,
        footer: getComputedStyle(slot('section-footer')).paddingLeft,
      };
    });
    mount(
      h(
        SectionRoot,
        { size: 'lg' },
        h(SectionHeader, null, h(SectionTitle, null, 'Outer')),
        h(
          SectionContent,
          null,
          h(Section, { id: 'nested', size: 'sm', title: 'Inner' }),
        ),
        h(SectionFooter, null, 'Actions'),
      ),
    );
    return {
      sizes,
      manualOrder: [...slot('section').children].map((node) =>
        node.getAttribute('data-slot'),
      ),
      outerPadding: getComputedStyle(slot('section-header')).paddingLeft,
      innerPadding: getComputedStyle(
        document.querySelector('#nested [data-slot="section-header"]')!,
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
    'section-header',
    'section-content',
    'section-footer',
  ]);
  expect(result.outerPadding).toBe('24px');
  expect(result.innerPadding).toBe('12px');
});

test('narrow sections wrap long content and optional sections do not reserve gaps', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 360, height: 700 });
  const result = await page.evaluate(() => {
    const { h, mount, Section, slot } = window.designFixture;
    mount(
      h(
        Section,
        {
          title: 'A long project title that should wrap across multiple lines',
          description: 'Project details for the team.',
          footer: h('button', { type: 'button' }, 'View project'),
        },
        'project_identifier_'.repeat(12),
      ),
    );
    const section = slot('section');
    const fits = section.scrollWidth <= section.clientWidth;
    mount(
      h(
        Section,
        { title: 'Hidden', slots: { header: false }, footer: null },
        'Body',
      ),
    );
    const body = slot('section-content');
    const box = slot('section').getBoundingClientRect();
    const bodyBox = body.getBoundingClientRect();
    const onlyBody = {
      count: slot('section').children.length,
      top: bodyBox.top - box.top,
      bottom: box.bottom - bodyBox.bottom,
    };
    mount(
      h(
        Section,
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
  await page.screenshot({ path: testInfo.outputPath('section.png') });
});
