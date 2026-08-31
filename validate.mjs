/* extract_module.py 는 Temp 에 qa_extracted.mjs 를 쓴다.
   예전에는 프로젝트 폴더의 extracted.mjs 를 읽었는데, 그 파일이 갱신되지 않아도
   검증이 조용히 통과해 버렸다 — 최신본을 읽는지 경로로 못박는다. */
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { statSync } from "node:fs";
const SRC = tmpdir() + "/qa_extracted.mjs";
if (Date.now() - statSync(SRC).mtimeMs > 10 * 60 * 1000)
  console.warn("경고: " + SRC + " 가 10분 이상 지났습니다. python extract_module.py 를 먼저 실행하세요.");
const { DEMO, DOC43, DOC43_STATUS, DEMO_AUTO } = await import(pathToFileURL(SRC).href);

const err = [];
const codes = DEMO.map(d => d.detail.code);
const autoCodes = DEMO_AUTO.map(d => d.detail.code);

// 1) 코드 중복 / DEMO↔DEMO_AUTO 중복
const dup = codes.filter((c, i) => codes.indexOf(c) !== i);
if (dup.length) err.push(`DEMO 코드 중복: ${[...new Set(dup)]}`);
const both = codes.filter(c => autoCodes.includes(c));
if (both.length) err.push(`DEMO와 DEMO_AUTO에 동시 존재: ${both}`);

// 2) DEMO ↔ DOC43_STATUS 매칭
const stCodes = Object.keys(DOC43_STATUS);
const missing = codes.filter(c => !stCodes.includes(c));
const orphan = stCodes.filter(c => !codes.includes(c));
if (missing.length) err.push(`DOC43_STATUS 누락: ${missing}`);
if (orphan.length) err.push(`DEMO에 없는 DOC43_STATUS: ${orphan}`);

// 3) 항목명 오타 / have·check·na 중복 배정
for (const [code, st] of Object.entries(DOC43_STATUS)) {
  const have = st.have || [], check = Object.keys(st.check || {}), na = Object.keys(st.na || {});
  for (const item of [...have, ...check, ...na])
    if (!DOC43.includes(item)) err.push(`${code}: DOC43에 없는 항목명 "${item}"`);
  const all = [...have, ...check, ...na];
  const d = all.filter((x, i) => all.indexOf(x) !== i);
  if (d.length) err.push(`${code}: 중복 배정 ${[...new Set(d)]}`);
}

// 4) fileCount vs documents[] 파일 수
for (const d of DEMO) {
  const docs = d.detail.documents || [];
  const n = docs.reduce((s, x) => s + (x.files ? x.files.length : 0), 0);
  if (d.fileCount != null && docs.length && n !== d.fileCount)
    err.push(`${d.detail.code} ${d.name}: fileCount ${d.fileCount} ≠ documents 파일수 ${n}`);
}

// 8) storage 필수키 — 스크립트로 통째로 덮어쓸 때 필드가 통째로 사라지는 사고 방지
const STORAGE_KEYS = ['expiryDate','expiryLot','expirySrc','temp','text','source','shelfLife'];
for (const [code, st] of Object.entries(DOC43_STATUS)) {
  if (!st.storage) { err.push(`${code}: storage 없음`); continue; }
  const missing = STORAGE_KEYS.filter(k => !(k in st.storage));
  if (missing.length) err.push(`${code}: storage 키 누락 ${missing.join(', ')}`);
}

/* 서로 다른 원료가 같은 이름을 쓰는 경우가 있다(611599/611941 SHEA BUTTER 등).
   스텁을 이름으로 찾아 지우면 엉뚱한 원료가 사라지므로 미리 알려 준다. */
const byName = new Map();
for (const m of DEMO_AUTO) {
  const n = m.name;
  if (!byName.has(n)) byName.set(n, []);
  byName.get(n).push(m.detail.code);
}
const dupNames = [...byName].filter(([, c]) => c.length > 1);
if (dupNames.length) {
  console.log(`
주의: 이름이 겹치는 미검증 스텁 ${dupNames.length}쌍 — 정독 등록 시 반드시 code 로 스텁을 찾을 것`);
  for (const [n, c] of dupNames) console.log(`  ${c.join(' / ')}  ${n}`);
  console.log('');
}

console.log(`DEMO ${DEMO.length}건 / DEMO_AUTO ${DEMO_AUTO.length}건 / DOC43_STATUS ${stCodes.length}건`);
const t = c => { const s = DOC43_STATUS[c]; return (s.have||[]).length; };
console.log(`612252 have=${t("612252")} / 612272 have=${t("612272")}`);
console.log(err.length ? "오류 " + err.length + "건:\n- " + err.join("\n- ") : "오류 0건");
