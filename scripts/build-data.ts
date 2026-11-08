import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { convertCedict, convertHsk } from './convert.ts';

const SRC_DIR = 'data-src';
const OUT_DIR = 'public/data';
const HSK_URL = 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.min.json';
const CEDICT_URL = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';

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

const hsk = convertHsk(JSON.parse((await fetchCached(HSK_URL, 'hsk-complete.min.json')).toString('utf8')));
writeFileSync(`${OUT_DIR}/hsk.json`, JSON.stringify(hsk));
console.log(`hsk.json: ${hsk.length} words`);

const cedict = convertCedict(gunzipSync(await fetchCached(CEDICT_URL, 'cedict.txt.gz')).toString('utf8'));
writeFileSync(`${OUT_DIR}/cedict.txt`, cedict);
console.log(`cedict.txt: ${cedict.split('\n').length} entries`);
