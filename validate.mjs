import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
const { DEMO, DOC43, DOC43_STATUS, DEMO_AUTO } =
  await import(pathToFileURL(path.join(os.tmpdir(), "qa_extracted.mjs")).href);

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

// 5) 스키마 타입 일관성 — 다수(過半)와 타입이 다른 필드는 렌더러가 깨진다
//    (msds.physical을 표(배열) 대신 문자열로 쓰면 상세창이 table.map 오류로 죽었던 사례)
const typeOf = v => v == null ? null : Array.isArray(v) ? "array" : typeof v;
const FIELDS = [
  ["detail.specTable",    d => d.detail && d.detail.specTable],
  ["detail.composition",  d => d.detail && d.detail.composition],
  ["detail.documents",    d => d.detail && d.detail.documents],
  ["detail.declarations", d => d.detail && d.detail.declarations],
  ["detail.msds.physical",d => d.detail && d.detail.msds && d.detail.msds.physical],
  ["detail.coa.results",  d => d.detail && d.detail.coa && d.detail.coa.results],
  ["detail.origin.rawMaterials", d => d.detail && d.detail.origin && d.detail.origin.rawMaterials],
  ["certs",               d => d.certs],
];
for (const [label, get] of FIELDS) {
  const seen = new Map();                       // type -> [code]
  for (const d of DEMO) {
    const ty = typeOf(get(d));
    if (ty === null) continue;
    if (!seen.has(ty)) seen.set(ty, []);
    seen.get(ty).push(d.detail.code);
  }
  if (seen.size > 1) {
    const major = [...seen.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    for (const [ty, codes] of seen)
      if (ty !== major[0])
        err.push(`${label}: 다수는 ${major[0]}(${major[1].length}건)인데 ${ty} 사용 → ${codes.join(" ")}`);
  }
}

// 6) 표 행(row) 구조 점검 — item/spec 같은 필수 키 누락
const ROWS = [
  ["detail.specTable",     d => d.detail.specTable,     ["item", "spec"]],
  ["detail.composition",   d => d.detail.composition,   ["item"]],
  ["detail.msds.physical", d => d.detail.msds && d.detail.msds.physical, ["item", "spec"]],
  ["detail.coa.results",   d => d.detail.coa && d.detail.coa.results,    ["item"]],
  ["detail.documents",     d => d.detail.documents,     ["files", "title"]],
];
for (const [label, get, keys] of ROWS)
  for (const d of DEMO) {
    const rows = get(d);
    if (!Array.isArray(rows)) continue;
    rows.forEach((r, i) => {
      if (r === null || typeof r !== "object") { err.push(`${d.detail.code} ${label}[${i}]: 객체가 아님`); return; }
      for (const k of keys) if (r[k] == null) err.push(`${d.detail.code} ${label}[${i}]: "${k}" 누락`);
    });
  }

console.log(`DEMO ${DEMO.length}건 / DEMO_AUTO ${DEMO_AUTO.length}건 / DOC43_STATUS ${stCodes.length}건`);
const t = c => { const s = DOC43_STATUS[c]; return (s.have||[]).length; };
console.log(`612252 have=${t("612252")} / 612272 have=${t("612272")}`);
console.log(err.length ? "오류 " + err.length + "건:\n- " + err.join("\n- ") : "오류 0건");

