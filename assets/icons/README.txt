Custom icons / آیکون‌های سفارشی
================================
Optional. Without any file here the dashboard uses Unicode emoji.

Tabler icons: download an SVG sprite (symbol ids like "tabler-heart") and save it as
  assets/icons/tabler-sprite.svg
The path and the id prefix are configurable in data/projects.json:
  "settings": { "iconSpritePath": "assets/icons/tabler-sprite.svg", "iconSymbolPrefix": "tabler-" }

Categories and projects can name a Tabler icon ("icon": {"emoji": "💰", "tabler": "coin"}).
The emoji is always the fallback when the sprite or the symbol is missing.
Favicon / logo files can also live here; reference them from index.html.
