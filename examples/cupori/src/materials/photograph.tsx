import { useMutation } from '@tanstack/react-query';

import type { MediaResult } from '@capacitor/camera';
import {
  Camera,
  CameraDirection,
  CameraErrorCode,
  MediaTypeSelection,
} from '@capacitor/camera';
import { Exif } from '@capawesome/capacitor-exif';
import { Camera01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button, cx, toPixel } from '@momots/design';

import { m } from '@/paraglide/messages.js';

async function chooseSinglePhoto(): Promise<MediaResult | undefined> {
  const { results } = await Camera.chooseFromGallery({
    mediaType: MediaTypeSelection.Photo,
    allowMultipleSelection: false,
    quality: 85,
  });

  return results[0];
}

// 从图库选择一张照片
export async function selectPhoto() {
  try {
    const photo = await chooseSinglePhoto();

    return photo?.webPath ?? photo?.uri;
  } catch (error) {
    console.error('选择取消或失败', error);
    return undefined;
  }
}

// 从图库选择多张照片
export async function selectMultiplePhotos() {
  const { results } = await Camera.chooseFromGallery({
    mediaType: MediaTypeSelection.Photo,
    allowMultipleSelection: true,
    limit: 5,
    quality: 85,
  });

  return results.map((item) => item.webPath);
}

export interface PhotographProps {
  value?: string;
  onChange?: (path: string) => void;
  onRemove?: () => void;
  className?: string;
}

function isCameraCancellation(error: unknown) {
  return (
    hasCameraErrorCode(error, CameraErrorCode.TakePhotoCancelled) ||
    hasCameraErrorCode(error, CameraErrorCode.ChooseMediaCancelled) ||
    (error instanceof Error &&
      error.message.toLocaleLowerCase().includes('cancel'))
  );
}

function hasCameraErrorCode(error: unknown, code: CameraErrorCode) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

export function Photograph({
  value,
  onChange,
  onRemove,
  className,
}: PhotographProps) {
  const isControlled = value !== undefined;
  const mutation = useMutation({
    onError: (error) => {
      console.error('拍摄饮品照片失败', error);
    },
    onSuccess: (path) => {
      if (path) onChange?.(path);
    },
    mutationFn: async () => {
      let photo: MediaResult | undefined;
      try {
        photo = await Camera.takePhoto({
          quality: 85,
          cameraDirection: CameraDirection.Rear,
          saveToGallery: false,
          correctOrientation: false, // 不纠正方向
          includeMetadata: true,
        });
      } catch (error) {
        if (isCameraCancellation(error)) return;

        if (!hasCameraErrorCode(error, CameraErrorCode.NoCameraAvailable)) {
          throw error;
        }

        try {
          photo = await chooseSinglePhoto();
        } catch (galleryError) {
          if (isCameraCancellation(galleryError)) return;
          throw galleryError;
        }
      }

      if (!photo) return;

      const path = photo.webPath ?? photo.uri;
      const exifPath = photo.uri ?? photo.webPath;

      if (exifPath) {
        try {
          const { tags } = await Exif.readExif({ path: exifPath });
          console.debug('饮品照片元数据', {
            hasCaptureTime: Boolean(tags.dateTimeOriginal),
            hasLocation: Boolean(
              tags.gpsLatitude != null && tags.gpsLongitude != null,
            ),
          });
        } catch (error) {
          // Some cameras and web-picked files do not contain readable EXIF data.
          console.debug('饮品照片没有可读取的 EXIF 元数据', error);
        }
      }

      return path;
    },
  });

  const preview = isControlled ? value : mutation.data;

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <button
        type='button'
        className='group relative flex aspect-2/1 w-full items-center justify-center overflow-hidden rounded-momo-lg bg-momo-bg-surface-muted text-momo-fg-default outline-none transition-[transform,box-shadow] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-momo-ring-focus/45 disabled:pointer-events-none disabled:opacity-60'
        disabled={mutation.isPending}
        aria-busy={mutation.isPending}
        aria-label={preview ? m.photo_retake() : m.photo_take_optional()}
        onClick={() => mutation.mutate()}
      >
        {preview ? (
          <>
            <img
              className='size-full object-cover'
              src={preview}
              alt={m.photo_preview_alt()}
            />
            <span className='absolute inset-x-0 bottom-0 bg-momo-fg-default/55 px-3 py-2 text-xs font-medium text-momo-fg-on-brand backdrop-blur-sm'>
              {mutation.isPending
                ? m.photo_opening_camera()
                : m.photo_tap_retake()}
            </span>
          </>
        ) : (
          <span className='flex flex-col items-center gap-2 text-sm text-momo-fg-muted'>
            <HugeiconsIcon
              icon={Camera01Icon}
              size={toPixel(20)}
              color='currentColor'
              strokeWidth={1.5}
              aria-hidden
            />
            {mutation.isPending
              ? m.photo_opening_camera()
              : m.photo_add_optional()}
          </span>
        )}
      </button>

      {preview && onRemove && (
        <Button
          type='button'
          size='sm'
          variant='ghost'
          className='self-end text-momo-fg-danger hover:bg-momo-bg-danger/10 hover:text-momo-fg-danger any-pointer-coarse:min-h-11'
          onClick={onRemove}
        >
          {m.photo_remove()}
        </Button>
      )}

      {mutation.isError && (
        <p className='text-xs text-momo-fg-danger' role='alert'>
          {m.photo_read_error()}
        </p>
      )}
    </div>
  );
}
