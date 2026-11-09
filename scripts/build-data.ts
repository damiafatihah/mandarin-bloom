import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { buildExamples } from './examples.ts';
import { convertCedict, convertHsk, fillMeaningsFromCedict } from './convert.ts';

const SRC_DIR = 'data-src';
const OUT_DIR = 'public/data';
const HSK_URL = 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.min.json';
const CEDICT_URL = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';
// Example sentences: Tatoeba (CC BY 2.0 FR). Chinese sentences, Chinese→English links, English sentences.
const TATOEBA = 'https://downloads.tatoeba.org/exports/per_language';
const TATOEBA_FILES = ['cmn/cmn_sentences.tsv.bz2', 'cmn/cmn-eng_links.tsv.bz2', 'eng/eng_sentences.tsv.bz2'];

async function fetchCached(url: string, file: string): Promise<Buffer> {
  const path = `${SRC_DIR}/${file}`;
  if (!existsSync(path)) {
    console.log(`Downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  return readFileSync(path);
}

mkdirSync(SRC_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const cedict = convertCedict(gunzipSync(await fetchCached(CEDICT_URL, 'cedict.txt.gz')).toString('utf8'));
writeFileSync(`${OUT_DIR}/cedict.txt`, cedict);
console.log(`cedict.txt: ${cedict.split('\n').length} entries`);

const hskRaw = convertHsk(JSON.parse((await fetchCached(HSK_URL, 'hsk-complete.min.json')).toString('utf8')));
const hsk = fillMeaningsFromCedict(hskRaw, cedict);
writeFileSync(`${OUT_DIR}/hsk.json`, JSON.stringify(hsk));
const filled = hsk.filter((w, i) => w !== hskRaw[i]).length;
console.log(`hsk.json: ${hsk.length} words (${filled} meanings filled from CEDICT)`);

// ---- example sentences ----
const bunzip = async (path: string) => {
  const file = path.split('/').pop()!;
  await fetchCached(`${TATOEBA}/${path}`, file);
  return execFileSync('bunzip2', ['-c', `${SRC_DIR}/${file}`], { maxBuffer: 1 << 30 }).toString('utf8');
};
const [cmnTsv, linksTsv, engTsv] = await Promise.all(TATOEBA_FILES.map(bunzip));
const rows = (tsv: string) => tsv.split('\n').filter(Boolean).map((l) => l.split('\t'));
const cmn = new Map(rows(cmnTsv).map(([id, , text]) => [id, text]));
const firstEn = new Map<string, string>();
for (const [c, e] of rows(linksTsv)) if (!firstEn.has(c)) firstEn.set(c, e);
const wanted = new Set(firstEn.values());
const eng = new Map(rows(engTsv).filter(([id]) => wanted.has(id)).map(([id, , text]) => [id, text]));
const pairs: [string, string][] = [];
for (const [c, e] of firstEn) {
  const zh = cmn.get(c), en = eng.get(e);
  if (zh && en) pairs.push([zh, en]);
}
const examples = buildExamples(pairs, hsk, cedict, 3);
writeFileSync(`${OUT_DIR}/examples.json`, JSON.stringify(examples));
const covered = (lv: number[]) => {
  const ws = hsk.filter((w) => lv.includes(w.l));
  return `${Math.round((100 * ws.filter((w) => examples.w[w.s]).length) / ws.length)}%`;
};
console.log(`examples.json: ${examples.s.length} sentences from ${pairs.length} pairs; words covered: ` +
  `HSK 1–3 ${covered([1, 2, 3])}, 4 ${covered([4])}, 5 ${covered([5])}, 6 ${covered([6])}, 7–9 ${covered([7])}`);
