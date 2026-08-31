/** 미검증 스텁 1,804건의 정독 우선순위를 낸다.
 *  파일 수가 많을수록 한 건에서 얻는 항목이 많지만, 100개를 넘으면
 *  한 세션에 한 건도 끝내기 어려워 오히려 진도가 안 나간다.
 *  실제로 이번 세션에서 35개짜리 한 건이 상당한 분량이었다.
 */
import { DEMO, DEMO_AUTO } from './extracted.mjs';
import fs from 'fs';

/* 이미 정독한 113건에서 브랜드 계열을 배운다 — 같은 계열은 서식이 같아 판독이 빠르다 */
const known = new Map();
for (const x of DEMO) {
  const n = String(x.detail.name || x.name || '').toUpperCase();
  const brand = (n.match(/^[A-Z][A-Z0-9\-]{2,}/) || [])[0];
  if (brand && brand.length >= 4) known.set(brand, (known.get(brand) || 0) + 1);
}

const rows = DEMO_AUTO.map(x => {
  const name = String(x.detail.name || x.name || '');
  const n = x.fileCount || 0;
  const up = name.toUpperCase();
  const brand = (up.match(/^[A-Z][A-Z0-9\-]{2,}/) || [])[0] || '';
  const kin = brand && known.has(brand) ? known.get(brand) : 0;
  /* 20~60개 구간에 가장 높은 점수 — 정보가 충분하면서 한 세션에 여러 건이 가능하다 */
  const band = n >= 20 && n <= 60 ? 1.0 : n > 60 && n <= 100 ? 0.75 : n > 100 ? 0.45 : n >= 10 ? 0.8 : 0.5;
  return { code: x.detail.code, name: name.slice(0, 42), files: n, kin,
           score: Math.round(n * band + kin * 8) };
}).sort((a, b) => b.score - a.score);

const out = rows.map(r => `${r.code}\t${r.files}\t${r.kin}\t${r.name}`).join('\n');
fs.writeFileSync(new URL('./stub_priority.tsv', import.meta.url),
  '코드\t파일수\t기정독동일계열\t원료명\n' + out, 'utf8');

console.log(`미검증 ${rows.length}건 우선순위 산출\n`);
console.log('상위 25건 (코드 · 파일 · 계열 · 원료명)');
rows.slice(0, 25).forEach(r =>
  console.log(`  ${r.code} ${String(r.files).padStart(3)}개 ${r.kin ? `계열${r.kin}` : '    '}  ${r.name}`));
const band = n => rows.filter(r => n[0] <= r.files && r.files <= n[1]).length;
console.log(`\n구간별  10~19: ${band([10,19])} · 20~60: ${band([20,60])} · 61~100: ${band([61,100])} · 100+: ${band([101,999])}`);
