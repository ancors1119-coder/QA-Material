"""본문 텍스트가 안 잡히는 PDF 페이지를 PNG로 렌더링 (비전 판독용).

주의: 본문만 이미지이고 머리말·꼬리말은 텍스트인 PDF가 흔하다(세일인터내쇼날 확인서류 등).
그래서 '텍스트 0자'가 아니라 '임계값(기본 400자) 미만'을 스캔본으로 간주한다.
사용: python render_scans.py <원료폴더> <출력폴더> [임계값]
"""
import sys, os, re, fitz

src, outdir = sys.argv[1], sys.argv[2]
limit = int(sys.argv[3]) if len(sys.argv) > 3 else 400
os.makedirs(outdir, exist_ok=True)
for fn in sorted(os.listdir(src)):
    if not fn.lower().endswith(".pdf"):
        continue
    doc = fitz.open(os.path.join(src, fn))
    for i, page in enumerate(doc, 1):
        n = len(page.get_text().strip())
        if n >= limit:
            continue
        slug = re.sub(r"[^A-Za-z0-9]+", "_", os.path.splitext(fn)[0])[-60:]
        out = os.path.join(outdir, f"{slug}_p{i}.png")
        page.get_pixmap(dpi=170).save(out)
        print(f"{out}  (추출 텍스트 {n}자)")
    doc.close()
