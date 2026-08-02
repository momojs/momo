import { describe, expect, test } from 'bun:test';

import type { SlotBaseProps } from './render';
import { render } from './render';

interface TestSlotProps extends SlotBaseProps {
  className?: string;
  tone?: 'default' | 'brand';
}

function TestSlot(props: TestSlotProps) {
  return <div {...props} />;
}

type TestSlotElement = React.ReactElement<TestSlotProps>;

describe('render', () => {
  test('omits an undefined slot and enables the default slot with true', () => {
    expect(render(TestSlot, undefined)).toBeUndefined();

    const element = render<TestSlotProps>(
      TestSlot,
      true,
      'Default content',
    ) as TestSlotElement;

    expect(element.type).toBe(TestSlot);
    expect(element.props.children).toBe('Default content');
  });

  test('preserves config children when fallback props are omitted', () => {
    const element = render(TestSlot, {
      children: 'Configured content',
      tone: 'brand',
    }) as TestSlotElement;

    expect(element.props.children).toBe('Configured content');
    expect(element.props.tone).toBe('brand');
  });

  test('lets fallback props override the config object', () => {
    const element = render<TestSlotProps>(
      TestSlot,
      { children: 'Configured content', className: 'configured' },
      { children: 'Fallback content', tone: 'default' },
    ) as TestSlotElement;

    expect(element.props.children).toBe('Fallback content');
    expect(element.props.className).toBe('configured');
    expect(element.props.tone).toBe('default');
  });

  test('returns a React node replacement without merging fallback props', () => {
    const replacement = <aside>Replacement</aside>;

    expect(
      render(TestSlot, replacement, { children: 'Fallback content' }),
    ).toBe(replacement);
  });
});
