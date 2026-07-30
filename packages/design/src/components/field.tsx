import type {
  FieldControlProps,
  FieldDescriptionProps,
  FieldErrorProps,
  FieldRootProps,
} from '@base-ui/react/field';
import { Field as BaseField } from '@base-ui/react/field';

const { Root, Label, Control, Description, Item, Error, Validity } = BaseField;

export interface FieldProps
  extends Omit<FieldRootProps, 'title'>,
    Pick<FieldControlProps, 'required' | 'placeholder'> {
  title: React.ReactNode;
  description: React.ReactNode | FieldDescriptionProps;
  error: Error | React.ReactNode | FieldErrorProps;
  variant?: 'cell' | 'serious';
}

export function Field(props: FieldProps) {
  const {
    title, //
    variant = 'cell',
    children,
    placeholder,
    ...rest
  } = props;
  return (
    <Root {...rest}>
      <Label>{title}</Label>
      <Control required placeholder={placeholder}>
        {children}
      </Control>
      <Description />
      <Item />
      <Error />
      <Validity>
        {(validity) => {
          return <div>...</div>;
        }}
      </Validity>
    </Root>
  );
}
