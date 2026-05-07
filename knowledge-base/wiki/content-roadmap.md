# Content And GEO Roadmap

Backlinks: [[business-entity.md]], [[search-entity-map.md]], [[open-questions.md]], [[deity-compatibility-model.md]]

## Immediate Technical Fixes

- Keep all Organization/LocalBusiness schema aligned to Golden Collections, not old brand data.
- Remove public legacy-origin, unsupported certificate, and incorrect plating claims that conflict with owner-confirmed facts.
- Audit old-brand references and decide whether each page should be removed, redirected, or rewritten for Golden Collections.
- Make schema claims match public page content exactly.
- Add or improve `FAQPage` schema only where the same FAQ is visible on the page.
- Build internal links from glossary terms to collection/product pages and from collection pages back to glossary definitions.
- Build deity compatibility fields around deity, idol size, and ornament/accessory type.

## High-Impact Pages

1. `Real Kemp Jewellery: Meaning, Materials, Uses, and Buying Guide`
2. `Complete Bharatanatyam Jewellery Set: 12-15 Ornaments Explained`
3. `Bharatanatyam Jewellery Size Guide for Kids, Teens, and Adults`
4. `Deity Jewellery Size Guide by Idol Height`
5. `Varalakshmi Vratham Alankaram Checklist`
6. `Kemp Black Jewellery for Bharatanatyam and Kuchipudi`
7. `Temple Jewellery Glossary: Nethi Chutti, Mattal, Oddiyanam, Vanki, Rakodi`
8. `Real Kemp Jewellery vs Regular Bharatanatyam Jewellery`
9. `Deity Jewellery Regional Names and Compatibility Guide`

## Product Page Improvements

Each important product should answer:

- What is this ornament called, including regional names?
- Who is it for: dancer, deity, bride, temple, festival?
- Which set/component does it complete?
- Size, fit, idol height compatibility, or dancer age guidance.
- Material/range: normal premium range or real kemp range.
- For real kemp, use customer-friendly wording: Kemp stones or Kempu stones.
- Care instructions.
- Shipping/returns/customization clarity.

## Collection Page Improvements

Each collection page should include:

- One clear H1 matching customer language.
- Short buying guide above or below products.
- Visible FAQ section with 4-6 specific questions.
- Internal links to related collections and glossary terms.
- Schema that supports `CollectionPage`, `ItemList`, and visible FAQ where appropriate.

### Current Deity Collection Template Decision

For existing deity category collections, keep the shopping experience simple and avoid duplicate navigation.

Do:

- Use one deity collection template for the existing deity collections.
- Show breadcrumb, H1, short intro, product count, and trust/fit signals near the top.
- Keep measured-size guidance, quality checked, WhatsApp fit help, and shipping confidence visible.
- Use the existing category node/subcollection circles below the hero for collection-specific navigation.
- Keep product grid, filters, FAQ, and size guide focused on the current collection.

Do not:

- Add a global `Shop this deity by ornament` strip to these current collection pages when subcollection circles already exist below.
- Mix current ornament/category navigation with the future deity-first navigation model.
- Add navigation that makes customers wonder whether they are browsing a deity, an ornament type, or all deity products.

## Deity-Based Collection Architecture

Future navigation should support deity-first shopping, then ornament-type browsing inside each deity.

Example customer path:

1. Shop by Deity.
2. Choose `Amman`.
3. See subcollection circles for `Mukut/Crown`, `Necklace`, `Long Haram`, `Earrings`, `Vaddanam/Waist Belt`, `Nose Ring`, `Hands and Legs`, `Tilak/Bindi`, `Accessories`, and `Full Alankaram`.

This same pattern should later exist for Varalakshmi/Lakshmi/Amman, Balaji/Vishnu/Perumal, Krishna/Radha Krishna, Ganesha, Shiva, Durga/Devi, Murugan/Subramanya, Ayyappa, and Hanuman.

Implementation should use Shopify custom data where possible:

- Deity metaobjects define the deity group and aliases.
- Ornament type metaobjects define product families.
- Product metafields connect each product to deity groups and ornament types.
- Collection templates use these fields to show easy subcollection circles and internal links.

This should not replace the current ornament-first collections; it should add a second browsing path for customers who begin with the deity name.

Owner-confirmed refinement: deity-first pages should likely use a separate template from the current deity category template. Products should be selected by deity compatibility fields, and `General/Common` products should also appear where size and placement are suitable.

## GEO / LLM Answer Strategy

Answer engines need stable facts, repeated consistently. Golden Collections should publish concise source-of-truth pages for:

- About Golden Collections
- Heritage and craftsmanship
- Real kemp explanation
- Deity jewellery size guide
- Bharatanatyam set components
- FAQ
- Glossary

These pages should be written in direct answer style, because ChatGPT, Perplexity, Gemini, and Google AI Overviews often pull concise definitions, lists, comparisons, and FAQs.

## Deity Compatibility Model

Each deity collection/page should classify products as:

- Deity-specific.
- Multi-deity compatible.
- Common/general alankaram accessory.

This should be paired with regional names so a customer searching for mukut, kireedam, vaddanam, oddiyanam, namam, thiruman, or tilak can land on the correct product family.

## Knowledge Base Maintenance

Weekly:

- Add new raw source notes for new products, collections, competitor observations, and customer questions.
- Update one wiki article when a fact changes.
- Add backlinks between related terms.

Monthly:

- Run a brand/entity consistency audit.
- Run a stale-content audit for festival years.
- Review Search Console queries and convert recurring searches into FAQ/glossary entries.

Quarterly:

- Refresh size guides, real kemp proof points, and best-selling product clusters.
- Re-check schema with Google Rich Results Test and Schema.org validator.
