import { useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  Clock01Icon,
  Coffee02Icon,
  Edit02Icon,
  EnergyIcon,
  StarIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Badge, Button, Dialog, DialogClose } from '@momots/design';
import { Drawer } from '@momots/design/components/drawer';

import type { DrizzleStampRallyTableRow } from '@/databases';
import { formatCupType } from '@/helpers/cup-type';
import { formatCurrency, formatDate } from '@/helpers/locale';
import { DeletePhoto } from '@/helpers/photo';
import { m } from '@/paraglide/messages.js';
import { synchronizeStampRallyQueries } from '@/queries/stamp-rally';
import {
  DeleteStampRally,
  HasStampRallyPhotoReference,
  StampRallyConflictError,
} from '@/services';

import { StampForm } from './stamp-form';

const CUP_SIZE_LABELS = {
  short: m.cup_size_short,
  tall: m.cup_size_tall,
  grande: m.cup_size_grande,
  venti: m.cup_size_venti,
} as const;

export interface CupCardProps {
  onDeleted?: (cupType: string) => void;
  photo?: string;
  record: DrizzleStampRallyTableRow;
}

export function CupCard({ onDeleted, photo, record }: CupCardProps) {
  const queryClient = useQueryClient();
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const brand = record.brand?.trim();
  const cupType = formatCupType(record.cupType);
  const recordTime = formatDate(record.consumedAt, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const [deleted] = await DeleteStampRally(record.id, record.revision);
      if (!deleted) throw new StampRallyConflictError(record.id);

      if (deleted.photo) {
        try {
          const stillReferenced = await HasStampRallyPhotoReference(
            deleted.photo,
          );
          if (!stillReferenced) await DeletePhoto(deleted.photo);
        } catch (error) {
          // The record is already deleted; a failed best-effort cleanup must
          // not make the destructive action appear to have failed.
          console.error('清理已删除记录的饮品照片失败', error);
        }
      }

      return deleted;
    },
    onError: (error) => {
      console.error('删除饮品记录失败', error);
    },
  });

  const handleDelete = async () => {
    deleteMutation.reset();

    try {
      const deleted = await deleteMutation.mutateAsync();
      setDeleteOpen(false);
      setEditorOpen(false);

      try {
        await synchronizeStampRallyQueries(queryClient);
      } catch (error) {
        console.error('刷新饮品记录失败', error);
      }

      onDeleted?.(formatCupType(deleted.cupType));
    } catch (error) {
      if (error instanceof StampRallyConflictError) {
        try {
          await synchronizeStampRallyQueries(queryClient);
        } catch (refreshError) {
          console.error('刷新发生冲突的饮品记录失败', refreshError);
        }
      }
      // useMutation exposes the error inside the confirmation dialog.
    }
  };

  return (
    <article className='flex gap-3 rounded-momo-lg bg-momo-bg-surface-muted p-3 transition-colors hover:bg-momo-bg-surface-raised'>
      <div className='flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-momo-md bg-momo-bg-surface text-momo-fg-muted'>
        {photo ? (
          <img
            src={photo}
            alt={m.beverage_photo_alt({ brand: brand || cupType })}
            loading='lazy'
            decoding='async'
            className='size-full object-cover'
          />
        ) : (
          <HugeiconsIcon
            icon={Coffee02Icon}
            size={24}
            strokeWidth={1.6}
            aria-hidden
          />
        )}
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-3'>
          <h3 className='truncate text-sm font-semibold text-momo-fg-default'>
            {cupType}
          </h3>
          <span className='shrink-0 text-sm font-medium tabular-nums text-momo-fg-default'>
            {formatCurrency(record.price)}
          </span>
        </div>

        <div className='mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-momo-fg-muted'>
          {brand && (
            <Badge size='sm' variant='outline'>
              {brand}
            </Badge>
          )}
          <Badge size='sm' variant='outline'>
            {CUP_SIZE_LABELS[record.size]()}
          </Badge>
          <span className='inline-flex items-center gap-1'>
            <HugeiconsIcon
              icon={Clock01Icon}
              size={14}
              strokeWidth={1.7}
              aria-hidden
            />
            {recordTime}
          </span>
        </div>

        <div className='mt-2 flex items-center gap-3 text-xs text-momo-fg-muted'>
          <span className='inline-flex items-center gap-1 tabular-nums'>
            <HugeiconsIcon
              icon={EnergyIcon}
              size={14}
              strokeWidth={1.7}
              aria-hidden
            />
            {record.caffeine} mg
          </span>
          <span className='inline-flex items-center gap-1 tabular-nums'>
            <HugeiconsIcon
              icon={StarIcon}
              size={14}
              strokeWidth={1.7}
              aria-hidden
            />
            {record.rating > 0 ? record.rating : m.rating_unrated()}
          </span>
        </div>

        {record.note && (
          <p className='mt-2 line-clamp-2 text-xs leading-relaxed text-momo-fg-muted'>
            {record.note}
          </p>
        )}

        <div className='mt-2 flex justify-end'>
          <Drawer
            direction='down'
            open={editorOpen}
            snapPoints={[1]}
            title={<span>{m.record_edit_title()}</span>}
            trigger={
              <Button
                type='button'
                size='sm'
                variant='ghost'
                className='any-pointer-coarse:min-h-11'
                aria-label={m.record_edit_label({ cupType, time: recordTime })}
              >
                <HugeiconsIcon
                  icon={Edit02Icon}
                  size={15}
                  strokeWidth={1.8}
                  aria-hidden
                />
                {m.record_edit_action()}
              </Button>
            }
            onOpenChange={(open) => {
              if (!deleteMutation.isPending) setEditorOpen(open);
            }}
          >
            <StampForm
              className='h-full'
              deleteButtonRef={deleteButtonRef}
              initialPhoto={photo}
              record={record}
              onDelete={() => {
                deleteMutation.reset();
                setDeleteOpen(true);
              }}
            />

            <Dialog
              open={deleteOpen}
              size='sm'
              title={m.record_delete_title()}
              description={m.record_delete_description({
                cupType,
                time: formatDate(record.consumedAt, {
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              })}
              showCloseButton={false}
              disablePointerDismissal
              onChange={(open) => {
                if (!deleteMutation.isPending) setDeleteOpen(open);
              }}
              onOpenChangeComplete={(open) => {
                if (!open && editorOpen) deleteButtonRef.current?.focus();
              }}
              footer={
                <>
                  <DialogClose
                    render={
                      <Button
                        type='button'
                        variant='secondary'
                        autoFocus
                        disabled={deleteMutation.isPending}
                      />
                    }
                  >
                    {m.action_cancel()}
                  </DialogClose>
                  <Button
                    type='button'
                    variant='destructive'
                    aria-busy={deleteMutation.isPending}
                    disabled={deleteMutation.isPending}
                    onClick={() => void handleDelete()}
                  >
                    {deleteMutation.isPending
                      ? m.record_deleting()
                      : m.record_delete_confirm()}
                  </Button>
                </>
              }
            >
              {deleteMutation.isError && (
                <p className='text-momo-fg-danger' role='alert'>
                  {m.record_delete_failed()}
                </p>
              )}
            </Dialog>
          </Drawer>
        </div>
      </div>
    </article>
  );
}
