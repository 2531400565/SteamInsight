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

// electron/main/steam-api.ts
var steam_api_exports = {};
__export(steam_api_exports, {
  getAchievementSchema: () => getAchievementSchema,
  getGlobalAchievementPercentagesForApp: () => getGlobalAchievementPercentagesForApp,
  getOwnedGames: () => getOwnedGames,
  getPlayerAchievements: () => getPlayerAchievements,
  getPlayerSummaries: () => getPlayerSummaries,
  getRecentlyPlayedGames: () => getRecentlyPlayedGames,
  getWishlist: () => getWishlist,
  resolveVanityURL: () => resolveVanityURL
});
module.exports = __toCommonJS(steam_api_exports);
var import_node_url = require("node:url");

// electron/main/settings.ts
var import_node_fs = __toESM(require("node:fs"));
var import_electron2 = require("electron");

// src/types/steam.ts
var DEFAULT_SETTINGS = {
  autoLaunch: false,
  minimizeToTray: true,
  autoSync: true,
  syncIntervalMin: 30,
  notifyWishlistDrop: true,
  notifyHistoricalLow: true,
  notifyFreeGame: true,
  theme: "dark",
  steamApiKey: "",
  steamId: "",
  personaName: "",
  avatarUrl: "",
  countryCode: "CN",
  enableDemoData: true
};

// electron/main/paths.ts
var import_node_path = __toESM(require("node:path"));
var import_electron = require("electron");
var userDataDir = import_electron.app.getPath("userData");
var dbPath = import_node_path.default.join(userDataDir, "steam-insight.db");
var settingsPath = import_node_path.default.join(userDataDir, "settings.json");
var appVersion = import_electron.app.getVersion();

