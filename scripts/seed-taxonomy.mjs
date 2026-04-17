#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const SHOP = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-10";
const ENDPOINT = `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`;

const APPLY = process.argv.includes("--apply");
const DATA_DIR = getArg("--data-dir") || "./seed-data";
const MAP_FILE = getArg("--map-file") || "product_mapping.sample.jsonl";
const ROLLBACK_FILE = getArg("--rollback-file") || "./seed-data/rollback-log.json";
const STRICT = process.argv.includes("--strict");
const MAP_ONLY = process.argv.includes("--map-only");

if (!SHOP || !TOKEN) {
  console.error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_TOKEN");
  process.exit(1);
}

const CONFIG = [
  { type: "ornament_type", file: "ornament_type.jsonl" },
  { type: "deity_accessory_type", file: "deity_accessory_type.jsonl" },
  { type: "idol_type", file: "idol_type.jsonl" },
  { type: "accessory_type", file: "accessory_type.jsonl" },
  { type: "entity_type", file: "entity_type.jsonl" },
  { type: "size_compatibility_profile", file: "size_compatibility_profile.jsonl" }
];

const rollback = {
  createdMetaobjects: [],
  touchedProducts: []
};

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function readJsonl(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .map((line, idx) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error(`Invalid JSONL ${filePath}:${idx + 1}`);
      }
    });
}

function toMetaobjectFields(fieldsObj) {
  const out = [];
  for (const [key, v] of Object.entries(fieldsObj)) {
    let value = v;
    if (Array.isArray(v)) value = JSON.stringify(v);
    else if (typeof v === "boolean") value = String(v);
    else if (typeof v === "number") value = String(v);
    else if (v === null || v === undefined) continue;
    out.push({ key, value: String(value) });
  }
  return out;
}

function getFieldValueFromNodes(nodes, key) {
  const n = (nodes || []).find(x => x.key === key);
  return n ? n.value : null;
}

async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN
    },
    body: JSON.stringify({ query, variables })
  });
  const body = await res.json();
  if (body.errors?.length) throw new Error(`GraphQL errors: ${JSON.stringify(body.errors)}`);
  return body.data;
}

