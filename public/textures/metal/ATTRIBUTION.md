# Metal finish maps

Surface detail for the metal finishes, made from photos of real metal. For each photo: the
lighting was removed (the photo minus its blurred self, so only the fine surface detail stays),
and the result used as a height map. From it come a tangent-space normal map (`*-normal.webp`)
and a roughness map (`*-roughness.webp`, averaging 0.75). The brushed photo was turned so its
lines run along the width (round the band) and its ends cross-faded so it tiles without a seam;
the other photos are seamless tiles already. WebP, quality 74. The maps carry no colour: the app
keeps each alloy's own colour. Satin uses the brushed maps at half the size; hammered uses the
polished maps (its dents are modelled in the band's shape).

| File | Source | Author | License | Used for |
| --- | --- | --- | --- | --- |
| `brushed-normal.webp`, `brushed-roughness.webp` (1024 × 256) | [Brushed metal.jpg](https://commons.wikimedia.org/wiki/File:Brushed_metal.jpg) | Gordeonbleu | Public domain | Brushed, satin |
| `polished-normal.webp`, `polished-roughness.webp` (512 × 512) | [Dark grey stainless steel heavily scratched worn seamless metal surface texture.jpg](https://commons.wikimedia.org/wiki/File:Dark_grey_stainless_steel_heavily_scratched_worn_seamless_metal_surface_texture.jpg) | Sisters.seamless | CC0 | Polished, hammered (hairline scratches, shown faintly) |
| `matte-normal.webp`, `matte-roughness.webp` (512 × 512) | [Grey textured cast finish clean rough seamless metal sheet surface texture.jpg](https://commons.wikimedia.org/wiki/File:Grey_textured_cast_finish_clean_rough_seamless_metal_sheet_surface_texture.jpg) | Sisters.seamless | CC0 | Matte |
| `sandblasted-normal.webp`, `sandblasted-roughness.webp` (512 × 512) | [Charcoal dark grey rough speckled textured cast finish seamless metal surface texture.jpg](https://commons.wikimedia.org/wiki/File:Charcoal_dark_grey_rough_speckled_textured_cast_finish_seamless_metal_surface_texture.jpg) | Sisters.seamless | CC0 | Sandblasted |

Licenses: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); public domain as marked
on Wikimedia Commons. The maps above are shared the same way.