// electron/main/settings.ts
var cache = load();
function load() {
  try {
    const raw = import_node_fs.default.readFileSync(settingsPath, "utf8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
function getSettings() {
  return { ...cache };
}

// electron/main/http.ts
var import_node_https = __toESM(require("node:https"));
var import_electron3 = require("electron");
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
      req = import_electron3.net.request({ method: o.method ?? "GET", url });
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
  if (import_electron3.app.isReady()) {
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

// electron/main/steam-api.ts
var API_BASE = "https://api.steampowered.com";
function apiUrl(path2, params) {
  const key = getSettings().steamApiKey;
  if (!key) throw new Error("\u7F3A\u5C11 Steam API Key\uFF0C\u65E0\u6CD5\u8C03\u7528 Web API");
  const q = new import_node_url.URLSearchParams({ key, ...params });
  return `${API_BASE}${path2}?${q.toString()}`;
}
function resolveVanityURL(vanity) {
  return requestJson(apiUrl("/ISteamUser/ResolveVanityURL/v1/", { vanityurl: vanity })).then((j) => {
    const r = j.response;
    const id = asStr(r?.steamid);
    if (!id) throw new Error("\u672A\u627E\u5230\u8BE5 vanity \u5BF9\u5E94\u7684 SteamID");
    return { steamId: id };
  });
}
function getPlayerSummaries(steamId) {
  return requestJson(apiUrl("/ISteamUser/GetPlayerSummaries/v2/", { steamids: steamId })).then((j) => {
    const players = j.response?.players;
    const p = Array.isArray(players) && isObj(players[0]) ? players[0] : null;
    if (!p) throw new Error("\u672A\u83B7\u53D6\u5230\u73A9\u5BB6\u8D44\u6599");
    return {
      steamId,
      personaName: asStr(p.personaname),
      avatarUrl: asStr(p.avatarfull),
      profileUrl: asStr(p.profileurl),
      countryCode: asStr(p.loccountrycode),
      accountCreatedAt: asNum(p.timecreated) || null,
      lastLogoffAt: asNum(p.lastlogoff) || null,
      personaState: asNum(p.personastate)
    };
  });
}
function toOwnedGames(j) {
  const games = j.response?.games;
  if (!Array.isArray(games)) return [];
  return games.map((g) => {
    const o = isObj(g) ? g : {};
    return {
      appId: asNum(o.appid),
      name: asStr(o.name),
      playtimeForeverMin: Math.round(asNum(o.playtime_forever)),
      playtimeTwoWeeksMin: Math.round(asNum(o.playtime_2weeks)),
      lastPlayedAt: asNum(o.rtime_last_played) || null,
      imgIconUrl: asStr(o.img_icon_url),
      imgLogoUrl: asStr(o.img_logo_url)
    };
  });
}
function getOwnedGames(steamId) {
  return requestJson(apiUrl("/IPlayerService/GetOwnedGames/v1/", {
    steamid: steamId,
    include_appinfo: "1",
    include_played_free_games: "1"
  })).then(toOwnedGames);
}
function getRecentlyPlayedGames(steamId) {
  return requestJson(apiUrl("/IPlayerService/GetRecentlyPlayedGames/v1/", { steamid: steamId })).then(toOwnedGames);
}
function getPlayerAchievements(steamId, appId) {
  return requestJson(apiUrl("/ISteamUserStats/GetPlayerAchievements/v1/", {
    steamid: steamId,
    appid: String(appId),
    l: "schinese"
  })).then((j) => {
    const playerStats = j.playerstats;
    const list = Array.isArray(playerStats?.achievements) ? playerStats?.achievements : [];
    return {
      appId,
      achievements: list.map((a) => {
        const o = isObj(a) ? a : {};
        return {
          apiName: asStr(o.apiname),
          displayName: asStr(o.name) || asStr(o.displayName),
          // 真实字段名是 description，早前写成 desc 导致描述全空
          description: asStr(o.description) || asStr(o.desc),
          unlocked: asNum(o.achieved) === 1,
          unlockTime: asNum(o.unlocktime) || null
        };
      })
    };
  });
}
function getGlobalAchievementPercentagesForApp(appId) {
  return requestJson(`${API_BASE}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appId}`).then((j) => {
    const list = j.achievementpercentages?.achievements;
    const out = {};
    if (Array.isArray(list)) for (const a of list) {
      const o = isObj(a) ? a : {};
      out[asStr(o.name)] = asNum(o.percent);
    }
    return out;
  });
}
function getAchievementSchema(appId) {
  return requestJson(apiUrl("/ISteamUserStats/GetSchemaForGame/v2/", { appid: String(appId), l: "schinese" })).then((j) => {
    const game = isObj(j) && isObj(j.game) ? j.game : {};
    const stats = isObj(game.availableGameStats) ? game.availableGameStats : {};
    const list = Array.isArray(stats.achievements) ? stats.achievements : [];
    const out = /* @__PURE__ */ new Map();
    for (const a of list) {
      const o = isObj(a) ? a : {};
      const name = asStr(o.name);
      if (!name) continue;
      out.set(name, {
        displayName: asStr(o.displayName),
        description: asStr(o.description),
        iconUrl: asStr(o.icon),
        iconGrayUrl: asStr(o.icongray),
        hidden: asBool(o.hidden)
      });
    }
    return out;
  });
}
function getWishlist(steamId) {
  return requestJson(`${API_BASE}/IWishlistService/GetWishlist/v1/?steamid=${steamId}`).then((j) => {
    const items = j.response?.items;
    if (!Array.isArray(items)) return [];
    return items.map((it) => {
      const o = isObj(it) ? it : {};
      const tags = Array.isArray(o.tags) ? o.tags.map((t) => isObj(t) ? asStr(t.name) : "").filter(Boolean) : [];
      return { appId: asNum(o.appid), name: asStr(o.name), addedAt: asNum(o.date_added) || asNum(o.added) || 0, priority: asNum(o.priority, 1), tags };
    });
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getAchievementSchema,
  getGlobalAchievementPercentagesForApp,
  getOwnedGames,
  getPlayerAchievements,
  getPlayerSummaries,
  getRecentlyPlayedGames,
  getWishlist,
  resolveVanityURL
});
