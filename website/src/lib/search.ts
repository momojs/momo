import type { Tokenizer } from '@orama/orama';

import { resolveLocale } from './i18n';

/** Use the same word segmentation when indexing and searching Chinese text. */
export function searchOptions(language?: string) {
  if (resolveLocale(language) !== 'zh') return { language: 'english' };
  const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
  const tokenizer: Tokenizer = {
    language: 'english',
    normalizationCache: new Map(),
    tokenize: (text) => [
      ...new Set(
        Array.from(segmenter.segment(text.toLowerCase()))
          .filter((part) => part.isWordLike)
          .map((part) => part.segment),
      ),
    ],
  };
  return { components: { tokenizer } };
}
