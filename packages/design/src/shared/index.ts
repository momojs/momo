export type ControlValue = PropertyKey | null;

export type ControlSize = 'sm' | 'md' | 'lg';

export type ControlOption<T extends ControlValue> = {
  value: T;
  textValue?: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}
