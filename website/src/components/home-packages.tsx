import { Link } from '@tanstack/react-router';

import {
  ArrowUpRight,
  Boxes,
  Monitor,
  PanelsTopLeft,
  Route,
} from 'lucide-react';

import { useSiteLocale, useSiteTranslations } from '@/lib/site-translations';
import motionTheme from '@/motion.theme';

import { MotionUIThemeProvider } from '../../../packages/design/src/motion';
import { HomeDesignDemo } from './home-design-demo';
import {
  HomeCoreDemo,
  HomeDriveDemo,
  HomeHostDemo,
} from './home-package-demos';
import { HomePackageSource } from './home-package-source';

const packages = [
  {
    name: 'core',
    icon: Boxes,
    category: '通用工具与类型',
    title: '筛选文件，保留目录层级',
    description:
      'prune 按条件筛选树节点，同时保留匹配项的父级路径。返回新树，保留节点类型，不修改原始数据。',
    Demo: HomeCoreDemo,
    example: `import { prune } from '@momots/core/tree/prune';
import type { TreeNode } from '@momots/core/tree/types';

type Entry = { name: string; kind: 'file' | 'folder' };

function searchFiles(files: TreeNode<Entry>[], query: string) {
  const keyword = query.trim().toLowerCase();
  return prune(files, (node) =>
    node.kind === 'file' &&
    node.name.toLowerCase().includes(keyword),
  );
}

// 返回类型推导为 TreeNode<Entry>[]
// name、kind 和递归 children 的类型均保留`,
    accent: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
  },
  {
    name: 'host',
    icon: Monitor,
    category: '宿主与平台能力',
    title: '保存设置，同步多个视图',
    description:
      'Storagefy 保存显示设置，并通知订阅同一存储项的视图。刷新页面后恢复设置，应用无需手动同步各处状态。',
    Demo: HomeHostDemo,
    example: `import { Storagefy } from '@momots/host/storage';

type Display = { density: 'compact' | 'comfortable' };
// 浏览器中默认使用 localStorage
const settings = new Storagefy<Display>('display');
const list = new Storagefy<Display>('display');

const unsubscribe = list.subscribe(() => {
  console.log(list.snapshot?.density);
});

settings.set({ density: 'compact' }); // 订阅收到 compact
// 刷新后使用相同的 key，仍可读取已保存的设置
settings.get(); // { density: 'compact' }

settings.remove(); // 清除设置，订阅同步收到变更
unsubscribe();`,
    accent: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  {
    name: 'drive',
    icon: Route,
    category: '请求与传输策略',
    title: '按请求范围组合公共规则',
    description:
      '鉴权规则修改账户接口的请求头，记录规则读取所有接口的响应。切换接口，对照每条规则的处理结果。',
    Demo: HomeDriveDemo,
    example: `import { Drive } from '@momots/drive';

const drive = new Drive()
  .use('/account/**', async (ctx, next) => {
    // 请求前：为账户接口添加凭证
    const token = getToken();
    if (token) {
      ctx.req.headers.set('Authorization', \`Bearer \${token}\`);
    }
    await next();
  })
  .use('*', async (ctx, next) => {
    await next();
    // 响应后：记录所有接口的状态，包括 401
    console.log({
      method: ctx.req.method,
      path: ctx.path,
      status: ctx.res.status,
    });
  });

// 业务调用只表达要访问哪个接口
drive.get({ api: '/account/profile' });
drive.get({ api: '/account/orders' });
// 商品目录只匹配响应记录规则
drive.get({ api: '/catalog/products' });`,
    accent: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  {
    name: 'design',
    icon: PanelsTopLeft,
    category: '组件与动画',
    title: '内容变化，过渡由组件处理',
    description:
      '展开设置、切换频率、拖动滑块。图标、高亮和面板高度随状态变化，收起后显示当前选择。',
    Demo: HomeDesignDemo,
    example: `const periods = [
  { value: '每天', label: '每天' },
  { value: '每周', label: '每周' },
  { value: '每月', label: '每月' },
];

function ReminderSettings() {
  // 状态放在面板外，收起后仍会保留
  const [period, setPeriod] = useState('每周');
  const [minutes, setMinutes] = useState(25);

  return (
    <Accordion
      defaultValue={['reminder']}
      options={[{
        value: 'reminder',
        label: \`\${period}提醒 · 提前 \${minutes} 分钟\`,
        content: (
          <>
            <ToggleGroup
              variant="segmented"
              options={periods}
              value={period}
              onChange={(next) => { if (next) setPeriod(next); }}
            />
            <Slider
              label="提前"
              min={5}
              max={60}
              step={5}
              value={minutes}
              formatValue={(value) => \`\${value} 分钟\`}
              onValueChange={setMinutes}
            />
          </>
        ),
      }]}
    />
  );
}`,
    accent: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
];

export function HomePackages() {
  const t = useSiteTranslations();
  const locale = useSiteLocale();
  return (
    <MotionUIThemeProvider theme={motionTheme}>
      <section
        aria-label={t('工具包')}
        className='mx-auto w-full max-w-6xl px-6 pb-20 sm:px-10 sm:pb-24'
      >
        <div className='border-t border-fd-border pt-14 sm:pt-16'>
          <div className='grid items-start gap-4 lg:grid-cols-2'>
            {packages.map((entry) => (
              <article
                key={entry.name}
                aria-labelledby={`package-${entry.name}`}
                className='flex min-w-0 flex-col rounded-2xl border border-fd-border bg-fd-card/60 p-5 sm:p-6'
              >
                <div className='flex items-center gap-3'>
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-xl ${entry.accent}`}
                  >
                    <entry.icon className='size-4' aria-hidden />
                  </span>
                  <h2
                    id={`package-${entry.name}`}
                    className='font-mono text-base font-medium'
                  >
                    momo/{entry.name}
                  </h2>
                  <span className='ml-auto text-xs text-fd-muted-foreground'>
                    {t(entry.category)}
                  </span>
                </div>
                <p className='mt-6 text-base font-semibold leading-7'>
                  {t(entry.title)}
                </p>
                <p className='mt-3 text-sm leading-7 text-fd-muted-foreground'>
                  {t(entry.description)}
                </p>
                <div className='mt-6 min-w-0'>
                  <entry.Demo key={locale} />
                </div>
                <div className='mt-auto flex items-center justify-between gap-3 pt-4'>
                  <Link
                    to='/$lang/docs/$'
                    params={{ lang: locale, ['_splat']: entry.name }}
                    className='inline-flex items-center gap-2 rounded-md py-1.5 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fd-ring'
                  >
                    momo/{entry.name}
                    {t('文档')}
                    <ArrowUpRight className='size-4' aria-hidden />
                  </Link>
                  <HomePackageSource
                    name={entry.name}
                    title={t(entry.title)}
                    code={t(entry.example)}
                    lang={entry.name === 'design' ? 'tsx' : 'ts'}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MotionUIThemeProvider>
  );
}
