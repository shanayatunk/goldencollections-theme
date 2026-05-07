# Golden Collections Shopify Custom Data

This package defines the custom data needed for the deity collection and deity product templates.

## Install Order

1. Create metaobject definitions with `admin-api/create-metaobject-definition.graphql` and `metaobject-definitions.json`.
2. Create product metafield definitions with `admin-api/create-product-metafield-definition.graphql` and `product-metafield-definitions.json`.
3. Seed reusable deity, ornament, and size entries with `admin-api/upsert-metaobject.graphql` and the `seed-*.jsonl` files.
4. Write product values with `admin-api/set-product-deity-metafields.graphql`.
5. Read product values with `admin-api/read-product-deity-data.graphql`.

## Installation Log

Installed on Shopify Admin API on 2026-05-04:

- 3 metaobject definitions created.
- 19 product metafield definitions created.
- 25 reusable metaobject entries upserted.
- Read-back verification succeeded for deity groups, ornament types, size profiles, and product metafield definitions.

## Required Admin API Scopes

- `read_products`
- `write_products`
- `read_metaobjects`
- `write_metaobjects`
- `read_metaobject_definitions`
- `write_metaobject_definitions`

## Template-Rendered Product Metafields

The deity templates render these `custom` namespace product metafields immediately:

- `primary_deity`
- `compatibility_class`
- `ornament_type`
- `idol_height_min_in`
- `idol_height_max_in`
- `ornament_width_in`
- `ornament_height_in`
- `ornament_depth_in`
- `placement`
- `size_confidence`
- `fit_notes`
- `regional_names`
- `quality_checks`

## Compatibility Classes

Use these values consistently:

- `Deity Specific`
- `Multi-Deity`
- `General/Common`
- `Festival Specific`

## Size Confidence Values

Use these values consistently:

- `Measured`
- `Measured from product image`
- `Owner confirmed`
- `Inferred`
- `Check product image`
