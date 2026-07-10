import { pathToFileURL } from 'node:url';

import type { MomoConfig } from '../config';

/** 加载并校验 momo.config.* 导出的配置对象。 */
export async function loadConfig(path: string): Promise<MomoConfig> {
  const module = (await import(pathToFileURL(path).href)) as {
    default?: MomoConfig;
    config?: MomoConfig;
  };

  const config = module.default ?? module.config;

  if (!config || typeof config !== 'object') {
    throw new Error(
      `${path} 必须默认导出一个配置对象（建议使用 defineConfig）。`,
    );
  }

  return config;
}
