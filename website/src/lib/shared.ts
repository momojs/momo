export const appName = 'momo';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';

/** TanStack Router splat param for `/docs/$`. */
export function docsLinkParams(splat = '') {
  const splatKey = '_splat';
  return { [splatKey]: splat };
}

export const gitConfig = {
  user: 'mango',
  repo: 'momo',
  branch: 'main',
};
