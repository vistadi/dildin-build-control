from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "app-icon-source.png"
SIZE = 1024
SCALE = 3
CANVAS = SIZE * SCALE


def sc(value: int) -> int:
    return value * SCALE


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def mix(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(lerp(c1[i], c2[i], t) for i in range(3))


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    return mask


def draw_gradient_square(base: Image.Image) -> None:
    rect = (sc(76), sc(76), sc(948), sc(948))
    w = rect[2] - rect[0]
    h = rect[3] - rect[1]
    gradient = Image.new("RGBA", (w, h))
    px = gradient.load()
    top = (21, 36, 42)
    bottom = (12, 84, 91)
    side = (26, 111, 112)

    for y in range(h):
        ty = y / max(1, h - 1)
        for x in range(w):
            tx = x / max(1, w - 1)
            color = mix(mix(top, bottom, ty), side, tx * 0.28)
            px[x, y] = (*color, 255)

    mask = rounded_mask(w, sc(210))

    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 235))
    shadow.putalpha(mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(sc(32)))
    base.alpha_composite(shadow, (rect[0], rect[1] + sc(20)))

    gradient.putalpha(mask)
    base.alpha_composite(gradient, rect[:2])

    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle(rect, radius=sc(210), outline=(204, 243, 235, 74), width=sc(5))
    draw.rounded_rectangle((sc(116), sc(116), sc(908), sc(908)), radius=sc(172), outline=(255, 255, 255, 26), width=sc(3))


def draw_control_marks(draw: ImageDraw.ImageDraw) -> None:
    teal = (124, 238, 217, 215)
    amber = (232, 147, 91, 230)
    muted = (169, 202, 204, 95)

    # Circuit/grid hints in the upper-left and lower-right corners.
    for x, y in [(178, 206), (234, 206), (290, 206), (178, 262), (290, 262)]:
        draw.ellipse((sc(x - 8), sc(y - 8), sc(x + 8), sc(y + 8)), fill=muted)
    draw.line((sc(178), sc(206), sc(290), sc(206)), fill=muted, width=sc(5))
    draw.line((sc(178), sc(206), sc(178), sc(262)), fill=muted, width=sc(5))
    draw.line((sc(290), sc(206), sc(290), sc(262)), fill=muted, width=sc(5))

    for x, height in [(706, 150), (766, 220), (826, 178)]:
        draw.rounded_rectangle((sc(x), sc(674 - height), sc(x + 30), sc(674)), radius=sc(12), fill=(238, 247, 245, 90))

    # Main controlled-loop underline.
    draw.rounded_rectangle((sc(252), sc(690), sc(772), sc(734)), radius=sc(22), fill=(10, 30, 35, 132))
    for x, color in [(300, teal), (512, amber), (724, teal)]:
        draw.ellipse((sc(x - 24), sc(712 - 24), sc(x + 24), sc(712 + 24)), fill=color)
    draw.line((sc(324), sc(712), sc(488), sc(712)), fill=(211, 244, 237, 185), width=sc(10))
    draw.line((sc(536), sc(712), sc(700), sc(712)), fill=(211, 244, 237, 185), width=sc(10))

    # Compact approval check.
    draw.line((sc(646), sc(596), sc(688), sc(638), sc(766), sc(544)), fill=teal, width=sc(22), joint="curve")


def draw_monogram(draw: ImageDraw.ImageDraw) -> None:
    font_path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    font = ImageFont.truetype(font_path, sc(230))
    text = "DBC"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (CANVAS - tw) // 2
    y = sc(350) - th // 2

    draw.text((x + sc(5), y + sc(9)), text, font=font, fill=(3, 16, 20, 125))
    draw.text((x, y), text, font=font, fill=(239, 249, 247, 255))

    small_font = ImageFont.truetype(font_path, sc(46))
    label = "BUILD CONTROL"
    bbox = draw.textbbox((0, 0), label, font=small_font)
    lx = (CANVAS - (bbox[2] - bbox[0])) // 2
    draw.text((lx, sc(536)), label, font=small_font, fill=(161, 224, 214, 225))


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw_gradient_square(img)
    draw = ImageDraw.Draw(img)
    draw_control_marks(draw)
    draw_monogram(draw)

    img = img.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    img.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
