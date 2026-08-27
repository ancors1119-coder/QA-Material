import { DEMO, DOC43, DOC43_STATUS, DEMO_AUTO } from "./extracted.mjs";

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

console.log(`DEMO ${DEMO.length}건 / DEMO_AUTO ${DEMO_AUTO.length}건 / DOC43_STATUS ${stCodes.length}건`);
const t = c => { const s = DOC43_STATUS[c]; return (s.have||[]).length; };
console.log(`612252 have=${t("612252")} / 612272 have=${t("612272")}`);
console.log(err.length ? "오류 " + err.length + "건:\n- " + err.join("\n- ") : "오류 0건");