async function getExistingSlugs(type) {
  const q = `
    query Existing($type: String!, $after: String) {
      metaobjects(first: 250, type: $type, after: $after) {
        nodes {
          id
          handle
          fields(first: 20) {
            nodes { key value }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;
  const map = new Map();
  let after = null;
  while (true) {
    const data = await gql(q, { type, after });
    for (const n of data.metaobjects.nodes) {
      const slug = getFieldValueFromNodes(n.fields?.nodes, "slug");
      if (slug) map.set(slug, { id: n.id, handle: n.handle });
    }
    if (!data.metaobjects.pageInfo.hasNextPage) break;
    after = data.metaobjects.pageInfo.endCursor;
  }
  return map;
}

async function findMetaobjectBySlug(type, slug) {
  const q = `
    query Find($type: String!, $query: String!) {
      metaobjects(first: 1, type: $type, query: $query) {
        nodes {
          id
          handle
          fields(first: 20) {
            nodes { key value }
          }
        }
      }
    }
  `;
  const query = `fields.slug:"${slug}"`;
  const data = await gql(q, { type, query });
  const node = data.metaobjects.nodes[0] || null;
  if (!node) return null;
  const resolvedSlug = getFieldValueFromNodes(node.fields?.nodes, "slug");
  return { id: node.id, handle: node.handle, slug: resolvedSlug };
}

async function createMetaobject(type, handle, fields) {
  const m = `
    mutation Create($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject { id handle displayName }
        userErrors { field message code }
      }
    }
  `;
  const input = {
    type,
    handle,
    capabilities: { publishable: { status: "ACTIVE" } },
    fields
  };
  const data = await gql(m, { metaobject: input });
  const errs = data.metaobjectCreate.userErrors || [];
  if (errs.length) throw new Error(JSON.stringify(errs));
  return data.metaobjectCreate.metaobject;
}

function validateRow(def, row) {
  const reqCommon = ["name", "slug", "aliases", "status"];
  for (const k of reqCommon) {
    if (!(k in row.fields)) return `Missing required field '${k}'`;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.fields.slug)) return `Invalid slug '${row.fields.slug}'`;
  if (!Array.isArray(row.fields.aliases) || row.fields.aliases.length < 2) return "aliases must be array with >=2";
  if (!["active", "deprecated"].includes(row.fields.status)) return "status must be active|deprecated";

  if (def.type === "ornament_type" && !row.fields.wear_position) return "Missing wear_position";
  if (def.type === "deity_accessory_type" && !row.fields.accessory_group) return "Missing accessory_group";
  if (def.type === "idol_type" && !row.fields.idol_group) return "Missing idol_group";
  if (def.type === "accessory_type" && !row.fields.accessory_group) return "Missing accessory_group";
  if (def.type === "entity_type" && !row.fields.entity_group) return "Missing entity_group";
  if (def.type === "size_compatibility_profile" && !row.fields.size_system) return "Missing size_system";

  return null;
}

async function seedMetaobjects() {
  for (const def of CONFIG) {
    const filePath = path.join(DATA_DIR, def.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[SKIP FILE] ${filePath}`);
      continue;
    }

    const rows = readJsonl(filePath);
    const existing = await getExistingSlugs(def.type);
    const seen = new Set();

    console.log(`\n[${def.type}] rows=${rows.length}, existing=${existing.size}`);

    for (const row of rows) {
      const err = validateRow(def, row);
      if (err) {
        const msg = `[INVALID] ${def.type}:${row.fields?.slug || row.handle} ${err}`;
        if (STRICT) throw new Error(msg);
        console.warn(msg);
        await sleep(200);
        continue;
      }

      const slug = row.fields.slug;
      if (seen.has(slug)) {
        const msg = `[DUP-IN-FILE] ${def.type}:${slug}`;
        if (STRICT) throw new Error(msg);
        console.warn(msg);
        await sleep(200);
        continue;
      }
      seen.add(slug);

      if (existing.has(slug)) {
        console.log(`[SKIP] ${def.type}:${slug} already exists`);
        await sleep(200);
        continue;
      }

      if (!APPLY) {
        console.log(`[DRY-RUN CREATE] ${def.type}:${slug}`);
        await sleep(200);
        continue;
      }

      const found = await findMetaobjectBySlug(def.type, slug);
      if (found) {
        console.log(`[SKIP-RACE] ${def.type}:${slug}`);
        await sleep(200);
        continue;
      }

      const handle = row.handle || slug;
      const fields = toMetaobjectFields(row.fields);
      const created = await createMetaobject(def.type, handle, fields);
      rollback.createdMetaobjects.push({ type: def.type, slug, id: created.id, handle: created.handle });
      console.log(`[CREATED] ${def.type}:${slug} id=${created.id}`);
      await sleep(200);
    }
  }
}

async function resolveRefId(definition, slug) {
  const found = await findMetaobjectBySlug(definition, slug);
  return found?.id || null;
}

async function getProductByHandle(handle) {
  const q = `
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        collections(first: 20) { nodes { handle title } }
        metafields(identifiers: [
          {namespace: "custom", key: "product_type_system"},
          {namespace: "custom", key: "primary_type_ref"},
          {namespace: "custom", key: "primary_entity_ref"},
          {namespace: "custom", key: "size_compatibility"}
        ]) { id namespace key value type }
      }
    }
  `;
  const data = await gql(q, { handle });
  return data.productByHandle;
}

function inferEntityFromTitle(title, keywordMap) {
  const t = title.toLowerCase();
  for (const [slug, words] of Object.entries(keywordMap)) {
    if (words.some(w => t.includes(w))) return slug;
  }
  return null;
}

function inferEntityFromCollections(collections, map) {
  for (const c of collections) {
    if (map[c.handle]) return map[c.handle];
  }
  return null;
}

