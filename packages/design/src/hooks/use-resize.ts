import { useEffectEvent, useLayoutEffect } from 'react';

// React 打包工具会替换 NODE_ENV，因此浏览器端包无需依赖 Node 类型。
declare const process: { env: { NODE_ENV?: string } };

export type ElementSize = Readonly<{ width: number; height: number }>;

export const EMPTY_SIZE: ElementSize = { width: 0, height: 0 };

export type ResizeHandler<T extends HTMLElement> = (
  element: T,
  size: ElementSize | null,
) => void;

export type ResizeOptions = {
  /** 逻辑绑定变化时重新开始监听，即使 DOM 节点未变。 */
  key?: unknown;
};

const pixels = (value: string) => Number.parseFloat(value) || 0;

const INLINE_REPLACED_ELEMENTS = new Set([
  'audio',
  'canvas',
  'embed',
  'iframe',
  'img',
  'object',
  'video',
]);

function hasObservableBox(element: HTMLElement, display: string): boolean {
  if (display === 'contents') return false;
  // `none` 表示目标暂时隐藏，其实际尺寸仍为零。
  if (display !== 'inline') return true;
  return (
    INLINE_REPLACED_ELEMENTS.has(element.localName) ||
    (element.localName === 'input' &&
      element.getAttribute('type')?.toLowerCase() === 'image')
  );
}

/** 读取布局边框盒的尺寸，而非 CSS 变换后的视觉尺寸。 */
function readLayoutSize(
  element: HTMLElement,
  style: CSSStyleDeclaration,
): ElementSize {
  if (element.getClientRects().length === 0) return EMPTY_SIZE;

  const width = Number.parseFloat(style.width);
  const height = Number.parseFloat(style.height);
  const contentBox = style.boxSizing !== 'border-box';

  return {
    width: Number.isFinite(width)
      ? width +
        (contentBox
          ? pixels(style.paddingLeft) +
            pixels(style.paddingRight) +
            pixels(style.borderLeftWidth) +
            pixels(style.borderRightWidth)
          : 0)
      : element.offsetWidth,
    height: Number.isFinite(height)
      ? height +
        (contentBox
          ? pixels(style.paddingTop) +
            pixels(style.paddingBottom) +
            pixels(style.borderTopWidth) +
            pixels(style.borderBottomWidth)
          : 0)
      : element.offsetHeight,
  };
}

function readObservedSize(
  entry: ResizeObserverEntry,
  style: CSSStyleDeclaration,
): ElementSize {
  const box = entry.borderBoxSize[0];
  if (!box) return readLayoutSize(entry.target as HTMLElement, style);

  const vertical = !style.writingMode.startsWith('horizontal');
  return {
    width: vertical ? box.blockSize : box.inlineSize,
    height: vertical ? box.inlineSize : box.blockSize,
  };
}

/**
 * 监听单个元素布局边框盒的物理尺寸，并同步读取初始尺寸。
 * target 为 null 时禁用监听；尺寸为 null 表示布局不受支持，而非实际尺寸为零。
 * 通知使用最近一次提交的回调，无需重新订阅。
 * options.key 变化时，即使元素未变，也会重新开始监听并测量。
 * 调用方已入队的更新在应用时必须自行校验对应的逻辑绑定。
 */
export function useResize<T extends HTMLElement>(
  target: T | null,
  onResize: ResizeHandler<T>,
  { key }: ResizeOptions = {},
): void {
  const notify = useEffectEvent(onResize);

  useLayoutEffect(() => {
    if (!target) return;

    // 忽略此副作用清理后才到达的监听回调。
    let disposed = false;
    // 每次监听期间仅提示一次布局不受支持的警告。
    let warned = false;
    // 上次发布的尺寸；`undefined` 表示尚未发布过尺寸。
    let previous: ElementSize | null | undefined;
    const publish = (size: ElementSize | null) => {
      if (disposed) return;
      if (
        previous !== undefined &&
        previous?.width === size?.width &&
        previous?.height === size?.height
      ) {
        return;
      }
      previous = size;
      notify(target, size);
    };

    const measure = (entry?: ResizeObserverEntry) => {
      const style = getComputedStyle(target);
      if (!hasObservableBox(target, style.display)) {
        // 不受支持的布局无法获取尺寸，不能视为尺寸为零的有效盒子。
        publish(null);
        if (process.env.NODE_ENV !== 'production' && !warned) {
          warned = true;
          console.warn(
            `useResize requires an observable layout box; <${target.localName}> has display: ${style.display}. Use a block, inline-block, flow-root, flex, or grid wrapper instead.`,
          );
        }
        return;
      }
      publish(
        entry ? readObservedSize(entry, style) : readLayoutSize(target, style),
      );
    };

    const observer = new ResizeObserver((entries) => {
      if (disposed) return;
      for (const entry of entries) {
        if (entry.target === target) measure(entry);
      }
    });

    // 持续监听无效目标，以便其后续变为有效布局盒时恢复测量。
    observer.observe(target, { box: 'border-box' });
    measure();

    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [target, key]);
}
