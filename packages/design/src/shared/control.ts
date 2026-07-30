export type ControlValue = string | number | null;

export type ControlSize = 'sm' | 'md' | 'lg';

export type ControlAxis = 'x' | 'y';

export type ControlDirection = 'up' | 'down' | 'left' | 'right';

export type ControlOption<TValue extends ControlValue, TMeta = unknown> = {
  /** 值 */
  value: TValue;
  /** 标签 */
  label: React.ReactNode;
  /** 样式 */
  style?: React.CSSProperties;
  /** 图标 */
  icon?: React.ReactNode;
  /** 额外内容 */
  extra?: React.ReactNode;
  /** 文本 */
  textValue?: string;
  /** 类名 */
  className?: string;
  /** 禁用 */
  disabled?: boolean;
  /** 跳转 */
  href?: string;
  /** 元数据 */
  meta?: TMeta;
};
