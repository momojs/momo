import type { ReactNode, Ref } from 'react';
import { useId, useLayoutEffect, useRef, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  CheckCircleIcon,
  ChevronRightIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button, cx, Input, Rating, ToggleGroup } from '@momots/design';
import { DrawerClose } from '@momots/design/components/drawer';
import { Numeric } from '@momots/design/components/numeric';
import { Slider } from '@momots/design/components/slider';
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from 'motion/react';
import { z } from 'zod';

import { TimerCard } from '@/components/timer-card';
import type { CupType, DrizzleStampRallyTableRow } from '@/databases';
import { isCupType } from '@/databases';
import { CupSizeEnums, CupTypeEnums } from '@/databases/enums';
import { formatCupType } from '@/helpers/cup-type';
import { DeletePhoto, SavePhoto } from '@/helpers/photo';
import { useFormSubmit } from '@/hooks/use-form-event';
import { m } from '@/paraglide/messages.js';
import {
  stampRallyKeys,
  synchronizeStampRallyQueries,
} from '@/queries/stamp-rally';
import {
  HasStampRallyPhotoReference,
  InsertStampRally,
  ListRecentCupTypes,
  StampRallyConflictError,
  UpdateStampRally,
} from '@/services';

import { CupTypePicker } from './cup-type-picker';
import { Photograph } from './photograph';

const schema = z.object({
  photo: z.string(),
  consumedAt: z.date(),
  cupType: z
    .union([z.enum(CupTypeEnums), z.literal('')])
    .refine((value) => value !== '', m.form_cup_type_placeholder()),
  size: z.enum(CupSizeEnums),
  price: z.number().finite().min(0).max(9999),
  calories: z.number().finite().min(0).max(1000),
  sugar: z.number().finite().min(0).max(100),
  caffeine: z.number().finite().min(0).max(500),
  rating: z.number().int().min(0).max(5),
  brand: z.string().trim().max(40),
  note: z.string().trim().max(240),
});

type StampFormValues = z.input<typeof schema>;

const createDefaultValues = (
  consumedAt = new Date(),
  record?: DrizzleStampRallyTableRow,
  initialPhoto?: string,
): StampFormValues => {
  if (!record) {
    return {
      photo: '',
      consumedAt: new Date(consumedAt),
      cupType: '',
      calories: 0,
      sugar: 0,
      caffeine: 0,
      brand: '',
      note: '',
      price: 0,
      size: 'short',
      rating: 0,
    };
  }

  return {
    photo: initialPhoto ?? '',
    consumedAt: new Date(record.consumedAt),
    cupType: isCupType(record.cupType) ? record.cupType : '',
    calories: record.calories,
    sugar: record.sugar,
    caffeine: record.caffeine,
    brand: record.brand ?? '',
    note: record.note ?? '',
    price: record.price,
    size: record.size,
    rating: record.rating,
  };
};

async function deletePhotoIfUnreferenced(photo: string) {
  if (!photo || (await HasStampRallyPhotoReference(photo))) return;
  await DeletePhoto(photo);
}

type FormPanel = 'details' | 'cupType';

interface PanelMotionState {
  direction: 1 | -1;
  reduced: boolean;
}

const PANEL_VARIANTS = {
  enter: ({ direction, reduced }: PanelMotionState) => ({
    opacity: 0,
    x: reduced ? 0 : direction * 32,
  }),
  center: { opacity: 1, x: 0 },
  exit: ({ direction, reduced }: PanelMotionState) => ({
    opacity: 0,
    x: reduced ? 0 : direction * -32,
  }),
};

interface AnimatedPanelProps {
  children: ReactNode;
  className?: string;
  inactive?: boolean;
  motionState: PanelMotionState;
  transition: React.ComponentProps<typeof motion.section>['transition'];
}

function AnimatedPanel({
  children,
  className,
  inactive = false,
  motionState,
  transition,
}: AnimatedPanelProps) {
  const isPresent = useIsPresent();

  return (
    <motion.section
      inert={!isPresent || inactive}
      aria-hidden={!isPresent || inactive}
      custom={motionState}
      variants={PANEL_VARIANTS}
      initial='enter'
      animate='center'
      exit='exit'
      transition={transition}
      className={cx('absolute inset-0 min-h-0', className)}
    >
      {children}
    </motion.section>
  );
}

