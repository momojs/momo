'use client';

import { useState, useSyncExternalStore } from 'react';

import { ArrowRight, File, Folder } from 'lucide-react';

import type { SiteTranslator } from '@/lib/site-translations';
import { useSiteTranslations } from '@/lib/site-translations';

import { prune } from '../../../packages/core/src/tree/prune';
import type { TreeNode } from '../../../packages/core/src/tree/types';
import { Alert } from '../../../packages/design/src/components/alert';
import { Badge } from '../../../packages/design/src/components/badge';
import { Button } from '../../../packages/design/src/components/button';
import { Input } from '../../../packages/design/src/components/input';
import { Select } from '../../../packages/design/src/components/select';
import { Spinner } from '../../../packages/design/src/components/spinner';
import { Drive } from '../../../packages/drive/src/core';
import { Storagefy } from '../../../packages/host/src/storage';

const frameClass =
  'flex min-h-88 min-w-0 flex-col gap-3 rounded-xl border border-fd-border bg-fd-background/70 p-4';

function DemoSelect<Value extends string | number>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: Value;
  options: Array<{ value: Value; label: string }>;
  disabled?: boolean;
  onChange: (value: Value) => void;
}) {
  return (
    <div className='flex min-w-0 items-center gap-3 text-xs text-fd-muted-foreground'>
      <span>{label}</span>
      <Select<Value>
        value={value}
        options={options}
        disabled={disabled}
        onChange={onChange}
        trigger={{
          'aria-label': label,
          className: 'w-auto min-w-24',
        }}
        popup={{ className: 'min-w-(--anchor-width)!' }}
      />
    </div>
  );
}

type FileEntry = { name: string; kind: 'file' | 'folder' };

const projectFiles: TreeNode<FileEntry>[] = [
  {
    name: 'src',
    kind: 'folder',
    children: [
      {
        name: 'components',
        kind: 'folder',
        children: [
          { name: 'button.tsx', kind: 'file', children: [] },
          { name: 'select.tsx', kind: 'file', children: [] },
        ],
      },
      { name: 'theme.ts', kind: 'file', children: [] },
    ],
  },
  {
    name: 'docs',
    kind: 'folder',
    children: [{ name: 'select.mdx', kind: 'file', children: [] }],
  },
  { name: 'README.md', kind: 'file', children: [] },
];

