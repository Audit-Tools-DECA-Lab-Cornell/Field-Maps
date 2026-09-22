import os
OUT = "assets/icon-source"  # run from mobile/
ZONES = [(268,330,224,420),(548,274,208,236),(548,566,172,150)]
FILLS = ["#5d5294","#796cbf","#423a6a"]
CX, CY = 520, 538
PATH_D = "M250 700 C 380 690, 430 560, 520 538 S 700 420, 790 300"
HEAD = '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">'
def rects(fill=None):
    return "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="52" fill="{fill or f}"/>'
                   for (x,y,w,h),f in zip(ZONES,FILLS))
def scaled(inner, s):
    return f'<g transform="translate(512 512) scale({s}) translate(-512 -512)">{inner}</g>'
CLIP = f'<clipPath id="zones">{rects("#000")}</clipPath>'
PATH = f'<path d="{PATH_D}" fill="none" stroke="#161826" stroke-width="44" stroke-linecap="round" clip-path="url(#zones)"/>'
MARKER = (f'<circle cx="{CX}" cy="{CY}" r="128" fill="#161826"/>'
          f'<circle cx="{CX}" cy="{CY}" r="98" fill="#e9e9ed"/>'
          f'<circle cx="{CX}" cy="{CY}" r="58" fill="#9184d9"/>')
MARK = rects() + PATH + MARKER
BG = ('<radialGradient id="bg" cx="512" cy="430" r="760" gradientUnits="userSpaceOnUse">'
      '<stop offset="0" stop-color="#20223a"/><stop offset="1" stop-color="#161826"/></radialGradient>')
# Full-bleed square: the platform applies its own mask.
icon = HEAD + f'<defs>{BG}{CLIP}</defs><rect width="1024" height="1024" fill="url(#bg)"/>' + scaled(MARK, 1.2) + '</svg>\n'
# Android adaptive foreground: transparent, inside the 640px safe circle.
fg = HEAD + f'<defs>{CLIP}</defs>' + scaled(MARK, 0.86) + '</svg>\n'
# Android 13 themed icon: one colour; the path, the marker's halo and its dot are cut out.
cut = (f'<path d="{PATH_D}" fill="none" stroke="#000" stroke-width="44" stroke-linecap="round"/>'
       f'<circle cx="{CX}" cy="{CY}" r="128" fill="#000"/>')
mask = f'<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><rect width="1024" height="1024" fill="#fff"/>{cut}</mask>'
ring = f'<path d="M{CX-98} {CY}a98 98 0 1 0 196 0a98 98 0 1 0 -196 0ZM{CX-58} {CY}a58 58 0 1 1 116 0a58 58 0 1 1 -116 0Z" fill="#fff" fill-rule="evenodd"/>'
mono = HEAD + f'<defs>{mask}</defs>' + scaled(f'<g mask="url(#cut)">{rects("#fff")}</g>{ring}', 0.86) + '</svg>\n'
for name, body in [("icon.svg", icon), ("adaptive-foreground.svg", fg), ("adaptive-monochrome.svg", mono)]:
    open(os.path.join(OUT, name), "w").write(body)
