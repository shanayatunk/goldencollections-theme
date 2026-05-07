# Shopify Custom Data Model

Backlinks: [[deity-compatibility-model.md]], [[content-roadmap.md]], [[business-entity.md]]

## Purpose

Use Shopify custom data to make Golden Collections product pages, collection pages, filters, and GEO answers consistent.

The model should separate:

- Product-specific facts: stored as product metafields.
- Reusable entities: stored as metaobjects and referenced by products.

## Metaobjects

### Deity Group

Fields:

- `name`
- `aliases`
- `regional_names`
- `parent_group`
- `specific_symbols`
- `seo_intro`

Examples:

- Varalakshmi / Lakshmi / Amman
- Vishnu / Balaji / Venkateswara / Perumal
- Krishna / Radha Krishna
- Ganesha / Ganapati / Vinayaka
- Shiva / Mahadev
- Durga / Devi / Amman / Parvati
- Murugan / Subramanya / Kartikeya / Skanda
- Ayyappa / Ayyappan
- Hanuman / Anjaneya / Maruti

### Ornament Type

Fields:

- `name`
- `aliases`
- `placement`
- `fit_measurement_needed`
- `seo_definition`

Examples:

- Crown / Mukut / Kireedam
- Short Haram / Short Necklace
- Long Haram
- Vaddanam / Oddiyanam / Waist Belt
- Earrings
- Nose Ring / Nath / Bullaku
- Hands / Legs / Hastham / Padam
- Tilak / Namam / Thiruman
- Shanku Chakra

### Size Profile

Fields:

- `label`
- `idol_height_min_in`
- `idol_height_max_in`
- `fit_notes`
- `confidence`

Use this for deity products where idol size is critical.

## Product Metafields

Recommended product fields:

- `primary_deity`
- `compatible_deities`
- `compatibility_class`
- `ornament_type`
- `idol_height_min_in`
- `idol_height_max_in`
- `ornament_height_in`
- `ornament_width_in`
- `ornament_depth_in`
- `placement`
- `regional_names`
- `size_confidence`
- `fit_notes`
- `quality_checks`
- `set_items_included`
- `optional_items`
- `component_count`
- `range_type`

## Deity-First Navigation Use Case

The custom data model should support future deity-based collections.

Customer path:

- Shop by Deity
- Amman
- Amman Crowns / Mukut
- Amman Necklaces
- Amman Earrings
- Amman Vaddanam / Waist Belt
- Amman Accessories

Products should be able to appear in both:

- Ornament-first collections, such as all deity crowns.
- Deity-first collections, such as Amman crowns.

This requires products to reference both deity groups and ornament types.

## Public Labels

Use customer-friendly public labels:

- `Made for`
- `Also suitable for`
- `Idol size guide`
- `Measured ornament size`
- `Set includes`
- `Quality checked for`

Avoid certificate language. Talk about quality checks instead.
