import type {
  CameraPermissionState,
  CameraPermissionType,
  CameraPlugin,
} from '@capacitor/camera';
import { Camera, CameraErrorCode } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export type PhotoSource = 'camera' | 'gallery';

export type PhotoFailureKind =
  | 'camera-permission-denied'
  | 'gallery-permission-denied'
  | 'camera-unavailable'
  | 'photo-read-failed';

export class PhotoOperationError extends Error {
  constructor(
    readonly kind: PhotoFailureKind,
    readonly source: PhotoSource,
    options?: ErrorOptions,
  ) {
    super(kind, options);
    this.name = 'PhotoOperationError';
  }
}

type CameraPermissionClient = Pick<
  CameraPlugin,
  'checkPermissions' | 'requestPermissions'
>;

interface EnsurePhotoAccessOptions {
  camera?: CameraPermissionClient;
  isNative?: boolean;
}

function getErrorCode(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return '';
}

export function isPhotoActionCancellation(error: unknown) {
  const code = getErrorCode(error);
  if (
    code === CameraErrorCode.TakePhotoCancelled ||
    code === CameraErrorCode.ChooseMediaCancelled
  ) {
    return true;
  }

  return /cancel(?:led|ed)?|no files? selected|no image picked/i.test(
    getErrorMessage(error),
  );
}

export function normalizePhotoOperationError(
  error: unknown,
  attemptedSource: PhotoSource,
) {
  if (error instanceof PhotoOperationError) return error;

  const code = getErrorCode(error);
  const message = getErrorMessage(error);

  if (
    code === CameraErrorCode.CameraPermissionDenied ||
    /(?:camera.*permission|denied access to camera)/i.test(message)
  ) {
    return new PhotoOperationError('camera-permission-denied', 'camera', {
      cause: error,
    });
  }

  if (
    code === CameraErrorCode.GalleryPermissionDenied ||
    /(?:(?:photo|gallery).*(?:permission|access)|denied access to photos)/i.test(
      message,
    )
  ) {
    return new PhotoOperationError('gallery-permission-denied', 'gallery', {
      cause: error,
    });
  }

  if (
    code === CameraErrorCode.NoCameraAvailable ||
    /(?:camera (?:is )?not available|no camera available)/i.test(message)
  ) {
    return new PhotoOperationError('camera-unavailable', 'camera', {
      cause: error,
    });
  }

  return new PhotoOperationError('photo-read-failed', attemptedSource, {
    cause: error,
  });
}

function permissionTypeFor(source: PhotoSource): CameraPermissionType {
  return source === 'camera' ? 'camera' : 'photos';
}

function isGranted(source: PhotoSource, state: CameraPermissionState) {
  if (source === 'gallery') return state === 'granted' || state === 'limited';
  return state === 'granted';
}

export async function ensurePhotoAccess(
  source: PhotoSource,
  {
    camera = Camera,
    isNative = Capacitor.isNativePlatform(),
  }: EnsurePhotoAccessOptions = {},
) {
  // Browser file inputs and getUserMedia own their permission lifecycle. Calling
  // Camera.requestPermissions() on Web is unsupported, so let the browser UI
  // handle it and normalize any resulting error instead.
  if (!isNative) return;

  const permission = permissionTypeFor(source);
  let status = await camera.checkPermissions();
  if (isGranted(source, status[permission])) return;

  if (status[permission] !== 'denied') {
    status = await camera.requestPermissions({ permissions: [permission] });
    if (isGranted(source, status[permission])) return;
  }

  throw new PhotoOperationError(
    source === 'camera'
      ? 'camera-permission-denied'
      : 'gallery-permission-denied',
    source,
  );
}
