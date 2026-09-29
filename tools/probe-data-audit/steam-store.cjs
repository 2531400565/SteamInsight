"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/main/steam-store.ts
var steam_store_exports = {};
__export(steam_store_exports, {
  getAppReviewSummary: () => getAppReviewSummary,
  storeAppDetails: () => storeAppDetails,
  storeFeaturedCategories: () => storeFeaturedCategories
});
module.exports = __toCommonJS(steam_store_exports);

// electron/main/http.ts
var import_node_https = __toESM(require("node:https"));
var import_electron = require("electron");
function reason(e) {
  if (e instanceof Error) {
    const code = e.code;
    return code ? `${code}: ${e.message}` : e.message;
  }
  return String(e);
}
function viaNet(url, o) {
  const timeoutMs = o.timeoutMs ?? 12e3;
  return new Promise((resolve) => {
    let settled = false;
    const done = (r) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };
    let req;
    try {
      req = import_electron.net.request({ method: o.method ?? "GET", url });
    } catch (e) {
      done({ ok: false, status: null, body: "", error: `net \u4E0D\u53EF\u7528\uFF1A${reason(e)}`, via: null });
      return;
    }
    const timer = setTimeout(() => {
      try {
        req.abort();
      } catch {
      }
      done({ ok: false, status: null, body: "", error: `\u8D85\u65F6 ${timeoutMs}ms`, via: "net" });
    }, timeoutMs);
    const finish = (r) => {
      clearTimeout(timer);
      done({ ...r, via: "net" });
    };
    for (const [k, v] of Object.entries(o.headers ?? {})) {
      if (/^content-length$/i.test(k)) continue;
      req.setHeader(k, v);
    }
    req.on("response", (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(Buffer.from(c)));
      res.on("end", () => {
        const status = res.statusCode;
        finish({ ok: status < 500, status, body: Buffer.concat(chunks).toString("utf8"), error: null });
      });
      res.on("error", (e) => finish({ ok: false, status: null, body: "", error: reason(e) }));
    });
    req.on("error", (e) => finish({ ok: false, status: null, body: "", error: reason(e) }));
    if (o.body) req.write(o.body);
    req.end();
  });
}
function viaNode(url, o) {
  const timeoutMs = o.timeoutMs ?? 12e3;
  return new Promise((resolve) => {
    try {
      const headers = {};
      for (const [k, v] of Object.entries(o.headers ?? {})) {
        if (/^content-length$/i.test(k)) continue;
        headers[k] = v;
      }
      const req = import_node_https.default.request(url, { method: o.method ?? "GET", headers }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("end", () => {
          const status = res.statusCode ?? null;
          resolve({ ok: status !== null && status < 500, status, body: Buffer.concat(chunks).toString("utf8"), error: null, via: "node" });
        });
      });
      req.on("error", (e) => resolve({ ok: false, status: null, body: "", error: reason(e), via: "node" }));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve({ ok: false, status: null, body: "", error: `\u8D85\u65F6 ${timeoutMs}ms`, via: "node" });
      });
      req.end(o.body);
    } catch (e) {
      resolve({ ok: false, status: null, body: "", error: reason(e), via: null });
    }
  });
}
async function fetchText(url, o = {}) {
  if (import_electron.app.isReady()) {
    const primary = await viaNet(url, o);
    if (primary.ok) return primary;
    const fallback = await viaNode(url, { ...o, timeoutMs: Math.min(o.timeoutMs ?? 12e3, 6e3) });
    if (fallback.ok) return fallback;
    return { ...fallback, error: `net(${primary.error ?? "\u672A\u77E5"}) / node(${fallback.error ?? "\u672A\u77E5"})` };
  }
  return viaNode(url, o);
}

// electron/main/api-base.ts
function isObj(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function asStr(v, d = "") {
  return typeof v === "string" ? v : d;
}
function asNum(v, d = 0) {
  if (typeof v === "number") return Number.isFinite(v) ? v : d;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  }
  return d;
}
function asBool(v) {
  return v === true || v === 1 || v === "1" || v === "true";
}
async function requestJson(url, timeoutMs = 12e3, retries = 2) {
  const backoff = [0, 500, 1500];
  let lastError = new Error("\u8BF7\u6C42\u5931\u8D25");
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, backoff[attempt] ?? 1500));
    const res = await fetchText(url, { timeoutMs });
    if (res.status !== null && res.status < 500) {
      try {
        return JSON.parse(res.body);
      } catch {
        throw new Error(`\u54CD\u5E94\u4E0D\u662F\u5408\u6CD5 JSON\uFF08HTTP ${res.status}\uFF09`);
      }
    }
    lastError = new Error(res.error ?? `HTTP ${res.status ?? "\u2014"}`);
  }
  throw lastError;
}

