import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { blobToBase64 } from '@momots/host';
import { default as Compressor } from 'compressorjs';
import { format } from 'date-fns';
import { nanoid } from 'nanoid';

import { isWeb } from './guard';

const PHOTO_DIR = 'photos';

const MIME_TYPE = 'image/webp';

function isMissingPhotoDirectoryError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return (
    ('code' in error && error.code === 'OS-PLUG-FILE-0008') ||
    error.message.includes('Folder does not exist') ||
    error.message.includes('does not exist')
  );
}

export function assertSafePhotoName(name: string) {
  if (
    !name ||
    name.length > 255 ||
    name === '.' ||
    name === '..' ||
    name.includes('/') ||
    name.includes('\\')
  ) {
    throw new Error('Invalid local photo file name.');
  }
}

function compress(src: Blob, opts: Compressor.Options): Promise<Blob> {
  return new Promise((resolve, reject) => {
    new Compressor(src, {
      checkOrientation: true, // 处理 EXIF 方向
      convertSize: Infinity, // 不让它擅自转格式
      ...opts,
      success: resolve,
      error: reject,
    });
  });
}

async function write(path: string, blob: Blob): Promise<string> {
  await Filesystem.writeFile({
    path: `${PHOTO_DIR}/${path}`,
    data: await blobToBase64(blob),
    directory: Directory.Data,
    recursive: true, // 自动创建 photos/ 目录
  });
  return `${PHOTO_DIR}/${path}`; // 只把相对路径存进 DB
}

export async function SavePhoto(uri: string) {
  const blob = await (await fetch(uri)).blob();
  const name = `${format(new Date(), 'yyyyMMddHHmmssSSS')}-${nanoid(8)}`;
  const res = await compress(blob, {
    maxWidth: 64,
    maxHeight: 64,
    quality: 0.7,
    mimeType: MIME_TYPE,
  });
  await write(name, res);
  return name;
}

export async function DeletePhoto(name: string) {
  if (!name) return;
  assertSafePhotoName(name);

  await Filesystem.deleteFile({
    path: `${PHOTO_DIR}/${name}`,
    directory: Directory.Data,
  });
}

/** 清除 V0 测试基线产生的全部本地照片；目录不存在时视为已经清空。 */
export async function DeleteAllPhotos() {
  try {
    await Filesystem.rmdir({
      path: PHOTO_DIR,
      directory: Directory.Data,
      recursive: true,
    });
  } catch (error) {
    if (!isMissingPhotoDirectoryError(error)) throw error;
  }
}

export async function ReadPhoto(name: string) {
  assertSafePhotoName(name);
  const path = `${PHOTO_DIR}/${name}`;
  if (isWeb()) {
    // web：文件在 IndexedDB 里，convertFileSrc 取不到，得读出来转 data URL
    const { data } = await Filesystem.readFile({
      path,
      directory: Directory.Data,
    });
    return `data:${MIME_TYPE};base64,${data}`;
  }
  // native：拿到 file:// 绝对路径再转成 capacitor/localhost 协议
  const { uri } = await Filesystem.getUri({
    path,
    directory: Directory.Data,
  });
  return Capacitor.convertFileSrc(uri);
}
