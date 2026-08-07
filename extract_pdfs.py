import sys, os
import pdfplumber

folder = sys.argv[1]
out_path = sys.argv[2]

with open(out_path, "w", encoding="utf-8") as out:
    for fname in sorted(os.listdir(folder)):
        if not fname.lower().endswith(".pdf"):
            continue
        fpath = os.path.join(folder, fname)
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
            out.write(f"[ERROR extracting {fname}: {e}]\n")
print("done:", out_path)
