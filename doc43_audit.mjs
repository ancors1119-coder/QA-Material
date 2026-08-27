/**
 * DOC43 판정 현황 점검기.
 *
 * index.html 안의 DEMO / DOC43_STATUS 를 그대로 읽어
 *   ① 특정 항목(HALAL 등)을 보유한 원료가 몇 건인지
 *   ② 원료별 보유율과 하위 원료
 *   ③ 확인필요가 많이 몰린 항목
 * 을 뽑는다. 인증서 갱신 요청 대상을 추릴 때 쓴다.
 *
 * 사전 준비
 *   python extract_module.py          → extracted.mjs 생성
 *
 * 사용법
 *   node doc43_audit.mjs                    전체 요약
 *   node doc43_audit.mjs HALAL              HALAL 보유 원료 목록
 *   node doc43_audit.mjs HALAL --check      HALAL 확인필요 원료와 사유
 *   node doc43_audit.mjs --low 50           보유율 50% 미만 원료
 *   node doc43_audit.mjs --gaps             확인필요가 많은 항목 순위
 */
import { DEMO, DOC43, DOC43_STATUS } from './extracted.mjs';

const args = process.argv.slice(2);
const flag = n => args.includes(n);
const nameOf = m => (m.detail?.name || m.name || '').slice(0, 34);

/** 원료별 판정 요약을 한 번에 만들어 둔다. */
const rows = DEMO.map(m => {
  const code = m.detail.code, st = DOC43_STATUS[code];
  if (!st) return null;
  const have = st.have || [], check = st.check || {}, na = st.na || {};
  const denom = 43 - Object.keys(na).length;
  return { code, name: nameOf(m), have, check, na, denom,
           rate: Math.round(have.length / denom * 100) };
}).filter(Boolean);

if (flag('--gaps')) {
  const tally = new Map();
  for (const r of rows)
    for (const k of Object.keys(r.check)) tally.set(k, (tally.get(k) || 0) + 1);
  const sorted = [...tally].sort((a, b) => b[1] - a[1]);
  console.log(`확인필요가 몰린 항목 (전체 ${rows.length}개 원료 기준)\n`);
  for (const [item, n] of sorted.slice(0, 25))
    console.log(`  ${String(n).padStart(3)}건  ${item}`);

} else if (flag('--low')) {
  const cut = Number(args[args.indexOf('--low') + 1] || 50);
  const low = rows.filter(r => r.rate < cut).sort((a, b) => a.rate - b.rate);
  console.log(`보유율 ${cut}% 미만 ${low.length}건\n`);
  for (const r of low)
    console.log(`  ${r.code} ${String(r.rate).padStart(3)}%  (${r.have.length}/${r.denom})  ${r.name}`);

} else if (args.length && !args[0].startsWith('--')) {
  const item = args[0];
  if (!DOC43.includes(item)) {
    console.log(`DOC43에 없는 항목명: "${item}"`);
    console.log('\n사용 가능한 항목:');
    console.log('  ' + DOC43.join(' · '));
    process.exit(1);
  }
  if (flag('--check')) {
    const hit = rows.filter(r => item in r.check);
    console.log(`"${item}" 확인필요 ${hit.length}건\n`);
    for (const r of hit) {
      console.log(`── ${r.code} ${r.name}`);
      console.log(`   ${String(r.check[item]).replace(/\*\*/g, '').slice(0, 240)}\n`);
    }
  } else {
    const hit = rows.filter(r => r.have.includes(item));
    console.log(`"${item}" 보유 ${hit.length}건 / 확인필요 ${rows.filter(r => item in r.check).length}건 ` +
                `/ 해당없음 ${rows.filter(r => item in r.na).length}건 (전체 ${rows.length}건)\n`);
    for (const r of hit) console.log(`  ${r.code}  ${r.name}`);
  }

} else {
  let o = 0, d = 0;
  for (const r of rows) { o += r.have.length; d += r.denom; }
  console.log(`원료 ${rows.length}건 / 평균 보유율 ${(o / d * 100).toFixed(1)}%  (O ${o} / 분모 ${d})`);
  const worst = [...rows].sort((a, b) => a.rate - b.rate).slice(0, 10);
  console.log('\n보유율 하위 10건');
  for (const r of worst)
    console.log(`  ${r.code} ${String(r.rate).padStart(3)}%  ${r.name}`);
  console.log('\n옵션: <항목명> | <항목명> --check | --low <숫자> | --gaps');
}
