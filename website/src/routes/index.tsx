import { createFileRoute } from '@tanstack/react-router';

import { HomeLayout } from 'fumadocs-ui/layouts/home';

import { Hero } from '@/components/hero';
import { HomePackages } from '@/components/home-packages';
import { baseOptions } from '@/lib/layout.shared';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'momo · 为 React 而生的可组合工具链' },
      {
        name: 'description',
        content:
          'momo 提供 React 组件与动画、数据处理、宿主环境工具和 HTTP 客户端，使用 TypeScript 编写，支持按需导入。',
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <HomeLayout {...baseOptions()} className='flex flex-1 flex-col'>
      <Hero />
      <HomePackages />
    </HomeLayout>
  );
}
