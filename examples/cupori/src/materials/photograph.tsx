import { useMutation } from '@tanstack/react-query';

import { AppLauncher } from '@capacitor/app-launcher';
import type { MediaResult } from '@capacitor/camera';
import { Camera, CameraDirection, MediaTypeSelection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Exif } from '@capawesome/capacitor-exif';
import {
  Album01Icon,
  AlertCircleIcon,
  Camera01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button, cx, toPixel } from '@momots/design';

import type { PhotoFailureKind, PhotoSource } from '@/helpers/photo-access';
import {
  ensurePhotoAccess,
  isPhotoActionCancellation,
  normalizePhotoOperationError,
  PhotoOperationError,
} from '@/helpers/photo-access';
import { m } from '@/paraglide/messages.js';

async function chooseSinglePhoto(): Promise<MediaResult | undefined> {
  await ensurePhotoAccess('gallery');
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
    if (isPhotoActionCancellation(error)) return;
    throw normalizePhotoOperationError(error, 'gallery');
  }
}

// 从图库选择多张照片
export async function selectMultiplePhotos() {
  try {
    await ensurePhotoAccess('gallery');
    const { results } = await Camera.chooseFromGallery({
      mediaType: MediaTypeSelection.Photo,
      allowMultipleSelection: true,
      limit: 5,
      quality: 85,
    });

    return results.map((item) => item.webPath);
  } catch (error) {
    if (isPhotoActionCancellation(error)) return [];
    throw normalizePhotoOperationError(error, 'gallery');
  }
}

export interface PhotographProps {
  value?: string;
  onChange?: (path: string) => void;
  onRemove?: () => void;
  className?: string;
}

function getPhotoFailureCopy(kind: PhotoFailureKind) {
  switch (kind) {
    case 'camera-permission-denied':
      return {
        title: m.photo_camera_permission_title(),
        description: m.photo_camera_permission_description(),
      };
    case 'gallery-permission-denied':
      return {
        title: m.photo_gallery_permission_title(),
        description: m.photo_gallery_permission_description(),
      };
    case 'camera-unavailable':
      return {
        title: m.photo_camera_unavailable_title(),
        description: m.photo_camera_unavailable_description(),
      };
    case 'photo-read-failed':
      return {
        title: m.photo_read_error_title(),
        description: m.photo_read_error_description(),
      };
  }
}

async function takeDrinkPhoto() {
  await ensurePhotoAccess('camera');
  return Camera.takePhoto({
    quality: 85,
    cameraDirection: CameraDirection.Rear,
    saveToGallery: false,
    correctOrientation: false,
    includeMetadata: true,
  });
}

