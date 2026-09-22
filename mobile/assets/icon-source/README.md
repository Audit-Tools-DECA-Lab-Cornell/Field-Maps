# App icon source

The icon is a site plan: three zones cut by a path, with the collector's own observation marker
(dark halo, light ring, lavender dot) placed on the path. Colours are Nocturne tokens from
`src/theme.ts`.

| File | Used for |
| --- | --- |
| `icon.svg` → `../icon.png` | iOS and the Expo default icon: 1024×1024, full bleed, no alpha |
| `adaptive-foreground.svg` → `../adaptive-icon.png` | Android adaptive foreground on `#161826`; the mark sits inside the 640px safe circle |
| `adaptive-monochrome.svg` → `../adaptive-icon-monochrome.png` | Android 13+ themed icon, one colour |
| `icon.svg` → `../store/play-icon-512.png` | Google Play listing icon: 512×512, 32-bit PNG, full square (Play applies the mask) |
| `preview.png` | iOS, circle, squircle, themed, 48px and 29px previews |

To change the design, edit `generate.py` and rebuild (needs Python 3, Inkscape and ImageMagick),
from `mobile/`:

```bash
python3 assets/icon-source/generate.py
inkscape assets/icon-source/icon.svg --export-type=png --export-filename=icon.tmp.png -w 1024
magick icon.tmp.png -background '#161826' -alpha remove -alpha off assets/icon.png
inkscape assets/icon-source/adaptive-foreground.svg --export-type=png --export-filename=assets/adaptive-icon.png -w 1024
inkscape assets/icon-source/adaptive-monochrome.svg --export-type=png --export-filename=assets/adaptive-icon-monochrome.png -w 1024
inkscape assets/icon-source/icon.svg --export-type=png --export-filename=icon.tmp.png -w 512
magick icon.tmp.png -background '#161826' -alpha remove -alpha off PNG32:assets/store/play-icon-512.png
rm icon.tmp.png
```

A new icon reaches a device only after `EXPO_NO_DOTENV=1 pnpm exec expo prebuild` and a rebuild.
