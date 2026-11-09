import { useEffect, useState } from 'react';
import type { DictEntry, HskWord } from '../lib/types';
import { parseDictTsv } from '../lib/search';

function cached<T>(fn: () => Promise<T>): () => Promise<T> {
  let p: Promise<T> | null = null;
  return () => (p ??= fn().catch((e) => { p = null; throw e; }));
}

async function get(path: string): Promise<Response> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r;
}

/** Example sentences: `s` holds [chinese, english] pairs; `w` maps a word to indexes into `s`, easiest first. */
export type ExamplesData = { s: [string, string][]; w: Record<string, number[]> };

export const examplesFor = (data: ExamplesData | null, word: string): [string, string][] =>
  data ? (data.w[word] ?? []).map((i) => data.s[i]).filter(Boolean) : [];

export const loadHsk = cached(async () => (await (await get('/data/hsk.json')).json()) as HskWord[]);
export const loadExamples = cached(async () => (await (await get('/data/examples.json')).json()) as ExamplesData);
export const loadCedict = cached(async () => parseDictTsv(await (await get('/data/cedict.txt')).text()));

type Resource<T> = { data: T | null; error: Error | null };

function useResource<T>(load: () => Promise<T>, enabled = true): Resource<T> {
  const [res, setRes] = useState<Resource<T>>({ data: null, error: null });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    load().then(
      (data) => alive && setRes({ data, error: null }),
      (error: Error) => alive && setRes({ data: null, error }),
    );
    return () => { alive = false; };
  }, [load, enabled]);
  return res;
}

export const useHsk = () => useResource(loadHsk);
export const useExamples = () => useResource(loadExamples);
export const useCedict = (enabled = true) => useResource<DictEntry[]>(loadCedict, enabled);
