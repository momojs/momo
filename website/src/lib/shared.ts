export const appName = 'momo';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';

/** Prefix URLs used by fetch or plain anchors (Router links apply base themselves). */
export function withBasePath(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

/** TanStack Router splat param for `/docs/$`. */
export function docsLinkParams(splat = '') {
  const splatKey = '_splat';
  return { [splatKey]: splat };
}

export const gitConfig = {
  user: 'momojs',
  repo: 'momo',
  branch: 'main',
};
