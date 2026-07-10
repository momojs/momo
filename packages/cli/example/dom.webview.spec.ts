import { beforeEach, describe, expect, it, test } from '../src/test';

describe('Bun.WebView 真实浏览器环境', () => {
  beforeEach(() => {
    document.body.querySelector('#app')!.innerHTML = '';
  });

  test('可以操作真实 DOM', () => {
    const node = document.createElement('button');
    node.textContent = 'momo';
    document.querySelector('#app')!.append(node);

    expect(document.querySelector('button')?.textContent).toBe('momo');
    expect(document.querySelectorAll('button')).toHaveLength(1);
  });

  test('拥有浏览器全局对象', () => {
    expect(typeof window).toBe('object');
    expect(typeof document.createElement).toBe('function');
    expect(location.protocol).toMatch(/^https?:$/);
  });

  it('支持基于真实布局的度量', () => {
    const box = document.createElement('div');
    box.style.cssText = 'width: 120px; height: 80px;';
    document.querySelector('#app')!.append(box);

    expect(box.getBoundingClientRect().width).toBe(120);
    expect(box.getBoundingClientRect().height).toBe(80);
  });

  test('支持异步断言', async () => {
    const value = await Promise.resolve(42);
    expect(value).toBe(42);
    expect(value).not.toBe(43);
  });
});
