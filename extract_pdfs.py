import sys, os
import pdfplumber


def fallback_text(fpath):
    """pdfplumber 가 열지 못한 PDF 를 PyMuPDF 로 다시 읽는다.

    pdfplumber 는 Ascii85 스트림이 조금만 어긋나도 파일 전체에서 예외를 던진다
    (611113 자일리톨에서 4건). 예외만 적어 두면 그 문서가 판정에서 조용히 빠지므로
    엔진을 바꿔 한 번 더 시도한다.
    """
    import fitz
    doc = fitz.open(fpath)
    parts = []
    for i, page in enumerate(doc):
        parts.append("\n--- page %d ---\n" % (i + 1))
        parts.append(page.get_text())
        parts.append("\n")
    doc.close()
    return "".join(parts)


folder = sys.argv[1]
out_path = sys.argv[2]

with open(out_path, "w", encoding="utf-8") as out:
    # 하위폴더까지 훑는다 — 만료본·구자료가 하위폴더에 들어 있는 원료가 많아
    # os.listdir 만 쓰면 그 문서들이 판독 대상에서 조용히 빠진다.
    paths = []
    for base, _dirs, names in os.walk(folder):
        for n in names:
            if n.lower().endswith(".pdf"):
                paths.append(os.path.join(base, n))
    for fpath in sorted(paths):
        fname = os.path.relpath(fpath, folder).replace(os.sep, "/")
        out.write("\n" + "="*100 + "\n")
        out.write(f"FILE: {fname}\n")
        out.write("="*100 + "\n")
        try:
            with pdfplumber.open(fpath) as pdf:
                for i, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    out.write(f"\n--- page {i+1} ---\n")
                    out.write(text)
                    out.write("\n")
        except Exception as e:
            try:
                out.write(f"[pdfplumber 실패 → PyMuPDF 로 재추출: {e}]\n")
                out.write(fallback_text(fpath))
            except Exception as e2:
                out.write(f"[ERROR extracting {fname}: {e} / fallback: {e2}]\n")
print("done:", out_path)
