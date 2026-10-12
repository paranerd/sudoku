"""Generate self-contained PWA icons. Requires Pillow; the PNGs are committed."""
from pathlib import Path
from PIL import Image, ImageDraw

destination = Path(__file__).resolve().parents[1] / 'public'
for name, size, maskable in [('icon-192.png', 192, False), ('icon-512.png', 512, False), ('icon-maskable.png', 512, True)]:
    scale = 4
    image = Image.new('RGB', (512 * scale, 512 * scale), '#244e40')
    draw = ImageDraw.Draw(image)
    def box(values):
        return tuple(int(v * scale) for v in values)
    left, right = (146, 366) if maskable else (124, 388)
    third = (right - left) / 3
    draw.rounded_rectangle(box((left, left, right, right)), radius=16 * scale, outline='#f5f5ef', width=9 * scale)
    for i in (1, 2):
        line = left + third * i
        draw.line(box((line, left, line, right)), fill='#f5f5ef', width=8 * scale)
        draw.line(box((left, line, right, line)), fill='#f5f5ef', width=8 * scale)
    draw.ellipse(box((237, 237, 275, 275)), fill='#cbdcaa')
    image.resize((size, size), Image.Resampling.LANCZOS).save(destination / name)