async function readPhotoMetadata(photo: MediaResult) {
  const exifPath = photo.uri ?? photo.webPath;
  if (!exifPath) return;

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

export function Photograph({
  value,
  onChange,
  onRemove,
  className,
}: PhotographProps) {
  const isControlled = value !== undefined;
  const mutation = useMutation({
    onError: (error) => {
      if (!isPhotoActionCancellation(error)) {
        console.error('添加饮品照片失败', error);
      }
    },
    onSuccess: (path) => {
      if (path) onChange?.(path);
    },
    mutationFn: async (source: PhotoSource) => {
      let photo: MediaResult | undefined;
      try {
        photo =
          source === 'camera'
            ? await takeDrinkPhoto()
            : await chooseSinglePhoto();
      } catch (error) {
        if (isPhotoActionCancellation(error)) return;
        throw normalizePhotoOperationError(error, source);
      }

      if (!photo) return;

      const path = photo.webPath ?? photo.uri;
      await readPhotoMetadata(photo);
      return path;
    },
  });
  const settingsMutation = useMutation({
    mutationFn: async () => {
      const { completed } = await AppLauncher.openUrl({
        url: 'app-settings:',
      });
      if (!completed) throw new Error('System settings did not open.');
    },
    onError: (error) => {
      console.error('打开 Cupori 系统设置失败', error);
    },
  });

  const preview = isControlled ? value : mutation.data;
  const failure =
    mutation.error instanceof PhotoOperationError ? mutation.error : undefined;
  const failureCopy = failure ? getPhotoFailureCopy(failure.kind) : undefined;
  const showSettings =
    Capacitor.isNativePlatform() &&
    (failure?.kind === 'camera-permission-denied' ||
      failure?.kind === 'gallery-permission-denied');
  const retrySource = failure?.source ?? 'camera';

  const startPhotoAction = (source: PhotoSource) => {
    settingsMutation.reset();
    mutation.reset();
    mutation.mutate(source);
  };

  const dismissFailure = () => {
    settingsMutation.reset();
    mutation.reset();
  };

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <div className='relative flex aspect-2/1 w-full items-center justify-center overflow-hidden rounded-momo-lg bg-momo-bg-surface-muted text-momo-fg-default'>
        {preview ? (
          <>
            <img
              className='size-full object-cover'
              src={preview}
              alt={m.photo_preview_alt()}
            />
          </>
        ) : (
          <span
            className='flex flex-col items-center gap-2 text-sm text-momo-fg-muted'
            aria-hidden
          >
            <HugeiconsIcon
              icon={Camera01Icon}
              size={toPixel(20)}
              color='currentColor'
              strokeWidth={1.5}
            />
            {m.photo_add_optional()}
          </span>
        )}

        {mutation.isPending && (
          <div
            role='status'
            className='absolute inset-0 flex items-center justify-center bg-momo-bg-canvas/75 px-4 text-sm font-medium text-momo-fg-default backdrop-blur-sm'
          >
            {mutation.variables === 'gallery'
              ? m.photo_opening_gallery()
              : m.photo_opening_camera()}
          </div>
        )}
      </div>

      <div className='grid grid-cols-2 gap-2 pt-0.5'>
        <Button
          type='button'
          size='xl'
          className='min-w-0 px-3'
          variant='secondary'
          disabled={mutation.isPending}
          onClick={() => startPhotoAction('camera')}
        >
          <HugeiconsIcon icon={Camera01Icon} aria-hidden />
          {preview ? m.photo_retake_action() : m.photo_take_action()}
        </Button>
        <Button
          type='button'
          size='xl'
          className='min-w-0 px-3'
          variant='secondary'
          disabled={mutation.isPending}
          onClick={() => startPhotoAction('gallery')}
        >
          <HugeiconsIcon icon={Album01Icon} aria-hidden />
          {preview ? m.photo_replace_from_gallery() : m.photo_choose_action()}
        </Button>
      </div>

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

      {mutation.isError && failureCopy && (
        <div
          role='alert'
          className='mt-1 rounded-momo-md border border-momo-border-danger/40 bg-momo-bg-danger/10 p-3 text-momo-fg-default'
        >
          <div className='flex items-start gap-2.5'>
            <HugeiconsIcon
              icon={AlertCircleIcon}
              size={toPixel(18)}
              color='currentColor'
              strokeWidth={1.7}
              className='mt-0.5 shrink-0 text-momo-fg-danger'
              aria-hidden
            />
            <div className='min-w-0 flex-1'>
              <p className='text-sm font-semibold'>{failureCopy.title}</p>
              <p className='mt-1 text-xs leading-relaxed text-momo-fg-muted'>
                {failureCopy.description}
              </p>
              {settingsMutation.isError && (
                <p className='mt-1.5 text-xs font-medium text-momo-fg-danger'>
                  {m.photo_open_settings_failed()}
                </p>
              )}
            </div>
          </div>
          <div className='mt-3 flex flex-wrap justify-end gap-2'>
            <Button
              type='button'
              size='sm'
              variant='ghost'
              onClick={dismissFailure}
            >
              {m.action_dismiss()}
            </Button>
            <Button
              type='button'
              size='sm'
              variant={showSettings ? 'secondary' : 'default'}
              onClick={() => startPhotoAction(retrySource)}
            >
              {m.photo_retry()}
            </Button>
            {showSettings && (
              <Button
                type='button'
                size='sm'
                disabled={settingsMutation.isPending}
                onClick={() => settingsMutation.mutate()}
              >
                {m.photo_open_settings()}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