// electron/main/steam-store.ts
var STORE_BASE = "https://store.steampowered.com/api";
var STORE_ROOT = "https://store.steampowered.com";
function getAppReviewSummary(appId) {
  return requestJson(`${STORE_ROOT}/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`, 12e3, 1).then((j) => {
    const q = isObj(j) && isObj(j.query_summary) ? j.query_summary : null;
    if (!q) return null;
    const total = asNum(q.total_reviews);
    if (total <= 0) return null;
    return { percent: Math.round(asNum(q.total_positive) / total * 100), count: total, desc: asStr(q.review_score_desc) };
  });
}
function pickAppDetailsEntry(j, appId) {
  if (!isObj(j)) return null;
  const root = j;
  const direct = root[String(appId)];
  if (isObj(direct) && direct.success === true) return direct;
  let firstOk = null;
  for (const v of Object.values(root)) {
    if (!isObj(v) || v.success !== true) continue;
    const d = isObj(v.data) ? v.data : {};
    if (asNum(d.steam_appid) === appId) return v;
    if (!firstOk) firstOk = v;
  }
  return firstOk;
}
async function storeAppDetails(appId, cc = "cn", l = "schinese") {
  const [j, rev] = await Promise.all([
    requestJson(`${STORE_BASE}/appdetails?appids=${appId}&cc=${cc}&l=${l}`),
    getAppReviewSummary(appId).catch(() => null)
  ]);
  const entry = pickAppDetailsEntry(j, appId);
  if (!entry) return null;
  const d = isObj(entry.data) ? entry.data : {};
  const price = isObj(d.price_overview) ? d.price_overview : {};
  const genres = Array.isArray(d.genres) ? d.genres.map((g) => isObj(g) ? asStr(g.description) : "") : [];
  const cats = Array.isArray(d.categories) ? d.categories.map((g) => isObj(g) ? asStr(g.description) : "") : [];
  const finalCents = asNum(price.final, -1);
  const initialCents = asNum(price.initial, -1);
  const isFree = asBool(d.is_free) || finalCents === 0;
  return {
    appId,
    name: asStr(d.name),
    headerImage: asStr(d.header_image),
    capsuleImage: asStr(d.capsule_image),
    genres,
    tags: [.../* @__PURE__ */ new Set([...genres, ...cats])],
    // release_date 是 {date, coming_soon} 对象，早前用 asStr() 判空恒为 '' → release_date 全空
    releaseDate: isObj(d.release_date) ? asStr(d.release_date.date) : asStr(d.release_date),
    developer: Array.isArray(d.developers) ? d.developers.join(", ") : "",
    publisher: Array.isArray(d.publishers) ? d.publishers.join(", ") : "",
    isFree,
    priceCents: finalCents >= 0 ? finalCents : isFree ? 0 : -1,
    originalPriceCents: initialCents >= 0 ? initialCents : isFree ? 0 : -1,
    reviewPercent: rev?.percent ?? 0,
    reviewCount: rev?.count ?? asNum((isObj(d.recommendations) ? d.recommendations : {}).total),
    endsAt: asNum(price.discount_expiration) || null
  };
}
function storeFeaturedCategories(cc = "cn", l = "schinese") {
  const featured = requestJson(`${STORE_BASE}/featuredcategories?cc=${cc}&l=${l}`).then((j) => {
    const specials = isObj(j) && isObj(j.specials) ? j.specials.items : void 0;
    return Array.isArray(specials) ? specials.map((s) => {
      const o = isObj(s) ? s : {};
      return { appId: asNum(o.id), name: asStr(o.name), endsAt: asNum(o.discount_expiration) || null };
    }).filter((x) => x.appId > 0) : [];
  });
  return Promise.all([featured, storeSearchFreeAppIds(cc, l)]).then(([specials, freeAppIds]) => ({ specials, freeAppIds }));
}
function storeSearchFreeAppIds(cc, l) {
  const url = `${STORE_ROOT}/search/results/?query&start=0&count=50&maxprice=free&specials=1&cc=${cc}&l=${l}&json=1`;
  return requestJson(url, 12e3, 1).then((j) => {
    const items = isObj(j) && Array.isArray(j.items) ? j.items : [];
    const ids = /* @__PURE__ */ new Set();
    for (const it of items) {
      const o = isObj(it) ? it : {};
      const m = /\/apps\/(\d+)\//.exec(asStr(o.logo));
      if (m) {
        const id = Number(m[1]);
        if (Number.isFinite(id) && id > 0) ids.add(id);
      }
    }
    return [...ids];
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getAppReviewSummary,
  storeAppDetails,
  storeFeaturedCategories
});
