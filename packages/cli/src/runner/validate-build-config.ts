import type { MomoBuildConfig } from '../config';

export interface DoctorDiagnostic {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  /** 配置字段、manifest 字段或相关文件的路径。 */
  path?: string;
}

export type AddDiagnostic = (
  severity: DoctorDiagnostic['severity'],
  code: string,
  message: string,
  path?: string,
) => void;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

const STRING_ARRAY = (value: unknown) =>
  Array.isArray(value) && value.every(isNonemptyString);
const BUILD_FIELDS = {
  src: isNonemptyString,
  outdir: isNonemptyString,
  format: (value) =>
    typeof value === 'string' && ['esm', 'cjs', 'iife'].includes(value),
  target: (value) =>
    typeof value === 'string' && ['browser', 'bun', 'node'].includes(value),
  packages: (value) =>
    typeof value === 'string' && ['bundle', 'external'].includes(value),
  bundle: STRING_ARRAY,
  external: STRING_ARRAY,
  splitting: (value) => typeof value === 'boolean',
  banner: (value) => typeof value === 'string',
  scripts: STRING_ARRAY,
  executables: STRING_ARRAY,
  assets: (value) =>
    isRecord(value) &&
    Object.entries(value).every(
      ([source, destination]) =>
        isNonemptyString(source) && isNonemptyString(destination),
    ),
} satisfies Record<keyof MomoBuildConfig, (value: unknown) => boolean>;

/** 校验动态加载的 build 配置；无效配置不进入文件系统检查。 */
export function validateBuildConfig(
  config: unknown,
  add: AddDiagnostic,
): MomoBuildConfig | undefined {
  if (!isRecord(config)) {
    add('error', 'config.invalid', '配置必须是对象。');
    return;
  }

  for (const key of Object.keys(config)) {
    if (key !== 'build' && key !== 'tarball') {
      add('warning', 'config.unknown-field', `未知配置字段：${key}。`, key);
    }
  }
  if (config.tarball !== undefined && !isRecord(config.tarball)) {
    add('error', 'config.invalid-field', 'tarball 必须是对象。', 'tarball');
  }

  const value = config.build;
  if (value === undefined) return {};
  if (!isRecord(value)) {
    add('error', 'config.invalid-field', 'build 必须是对象。', 'build');
    return;
  }

  let valid = true;
  for (const [key, field] of Object.entries(value)) {
    if (!Object.hasOwn(BUILD_FIELDS, key)) {
      add(
        'warning',
        'config.unknown-field',
        `未知构建配置字段：${key}。`,
        `build.${key}`,
      );
    } else if (
      field !== undefined &&
      !BUILD_FIELDS[key as keyof MomoBuildConfig](field)
    ) {
      valid = false;
      add(
        'error',
        'config.invalid-field',
        `build.${key} 的类型或值无效，请检查配置文档。`,
        `build.${key}`,
      );
    }
  }

  return valid ? (value as MomoBuildConfig) : undefined;
}