export interface StampFormProps
  extends Omit<React.ComponentProps<'div'>, 'onSubmit'> {
  defaultDate?: Date;
  deleteButtonRef?: Ref<HTMLButtonElement>;
  initialPhoto?: string;
  onDelete?: () => void;
  record?: DrizzleStampRallyTableRow;
}

export function StampForm({
  className,
  defaultDate,
  deleteButtonRef,
  initialPhoto,
  onDelete,
  record,
  ...props
}: StampFormProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(record);
  const reducedMotion = useReducedMotion() ?? false;
  const [panel, setPanel] = useState<FormPanel>('details');
  const [showCupTypeError, setShowCupTypeError] = useState(false);
  const [savedCupType, setSavedCupType] = useState<CupType>();
  const cupTypeErrorId = useId();
  const successTitleId = useId();
  const successDescriptionId = useId();
  const cupTypeTriggerRef = useRef<HTMLButtonElement>(null);
  const successActionRef = useRef<HTMLButtonElement>(null);
  const restoreCupTypeFocusRef = useRef(false);
  const restoreAfterSuccessFocusRef = useRef(false);
  const recentTypesQuery = useQuery({
    queryKey: stampRallyKeys.recentCupTypes(),
    queryFn: () => ListRecentCupTypes(),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async (value: StampFormValues) => {
      const { photo, brand, note, cupType, ...data } = schema.parse(value);
      if (!cupType) throw new Error(m.form_cup_type_placeholder());

      const photoChanged = !record || photo !== (initialPhoto ?? '');
      const newlySavedPhoto =
        photoChanged && photo ? await SavePhoto(photo) : '';
      const savedPhoto = photoChanged ? newlySavedPhoto : (record?.photo ?? '');
      const savedValues = {
        ...data,
        cupType,
        photo: savedPhoto,
        brand: brand || null,
        note: note || null,
      };

      try {
        if (record) {
          await UpdateStampRally(record.id, record.revision, savedValues);
        } else {
          await InsertStampRally(savedValues);
        }
      } catch (error) {
        if (newlySavedPhoto) {
          try {
            await deletePhotoIfUnreferenced(newlySavedPhoto);
          } catch (cleanupError) {
            console.error('清理未使用的饮品照片失败', cleanupError);
          }
        }
        throw error;
      }

      if (record?.photo && photoChanged && savedPhoto !== record.photo) {
        try {
          await deletePhotoIfUnreferenced(record.photo);
        } catch (error) {
          console.error('清理已替换的饮品照片失败', error);
        }
      }

      return cupType;
    },
    onError: (error) => {
      console.error(isEditing ? '更新饮品记录失败' : '保存饮品记录失败', error);
    },
  });

  const form = useForm({
    defaultValues: createDefaultValues(defaultDate, record, initialPhoto),
    validators: {
      onSubmit: schema,
    },
    onSubmit: async ({ value }) => {
      mutation.reset();

      try {
        const cupType = await mutation.mutateAsync(value);

        try {
          await synchronizeStampRallyQueries(queryClient);
        } catch (error) {
          console.error('刷新饮品记录失败', error);
        }

        if (!isEditing) form.reset(createDefaultValues(defaultDate));
        setPanel('details');
        setShowCupTypeError(false);
        setSavedCupType(cupType);
      } catch (error) {
        if (error instanceof StampRallyConflictError) {
          try {
            await synchronizeStampRallyQueries(queryClient);
          } catch (refreshError) {
            console.error('刷新发生冲突的饮品记录失败', refreshError);
          }
        }
        // useMutation exposes the error state to the inline alert below.
      }
    },
    onSubmitInvalid: () => {
      const cupTypeMissing = !form.getFieldValue('cupType');

      setPanel('details');
      setShowCupTypeError(cupTypeMissing);

      if (cupTypeMissing) {
        cupTypeTriggerRef.current?.focus();
        cupTypeTriggerRef.current?.scrollIntoView({
          behavior: reducedMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }
      console.warn('饮品记录表单校验未通过');
    },
  });

  const { Subscribe, Field, handleSubmit } = form;

  const onFormSubmit = useFormSubmit(handleSubmit);
  const panelDirection: 1 | -1 = panel === 'cupType' ? 1 : -1;
  const panelMotionState = {
    direction: panelDirection,
    reduced: reducedMotion,
  } satisfies PanelMotionState;
  const panelTransition = reducedMotion
    ? { duration: 0.15 }
    : { type: 'spring' as const, bounce: 0, duration: 0.3 };

  const returnToDetails = () => {
    restoreCupTypeFocusRef.current = true;
    setPanel('details');
  };

  useLayoutEffect(() => {
    if (panel !== 'details' || !restoreCupTypeFocusRef.current) return;

    restoreCupTypeFocusRef.current = false;
    cupTypeTriggerRef.current?.focus();
  }, [panel]);

  useLayoutEffect(() => {
    if (savedCupType) {
      successActionRef.current?.focus();
      return;
    }

    if (!restoreAfterSuccessFocusRef.current) return;
    restoreAfterSuccessFocusRef.current = false;
    cupTypeTriggerRef.current?.focus();
  }, [savedCupType]);

  return (
    <div
      className={cx(
        'flex h-full max-h-full min-h-0 flex-1 flex-col overflow-hidden p-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
        className,
      )}
      {...props}
    >
      <form
        noValidate
        onSubmit={onFormSubmit}
        className='relative size-full min-h-0 overflow-hidden'
      >
        <AnimatePresence initial={false} custom={panelMotionState}>
          {panel === 'details' ? (
            <AnimatedPanel
              key='details'
              inactive={Boolean(savedCupType)}
              motionState={panelMotionState}
              transition={panelTransition}
              className='grid grid-rows-[minmax(0,1fr)_auto] gap-4'
            >
              <div className='flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-0.5 pb-2'>
                <Field name='photo'>
                  {(field) => (
                    <Photograph
                      value={field.state.value}
                      onChange={field.handleChange}
                      onRemove={() => field.handleChange('')}
                    />
                  )}
                </Field>

                <Field name='consumedAt'>
                  {(field) => (
                    <TimerCard
                      value={field.state.value}
                      onChange={field.handleChange}
                    />
                  )}
                </Field>

                <Field name='cupType'>
                  {(cupTypeField) => (
                    <div>
                      <motion.button
                        ref={cupTypeTriggerRef}
                        type='button'
                        aria-invalid={
                          showCupTypeError && !cupTypeField.state.value
                        }
                        aria-describedby={
                          showCupTypeError && !cupTypeField.state.value
                            ? cupTypeErrorId
                            : undefined
                        }
                        whileTap={{ scale: 0.98 }}
                        className='flex min-h-16 w-full items-center justify-between gap-4 rounded-momo-lg bg-momo-bg-surface-muted px-4 py-3 text-left outline-none transition-[background-color,box-shadow] hover:bg-momo-bg-surface-raised focus-visible:ring-2 focus-visible:ring-momo-ring-focus/50 aria-invalid:ring-2 aria-invalid:ring-momo-fg-danger/30'
                        onClick={() => setPanel('cupType')}
                      >
                        <span className='min-w-0 flex-1'>
                          <span className='block text-xs font-medium text-momo-fg-muted'>
                            {m.form_cup_type_required()}
                          </span>
                          <span
                            className={cx(
                              'mt-1 block truncate text-sm font-semibold',
                              cupTypeField.state.value
                                ? 'text-momo-fg-default'
                                : 'text-momo-fg-subtle',
                            )}
                          >
                            {cupTypeField.state.value
                              ? formatCupType(cupTypeField.state.value)
                              : m.form_cup_type_placeholder()}
                          </span>
                        </span>
                        <ChevronRightIcon
                          aria-hidden
                          className='size-5 shrink-0 text-momo-fg-muted'
                        />
                      </motion.button>
                      {showCupTypeError && !cupTypeField.state.value && (
                        <p
                          id={cupTypeErrorId}
                          role='alert'
                          className='mt-1.5 px-1 text-xs text-momo-fg-danger'
                        >
                          {m.form_cup_type_placeholder()}
                        </p>
                      )}
                    </div>
                  )}
                </Field>

                <Field name='size'>
                  {(field) => (
                    <fieldset className='flex flex-col gap-2'>
                      <legend className='mb-2 text-sm font-medium text-momo-fg-default'>
                        {m.form_cup_size()}
                      </legend>
                      <ToggleGroup
                        variant='button'
                        className='grid-cols-4'
                        value={field.state.value}
                        onChange={(value) => {
                          if (value) field.handleChange(value);
                        }}
                        options={[
                          { label: m.cup_size_short(), value: 'short' },
                          { label: m.cup_size_tall(), value: 'tall' },
                          { label: m.cup_size_grande(), value: 'grande' },
                          { label: m.cup_size_venti(), value: 'venti' },
                        ]}
                      />
                    </fieldset>
                  )}
                </Field>

                <section className='flex flex-col gap-4 rounded-momo-lg bg-momo-bg-surface-muted p-4'>
                  <Field name='price'>
                    {(field) => (
                      <Numeric
                        id={field.name}
                        className='w-full'
                        groupClassName='w-full'
                        label={m.form_price_cny()}
                        value={field.state.value}
                        min={0}
                        max={9999}
                        step={0.5}
                        onBlur={field.handleBlur}
                        onChange={(value) => field.handleChange(value ?? 0)}
                      />
                    )}
                  </Field>

                  <Field name='brand'>
                    {(field) => (
                      <label
                        className='flex flex-col gap-1.5 text-sm font-medium text-momo-fg-muted'
                        htmlFor={field.name}
                      >
                        {m.form_brand_optional()}
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          placeholder={m.form_brand_placeholder()}
                          maxLength={40}
                          onBlur={field.handleBlur}
                          onValueChange={field.handleChange}
                        />
                      </label>
                    )}
                  </Field>
                </section>

                <section
                  className='flex flex-col gap-5 rounded-momo-lg bg-momo-bg-surface-muted p-4'
                  aria-label={m.form_nutrition()}
                >
                  <Field name='calories'>
                    {(field) => (
                      <Slider
                        label={m.metric_calories()}
                        value={field.state.value}
                        min={0}
                        max={1000}
                        step={10}
                        formatValue={(value) => `${value} kcal`}
                        onValueChange={field.handleChange}
                      />
                    )}
                  </Field>
                  <Field name='sugar'>
                    {(field) => (
                      <Slider
                        label={m.metric_sugar()}
                        value={field.state.value}
                        min={0}
                        max={100}
                        step={1}
                        formatValue={(value) => `${value} g`}
                        onValueChange={field.handleChange}
                      />
                    )}
                  </Field>
                  <Field name='caffeine'>
                    {(field) => (
                      <Slider
                        label={m.metric_caffeine()}
                        value={field.state.value}
                        min={0}
                        max={500}
                        step={5}
                        formatValue={(value) => `${value} mg`}
                        onValueChange={field.handleChange}
                      />
                    )}
                  </Field>
                </section>

                <Field name='rating'>
                  {(field) => (
                    <div className='flex items-center justify-between gap-4 rounded-momo-lg bg-momo-bg-surface-muted p-4'>
                      <span className='text-sm font-medium text-momo-fg-default'>
                        {m.form_rating_question()}
                      </span>
                      <Rating
                        aria-label={m.form_rating_question()}
                        value={field.state.value}
                        variant='yellow'
                        size='lg'
                        onBlur={field.handleBlur}
                        onValueChange={field.handleChange}
                      />
                    </div>
                  )}
                </Field>

                <Field name='note'>
                  {(field) => (
                    <label
                      className='flex flex-col gap-2 rounded-momo-lg bg-momo-bg-surface-muted p-4 text-sm font-medium text-momo-fg-muted'
                      htmlFor={field.name}
                    >
                      {m.form_note_optional()}
                      <textarea
                        id={field.name}
                        name={field.name}
                        rows={3}
                        maxLength={240}
                        value={field.state.value}
                        placeholder={m.form_note_placeholder()}
                        autoCapitalize='sentences'
                        className='min-h-24 w-full resize-none rounded-momo-md border border-momo-border-input bg-momo-bg-canvas px-3 py-2.5 font-momo-body text-momo-body-sm text-momo-fg-default outline-none transition-[background-color,border-color,box-shadow,color,opacity] placeholder:text-momo-fg-subtle focus-visible:border-momo-ring-focus focus-visible:ring-[3px] focus-visible:ring-momo-ring-focus/35 any-pointer-coarse:text-base'
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                      />
                    </label>
                  )}
                </Field>
              </div>

              <div className='flex shrink-0 flex-col gap-2 border-t border-momo-border-default bg-momo-bg-overlay pt-3'>
                <div className='min-h-5 text-center text-xs' aria-live='polite'>
                  {mutation.isError && (
                    <p className='text-momo-fg-danger' role='alert'>
                      {isEditing
                        ? m.form_update_failed()
                        : m.form_save_failed()}
                    </p>
                  )}
                </div>

                <Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      type='submit'
                      className='w-full'
                      size='lg'
                      disabled={
                        !canSubmit || isSubmitting || mutation.isPending
                      }
                    >
                      {isSubmitting || mutation.isPending
                        ? isEditing
                          ? m.form_updating()
                          : m.form_saving()
                        : isEditing
                          ? m.form_update()
                          : m.form_save()}
                    </Button>
                  )}
                </Subscribe>

                {onDelete && (
                  <div className='mt-2 border-t border-momo-border-default pt-2'>
                    <Button
                      ref={deleteButtonRef}
                      type='button'
                      size='lg'
                      variant='ghost'
                      className='w-full text-momo-fg-danger hover:bg-momo-bg-danger/10 hover:text-momo-fg-danger'
                      onClick={onDelete}
                    >
                      <TrashIcon aria-hidden className='size-4.5' />
                      {m.record_delete_action()}
                    </Button>
                  </div>
                )}
              </div>
            </AnimatedPanel>
          ) : (
            <AnimatedPanel
              key='cup-type'
              inactive={Boolean(savedCupType)}
              motionState={panelMotionState}
              transition={panelTransition}
            >
              <Field name='cupType'>
                {(cupTypeField) => (
                  <CupTypePicker
                    value={cupTypeField.state.value || undefined}
                    recentTypes={recentTypesQuery.data}
                    onBack={returnToDetails}
                    onSelect={(type) => {
                      cupTypeField.handleChange(type);
                      setShowCupTypeError(false);
                      returnToDetails();
                    }}
                  />
                )}
              </Field>
            </AnimatedPanel>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {savedCupType && (
            <motion.section
              key='save-success'
              aria-labelledby={successTitleId}
              aria-describedby={successDescriptionId}
              initial={
                reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }
              }
              animate={{ opacity: 1, scale: 1 }}
              exit={
                reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }
              }
              transition={panelTransition}
              className='absolute inset-0 z-20 grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-6 bg-momo-bg-overlay px-2 pb-1 pt-6 outline-none'
            >
              <div
                role='status'
                aria-live='polite'
                aria-atomic='true'
                className='flex min-h-0 flex-col items-center justify-center text-center'
              >
                <div className='flex size-20 items-center justify-center rounded-full bg-momo-bg-success/15 text-momo-fg-success'>
                  <CheckCircleIcon aria-hidden className='size-11' />
                </div>
                <h2
                  id={successTitleId}
                  className='mt-5 text-2xl font-bold tracking-tight text-momo-fg-default'
                >
                  {isEditing ? m.form_update_success() : m.form_save_success()}
                </h2>
                <p
                  id={successDescriptionId}
                  className='mt-2 max-w-64 text-sm leading-relaxed text-momo-fg-muted'
                >
                  {isEditing
                    ? m.form_update_success_description({
                        cupType: formatCupType(savedCupType),
                      })
                    : m.form_save_success_description({
                        cupType: formatCupType(savedCupType),
                      })}
                </p>
              </div>

              <div className='grid shrink-0 gap-2 border-t border-momo-border-default pt-3'>
                <DrawerClose
                  render={
                    <Button
                      ref={successActionRef}
                      type='button'
                      size='xl'
                      className='w-full'
                      onClick={() => {
                        mutation.reset();
                        setSavedCupType(undefined);
                      }}
                    >
                      {m.form_save_done()}
                    </Button>
                  }
                />
                {!isEditing && (
                  <Button
                    type='button'
                    size='lg'
                    variant='ghost'
                    className='w-full'
                    onClick={() => {
                      mutation.reset();
                      restoreAfterSuccessFocusRef.current = true;
                      setSavedCupType(undefined);
                    }}
                  >
                    {m.form_save_another()}
                  </Button>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
