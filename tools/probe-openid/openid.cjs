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

// electron/main/steam-openid.ts
var steam_openid_exports = {};
__export(steam_openid_exports, {
  cancelOpenId: () => cancelOpenId,
  getAuthStatus: () => getAuthStatus,
  setAuthStatus: () => setAuthStatus,
  startOpenId: () => startOpenId
});
module.exports = __toCommonJS(steam_openid_exports);
var import_node_http = __toESM(require("node:http"));
var import_electron2 = require("electron");
var import_node_url = require("node:url");

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

// electron/main/steam-openid.ts
var OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
var IDENTIFIER = "http://specs.openid.net/auth/2.0/identifier_select";
var NS = "http://specs.openid.net/auth/2.0";
var activeServer = null;
var activeTimer = null;
var resolveActive = null;
var lastAuth = { authenticated: false, steamId: null };
var SUCCESS_HTML = '<!doctype html><meta charset="utf-8"><title>\u767B\u5F55\u6210\u529F</title><body style="font-family:sans-serif;text-align:center;padding:80px"><h2>\u767B\u5F55\u6210\u529F</h2><p>\u8BF7\u5173\u95ED\u6B64\u9875\u9762\u8FD4\u56DE Steam Insight\u3002</p></body>';
var FAIL_HTML = '<!doctype html><meta charset="utf-8"><title>\u767B\u5F55\u5931\u8D25</title><body style="font-family:sans-serif;text-align:center;padding:80px"><h2>\u767B\u5F55\u5931\u8D25</h2><p>\u8BF7\u5173\u95ED\u6B64\u9875\u9762\u91CD\u8BD5\u3002</p></body>';
function failHtml(detail) {
  const safe = detail.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
  return FAIL_HTML.replace(
    "</body>",
    `<p style="color:#8a8a8a;font-size:13px;line-height:1.6;max-width:680px;margin:24px auto 0;word-break:break-all">\u8BCA\u65AD\uFF1A${safe}</p></body>`
  );
}
async function postForm(url, params, timeoutMs = 12e3) {
  const body = new import_node_url.URLSearchParams(params).toString();
  const r = await fetchText(url, {
    method: "POST",
    timeoutMs,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const diag = `via=${r.via ?? "-"} status=${r.status ?? "-"}${r.error ? ` err=${r.error}` : ""}`;
  return { body: r.ok ? r.body : "", diag };
}
function tryListen(port) {
  return new Promise((resolve, reject) => {
    const srv = import_node_http.default.createServer();
    srv.once("error", (e) => reject(e));
    srv.listen(port, "127.0.0.1", () => resolve(srv));
  });
}
function cancelOpenId() {
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
  if (activeServer) {
    try {
      activeServer.close();
    } catch {
    }
    activeServer = null;
  }
  if (resolveActive) {
    resolveActive({ ok: false, cancelled: true });
    resolveActive = null;
  }
}
async function startOpenId() {
  cancelOpenId();
  let port = 42510;
  let srv;
  for (let i = 0; i < 40; i++) {
    try {
      srv = await tryListen(port);
      break;
    } catch {
      port++;
    }
  }
  if (!srv) return { ok: false, error: "\u627E\u4E0D\u5230\u53EF\u7528\u7AEF\u53E3" };
  activeServer = srv;
  const returnTo = `http://127.0.0.1:${port}/auth/steam/return`;
  const realm = `http://127.0.0.1:${port}/`;
  const result = await new Promise((resolve) => {
    resolveActive = resolve;
    srv.on("request", async (req, res) => {
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
      if (!url.pathname.startsWith("/auth/steam/return")) {
        res.writeHead(404);
        res.end();
        return;
      }
      const params = Object.fromEntries(url.searchParams.entries());
      if (params["openid.mode"] === "cancel") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(FAIL_HTML);
        finish({ ok: false, cancelled: true });
        return;
      }
      const verify = { ...params, "openid.mode": "check_authentication" };
      const { body: resp, diag } = await postForm(OPENID_ENDPOINT, verify);
      const valid = /is_valid\s*:\s*true/i.test(resp);
      if (!valid) {
        const why = resp ? `Steam \u5224\u5B9A\u7B7E\u540D\u65E0\u6548\uFF08${diag}\uFF09\uFF1A${resp.trim().replace(/\s+/g, " ").slice(0, 140)}` : `\u56DE\u9A8C\u8BF7\u6C42\u672A\u9001\u8FBE Steam\uFF08${diag}\uFF09`;
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(failHtml(why));
        finish({ ok: false, error: why });
        return;
      }
      const claimed = params["openid.claimed_id"] ?? "";
      const mt = claimed.match(/\/id\/(\d{17})/);
      const steamId = mt ? mt[1] : null;
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(SUCCESS_HTML);
      if (!steamId) {
        finish({ ok: false, error: "\u65E0\u6CD5\u4ECE claimed_id \u63D0\u53D6 SteamID" });
        return;
      }
      lastAuth = { authenticated: true, steamId };
      finish({ ok: true, steamId });
    });
    activeTimer = setTimeout(() => {
      finish({ ok: false, cancelled: true, error: "\u767B\u5F55\u8D85\u65F6\uFF08180s\uFF09" });
    }, 18e4);
    activeTimer.unref?.();
    const loginUrl = `${OPENID_ENDPOINT}?${new import_node_url.URLSearchParams({
      "openid.ns": NS,
      "openid.mode": "checkid_setup",
      "openid.return_to": returnTo,
      "openid.realm": realm,
      "openid.identity": IDENTIFIER,
      "openid.claimed_id": IDENTIFIER
    }).toString()}`;
    import_electron2.shell.openExternal(loginUrl).catch(() => {
      finish({ ok: false, error: "\u65E0\u6CD5\u6253\u5F00\u7CFB\u7EDF\u6D4F\u89C8\u5668" });
    });
  });
  return result;
  function finish(r) {
    if (activeTimer) {
      clearTimeout(activeTimer);
      activeTimer = null;
    }
    if (activeServer) {
      try {
        activeServer.close();
      } catch {
      }
      activeServer = null;
    }
    if (resolveActive) {
      resolveActive(r);
      resolveActive = null;
    }
  }
}
function getAuthStatus() {
  return { ...lastAuth };
}
function setAuthStatus(steamId) {
  lastAuth = { authenticated: !!steamId, steamId };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  cancelOpenId,
  getAuthStatus,
  setAuthStatus,
  startOpenId
});
