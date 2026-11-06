import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { HomeLayout } from 'fumadocs-ui/layouts/home';

import { Hero } from '@/components/hero';
import { HomePackages } from '@/components/home-packages';
import { resolveLocale } from '@/lib/i18n';
import { baseOptions } from '@/lib/layout.shared';

export function homeHead(language?: string) {
  const chinese = resolveLocale(language) === 'zh';
  return {
    meta: [
      {
        title: chinese
          ? 'momo · 为 React 而生的可组合工具链'
          : 'momo · Composable tools for React',
      },
      {
        name: 'description',
        content: chinese
          ? 'momo 提供 React 组件与动画、数据处理、宿主环境工具和 HTTP 客户端，使用 TypeScript 编写，支持按需导入。'
          : 'React components and animations, data utilities, host environment tools, and an HTTP client. Written in TypeScript with on-demand imports.',
      },
    ],
  };
}

export function Home() {
  const { locale } = useI18n();
  return (
    <HomeLayout {...baseOptions(locale)} className='flex flex-1 flex-col'>
      <Hero />
      <HomePackages />
    </HomeLayout>
  );
}