async function applyProductMappings() {
  const mapPath = path.join(DATA_DIR, MAP_FILE);
  if (!fs.existsSync(mapPath)) {
    console.warn(`[SKIP MAP FILE] ${mapPath}`);
    return;
  }

  const rows = readJsonl(mapPath);

  const entityKeywordMap = {
    lakshmi: ["lakshmi", "varalakshmi", "mahalakshmi"],
    parvati: ["amman", "ammavaru", "devi", "goddess"],
    venkateswara: ["venkateswara", "balaji", "srinivasa", "perumal"],
    generic-dancer: ["bharatanatyam", "kuchipudi", "dance"]
  };

  const collectionEntityMap = {
    "bharatanatyam-jewelry-sets": "generic-dancer",
    "deity-crowns": "generic-deity",
    "varalakshmi-deity-jewellery": "lakshmi"
  };

  const setMutation = `
    mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key value type }
        userErrors { field message code }
      }
    }
  `;

  for (const row of rows) {
    const p = await getProductByHandle(row.product_handle);
    if (!p) {
      console.warn(`[MISSING PRODUCT] ${row.product_handle}`);
      await sleep(200);
      continue;
    }

    const system = row.product_type_system;
    const allowed = ["ornament", "deity_accessory", "idol", "accessory"];
    if (!allowed.includes(system)) {
      console.warn(`[INVALID SYSTEM] ${row.product_handle}`);
      await sleep(200);
      continue;
    }

    const typeDef = row.primary_type_ref?.definition;
    const typeSlug = row.primary_type_ref?.slug;
    if (!typeDef || !typeSlug) {
      console.warn(`[MISSING TYPE REF] ${row.product_handle}`);
      await sleep(200);
      continue;
    }

    const defBySystem = {
      ornament: "ornament_type",
      deity_accessory: "deity_accessory_type",
      idol: "idol_type",
      accessory: "accessory_type"
    };

    if (defBySystem[system] !== typeDef) {
      console.warn(`[TYPE SYSTEM MISMATCH] ${row.product_handle} ${system} != ${typeDef}`);
      await sleep(200);
      continue;
    }

    const typeId = await resolveRefId(typeDef, typeSlug);
    if (!typeId) {
      console.warn(`[UNRESOLVED TYPE] ${row.product_handle} ${typeDef}:${typeSlug}`);
      await sleep(200);
      continue;
    }

    let entitySlug = row.primary_entity_ref?.slug || null;
    if (!entitySlug) entitySlug = inferEntityFromTitle(p.title, entityKeywordMap);
    if (!entitySlug) entitySlug = inferEntityFromCollections(p.collections.nodes, collectionEntityMap);
    if (!entitySlug) entitySlug = system === "ornament" ? "generic-dancer" : "generic-deity";

    const entityId = await resolveRefId("entity_type", entitySlug);
    if (!entityId) {
      console.warn(`[UNRESOLVED ENTITY] ${row.product_handle} ${entitySlug}`);
      await sleep(200);
      continue;
    }

    const sizeSlugs = Array.isArray(row.size_compatibility) ? row.size_compatibility : [];
    if ((system === "idol" || system === "deity_accessory") && sizeSlugs.length === 0) {
      console.warn(`[SIZE REQUIRED] ${row.product_handle}`);
      await sleep(200);
      continue;
    }

    const sizeIds = [];
    for (const s of sizeSlugs) {
      const id = await resolveRefId("size_compatibility_profile", s);
      if (!id) {
        console.warn(`[UNRESOLVED SIZE] ${row.product_handle} ${s}`);
      } else {
        sizeIds.push(id);
      }
    }

    if ((system === "idol" || system === "deity_accessory") && sizeIds.length === 0) {
      console.warn(`[SIZE RESOLUTION FAILED] ${row.product_handle}`);
      await sleep(200);
      continue;
    }

    rollback.touchedProducts.push({
      handle: row.product_handle,
      productId: p.id,
      previous: p.metafields || []
    });

    const metafields = [
      { ownerId: p.id, namespace: "custom", key: "product_type_system", type: "single_line_text_field", value: system },
      { ownerId: p.id, namespace: "custom", key: "primary_type_ref", type: "metaobject_reference", value: typeId },
      { ownerId: p.id, namespace: "custom", key: "primary_entity_ref", type: "metaobject_reference", value: entityId }
    ];

    if (sizeIds.length > 0) {
      metafields.push({
        ownerId: p.id,
        namespace: "custom",
        key: "size_compatibility",
        type: "list.metaobject_reference",
        value: JSON.stringify(sizeIds)
      });
    }

    if (!APPLY) {
      console.log(`[DRY-RUN MAP] ${row.product_handle} system=${system} type=${typeSlug} entity=${entitySlug}`);
      await sleep(200);
      continue;
    }

    const data = await gql(setMutation, { metafields });
    const errs = data.metafieldsSet.userErrors || [];
    if (errs.length) {
      console.warn(`[MAP ERR] ${row.product_handle} ${JSON.stringify(errs)}`);
    } else {
      console.log(`[UPDATED] ${row.product_handle}`);
    }
    await sleep(200);
  }
}

async function main() {
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY-RUN");
  if (!MAP_ONLY) await seedMetaobjects();
  await applyProductMappings();
  fs.writeFileSync(ROLLBACK_FILE, JSON.stringify(rollback, null, 2));
  console.log(`Rollback log written: ${ROLLBACK_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});