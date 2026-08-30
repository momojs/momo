import { describe, expect, test } from 'bun:test';

import type { CameraPluginPermissions } from '@capacitor/camera';
import { CameraErrorCode } from '@capacitor/camera';

import {
  ensurePhotoAccess,
  isPhotoActionCancellation,
  normalizePhotoOperationError,
  PhotoOperationError,
} from './photo-access';

function errorWithCode(code: CameraErrorCode, message = '') {
  return Object.assign(new Error(message), { code });
}

describe('isPhotoActionCancellation', () => {
  test('recognizes structured native cancellation errors', () => {
    expect(
      isPhotoActionCancellation(
        errorWithCode(CameraErrorCode.TakePhotoCancelled),
      ),
    ).toBe(true);
    expect(
      isPhotoActionCancellation(
        errorWithCode(CameraErrorCode.ChooseMediaCancelled),
      ),
    ).toBe(true);
  });

  test('recognizes browser file-picker cancellation without hiding other errors', () => {
    expect(isPhotoActionCancellation(new Error('No file selected'))).toBe(true);
    expect(isPhotoActionCancellation(new Error('Could not decode image'))).toBe(
      false,
    );
  });
});

describe('normalizePhotoOperationError', () => {
  test.each([
    [
      CameraErrorCode.CameraPermissionDenied,
      'camera',
      'camera-permission-denied',
    ],
    [
      CameraErrorCode.GalleryPermissionDenied,
      'gallery',
      'gallery-permission-denied',
    ],
    [CameraErrorCode.NoCameraAvailable, 'camera', 'camera-unavailable'],
    [CameraErrorCode.ProcessImageFailed, 'gallery', 'photo-read-failed'],
  ] as const)('maps %s to %s', (code, source, expectedKind) => {
    expect(
      normalizePhotoOperationError(errorWithCode(code), source),
    ).toMatchObject({
      kind: expectedKind,
      source,
    });
  });

  test('preserves a previously normalized operation error', () => {
    const error = new PhotoOperationError(
      'gallery-permission-denied',
      'gallery',
    );
    expect(normalizePhotoOperationError(error, 'camera')).toBe(error);
  });
});

describe('ensurePhotoAccess', () => {
  test('does not invoke native permission APIs on the web', async () => {
    let calls = 0;
    const camera = {
      checkPermissions: async () => {
        calls += 1;
        return { camera: 'prompt' as const, photos: 'prompt' as const };
      },
      requestPermissions: async () => {
        calls += 1;
        return { camera: 'granted' as const, photos: 'granted' as const };
      },
    };

    await ensurePhotoAccess('camera', { camera, isNative: false });
    expect(calls).toBe(0);
  });

  test('requests a promptable camera permission and accepts the result', async () => {
    const requested: string[][] = [];
    const camera = {
      checkPermissions: async () => ({
        camera: 'prompt' as const,
        photos: 'granted' as const,
      }),
      requestPermissions: async (options?: CameraPluginPermissions) => {
        requested.push(options?.permissions ?? []);
        return { camera: 'granted' as const, photos: 'granted' as const };
      },
    };

    await ensurePhotoAccess('camera', { camera, isNative: true });
    expect(requested).toEqual([['camera']]);
  });

  test('accepts limited Photos access without requesting again', async () => {
    let requested = false;
    const camera = {
      checkPermissions: async () => ({
        camera: 'granted' as const,
        photos: 'limited' as const,
      }),
      requestPermissions: async () => {
        requested = true;
        return { camera: 'granted' as const, photos: 'granted' as const };
      },
    };

    await ensurePhotoAccess('gallery', { camera, isNative: true });
    expect(requested).toBe(false);
  });

  test('does not re-prompt a denied permission and exposes a typed error', async () => {
    let requested = false;
    const camera = {
      checkPermissions: async () => ({
        camera: 'denied' as const,
        photos: 'granted' as const,
      }),
      requestPermissions: async () => {
        requested = true;
        return { camera: 'denied' as const, photos: 'granted' as const };
      },
    };

    await expect(
      ensurePhotoAccess('camera', { camera, isNative: true }),
    ).rejects.toMatchObject({
      kind: 'camera-permission-denied',
      source: 'camera',
    });
    expect(requested).toBe(false);
  });
});
