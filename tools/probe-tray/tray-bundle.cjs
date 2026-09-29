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

// tools/probe-tray/tray-entry.ts
var tray_entry_exports = {};
__export(tray_entry_exports, {
  resolveTrayIcon: () => resolveTrayIcon,
  resolveTrayIconPath: () => resolveTrayIconPath,
  trayIconCandidates: () => trayIconCandidates,
  trayIconSize: () => trayIconSize
});
module.exports = __toCommonJS(tray_entry_exports);

// electron/main/tray-icon.ts
var import_node_path = __toESM(require("node:path"));
var import_electron = require("electron");
function trayIconCandidates() {
  return [
    `${process.resourcesPath}/tray.png`,
    `${import_electron.app.getAppPath()}/build/tray.png`,
    import_node_path.default.resolve(__dirname, "../../build/tray.png"),
    `${process.resourcesPath}/icon.png`
  ];
}
function trayIconSize() {
  try {
    const sf = import_electron.screen.getPrimaryDisplay().scaleFactor;
    return Math.max(16, Math.round(16 * (sf || 1)));
  } catch {
    return 16;
  }
}
function resolveTrayIconPath() {
  for (const c of trayIconCandidates()) {
    try {
      if (!import_electron.nativeImage.createFromPath(c).isEmpty()) return c;
    } catch {
    }
  }
  return null;
}
function resolveTrayIcon() {
  const p = resolveTrayIconPath();
  if (!p) {
    console.warn("[tray] \u672A\u627E\u5230\u6258\u76D8\u56FE\u6807\u8D44\u6E90\uFF0C\u6258\u76D8\u56FE\u6807\u5C06\u4E0D\u53EF\u89C1\u3002\u5019\u9009\u8DEF\u5F84\uFF1A", trayIconCandidates());
    return import_electron.nativeImage.createEmpty();
  }
  const size = trayIconSize();
  return import_electron.nativeImage.createFromPath(p).resize({ width: size, height: size, quality: "best" });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  resolveTrayIcon,
  resolveTrayIconPath,
  trayIconCandidates,
  trayIconSize
});
