"""Gera os ícones PNG do Hibi a partir da geometria da marca (日 + 々).

A marca é desenhada num quadro de 64x64 (mesmas coordenadas do SVG da identidade visual)
e renderizada com supersampling para ter bordas suaves. Uso: python3 scripts/make-icons.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"

BG = (28, 30, 34, 255)  # #1C1E22
PAPER = (236, 233, 228, 255)  # #ECE9E4
AMBER = (232, 163, 61, 255)  # #E8A33D

SS = 4  # fator de supersampling


def bezier_q(p0, p1, p2, steps=24):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t**2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t**2 * p2[1]
        pts.append((x, y))
    return pts


def stroke(draw, pts, width, color):
    """Linha poligonal com pontas e juntas arredondadas."""
    r = width / 2
    for a, b in zip(pts, pts[1:]):
        draw.line([a, b], fill=color, width=round(width))
    # um círculo em cada vértice: juntas e pontas redondas, sem falhas
    for x, y in pts:
        draw.ellipse((x - r, y - r, x + r, y + r), fill=color)


def draw_mark(size, mark_scale, background, ink, accent, stroke_w=3.6):
    """Desenha a marca centralizada num quadrado `size`. A marca ocupa `mark_scale` do lado."""
    big = size * SS
    img = Image.new("RGBA", (big, big), background)
    d = ImageDraw.Draw(img)

    # Quadro de 64x64 da marca; a caixa útil vai de x=5.2 a 59.5 e y=8.2 a 55.8.
    box_w, box_h = 55.8, 49.1
    cx, cy = 33.1, 31.75
    unit = (big * mark_scale) / max(box_w, box_h)

    def tx(x):
        return big / 2 + (x - cx) * unit

    def ty(y):
        return big / 2 + (y - cy) * unit

    def pt(p):
        return (tx(p[0]), ty(p[1]))

    w = stroke_w * unit

    # 日: retângulo arredondado
    x0, y0, x1, y1, rad = 7, 10, 29, 54, 7
    d.rounded_rectangle(
        (tx(x0) - w / 2, ty(y0) - w / 2, tx(x1) + w / 2, ty(y1) + w / 2),
        radius=(rad + stroke_w / 2) * unit,
        fill=ink,
    )
    d.rounded_rectangle(
        (tx(x0) + w / 2, ty(y0) + w / 2, tx(x1) - w / 2, ty(y1) - w / 2),
        radius=max((rad - stroke_w / 2) * unit, 1),
        fill=background,
    )
    # barra âmbar no meio do 日
    d.rounded_rectangle(
        (tx(13), ty(29.5), tx(23), ty(34.5)), radius=2.5 * unit, fill=accent
    )

    # 々: traço 1 (curva suave)
    stroke(d, [pt(q) for q in bezier_q((49, 9), (47, 19), (39, 27))], w, ink)
    # traço 2: horizontal curta, barriga larga e desce para a esquerda
    path2 = [pt((42, 23)), pt((54, 23))]
    path2 += [pt(q) for q in bezier_q((54, 23), (60.5, 23), (59.5, 31))][1:]
    path2 += [pt(q) for q in bezier_q((59.5, 31), (57.5, 46), (41, 54.5))][1:]
    stroke(d, path2, w, ink)
    # ponto âmbar (rima com a barra do 日)
    r = 2.4 * unit
    cxp, cyp = pt((50, 41))
    d.ellipse((cxp - r, cyp - r, cxp + r, cyp + r), fill=accent)

    return img.resize((size, size), Image.LANCZOS)


def save(img, name):
    OUT.mkdir(exist_ok=True)
    img.convert("RGBA").save(OUT / name)
    print("ok", name, img.size)


def main():
    # Ícone padrão: iOS arredonda sozinho, então vai quadrado e preenchido.
    save(draw_mark(1024, 0.62, BG, PAPER, AMBER), "icon-1024.png")
    save(draw_mark(512, 0.62, BG, PAPER, AMBER), "icon-512.png")
    save(draw_mark(192, 0.62, BG, PAPER, AMBER, stroke_w=4.2), "icon-192.png")
    save(draw_mark(180, 0.62, BG, PAPER, AMBER, stroke_w=4.2), "apple-touch-icon.png")
    # Maskable: a marca fica dentro da zona segura (80% central).
    save(draw_mark(512, 0.48, BG, PAPER, AMBER), "icon-maskable-512.png")
    # Favicon
    save(draw_mark(64, 0.78, BG, PAPER, AMBER, stroke_w=5.2), "favicon.png")


if __name__ == "__main__":
    main()
