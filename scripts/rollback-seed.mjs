#!/usr/bin/env node
import fs from "node:fs";

const SHOP = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-10";
const ENDPOINT = `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`;

const ROLLBACK_FILE = process.argv[2] || "./seed-data/rollback-log.json";
const APPLY = process.argv.includes("--apply");

if (!SHOP || !TOKEN) {
  console.error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_TOKEN");
  process.exit(1);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
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
  if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
  return body.data;
}

async function deleteMetaobject(id) {
  const m = `
    mutation Del($id: ID!) {
      metaobjectDelete(id: $id) {
        deletedId
        userErrors { field message code }
      }
    }
  `;
  return gql(m, { id });
}

async function restoreMetafields(touched) {
  const setMutation = `
    mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message code }
      }
    }
  `;

  for (const row of touched) {
    const metas = [];
    for (const mf of row.previous || []) {
      if (!mf) continue;
      metas.push({
        ownerId: row.productId,
        namespace: mf.namespace,
        key: mf.key,
        type: mf.type,
        value: mf.value ?? ""
      });
    }

    if (!metas.length) {
      await sleep(200);
      continue;
    }

    if (!APPLY) {
      console.log(`[DRY-RUN RESTORE] ${row.handle}`);
      await sleep(200);
      continue;
    }

    const data = await gql(setMutation, { metafields: metas });
    const errs = data.metafieldsSet.userErrors || [];
    if (errs.length) {
      console.warn(`[RESTORE ERR] ${row.handle} ${JSON.stringify(errs)}`);
    } else {
      console.log(`[RESTORED] ${row.handle}`);
    }
    await sleep(200);
  }
}

async function main() {
  const log = JSON.parse(fs.readFileSync(ROLLBACK_FILE, "utf8"));
  console.log(APPLY ? "ROLLBACK MODE: APPLY" : "ROLLBACK MODE: DRY-RUN");

  const created = (log.createdMetaobjects || []).slice().reverse();
  for (const c of created) {
    if (!APPLY) {
      console.log(`[DRY-RUN DELETE] ${c.type}:${c.slug} ${c.id}`);
      await sleep(200);
      continue;
    }

    const data = await deleteMetaobject(c.id);
    const errs = data.metaobjectDelete.userErrors || [];
    if (errs.length) {
      console.warn(`[DELETE ERR] ${c.id} ${JSON.stringify(errs)}`);
    } else {
      console.log(`[DELETED] ${c.id}`);
    }
    await sleep(200);
  }

  await restoreMetafields(log.touchedProducts || []);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});