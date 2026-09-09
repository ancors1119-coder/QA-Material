"""index.html에서 DEMO/DEMO_AUTO/DOC43/DOC43_STATUS 정의부만 뽑아 Temp에 extracted.mjs 생성.
사용: python extract_module.py  →  node validate.mjs
"""
import io, re, os, tempfile

base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
out = os.path.join(tempfile.gettempdir(), "qa_extracted.mjs")
html = io.open(base, encoding="utf-8").read()

def block(start_pat, end_pat):
    s = re.search(start_pat, html)
    assert s, start_pat
    e = html.index(end_pat, s.start()) + len(end_pat)
    return html[s.start():e]

parts = [
    block(r"const DEMO = \[", "\n    ];"),
    block(r"const DOC43 = \[", "];"),
    block(r"const DOC43_STATUS = \{", "\n    };"),
    # DEMO_AUTO 배열은 8칸 들여쓰기로 닫힌다. 4칸 패턴으로 찾으면 배열 밖의
    # Object.assign(DOC43_STATUS, DOC43_AUTO) 줄까지 딸려 들어와 ReferenceError 가 난다.
    block(r"const DEMO_AUTO = \[", "\n        ];"),
]
src = "\n".join(p.strip() for p in parts)
src += "\nexport { DEMO, DOC43, DOC43_STATUS, DEMO_AUTO };\n"
io.open(out, "w", encoding="utf-8").write(src)
print("wrote", out, len(src), "chars")