function FileTree({
  nodes,
  highlight = false,
}: {
  nodes: TreeNode<FileEntry>[];
  highlight?: boolean;
}) {
  return (
    <ul>
      {nodes.map((node) => {
        const isFile = node.kind === 'file';
        const EntryIcon = isFile ? File : Folder;
        return (
          <li key={node.name}>
            <div
              className={`flex min-w-0 items-center gap-1.5 py-0.5 font-mono text-[11px] leading-4 ${
                isFile && highlight
                  ? 'text-fuchsia-700 dark:text-fuchsia-300'
                  : 'text-fd-muted-foreground'
              }`}
            >
              <EntryIcon className='size-3 shrink-0' aria-hidden />
              <span className='truncate' title={node.name}>
                {node.name}
              </span>
            </div>
            {node.children.length > 0 && (
              <div className='ml-1.5 border-l border-fd-border pl-2'>
                <FileTree nodes={node.children} highlight={highlight} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function HomeCoreDemo() {
  const t = useSiteTranslations();
  const [query, setQuery] = useState('select');
  const keyword = query.trim().toLowerCase();
  const matches = prune(
    projectFiles,
    (node) => node.kind === 'file' && node.name.toLowerCase().includes(keyword),
  );

  return (
    <div className={frameClass}>
      <div className='flex items-center gap-2'>
        <label htmlFor='home-core-search' className='sr-only'>
          {t('搜索文件名')}
        </label>
        <Input
          id='home-core-search'
          type='search'
          size='sm'
          className='text-xs'
          value={query}
          placeholder={t('试试 select 或 theme')}
          autoComplete='off'
          spellCheck={false}
          aria-controls='home-core-search-results'
          onValueChange={setQuery}
        />
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='text-xs'
          onClick={() => setQuery('')}
        >
          {t('清空')}
        </Button>
      </div>
      <div className='grid grid-cols-2 gap-3'>
        <section aria-label={t('原始目录')} className='min-w-0'>
          <p className='mb-2 text-xs text-fd-muted-foreground'>
            {t('原始目录')}
          </p>
          <FileTree nodes={projectFiles} />
        </section>
        <section
          id='home-core-search-results'
          aria-label={t('筛选结果')}
          className='min-w-0'
        >
          <p className='mb-2 text-xs text-fd-muted-foreground'>
            {t('筛选结果')}
          </p>
          {matches.length > 0 ? (
            <FileTree nodes={matches} highlight={Boolean(keyword)} />
          ) : (
            <p className='text-xs leading-6 text-fd-muted-foreground'>
              {t('没有匹配的文件')}
            </p>
          )}
        </section>
      </div>
      <p
        role='status'
        className='mt-auto border-t border-fd-border pt-3 text-xs leading-6 text-fd-muted-foreground'
      >
        {!keyword
          ? t('显示全部文件。')
          : matches.length > 0
            ? t('保留匹配文件及其父级目录。')
            : t('没有匹配的文件。')}
        {t('原始数据不变。')}
      </p>
    </div>
  );
}

type DisplayPreference = { density: 'compact' | 'comfortable' };
const displayPreferenceKey = 'momo-website:home:display-preference';
const emptyDisplayPreference = () => null;

function useDisplayPreference() {
  // Each view owns an instance and subscribes to the same storage key.
  // The browser storage resolver is never called during SSR or hydration.
  const [binding] = useState(() => {
    const storage = new Storagefy<DisplayPreference>(
      displayPreferenceKey,
      () => window.localStorage,
    );
    return {
      storage,
      subscribe: (notify: () => void) => {
        try {
          return storage.subscribe(notify);
        } catch {
          return () => undefined;
        }
      },
      getSnapshot: () => {
        try {
          const value = storage.snapshot;
          return value?.density === 'compact' ||
            value?.density === 'comfortable'
            ? value
            : null;
        } catch {
          return 'unavailable' as const;
        }
      },
    };
  });
  const value = useSyncExternalStore(
    binding.subscribe,
    binding.getSnapshot,
    emptyDisplayPreference,
  );
  return [value, binding.storage] as const;
}

function StoredListPreview({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  const t = useSiteTranslations();
  const [preference] = useDisplayPreference();
  const compact =
    preference !== 'unavailable' && preference?.density === 'compact';

  return (
    <section
      aria-label={title}
      className='min-w-0 rounded-lg border border-fd-border px-2.5 py-3'
    >
      <div className='mb-2 flex flex-wrap items-center justify-between gap-1 text-xs'>
        <p>{title}</p>
        <Badge size='sm' variant='outline'>
          {compact ? t('紧凑') : t('宽松')}
        </Badge>
      </div>
      <ul className='divide-y divide-fd-border text-xs text-fd-muted-foreground'>
        {items.map((item) => (
          <li key={item} className={compact ? 'py-1.5' : 'py-3'}>
            <p className='truncate leading-5' title={item}>
              {item}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomeHostDemo() {
  const t = useSiteTranslations();
  const [preference, storage] = useDisplayPreference();
  const [error, setError] = useState<string>();
  const unavailable = preference === 'unavailable';
  const density = unavailable
    ? 'comfortable'
    : (preference?.density ?? 'comfortable');

  function save(next: DisplayPreference['density'] | null) {
    try {
      if (next === null) storage.remove();
      else storage.set({ density: next });
      setError(undefined);
    } catch {
      setError(t('未能保存设置，请检查浏览器的存储权限或可用空间。'));
    }
  }

  return (
    <div className={frameClass}>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <DemoSelect
          label={t('显示密度')}
          value={density}
          options={[
            { value: 'comfortable', label: t('宽松') },
            { value: 'compact', label: t('紧凑') },
          ]}
          disabled={unavailable}
          onChange={save}
        />
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='text-xs'
          disabled={unavailable}
          onClick={() => save(null)}
        >
          {t('重置设置')}
        </Button>
      </div>
      <div className='grid grid-cols-2 gap-3'>
        <StoredListPreview
          title={t('文件列表')}
          items={[t('设计说明.md'), t('组件清单.ts'), t('更新记录.md')]}
        />
        <StoredListPreview
          title={t('待办列表')}
          items={[t('检查键盘操作'), t('补充使用示例'), t('更新发布说明')]}
        />
      </div>
      {error || unavailable ? (
        <Alert
          variant='warning'
          role='status'
          className='mt-auto'
          description={error ?? t('浏览器存储不可用，无法保存设置。')}
        />
      ) : (
        <p
          role='status'
          className='mt-auto border-t border-fd-border pt-3 text-xs leading-6 text-fd-muted-foreground'
        >
          {preference
            ? t('已保存到此浏览器，刷新页面后仍会恢复。')
            : t('修改后自动保存；刷新页面可验证恢复。')}
        </p>
      )}
    </div>
  );
}

type Session = 'signed-in' | 'signed-out';
type AuthOutcome = { before: string | null; after: string | null };
type ResponseLog = { method: string; path: string; status: number };
type RequestPreview = {
  path: string;
  auth: AuthOutcome | null;
  authorization: string | null;
  log: ResponseLog | null;
};
const endpoints = [
  { name: '个人资料', path: '/account/profile', private: true },
  { name: '订单列表', path: '/account/orders', private: true },
  { name: '商品目录', path: '/catalog/products', private: false },
];

async function runRequests(
  session: Session,
  t: SiteTranslator,
): Promise<RequestPreview[]> {
  const token = session === 'signed-in' ? 'demo-token' : null;
  const authOutcomes = new Map<string, AuthOutcome>();
  const responseLog = new Map<string, ResponseLog>();
  const drive = new Drive({
    stages: {
      send: () => async (ctx, next) => {
        // Only the service response is simulated. Request middleware and
        // response decoding still run through Drive's normal lifecycle.
        const endpoint = endpoints.find((entry) => entry.path === ctx.path);
        const authenticated =
          ctx.req.headers.get('Authorization') === 'Bearer demo-token';
        const status = endpoint?.private && !authenticated ? 401 : 200;
        ctx.res.raw = Response.json(
          { message: status === 200 ? 'OK' : t('需要登录') },
          { status },
        );
        ctx.decode(ctx.res.raw);
        await next();
      },
    },
  })
    .use('/account/**', async (ctx, next) => {
      const before = ctx.req.headers.get('Authorization');
      if (token) ctx.req.headers.set('Authorization', `Bearer ${token}`);
      authOutcomes.set(ctx.path, {
        before,
        after: ctx.req.headers.get('Authorization'),
      });
      await next();
    })
    .use('*', async (ctx, next) => {
      await next();
      // Read the real response metadata after the remaining middleware returns.
      if (ctx.res.status !== undefined) {
        responseLog.set(ctx.path, {
          method: ctx.req.method ?? 'GET',
          path: ctx.path,
          status: ctx.res.status,
        });
      }
    });

  return Promise.all(
    endpoints.map(async ({ path }) => {
      const ctx = await drive.request({ api: `https://momo.example${path}` });
      return {
        path,
        auth: authOutcomes.get(path) ?? null,
        authorization: ctx.req.headers.get('Authorization'),
        log: responseLog.get(path) ?? null,
      };
    }),
  );
}

export function HomeDriveDemo() {
  const t = useSiteTranslations();
  const [session, setSession] = useState<Session>('signed-in');
  const [selectedPath, setSelectedPath] = useState('/account/profile');
  const [results, setResults] = useState<RequestPreview[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState(
    t('请求全部接口后，可切换查看各条规则的结果。'),
  );
  const result = results.find((entry) => entry.path === selectedPath);
  const authLabel = !result
    ? t('等待请求')
    : !result.auth
      ? t('未命中')
      : result.auth.after
        ? t('已添加凭证')
        : t('命中，无凭证');
  const authVariant =
    !result || !result.auth
      ? 'outline'
      : result.auth.after
        ? 'success'
        : 'warning';

  async function run() {
    setPending(true);
    setError(undefined);
    try {
      const next = await runRequests(session, t);
      setResults(next);
      setMessage(t('{0} 个接口已完成，可切换接口比较处理结果。', next.length));
    } catch {
      setResults([]);
      setError(t('示例执行失败，请重新运行。'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={frameClass}>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <DemoSelect
          label={t('登录状态')}
          value={session}
          options={[
            { value: 'signed-in', label: t('已登录') },
            { value: 'signed-out', label: t('未登录') },
          ]}
          disabled={pending}
          onChange={(value) => {
            setSession(value);
            setResults([]);
            setError(undefined);
            setMessage(t('登录状态已修改，重新请求查看结果。'));
          }}
        />
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='text-xs'
          disabled={pending}
          aria-busy={pending}
          onClick={run}
        >
          {pending && <Spinner className='size-3' aria-hidden />}
          {pending ? t('请求中…') : t('请求全部')}
        </Button>
      </div>
      <div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-fd-border pt-2'>
        <DemoSelect
          label={t('查看接口')}
          value={selectedPath}
          options={endpoints.map(({ name, path }) => ({
            value: path,
            label: t(name),
          }))}
          disabled={pending}
          onChange={setSelectedPath}
        />
        <div className='flex min-w-0 items-center gap-2'>
          <code className='text-[11px] text-fd-muted-foreground'>
            {selectedPath}
          </code>
          {result?.log && (
            <Badge
              size='sm'
              variant={result.log.status === 200 ? 'success' : 'warning'}
              aria-label={`HTTP ${result.log.status}`}
              className='font-mono tabular-nums'
            >
              {result.log.status}
            </Badge>
          )}
        </div>
      </div>
      <div className='divide-y divide-fd-border rounded-lg border border-fd-border'>
        <section
          aria-label={t('鉴权规则处理结果')}
          className='min-w-0 px-3 py-2'
        >
          <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5'>
            <span className='text-fd-muted-foreground'>{t('请求前')}</span>
            <h3 className='font-medium'>{t('鉴权规则')}</h3>
            <code className='text-fd-muted-foreground'>/account/**</code>
            <Badge size='sm' variant={authVariant} className='ml-auto'>
              {authLabel}
            </Badge>
          </div>
          <div className='mt-1 text-[11px] leading-5'>
            <p className='font-mono text-fd-muted-foreground'>Authorization</p>
            {result?.auth ? (
              <div className='flex flex-wrap items-center gap-x-2'>
                <span className='text-fd-muted-foreground'>
                  <span className='sr-only'>{t('处理前：')}</span>
                  {result.auth.before ?? t('未设置')}
                </span>
                <ArrowRight
                  className='size-3 shrink-0 text-fd-muted-foreground'
                  aria-hidden
                />
                <code className='wrap-anywhere'>
                  <span className='sr-only'>{t('处理后：')}</span>
                  {result.auth.after ?? t('未设置')}
                </code>
              </div>
            ) : (
              <p className='text-fd-muted-foreground'>
                {result
                  ? t('{0}，保持原样', result.authorization ?? t('未设置'))
                  : t('等待请求后查看变化')}
              </p>
            )}
          </div>
        </section>
        <section
          aria-label={t('响应记录处理结果')}
          className='min-w-0 px-3 py-2'
        >
          <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5'>
            <span className='text-fd-muted-foreground'>{t('响应后')}</span>
            <h3 className='font-medium'>{t('记录规则')}</h3>
            <code className='text-fd-muted-foreground'>*</code>
            <Badge
              size='sm'
              variant={result?.log ? 'success' : 'outline'}
              className='ml-auto'
            >
              {!result
                ? t('等待请求')
                : result.log
                  ? t('已写入日志')
                  : t('未写入日志')}
            </Badge>
          </div>
          <div className='mt-1 text-[11px] leading-5'>
            <p className='text-fd-muted-foreground'>{t('响应日志')}</p>
            {result?.log ? (
              <p className='flex flex-wrap items-center gap-x-2 font-mono'>
                <span>
                  {result.log.method} {result.log.path}
                </span>
                <ArrowRight
                  className='size-3 shrink-0 text-fd-muted-foreground'
                  aria-hidden
                />
                <span className='tabular-nums'>
                  <span className='sr-only'>HTTP </span>
                  {result.log.status}
                </span>
              </p>
            ) : (
              <p className='text-fd-muted-foreground'>{t('暂无记录')}</p>
            )}
          </div>
        </section>
      </div>
      {error ? (
        <Alert variant='warning' role='status' description={error} />
      ) : (
        <p role='status' className='sr-only'>
          {message}
        </p>
      )}
      <p className='mt-auto text-xs leading-5 text-fd-muted-foreground'>
        {t('凭证与响应为本地演示值，不发送网络请求。')}
      </p>
    </div>
  );
}
