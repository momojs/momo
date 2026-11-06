import { Suspense } from 'react';

import { Link, notFound, useLoaderData } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions';

import browserCollections from 'collections/browser';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';

import { useMDXComponents } from '@/components/mdx';
import { resolveLocale } from '@/lib/i18n';
import { baseOptions } from '@/lib/layout.shared';
import { gitConfig, withBasePath } from '@/lib/shared';
import { slugsToMarkdownPath, source } from '@/lib/source';

export async function loadDocs(
  params: { lang?: string } & Partial<Record<'_splat', string>>,
) {
  const slugs = params._splat?.split('/').filter(Boolean) ?? [];
  const data = await loader({
    data: { slugs, lang: resolveLocale(params.lang) },
  });
  await clientLoader.preload(data.path);
  return data;
}

const loader = createServerFn({
  method: 'GET',
})
  .validator((data: { slugs: string[]; lang: string }) => data)
  .middleware([staticFunctionMiddleware])
  .handler(async ({ data: { slugs, lang } }) => {
    const page = source.getPage(slugs, lang);
    if (!page) throw notFound();

    return {
      path: page.path,
      lang,
      title: page.data.title,
      description: page.data.description,
      markdownUrl: slugsToMarkdownPath(page.slugs, lang).url,
      pageTree: await source.serializePageTree(source.getPageTree(lang)),
    };
  });

const clientLoader = browserCollections.docs.createClientLoader({
  component(
    { toc, frontmatter, default: Mdx },
    // you can define props for the component
    {
      markdownUrl,
      path,
    }: {
      markdownUrl: string;
      path: string;
    },
  ) {
    return (
      <DocsPage toc={toc}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <div className='flex flex-row gap-2 items-center border-b -mt-4 pb-6'>
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover
            markdownUrl={markdownUrl}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/website/content/docs/${path}`}
          />
        </div>
        <DocsBody>
          <Mdx components={useMDXComponents()} />
        </DocsBody>
      </DocsPage>
    );
  },
});

export function DocsContent() {
  const { pageTree, path, markdownUrl, lang } = useFumadocsLoader(
    useLoaderData({ strict: false }) as Awaited<ReturnType<typeof loadDocs>>,
  );

  return (
    <DocsLayout {...baseOptions(lang)} tree={pageTree}>
      <Link to={markdownUrl} hidden />
      <Suspense>
        {clientLoader.useContent(path, {
          markdownUrl: withBasePath(markdownUrl),
          path,
        })}
      </Suspense>
    </DocsLayout>
  );
}
