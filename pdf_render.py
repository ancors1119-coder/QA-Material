# -*- coding: utf-8 -*-
"""스캔본 PDF를 PNG로 렌더링해 눈으로 읽을 수 있게 만든다.

정독 과정에서 텍스트가 추출되지 않는 문서(스캔 이미지)가 꾸준히 나온다.
특히 COA는 유효기한·로트가 그 안에만 있어서, 읽지 못하면 판정을 확정할 수 없다.
pdftoppm 이 없는 환경이라 PyMuPDF 로 직접 렌더링한다.

사용법
    python pdf_render.py <PDF경로> [출력폴더] [--dpi 200] [--pages 1-3]

    출력폴더를 생략하면 %TEMP%\\qa_png 에 넣는다.
    파일명은 <원본이름>_p01.png 형태다.

여러 건을 한 번에 처리하려면 폴더를 넘긴다 — 그 안의 PDF 중
**텍스트가 거의 없는 것만** 골라 렌더링한다(이미 읽히는 문서는 건너뛴다).
"""
import io, os, re, sys, glob

import fitz

sys.stdout.reconfigure(encoding='utf-8')

# 이 글자 수 미만이면 스캔본으로 본다(머리글·꼬리말만 텍스트인 경우가 있다)
TEXT_FLOOR = 40


def render(path, out_dir, dpi=200, pages=None):
    """PDF 한 개를 PNG 여러 장으로 만든다. 만들어진 경로 목록을 돌려준다."""
    doc = fitz.open(path)
    base = re.sub(r'[\\/:*?"<>|]', '_', os.path.splitext(os.path.basename(path))[0])[:80]
    made = []
    for n, page in enumerate(doc, 1):
        if pages and n not in pages:
            continue
        pix = page.get_pixmap(dpi=dpi)
        p = os.path.join(out_dir, '%s_p%02d.png' % (base, n))
        pix.save(p)
        made.append(p)
    doc.close()
    return made



TILE_W = 1240   # 타일 공통 폭(px) — 150dpi A4 세로쪽 폭에 맞춘 값


def montage(paths, out_path, dpi=150, cols=2, top_frac=0.62):
    """여러 PDF 의 1페이지 윗부분을 격자로 이어 붙여 PNG 한 장으로 만든다.

    선언서(statement)류는 한 장짜리에 본문이 위쪽 2/3 안에 다 들어간다.
    한 건씩 열어보면 왕복이 너무 많아, 한 번에 훑을 수 있게 합친다.
    파일명은 각 칸 위에 찍는다 — 어느 칸이 어느 문서인지 알아야 근거로 쓸 수 있다.
    """
    from PIL import Image, ImageDraw
    tiles = []
    for path in paths:
        doc = fitz.open(path)
        pix = doc[0].get_pixmap(dpi=dpi)
        img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        doc.close()
        img = img.crop((0, 0, img.width, int(img.height * top_frac)))
        # 페이지 크기가 문서마다 다르다. 폭을 맞추지 않으면 A4 옆에 큰 캔버스가 붙어
        # 작은 문서가 읽을 수 없게 줄어든다.
        if img.width != TILE_W:
            img = img.resize((TILE_W, max(1, round(img.height * TILE_W / img.width))))
        band = Image.new('RGB', (img.width, img.height + 26), 'white')
        band.paste(img, (0, 26))
        ImageDraw.Draw(band).text((6, 6), os.path.basename(path)[:90], fill='black')
        tiles.append(band)

    w = max(t.width for t in tiles)
    h = max(t.height for t in tiles)
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (w * cols, h * rows), 'white')
    for n, t in enumerate(tiles):
        sheet.paste(t, ((n % cols) * w, (n // cols) * h))
    sheet.save(out_path)
    return out_path


def is_scan(path):
    """본문 텍스트가 사실상 없는 PDF인지."""
    try:
        doc = fitz.open(path)
    except Exception:
        return False
    total = sum(len(p.get_text().strip()) for p in doc)
    doc.close()
    return total < TEXT_FLOOR


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    src = sys.argv[1]
    rest = sys.argv[2:]
    out_dir = None
    dpi, pages = 200, None
    i = 0
    while i < len(rest):
        a = rest[i]
        if a == '--dpi':
            dpi = int(rest[i + 1]); i += 2
        elif a == '--pages':
            s = rest[i + 1]
            pages = set()
            for part in s.split(','):
                if '-' in part:
                    a1, b1 = part.split('-')
                    pages.update(range(int(a1), int(b1) + 1))
                else:
                    pages.add(int(part))
            i += 2
        else:
            out_dir = a; i += 1

    out_dir = out_dir or os.path.join(os.environ.get('TEMP', '.'), 'qa_png')
    os.makedirs(out_dir, exist_ok=True)

    if os.path.isdir(src):
        targets = [p for p in glob.glob(os.path.join(src, '**', '*.pdf'), recursive=True)
                   if is_scan(p)]
        targets += [p for p in glob.glob(os.path.join(src, '**', '*.PDF'), recursive=True)
                    if is_scan(p)]
        print('스캔본 %d건을 렌더링합니다' % len(targets))
    else:
        targets = [src]

    for p in targets:
        made = render(p, out_dir, dpi, pages)
        print('%s → %d장' % (os.path.basename(p)[:64], len(made)))
        for m in made:
            print('   ', m)
    return 0


def demo():
    """자체 점검 — 빈 PDF 를 만들어 렌더링과 스캔 판정이 도는지 본다."""
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, 'blank.pdf')
        doc = fitz.open()
        doc.new_page()                       # 글자 없는 백지 = 스캔본으로 판정되어야 한다
        doc.save(p); doc.close()
        assert is_scan(p), '백지 PDF 를 스캔본으로 보지 못했습니다'

        q = os.path.join(d, 'text.pdf')
        doc = fitz.open()
        pg = doc.new_page()
        pg.insert_text((72, 72), 'Expiry Date: 2026-01-01  Lot: ABC123 ' * 3)
        doc.save(q); doc.close()
        assert not is_scan(q), '글자가 있는 PDF 를 스캔본으로 잘못 봤습니다'

        made = render(p, d, dpi=72)
        assert len(made) == 1 and os.path.getsize(made[0]) > 0, '렌더링 결과가 없습니다'
    print('pdf_render 자체 점검 통과')


if __name__ == '__main__':
    if len(sys.argv) == 2 and sys.argv[1] == '--demo':
        demo()
    else:
        sys.exit(main())
