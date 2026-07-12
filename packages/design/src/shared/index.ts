export type ControlValue = string | number | null;

export type ControlSize = 'sm' | 'md' | 'lg';

export type ControlOption<T extends ControlValue> = {
  value: T;
  textValue?: string;
  disabled?: boolean;
  className?: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
};

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}
