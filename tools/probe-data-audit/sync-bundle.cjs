"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all2) => {
  for (var name in all2)
    __defProp(target, name, { get: all2[name], enumerable: true });
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

// node_modules/sql.js/dist/sql-wasm.js
var require_sql_wasm = __commonJS({
  "node_modules/sql.js/dist/sql-wasm.js"(exports2, module2) {
    "use strict";
    var initSqlJsPromise = void 0;
    var initSqlJs2 = function(moduleConfig) {
      if (initSqlJsPromise) {
        return initSqlJsPromise;
      }
      initSqlJsPromise = new Promise(function(resolveModule, reject) {
        var Module = typeof moduleConfig !== "undefined" ? moduleConfig : {};
        var originalOnAbortFunction = Module["onAbort"];
        Module["onAbort"] = function(errorThatCausedAbort) {
          reject(new Error(errorThatCausedAbort));
          if (originalOnAbortFunction) {
            originalOnAbortFunction(errorThatCausedAbort);
          }
        };
        Module["postRun"] = Module["postRun"] || [];
        Module["postRun"].push(function() {
          resolveModule(Module);
        });
        module2 = void 0;
        var k;
        k ||= typeof Module != "undefined" ? Module : {};
        var aa = !!globalThis.window, ba = !!globalThis.WorkerGlobalScope, ca = globalThis.process?.versions?.node && "renderer" != globalThis.process?.type;
        k.onRuntimeInitialized = function() {
          function a(f, l) {
            switch (typeof l) {
              case "boolean":
                dc(f, l ? 1 : 0);
                break;
              case "number":
                ec(f, l);
                break;
              case "string":
                fc(f, l, -1, -1);
                break;
              case "object":
                if (null === l) lb(f);
                else if (null != l.length) {
                  var n = da(l.length);
                  m.set(l, n);
                  gc(f, n, l.length, -1);
                  ea(n);
                } else va(f, "Wrong API use : tried to return a value of an unknown type (" + l + ").", -1);
                break;
              default:
                lb(f);
            }
          }
          function b(f, l) {
            for (var n = [], p = 0; p < f; p += 1) {
              var r = t(l + 4 * p, "i32"), w = hc(r);
              if (1 === w || 2 === w) r = ic(r);
              else if (3 === w) r = jc(r);
              else if (4 === w) {
                w = r;
                r = kc(w);
                w = lc(w);
                for (var J = new Uint8Array(r), I = 0; I < r; I += 1) J[I] = m[w + I];
                r = J;
              } else r = null;
              n.push(r);
            }
            return n;
          }
          function c(f, l) {
            this.Qa = f;
            this.db = l;
            this.Oa = 1;
            this.mb = [];
          }
          function d(f, l) {
            this.db = l;
            this.fb = fa(f);
            if (null === this.fb) throw Error("Unable to allocate memory for the SQL string");
            this.lb = this.fb;
            this.$a = this.sb = null;
          }
          function e(f) {
            this.filename = "dbfile_" + (4294967295 * Math.random() >>> 0);
            if (null != f) {
              var l = this.filename, n = "/", p = l;
              n && (n = "string" == typeof n ? n : ha(n), p = l ? ia(n + "/" + l) : n);
              l = ja(true, true);
              p = ka(
                p,
                l
              );
              if (f) {
                if ("string" == typeof f) {
                  n = Array(f.length);
                  for (var r = 0, w = f.length; r < w; ++r) n[r] = f.charCodeAt(r);
                  f = n;
                }
                ma(p, l | 146);
                n = na(p, 577);
                oa(n, f, 0, f.length, 0);
                pa(n);
                ma(p, l);
              }
            }
            this.handleError(q(this.filename, g));
            this.db = t(g, "i32");
            ob(this.db);
            this.gb = {};
            this.Sa = {};
          }
          var g = y(4), h = k.cwrap, q = h("sqlite3_open", "number", ["string", "number"]), v = h("sqlite3_close_v2", "number", ["number"]), u = h("sqlite3_exec", "number", ["number", "string", "number", "number", "number"]), x = h("sqlite3_changes", "number", ["number"]), D = h(
            "sqlite3_prepare_v2",
            "number",
            ["number", "string", "number", "number", "number"]
          ), pb = h("sqlite3_sql", "string", ["number"]), nc = h("sqlite3_normalized_sql", "string", ["number"]), qb = h("sqlite3_prepare_v2", "number", ["number", "number", "number", "number", "number"]), oc = h("sqlite3_bind_text", "number", ["number", "number", "number", "number", "number"]), rb = h("sqlite3_bind_blob", "number", ["number", "number", "number", "number", "number"]), pc = h("sqlite3_bind_double", "number", ["number", "number", "number"]), qc = h("sqlite3_bind_int", "number", [
            "number",
            "number",
            "number"
          ]), rc = h("sqlite3_bind_parameter_index", "number", ["number", "string"]), sc = h("sqlite3_step", "number", ["number"]), tc = h("sqlite3_errmsg", "string", ["number"]), uc = h("sqlite3_column_count", "number", ["number"]), vc = h("sqlite3_data_count", "number", ["number"]), wc = h("sqlite3_column_double", "number", ["number", "number"]), sb = h("sqlite3_column_text", "string", ["number", "number"]), xc = h("sqlite3_column_blob", "number", ["number", "number"]), yc = h("sqlite3_column_bytes", "number", ["number", "number"]), zc = h(
            "sqlite3_column_type",
            "number",
            ["number", "number"]
          ), Ac = h("sqlite3_column_name", "string", ["number", "number"]), Bc = h("sqlite3_reset", "number", ["number"]), Cc = h("sqlite3_clear_bindings", "number", ["number"]), Dc = h("sqlite3_finalize", "number", ["number"]), tb = h("sqlite3_create_function_v2", "number", "number string number number number number number number number".split(" ")), hc = h("sqlite3_value_type", "number", ["number"]), kc = h("sqlite3_value_bytes", "number", ["number"]), jc = h("sqlite3_value_text", "string", ["number"]), lc = h(
            "sqlite3_value_blob",
            "number",
            ["number"]
          ), ic = h("sqlite3_value_double", "number", ["number"]), ec = h("sqlite3_result_double", "", ["number", "number"]), lb = h("sqlite3_result_null", "", ["number"]), fc = h("sqlite3_result_text", "", ["number", "string", "number", "number"]), gc = h("sqlite3_result_blob", "", ["number", "number", "number", "number"]), dc = h("sqlite3_result_int", "", ["number", "number"]), va = h("sqlite3_result_error", "", ["number", "string", "number"]), ub = h("sqlite3_aggregate_context", "number", ["number", "number"]), ob = h(
            "RegisterExtensionFunctions",
            "number",
            ["number"]
          ), vb = h("sqlite3_update_hook", "number", ["number", "number", "number"]);
          c.prototype.bind = function(f) {
            if (!this.Qa) throw "Statement closed";
            this.reset();
            return Array.isArray(f) ? this.Gb(f) : null != f && "object" === typeof f ? this.Hb(f) : true;
          };
          c.prototype.step = function() {
            if (!this.Qa) throw "Statement closed";
            this.Oa = 1;
            var f = sc(this.Qa);
            switch (f) {
              case 100:
                return true;
              case 101:
                return false;
              default:
                throw this.db.handleError(f);
            }
          };
          c.prototype.Ab = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            return wc(this.Qa, f);
          };
          c.prototype.Ob = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            f = sb(this.Qa, f);
            if ("function" !== typeof BigInt) throw Error("BigInt is not supported");
            return BigInt(f);
          };
          c.prototype.Tb = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            return sb(this.Qa, f);
          };
          c.prototype.getBlob = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            var l = yc(this.Qa, f);
            f = xc(this.Qa, f);
            for (var n = new Uint8Array(l), p = 0; p < l; p += 1) n[p] = m[f + p];
            return n;
          };
          c.prototype.get = function(f, l) {
            l = l || {};
            null != f && this.bind(f) && this.step();
            f = [];
            for (var n = vc(this.Qa), p = 0; p < n; p += 1) switch (zc(this.Qa, p)) {
              case 1:
                var r = l.useBigInt ? this.Ob(p) : this.Ab(p);
                f.push(r);
                break;
              case 2:
                f.push(this.Ab(p));
                break;
              case 3:
                f.push(this.Tb(p));
                break;
              case 4:
                f.push(this.getBlob(p));
                break;
              default:
                f.push(null);
            }
            return f;
          };
          c.prototype.qb = function() {
            for (var f = [], l = uc(this.Qa), n = 0; n < l; n += 1) f.push(Ac(this.Qa, n));
            return f;
          };
          c.prototype.zb = function(f, l) {
            f = this.get(f, l);
            l = this.qb();
            for (var n = {}, p = 0; p < l.length; p += 1) n[l[p]] = f[p];
            return n;
          };
          c.prototype.Sb = function() {
            return pb(this.Qa);
          };
          c.prototype.Pb = function() {
            return nc(this.Qa);
          };
          c.prototype.run = function(f) {
            null != f && this.bind(f);
            this.step();
            return this.reset();
          };
          c.prototype.wb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            f = fa(f);
            this.mb.push(f);
            this.db.handleError(oc(this.Qa, l, f, -1, 0));
          };
          c.prototype.Fb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            var n = da(f.length);
            m.set(f, n);
            this.mb.push(n);
            this.db.handleError(rb(this.Qa, l, n, f.length, 0));
          };
          c.prototype.vb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            this.db.handleError((f === (f | 0) ? qc : pc)(
              this.Qa,
              l,
              f
            ));
          };
          c.prototype.Ib = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            rb(this.Qa, f, 0, 0, 0);
          };
          c.prototype.xb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            switch (typeof f) {
              case "string":
                this.wb(f, l);
                return;
              case "number":
                this.vb(f, l);
                return;
              case "bigint":
                this.wb(f.toString(), l);
                return;
              case "boolean":
                this.vb(f + 0, l);
                return;
              case "object":
                if (null === f) {
                  this.Ib(l);
                  return;
                }
                if (null != f.length) {
                  this.Fb(f, l);
                  return;
                }
            }
            throw "Wrong API use : tried to bind a value of an unknown type (" + f + ").";
          };
          c.prototype.Hb = function(f) {
            var l = this;
            Object.keys(f).forEach(function(n) {
              var p = rc(l.Qa, n);
              0 !== p && l.xb(f[n], p);
            });
            return true;
          };
          c.prototype.Gb = function(f) {
            for (var l = 0; l < f.length; l += 1) this.xb(f[l], l + 1);
            return true;
          };
          c.prototype.reset = function() {
            this.freemem();
            return 0 === Cc(this.Qa) && 0 === Bc(this.Qa);
          };
          c.prototype.freemem = function() {
            for (var f; void 0 !== (f = this.mb.pop()); ) ea(f);
          };
          c.prototype.Ya = function() {
            this.freemem();
            var f = 0 === Dc(this.Qa);
            delete this.db.gb[this.Qa];
            this.Qa = 0;
            return f;
          };
          d.prototype.next = function() {
            if (null === this.fb) return { done: true };
            null !== this.$a && (this.$a.Ya(), this.$a = null);
            if (!this.db.db) throw this.ob(), Error("Database closed");
            var f = qa(), l = y(4);
            ra(g);
            ra(l);
            try {
              this.db.handleError(qb(this.db.db, this.lb, -1, g, l));
              this.lb = t(l, "i32");
              var n = t(g, "i32");
              if (0 === n) return this.ob(), { done: true };
              this.$a = new c(n, this.db);
              this.db.gb[n] = this.$a;
              return { value: this.$a, done: false };
            } catch (p) {
              throw this.sb = z(this.lb), this.ob(), p;
            } finally {
              sa(f);
            }
          };
          d.prototype.ob = function() {
            ea(this.fb);
            this.fb = null;
          };
          d.prototype.Qb = function() {
            return null !== this.sb ? this.sb : z(this.lb);
          };
          "function" === typeof Symbol && "symbol" === typeof Symbol.iterator && (d.prototype[Symbol.iterator] = function() {
            return this;
          });
          e.prototype.run = function(f, l) {
            if (!this.db) throw "Database closed";
            if (l) {
              f = this.tb(f, l);
              try {
                f.step();
              } finally {
                f.Ya();
              }
            } else this.handleError(u(this.db, f, 0, 0, g));
            return this;
          };
          e.prototype.exec = function(f, l, n) {
            if (!this.db) throw "Database closed";
            var p = qa(), r = null, w = null, J = null;
            try {
              J = w = fa(f);
              var I = y(4);
              for (f = []; 0 !== t(J, "i8"); ) {
                ra(g);
                ra(I);
                this.handleError(qb(this.db, J, -1, g, I));
                var L = t(g, "i32");
                J = t(I, "i32");
                if (0 !== L) {
                  var G = null;
                  r = new c(L, this);
                  for (null != l && r.bind(l); r.step(); ) null === G && (G = { columns: r.qb(), values: [] }, f.push(G)), G.values.push(r.get(null, n));
                  r.Ya();
                }
              }
              return f;
            } catch (la) {
              throw r && r.Ya(), la;
            } finally {
              w && ea(w), sa(p);
            }
          };
          e.prototype.Mb = function(f, l, n, p, r) {
            "function" === typeof l && (p = n, n = l, l = void 0);
            f = this.tb(f, l);
            try {
              for (; f.step(); ) n(f.zb(null, r));
            } finally {
              f.Ya();
            }
            if ("function" === typeof p) return p();
          };
          e.prototype.tb = function(f, l) {
            ra(g);
            this.handleError(D(this.db, f, -1, g, 0));
            f = t(g, "i32");
            if (0 === f) throw "Nothing to prepare";
            var n = new c(f, this);
            null != l && n.bind(l);
            return this.gb[f] = n;
          };
          e.prototype.Ub = function(f) {
            return new d(f, this);
          };
          e.prototype.Nb = function() {
            Object.values(this.gb).forEach(function(l) {
              l.Ya();
            });
            Object.values(this.Sa).forEach(A);
            this.Sa = {};
            this.handleError(v(this.db));
            var f = ta(this.filename);
            this.handleError(q(this.filename, g));
            this.db = t(g, "i32");
            ob(this.db);
            return f;
          };
          e.prototype.close = function() {
            null !== this.db && (Object.values(this.gb).forEach(function(f) {
              f.Ya();
            }), Object.values(this.Sa).forEach(A), this.Sa = {}, this.Za && (A(this.Za), this.Za = void 0), this.handleError(v(this.db)), ua("/" + this.filename), this.db = null);
          };
          e.prototype.handleError = function(f) {
            if (0 === f) return null;
            f = tc(this.db);
            throw Error(f);
          };
          e.prototype.Rb = function() {
            return x(this.db);
          };
          e.prototype.Kb = function(f, l) {
            Object.prototype.hasOwnProperty.call(this.Sa, f) && (A(this.Sa[f]), delete this.Sa[f]);
            var n = wa(function(p, r, w) {
              r = b(r, w);
              try {
                var J = l.apply(null, r);
              } catch (I) {
                va(p, I, -1);
                return;
              }
              a(p, J);
            }, "viii");
            this.Sa[f] = n;
            this.handleError(tb(this.db, f, l.length, 1, 0, n, 0, 0, 0));
            return this;
          };
          e.prototype.Jb = function(f, l) {
            var n = l.init || function() {
              return null;
            }, p = l.finalize || function(L) {
              return L;
            }, r = l.step;
            if (!r) throw "An aggregate function must have a step function in " + f;
            var w = {};
            Object.hasOwnProperty.call(this.Sa, f) && (A(this.Sa[f]), delete this.Sa[f]);
            l = f + "__finalize";
            Object.hasOwnProperty.call(this.Sa, l) && (A(this.Sa[l]), delete this.Sa[l]);
            var J = wa(function(L, G, la) {
              var V = ub(L, 1);
              Object.hasOwnProperty.call(w, V) || (w[V] = n());
              G = b(G, la);
              G = [w[V]].concat(G);
              try {
                w[V] = r.apply(null, G);
              } catch (Fc) {
                delete w[V], va(L, Fc, -1);
              }
            }, "viii"), I = wa(function(L) {
              var G = ub(L, 1);
              try {
                var la = p(w[G]);
              } catch (V) {
                delete w[G];
                va(L, V, -1);
                return;
              }
              a(L, la);
              delete w[G];
            }, "vi");
            this.Sa[f] = J;
            this.Sa[l] = I;
            this.handleError(tb(this.db, f, r.length - 1, 1, 0, 0, J, I, 0));
            return this;
          };
          e.prototype.Zb = function(f) {
            this.Za && (vb(this.db, 0, 0), A(this.Za), this.Za = void 0);
            if (!f) return this;
            this.Za = wa(function(l, n, p, r, w) {
              switch (n) {
                case 18:
                  l = "insert";
                  break;
                case 23:
                  l = "update";
                  break;
                case 9:
                  l = "delete";
                  break;
                default:
                  throw "unknown operationCode in updateHook callback: " + n;
              }
              p = z(p);
              r = z(r);
              if (w > Number.MAX_SAFE_INTEGER) throw "rowId too big to fit inside a Number";
              f(l, p, r, Number(w));
            }, "viiiij");
            vb(this.db, this.Za, 0);
            return this;
          };
          c.prototype.bind = c.prototype.bind;
          c.prototype.step = c.prototype.step;
          c.prototype.get = c.prototype.get;
          c.prototype.getColumnNames = c.prototype.qb;
          c.prototype.getAsObject = c.prototype.zb;
          c.prototype.getSQL = c.prototype.Sb;
          c.prototype.getNormalizedSQL = c.prototype.Pb;
          c.prototype.run = c.prototype.run;
          c.prototype.reset = c.prototype.reset;
          c.prototype.freemem = c.prototype.freemem;
          c.prototype.free = c.prototype.Ya;
          d.prototype.next = d.prototype.next;
          d.prototype.getRemainingSQL = d.prototype.Qb;
          e.prototype.run = e.prototype.run;
          e.prototype.exec = e.prototype.exec;
          e.prototype.each = e.prototype.Mb;
          e.prototype.prepare = e.prototype.tb;
          e.prototype.iterateStatements = e.prototype.Ub;
          e.prototype["export"] = e.prototype.Nb;
          e.prototype.close = e.prototype.close;
          e.prototype.handleError = e.prototype.handleError;
          e.prototype.getRowsModified = e.prototype.Rb;
          e.prototype.create_function = e.prototype.Kb;
          e.prototype.create_aggregate = e.prototype.Jb;
          e.prototype.updateHook = e.prototype.Zb;
          k.Database = e;
        };
        var xa = "./this.program", ya = (a, b) => {
          throw b;
        }, za = globalThis.document?.currentScript?.src;
        "undefined" != typeof __filename ? za = __filename : ba && (za = self.location.href);
        var Aa = "", Ba, Ca;
        if (ca) {
          var fs4 = require("node:fs");
          Aa = __dirname + "/";
          Ca = (a) => {
            a = Da(a) ? new URL(a) : a;
            return fs4.readFileSync(a);
          };
          Ba = async (a) => {
            a = Da(a) ? new URL(a) : a;
            return fs4.readFileSync(a, void 0);
          };
          1 < process.argv.length && (xa = process.argv[1].replace(/\\/g, "/"));
          process.argv.slice(2);
          "undefined" != typeof module2 && (module2.exports = k);
          ya = (a, b) => {
            process.exitCode = a;
            throw b;
          };
        } else if (aa || ba) {
          try {
            Aa = new URL(".", za).href;
          } catch {
          }
          ba && (Ca = (a) => {
            var b = new XMLHttpRequest();
            b.open("GET", a, false);
            b.responseType = "arraybuffer";
            b.send(null);
            return new Uint8Array(b.response);
          });
          Ba = async (a) => {
            if (Da(a)) return new Promise((c, d) => {
              var e = new XMLHttpRequest();
              e.open("GET", a, true);
              e.responseType = "arraybuffer";
              e.onload = () => {
                200 == e.status || 0 == e.status && e.response ? c(e.response) : d(e.status);
              };
              e.onerror = d;
              e.send(null);
            });
            var b = await fetch(a, { credentials: "same-origin" });
            if (b.ok) return b.arrayBuffer();
            throw Error(b.status + " : " + b.url);
          };
        }
        var Ea = console.log.bind(console), B = console.error.bind(console), Fa, Ga = false, Ha, Da = (a) => a.startsWith("file://"), m, C, Ia, E, F, Ja, Ka, H;
        function La() {
          var a = Ma.buffer;
          m = new Int8Array(a);
          Ia = new Int16Array(a);
          C = new Uint8Array(a);
          new Uint16Array(a);
          E = new Int32Array(a);
          F = new Uint32Array(a);
          Ja = new Float32Array(a);
          Ka = new Float64Array(a);
          H = new BigInt64Array(a);
          new BigUint64Array(a);
        }
        function Na(a) {
          k.onAbort?.(a);
          a = "Aborted(" + a + ")";
          B(a);
          Ga = true;
          throw new WebAssembly.RuntimeError(a + ". Build with -sASSERTIONS for more info.");
        }
        var Oa;
        async function Pa(a) {
          if (!Fa) try {
            var b = await Ba(a);
            return new Uint8Array(b);
          } catch {
          }
          if (a == Oa && Fa) a = new Uint8Array(Fa);
          else if (Ca) a = Ca(a);
          else throw "both async and sync fetching of the wasm failed";
          return a;
        }
        async function Qa(a, b) {
          try {
            var c = await Pa(a);
            return await WebAssembly.instantiate(c, b);
          } catch (d) {
            B(`failed to asynchronously prepare wasm: ${d}`), Na(d);
          }
        }
        async function Ra(a) {
          var b = Oa;
          if (!Fa && !Da(b) && !ca) try {
            var c = fetch(b, { credentials: "same-origin" });
            return await WebAssembly.instantiateStreaming(c, a);
          } catch (d) {
            B(`wasm streaming compile failed: ${d}`), B("falling back to ArrayBuffer instantiation");
          }
          return Qa(b, a);
        }
        class Sa {
          name = "ExitStatus";
          constructor(a) {
            this.message = `Program terminated with exit(${a})`;
            this.status = a;
          }
        }
        var Ta = (a) => {
          for (; 0 < a.length; ) a.shift()(k);
        }, Ua = [], Va = [], Wa = () => {
          var a = k.preRun.shift();
          Va.push(a);
        }, K = 0, Xa = null;
        function t(a, b = "i8") {
          b.endsWith("*") && (b = "*");
          switch (b) {
            case "i1":
              return m[a];
            case "i8":
              return m[a];
            case "i16":
              return Ia[a >> 1];
            case "i32":
              return E[a >> 2];
            case "i64":
              return H[a >> 3];
            case "float":
              return Ja[a >> 2];
            case "double":
              return Ka[a >> 3];
            case "*":
              return F[a >> 2];
            default:
              Na(`invalid type for getValue: ${b}`);
          }
        }
        var Ya = true;
        function ra(a) {
          var b = "i32";
          b.endsWith("*") && (b = "*");
          switch (b) {
            case "i1":
              m[a] = 0;
              break;
            case "i8":
              m[a] = 0;
              break;
            case "i16":
              Ia[a >> 1] = 0;
              break;
            case "i32":
              E[a >> 2] = 0;
              break;
            case "i64":
              H[a >> 3] = BigInt(0);
              break;
            case "float":
              Ja[a >> 2] = 0;
              break;
            case "double":
              Ka[a >> 3] = 0;
              break;
            case "*":
              F[a >> 2] = 0;
              break;
            default:
              Na(`invalid type for setValue: ${b}`);
          }
        }
        var Za = new TextDecoder(), $a = (a, b, c, d) => {
          c = b + c;
          if (d) return c;
          for (; a[b] && !(b >= c); ) ++b;
          return b;
        }, z = (a, b, c) => a ? Za.decode(C.subarray(a, $a(C, a, b, c))) : "", ab = (a, b) => {
          for (var c = 0, d = a.length - 1; 0 <= d; d--) {
            var e = a[d];
            "." === e ? a.splice(d, 1) : ".." === e ? (a.splice(d, 1), c++) : c && (a.splice(d, 1), c--);
          }
          if (b) for (; c; c--) a.unshift("..");
          return a;
        }, ia = (a) => {
          var b = "/" === a.charAt(0), c = "/" === a.slice(-1);
          (a = ab(a.split("/").filter((d) => !!d), !b).join("/")) || b || (a = ".");
          a && c && (a += "/");
          return (b ? "/" : "") + a;
        }, bb = (a) => {
          var b = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(a).slice(1);
          a = b[0];
          b = b[1];
          if (!a && !b) return ".";
          b &&= b.slice(0, -1);
          return a + b;
        }, cb = (a) => a && a.match(/([^\/]+|\/)\/*$/)[1], db2 = () => {
          if (ca) {
            var a = require("node:crypto");
            return (b) => a.randomFillSync(b);
          }
          return (b) => crypto.getRandomValues(b);
        }, eb = (a) => {
          (eb = db2())(a);
        }, fb = (...a) => {
          for (var b = "", c = false, d = a.length - 1; -1 <= d && !c; d--) {
            c = 0 <= d ? a[d] : "/";
            if ("string" != typeof c) throw new TypeError("Arguments to path.resolve must be strings");
            if (!c) return "";
            b = c + "/" + b;
            c = "/" === c.charAt(0);
          }
          b = ab(b.split("/").filter((e) => !!e), !c).join("/");
          return (c ? "/" : "") + b || ".";
        }, gb = (a) => {
          var b = $a(a, 0);
          return Za.decode(a.buffer ? a.subarray(0, b) : new Uint8Array(a.slice(0, b)));
        }, hb = [], ib = (a) => {
          for (var b = 0, c = 0; c < a.length; ++c) {
            var d = a.charCodeAt(c);
            127 >= d ? b++ : 2047 >= d ? b += 2 : 55296 <= d && 57343 >= d ? (b += 4, ++c) : b += 3;
          }
          return b;
        }, M = (a, b, c, d) => {
          if (!(0 < d)) return 0;
          var e = c;
          d = c + d - 1;
          for (var g = 0; g < a.length; ++g) {
            var h = a.codePointAt(g);
            if (127 >= h) {
              if (c >= d) break;
              b[c++] = h;
            } else if (2047 >= h) {
              if (c + 1 >= d) break;
              b[c++] = 192 | h >> 6;
              b[c++] = 128 | h & 63;
            } else if (65535 >= h) {
              if (c + 2 >= d) break;
              b[c++] = 224 | h >> 12;
              b[c++] = 128 | h >> 6 & 63;
              b[c++] = 128 | h & 63;
            } else {
              if (c + 3 >= d) break;
              b[c++] = 240 | h >> 18;
              b[c++] = 128 | h >> 12 & 63;
              b[c++] = 128 | h >> 6 & 63;
              b[c++] = 128 | h & 63;
              g++;
            }
          }
          b[c] = 0;
          return c - e;
        }, jb = [];
        function kb(a, b) {
          jb[a] = { input: [], output: [], eb: b };
          mb(a, nb);
        }
        var nb = { open(a) {
          var b = jb[a.node.rdev];
          if (!b) throw new N(43);
          a.tty = b;
          a.seekable = false;
        }, close(a) {
          a.tty.eb.fsync(a.tty);
        }, fsync(a) {
          a.tty.eb.fsync(a.tty);
        }, read(a, b, c, d) {
          if (!a.tty || !a.tty.eb.Bb) throw new N(60);
          for (var e = 0, g = 0; g < d; g++) {
            try {
              var h = a.tty.eb.Bb(a.tty);
            } catch (q) {
              throw new N(29);
            }
            if (void 0 === h && 0 === e) throw new N(6);
            if (null === h || void 0 === h) break;
            e++;
            b[c + g] = h;
          }
          e && (a.node.atime = Date.now());
          return e;
        }, write(a, b, c, d) {
          if (!a.tty || !a.tty.eb.ub) throw new N(60);
          try {
            for (var e = 0; e < d; e++) a.tty.eb.ub(a.tty, b[c + e]);
          } catch (g) {
            throw new N(29);
          }
          d && (a.node.mtime = a.node.ctime = Date.now());
          return e;
        } }, wb = { Bb() {
          a: {
            if (!hb.length) {
              var a = null;
              if (ca) {
                var b = Buffer.alloc(256), c = 0, d = process.stdin.fd;
                try {
                  c = fs4.readSync(d, b, 0, 256);
                } catch (e) {
                  if (e.toString().includes("EOF")) c = 0;
                  else throw e;
                }
                0 < c && (a = b.slice(0, c).toString("utf-8"));
              } else globalThis.window?.prompt && (a = window.prompt("Input: "), null !== a && (a += "\n"));
              if (!a) {
                a = null;
                break a;
              }
              b = Array(ib(a) + 1);
              a = M(a, b, 0, b.length);
              b.length = a;
              hb = b;
            }
            a = hb.shift();
          }
          return a;
        }, ub(a, b) {
          null === b || 10 === b ? (Ea(gb(a.output)), a.output = []) : 0 != b && a.output.push(b);
        }, fsync(a) {
          0 < a.output?.length && (Ea(gb(a.output)), a.output = []);
        }, hc() {
          return { bc: 25856, dc: 5, ac: 191, cc: 35387, $b: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
        }, ic() {
          return 0;
        }, jc() {
          return [24, 80];
        } }, xb = { ub(a, b) {
          null === b || 10 === b ? (B(gb(a.output)), a.output = []) : 0 != b && a.output.push(b);
        }, fsync(a) {
          0 < a.output?.length && (B(gb(a.output)), a.output = []);
        } }, O = { Wa: null, Xa() {
          return O.createNode(null, "/", 16895, 0);
        }, createNode(a, b, c, d) {
          if (24576 === (c & 61440) || 4096 === (c & 61440)) throw new N(63);
          O.Wa || (O.Wa = { dir: { node: { Ta: O.La.Ta, Ua: O.La.Ua, lookup: O.La.lookup, ib: O.La.ib, rename: O.La.rename, unlink: O.La.unlink, rmdir: O.La.rmdir, readdir: O.La.readdir, symlink: O.La.symlink }, stream: { Va: O.Ma.Va } }, file: { node: { Ta: O.La.Ta, Ua: O.La.Ua }, stream: { Va: O.Ma.Va, read: O.Ma.read, write: O.Ma.write, jb: O.Ma.jb, kb: O.Ma.kb } }, link: { node: { Ta: O.La.Ta, Ua: O.La.Ua, readlink: O.La.readlink }, stream: {} }, yb: { node: { Ta: O.La.Ta, Ua: O.La.Ua }, stream: yb } });
          c = zb(a, b, c, d);
          P(c.mode) ? (c.La = O.Wa.dir.node, c.Ma = O.Wa.dir.stream, c.Na = {}) : 32768 === (c.mode & 61440) ? (c.La = O.Wa.file.node, c.Ma = O.Wa.file.stream, c.Ra = 0, c.Na = null) : 40960 === (c.mode & 61440) ? (c.La = O.Wa.link.node, c.Ma = O.Wa.link.stream) : 8192 === (c.mode & 61440) && (c.La = O.Wa.yb.node, c.Ma = O.Wa.yb.stream);
          c.atime = c.mtime = c.ctime = Date.now();
          a && (a.Na[b] = c, a.atime = a.mtime = a.ctime = c.atime);
          return c;
        }, fc(a) {
          return a.Na ? a.Na.subarray ? a.Na.subarray(0, a.Ra) : new Uint8Array(a.Na) : new Uint8Array(0);
        }, La: {
          Ta(a) {
            var b = {};
            b.dev = 8192 === (a.mode & 61440) ? a.id : 1;
            b.ino = a.id;
            b.mode = a.mode;
            b.nlink = 1;
            b.uid = 0;
            b.gid = 0;
            b.rdev = a.rdev;
            P(a.mode) ? b.size = 4096 : 32768 === (a.mode & 61440) ? b.size = a.Ra : 40960 === (a.mode & 61440) ? b.size = a.link.length : b.size = 0;
            b.atime = new Date(a.atime);
            b.mtime = new Date(a.mtime);
            b.ctime = new Date(a.ctime);
            b.blksize = 4096;
            b.blocks = Math.ceil(b.size / b.blksize);
            return b;
          },
          Ua(a, b) {
            for (var c of ["mode", "atime", "mtime", "ctime"]) null != b[c] && (a[c] = b[c]);
            void 0 !== b.size && (b = b.size, a.Ra != b && (0 == b ? (a.Na = null, a.Ra = 0) : (c = a.Na, a.Na = new Uint8Array(b), c && a.Na.set(c.subarray(0, Math.min(b, a.Ra))), a.Ra = b)));
          },
          lookup() {
            O.nb || (O.nb = new N(44), O.nb.stack = "<generic error, no stack>");
            throw O.nb;
          },
          ib(a, b, c, d) {
            return O.createNode(a, b, c, d);
          },
          rename(a, b, c) {
            try {
              var d = Q(b, c);
            } catch (g) {
            }
            if (d) {
              if (P(a.mode)) for (var e in d.Na) throw new N(55);
              Ab(d);
            }
            delete a.parent.Na[a.name];
            b.Na[c] = a;
            a.name = c;
            b.ctime = b.mtime = a.parent.ctime = a.parent.mtime = Date.now();
          },
          unlink(a, b) {
            delete a.Na[b];
            a.ctime = a.mtime = Date.now();
          },
          rmdir(a, b) {
            var c = Q(a, b), d;
            for (d in c.Na) throw new N(55);
            delete a.Na[b];
            a.ctime = a.mtime = Date.now();
          },
          readdir(a) {
            return [".", "..", ...Object.keys(a.Na)];
          },
          symlink(a, b, c) {
            a = O.createNode(a, b, 41471, 0);
            a.link = c;
            return a;
          },
          readlink(a) {
            if (40960 !== (a.mode & 61440)) throw new N(28);
            return a.link;
          }
        }, Ma: { read(a, b, c, d, e) {
          var g = a.node.Na;
          if (e >= a.node.Ra) return 0;
          a = Math.min(a.node.Ra - e, d);
          if (8 < a && g.subarray) b.set(g.subarray(e, e + a), c);
          else for (d = 0; d < a; d++) b[c + d] = g[e + d];
          return a;
        }, write(a, b, c, d, e, g) {
          b.buffer === m.buffer && (g = false);
          if (!d) return 0;
          a = a.node;
          a.mtime = a.ctime = Date.now();
          if (b.subarray && (!a.Na || a.Na.subarray)) {
            if (g) return a.Na = b.subarray(c, c + d), a.Ra = d;
            if (0 === a.Ra && 0 === e) return a.Na = b.slice(c, c + d), a.Ra = d;
            if (e + d <= a.Ra) return a.Na.set(b.subarray(c, c + d), e), d;
          }
          g = e + d;
          var h = a.Na ? a.Na.length : 0;
          h >= g || (g = Math.max(g, h * (1048576 > h ? 2 : 1.125) >>> 0), 0 != h && (g = Math.max(g, 256)), h = a.Na, a.Na = new Uint8Array(g), 0 < a.Ra && a.Na.set(h.subarray(0, a.Ra), 0));
          if (a.Na.subarray && b.subarray) a.Na.set(b.subarray(c, c + d), e);
          else for (g = 0; g < d; g++) a.Na[e + g] = b[c + g];
          a.Ra = Math.max(a.Ra, e + d);
          return d;
        }, Va(a, b, c) {
          1 === c ? b += a.position : 2 === c && 32768 === (a.node.mode & 61440) && (b += a.node.Ra);
          if (0 > b) throw new N(28);
          return b;
        }, jb(a, b, c, d, e) {
          if (32768 !== (a.node.mode & 61440)) throw new N(43);
          a = a.node.Na;
          if (e & 2 || !a || a.buffer !== m.buffer) {
            e = true;
            d = 65536 * Math.ceil(b / 65536);
            var g = Bb(65536, d);
            g && C.fill(0, g, g + d);
            d = g;
            if (!d) throw new N(48);
            if (a) {
              if (0 < c || c + b < a.length) a.subarray ? a = a.subarray(c, c + b) : a = Array.prototype.slice.call(a, c, c + b);
              m.set(a, d);
            }
          } else e = false, d = a.byteOffset;
          return { Xb: d, Eb: e };
        }, kb(a, b, c, d) {
          O.Ma.write(a, b, 0, d, c, false);
          return 0;
        } } }, ja = (a, b) => {
          var c = 0;
          a && (c |= 365);
          b && (c |= 146);
          return c;
        }, Cb = null, Db = {}, Eb = [], Fb = 1, R = null, Gb = false, Hb = true, Ib = {}, N = class {
          name = "ErrnoError";
          constructor(a) {
            this.Pa = a;
          }
        }, Jb = class {
          hb = {};
          node = null;
          get flags() {
            return this.hb.flags;
          }
          set flags(a) {
            this.hb.flags = a;
          }
          get position() {
            return this.hb.position;
          }
          set position(a) {
            this.hb.position = a;
          }
        }, Kb = class {
          La = {};
          Ma = {};
          bb = null;
          constructor(a, b, c, d) {
            a ||= this;
            this.parent = a;
            this.Xa = a.Xa;
            this.id = Fb++;
            this.name = b;
            this.mode = c;
            this.rdev = d;
            this.atime = this.mtime = this.ctime = Date.now();
          }
          get read() {
            return 365 === (this.mode & 365);
          }
          set read(a) {
            a ? this.mode |= 365 : this.mode &= -366;
          }
          get write() {
            return 146 === (this.mode & 146);
          }
          set write(a) {
            a ? this.mode |= 146 : this.mode &= -147;
          }
        };
        function S(a, b = {}) {
          if (!a) throw new N(44);
          b.pb ?? (b.pb = true);
          "/" === a.charAt(0) || (a = "//" + a);
          var c = 0;
          a: for (; 40 > c; c++) {
            a = a.split("/").filter((q) => !!q);
            for (var d = Cb, e = "/", g = 0; g < a.length; g++) {
              var h = g === a.length - 1;
              if (h && b.parent) break;
              if ("." !== a[g]) if (".." === a[g]) if (e = bb(e), d === d.parent) {
                a = e + "/" + a.slice(g + 1).join("/");
                c--;
                continue a;
              } else d = d.parent;
              else {
                e = ia(e + "/" + a[g]);
                try {
                  d = Q(d, a[g]);
                } catch (q) {
                  if (44 === q?.Pa && h && b.Wb) return { path: e };
                  throw q;
                }
                !d.bb || h && !b.pb || (d = d.bb.root);
                if (40960 === (d.mode & 61440) && (!h || b.ab)) {
                  if (!d.La.readlink) throw new N(52);
                  d = d.La.readlink(d);
                  "/" === d.charAt(0) || (d = bb(e) + "/" + d);
                  a = d + "/" + a.slice(g + 1).join("/");
                  continue a;
                }
              }
            }
            return { path: e, node: d };
          }
          throw new N(32);
        }
        function ha(a) {
          for (var b; ; ) {
            if (a === a.parent) return a = a.Xa.Db, b ? "/" !== a[a.length - 1] ? `${a}/${b}` : a + b : a;
            b = b ? `${a.name}/${b}` : a.name;
            a = a.parent;
          }
        }
        function Lb(a, b) {
          for (var c = 0, d = 0; d < b.length; d++) c = (c << 5) - c + b.charCodeAt(d) | 0;
          return (a + c >>> 0) % R.length;
        }
        function Ab(a) {
          var b = Lb(a.parent.id, a.name);
          if (R[b] === a) R[b] = a.cb;
          else for (b = R[b]; b; ) {
            if (b.cb === a) {
              b.cb = a.cb;
              break;
            }
            b = b.cb;
          }
        }
        function Q(a, b) {
          var c = P(a.mode) ? (c = Mb(a, "x")) ? c : a.La.lookup ? 0 : 2 : 54;
          if (c) throw new N(c);
          for (c = R[Lb(a.id, b)]; c; c = c.cb) {
            var d = c.name;
            if (c.parent.id === a.id && d === b) return c;
          }
          return a.La.lookup(a, b);
        }
        function zb(a, b, c, d) {
          a = new Kb(a, b, c, d);
          b = Lb(a.parent.id, a.name);
          a.cb = R[b];
          return R[b] = a;
        }
        function P(a) {
          return 16384 === (a & 61440);
        }
        function Nb(a) {
          var b = ["r", "w", "rw"][a & 3];
          a & 512 && (b += "w");
          return b;
        }
        function Mb(a, b) {
          if (Hb) return 0;
          if (!b.includes("r") || a.mode & 292) {
            if (b.includes("w") && !(a.mode & 146) || b.includes("x") && !(a.mode & 73)) return 2;
          } else return 2;
          return 0;
        }
        function Ob(a, b) {
          if (!P(a.mode)) return 54;
          try {
            return Q(a, b), 20;
          } catch (c) {
          }
          return Mb(a, "wx");
        }
        function Pb(a, b, c) {
          try {
            var d = Q(a, b);
          } catch (e) {
            return e.Pa;
          }
          if (a = Mb(a, "wx")) return a;
          if (c) {
            if (!P(d.mode)) return 54;
            if (d === d.parent || "/" === ha(d)) return 10;
          } else if (P(d.mode)) return 31;
          return 0;
        }
        function Qb(a) {
          if (!a) throw new N(63);
          return a;
        }
        function T(a) {
          a = Eb[a];
          if (!a) throw new N(8);
          return a;
        }
        function Rb(a, b = -1) {
          a = Object.assign(new Jb(), a);
          if (-1 == b) a: {
            for (b = 0; 4096 >= b; b++) if (!Eb[b]) break a;
            throw new N(33);
          }
          a.fd = b;
          return Eb[b] = a;
        }
        function Sb(a, b = -1) {
          a = Rb(a, b);
          a.Ma?.ec?.(a);
          return a;
        }
        function Tb(a, b, c) {
          var d = a?.Ma.Ua;
          a = d ? a : b;
          d ??= b.La.Ua;
          Qb(d);
          d(a, c);
        }
        var yb = { open(a) {
          a.Ma = Db[a.node.rdev].Ma;
          a.Ma.open?.(a);
        }, Va() {
          throw new N(70);
        } };
        function mb(a, b) {
          Db[a] = { Ma: b };
        }
        function Ub(a, b) {
          var c = "/" === b;
          if (c && Cb) throw new N(10);
          if (!c && b) {
            var d = S(b, { pb: false });
            b = d.path;
            d = d.node;
            if (d.bb) throw new N(10);
            if (!P(d.mode)) throw new N(54);
          }
          b = { type: a, kc: {}, Db: b, Vb: [] };
          a = a.Xa(b);
          a.Xa = b;
          b.root = a;
          c ? Cb = a : d && (d.bb = b, d.Xa && d.Xa.Vb.push(b));
        }
        function Vb(a, b, c) {
          var d = S(a, { parent: true }).node;
          a = cb(a);
          if (!a) throw new N(28);
          if ("." === a || ".." === a) throw new N(20);
          var e = Ob(d, a);
          if (e) throw new N(e);
          if (!d.La.ib) throw new N(63);
          return d.La.ib(d, a, b, c);
        }
        function ka(a, b = 438) {
          return Vb(a, b & 4095 | 32768, 0);
        }
        function U(a, b = 511) {
          return Vb(a, b & 1023 | 16384, 0);
        }
        function Wb(a, b, c) {
          "undefined" == typeof c && (c = b, b = 438);
          Vb(a, b | 8192, c);
        }
        function Xb(a, b) {
          if (!fb(a)) throw new N(44);
          var c = S(b, { parent: true }).node;
          if (!c) throw new N(44);
          b = cb(b);
          var d = Ob(c, b);
          if (d) throw new N(d);
          if (!c.La.symlink) throw new N(63);
          c.La.symlink(c, b, a);
        }
        function Yb(a) {
          var b = S(a, { parent: true }).node;
          a = cb(a);
          var c = Q(b, a), d = Pb(b, a, true);
          if (d) throw new N(d);
          if (!b.La.rmdir) throw new N(63);
          if (c.bb) throw new N(10);
          b.La.rmdir(b, a);
          Ab(c);
        }
        function ua(a) {
          var b = S(a, { parent: true }).node;
          if (!b) throw new N(44);
          a = cb(a);
          var c = Q(b, a), d = Pb(b, a, false);
          if (d) throw new N(d);
          if (!b.La.unlink) throw new N(63);
          if (c.bb) throw new N(10);
          b.La.unlink(b, a);
          Ab(c);
        }
        function Zb(a, b) {
          a = S(a, { ab: !b }).node;
          return Qb(a.La.Ta)(a);
        }
        function $b(a, b, c, d) {
          Tb(a, b, { mode: c & 4095 | b.mode & -4096, ctime: Date.now(), Lb: d });
        }
        function ma(a, b) {
          a = "string" == typeof a ? S(a, { ab: true }).node : a;
          $b(null, a, b);
        }
        function ac(a, b, c) {
          if (P(b.mode)) throw new N(31);
          if (32768 !== (b.mode & 61440)) throw new N(28);
          var d = Mb(b, "w");
          if (d) throw new N(d);
          Tb(a, b, { size: c, timestamp: Date.now() });
        }
        function na(a, b, c = 438) {
          if ("" === a) throw new N(44);
          if ("string" == typeof b) {
            var d = { r: 0, "r+": 2, w: 577, "w+": 578, a: 1089, "a+": 1090 }[b];
            if ("undefined" == typeof d) throw Error(`Unknown file open mode: ${b}`);
            b = d;
          }
          c = b & 64 ? c & 4095 | 32768 : 0;
          if ("object" == typeof a) d = a;
          else {
            var e = a.endsWith("/");
            a = S(a, { ab: !(b & 131072), Wb: true });
            d = a.node;
            a = a.path;
          }
          var g = false;
          if (b & 64) if (d) {
            if (b & 128) throw new N(20);
          } else {
            if (e) throw new N(31);
            d = Vb(a, c | 511, 0);
            g = true;
          }
          if (!d) throw new N(44);
          8192 === (d.mode & 61440) && (b &= -513);
          if (b & 65536 && !P(d.mode)) throw new N(54);
          if (!g && (e = d ? 40960 === (d.mode & 61440) ? 32 : P(d.mode) && ("r" !== Nb(b) || b & 576) ? 31 : Mb(d, Nb(b)) : 44)) throw new N(e);
          b & 512 && !g && (e = d, e = "string" == typeof e ? S(e, { ab: true }).node : e, ac(null, e, 0));
          b &= -131713;
          e = Rb({ node: d, path: ha(d), flags: b, seekable: true, position: 0, Ma: d.Ma, Yb: [], error: false });
          e.Ma.open && e.Ma.open(e);
          g && ma(d, c & 511);
          !k.logReadFiles || b & 1 || a in Ib || (Ib[a] = 1);
          return e;
        }
        function pa(a) {
          if (null === a.fd) throw new N(8);
          a.rb && (a.rb = null);
          try {
            a.Ma.close && a.Ma.close(a);
          } catch (b) {
            throw b;
          } finally {
            Eb[a.fd] = null;
          }
          a.fd = null;
        }
        function bc(a, b, c) {
          if (null === a.fd) throw new N(8);
          if (!a.seekable || !a.Ma.Va) throw new N(70);
          if (0 != c && 1 != c && 2 != c) throw new N(28);
          a.position = a.Ma.Va(a, b, c);
          a.Yb = [];
        }
        function cc(a, b, c, d, e) {
          if (0 > d || 0 > e) throw new N(28);
          if (null === a.fd) throw new N(8);
          if (1 === (a.flags & 2097155)) throw new N(8);
          if (P(a.node.mode)) throw new N(31);
          if (!a.Ma.read) throw new N(28);
          var g = "undefined" != typeof e;
          if (!g) e = a.position;
          else if (!a.seekable) throw new N(70);
          b = a.Ma.read(a, b, c, d, e);
          g || (a.position += b);
          return b;
        }
        function oa(a, b, c, d, e) {
          if (0 > d || 0 > e) throw new N(28);
          if (null === a.fd) throw new N(8);
          if (0 === (a.flags & 2097155)) throw new N(8);
          if (P(a.node.mode)) throw new N(31);
          if (!a.Ma.write) throw new N(28);
          a.seekable && a.flags & 1024 && bc(a, 0, 2);
          var g = "undefined" != typeof e;
          if (!g) e = a.position;
          else if (!a.seekable) throw new N(70);
          b = a.Ma.write(a, b, c, d, e, void 0);
          g || (a.position += b);
          return b;
        }
        function ta(a) {
          var b = b || 0;
          var c = "binary";
          "utf8" !== c && "binary" !== c && Na(`Invalid encoding type "${c}"`);
          b = na(a, b);
          a = Zb(a).size;
          var d = new Uint8Array(a);
          cc(b, d, 0, a, 0);
          "utf8" === c && (d = gb(d));
          pa(b);
          return d;
        }
        function W(a, b, c) {
          a = ia("/dev/" + a);
          var d = ja(!!b, !!c);
          W.Cb ?? (W.Cb = 64);
          var e = W.Cb++ << 8 | 0;
          mb(e, { open(g) {
            g.seekable = false;
          }, close() {
            c?.buffer?.length && c(10);
          }, read(g, h, q, v) {
            for (var u = 0, x = 0; x < v; x++) {
              try {
                var D = b();
              } catch (pb) {
                throw new N(29);
              }
              if (void 0 === D && 0 === u) throw new N(6);
              if (null === D || void 0 === D) break;
              u++;
              h[q + x] = D;
            }
            u && (g.node.atime = Date.now());
            return u;
          }, write(g, h, q, v) {
            for (var u = 0; u < v; u++) try {
              c(h[q + u]);
            } catch (x) {
              throw new N(29);
            }
            v && (g.node.mtime = g.node.ctime = Date.now());
            return u;
          } });
          Wb(a, d, e);
        }
        var X = {};
        function Y(a, b, c) {
          if ("/" === b.charAt(0)) return b;
          a = -100 === a ? "/" : T(a).path;
          if (0 == b.length) {
            if (!c) throw new N(44);
            return a;
          }
          return a + "/" + b;
        }
        function mc(a, b) {
          F[a >> 2] = b.dev;
          F[a + 4 >> 2] = b.mode;
          F[a + 8 >> 2] = b.nlink;
          F[a + 12 >> 2] = b.uid;
          F[a + 16 >> 2] = b.gid;
          F[a + 20 >> 2] = b.rdev;
          H[a + 24 >> 3] = BigInt(b.size);
          E[a + 32 >> 2] = 4096;
          E[a + 36 >> 2] = b.blocks;
          var c = b.atime.getTime(), d = b.mtime.getTime(), e = b.ctime.getTime();
          H[a + 40 >> 3] = BigInt(Math.floor(c / 1e3));
          F[a + 48 >> 2] = c % 1e3 * 1e6;
          H[a + 56 >> 3] = BigInt(Math.floor(d / 1e3));
          F[a + 64 >> 2] = d % 1e3 * 1e6;
          H[a + 72 >> 3] = BigInt(Math.floor(e / 1e3));
          F[a + 80 >> 2] = e % 1e3 * 1e6;
          H[a + 88 >> 3] = BigInt(b.ino);
          return 0;
        }
        var Ec = void 0, Gc = () => {
          var a = E[+Ec >> 2];
          Ec += 4;
          return a;
        }, Hc = 0, Ic = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], Jc = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], Kc = {}, Lc = (a) => {
          Ha = a;
          Ya || 0 < Hc || (k.onExit?.(a), Ga = true);
          ya(a, new Sa(a));
        }, Mc = (a) => {
          if (!Ga) try {
            a();
          } catch (b) {
            b instanceof Sa || "unwind" == b || ya(1, b);
          } finally {
            if (!(Ya || 0 < Hc)) try {
              Ha = a = Ha, Lc(a);
            } catch (b) {
              b instanceof Sa || "unwind" == b || ya(1, b);
            }
          }
        }, Nc = {}, Pc = () => {
          if (!Oc) {
            var a = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8", _: xa || "./this.program" }, b;
            for (b in Nc) void 0 === Nc[b] ? delete a[b] : a[b] = Nc[b];
            var c = [];
            for (b in a) c.push(`${b}=${a[b]}`);
            Oc = c;
          }
          return Oc;
        }, Oc, Qc = (a, b, c, d) => {
          var e = { string: (u) => {
            var x = 0;
            if (null !== u && void 0 !== u && 0 !== u) {
              x = ib(u) + 1;
              var D = y(x);
              M(u, C, D, x);
              x = D;
            }
            return x;
          }, array: (u) => {
            var x = y(u.length);
            m.set(u, x);
            return x;
          } };
          a = k["_" + a];
          var g = [], h = 0;
          if (d) for (var q = 0; q < d.length; q++) {
            var v = e[c[q]];
            v ? (0 === h && (h = qa()), g[q] = v(d[q])) : g[q] = d[q];
          }
          c = a(...g);
          return c = (function(u) {
            0 !== h && sa(h);
            return "string" === b ? z(u) : "boolean" === b ? !!u : u;
          })(c);
        }, fa = (a) => {
          var b = ib(a) + 1, c = da(b);
          c && M(a, C, c, b);
          return c;
        }, Rc, Sc = [], A = (a) => {
          Rc.delete(Z.get(a));
          Z.set(a, null);
          Sc.push(a);
        }, Tc = (a) => {
          const b = a.length;
          return [b % 128 | 128, b >> 7, ...a];
        }, Uc = { i: 127, p: 127, j: 126, f: 125, d: 124, e: 111 }, Vc = (a) => Tc(Array.from(a, (b) => Uc[b])), wa = (a, b) => {
          if (!Rc) {
            Rc = /* @__PURE__ */ new WeakMap();
            var c = Z.length;
            if (Rc) for (var d = 0; d < 0 + c; d++) {
              var e = Z.get(d);
              e && Rc.set(e, d);
            }
          }
          if (c = Rc.get(a) || 0) return c;
          c = Sc.length ? Sc.pop() : Z.grow(1);
          try {
            Z.set(c, a);
          } catch (g) {
            if (!(g instanceof TypeError)) throw g;
            b = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0, 1, ...Tc([1, 96, ...Vc(b.slice(1)), ...Vc("v" === b[0] ? "" : b[0])]), 2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
            b = new WebAssembly.Module(b);
            b = new WebAssembly.Instance(b, { e: { f: a } }).exports.f;
            Z.set(c, b);
          }
          Rc.set(a, c);
          return c;
        };
        R = Array(4096);
        Ub(O, "/");
        U("/tmp");
        U("/home");
        U("/home/web_user");
        (function() {
          U("/dev");
          mb(259, { read: () => 0, write: (d, e, g, h) => h, Va: () => 0 });
          Wb("/dev/null", 259);
          kb(1280, wb);
          kb(1536, xb);
          Wb("/dev/tty", 1280);
          Wb("/dev/tty1", 1536);
          var a = new Uint8Array(1024), b = 0, c = () => {
            0 === b && (eb(a), b = a.byteLength);
            return a[--b];
          };
          W("random", c);
          W("urandom", c);
          U("/dev/shm");
          U("/dev/shm/tmp");
        })();
        (function() {
          U("/proc");
          var a = U("/proc/self");
          U("/proc/self/fd");
          Ub({ Xa() {
            var b = zb(a, "fd", 16895, 73);
            b.Ma = { Va: O.Ma.Va };
            b.La = { lookup(c, d) {
              c = +d;
              var e = T(c);
              c = { parent: null, Xa: { Db: "fake" }, La: { readlink: () => e.path }, id: c + 1 };
              return c.parent = c;
            }, readdir() {
              return Array.from(Eb.entries()).filter(([, c]) => c).map(([c]) => c.toString());
            } };
            return b;
          } }, "/proc/self/fd");
        })();
        k.noExitRuntime && (Ya = k.noExitRuntime);
        k.print && (Ea = k.print);
        k.printErr && (B = k.printErr);
        k.wasmBinary && (Fa = k.wasmBinary);
        k.thisProgram && (xa = k.thisProgram);
        if (k.preInit) for ("function" == typeof k.preInit && (k.preInit = [k.preInit]); 0 < k.preInit.length; ) k.preInit.shift()();
        k.stackSave = () => qa();
        k.stackRestore = (a) => sa(a);
        k.stackAlloc = (a) => y(a);
        k.cwrap = (a, b, c, d) => {
          var e = !c || c.every((g) => "number" === g || "boolean" === g);
          return "string" !== b && e && !d ? k["_" + a] : (...g) => Qc(a, b, c, g);
        };
        k.addFunction = wa;
        k.removeFunction = A;
        k.UTF8ToString = z;
        k.stringToNewUTF8 = fa;
        k.writeArrayToMemory = (a, b) => {
          m.set(a, b);
        };
        var da, ea, Bb, Wc, sa, y, qa, Ma, Z, Xc = {
          a: (a, b, c, d) => Na(`Assertion failed: ${z(a)}, at: ` + [b ? z(b) : "unknown filename", c, d ? z(d) : "unknown function"]),
          i: function(a, b) {
            try {
              return a = z(a), ma(a, b), 0;
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          },
          L: function(a, b, c) {
            try {
              b = z(b);
              b = Y(a, b);
              if (c & -8) return -28;
              var d = S(b, { ab: true }).node;
              if (!d) return -44;
              a = "";
              c & 4 && (a += "r");
              c & 2 && (a += "w");
              c & 1 && (a += "x");
              return a && Mb(d, a) ? -2 : 0;
            } catch (e) {
              if ("undefined" == typeof X || "ErrnoError" !== e.name) throw e;
              return -e.Pa;
            }
          },
          j: function(a, b) {
            try {
              var c = T(a);
              $b(c, c.node, b, false);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          },
          h: function(a) {
            try {
              var b = T(a);
              Tb(b, b.node, { timestamp: Date.now(), Lb: false });
              return 0;
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          },
          b: function(a, b, c) {
            Ec = c;
            try {
              var d = T(a);
              switch (b) {
                case 0:
                  var e = Gc();
                  if (0 > e) break;
                  for (; Eb[e]; ) e++;
                  return Sb(d, e).fd;
                case 1:
                case 2:
                  return 0;
                case 3:
                  return d.flags;
                case 4:
                  return e = Gc(), d.flags |= e, 0;
                case 12:
                  return e = Gc(), Ia[e + 0 >> 1] = 2, 0;
                case 13:
                case 14:
                  return 0;
              }
              return -28;
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return -g.Pa;
            }
          },
          g: function(a, b) {
            try {
              var c = T(a), d = c.node, e = c.Ma.Ta;
              a = e ? c : d;
              e ??= d.La.Ta;
              Qb(e);
              var g = e(a);
              return mc(b, g);
            } catch (h) {
              if ("undefined" == typeof X || "ErrnoError" !== h.name) throw h;
              return -h.Pa;
            }
          },
          H: function(a, b) {
            b = -9007199254740992 > b || 9007199254740992 < b ? NaN : Number(b);
            try {
              if (isNaN(b)) return -61;
              var c = T(a);
              if (0 > b || 0 === (c.flags & 2097155)) throw new N(28);
              ac(c, c.node, b);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          },
          G: function(a, b) {
            try {
              if (0 === b) return -28;
              var c = ib("/") + 1;
              if (b < c) return -68;
              M("/", C, a, b);
              return c;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          },
          K: function(a, b) {
            try {
              return a = z(a), mc(b, Zb(a, true));
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          },
          C: function(a, b, c) {
            try {
              return b = z(b), b = Y(a, b), U(b, c), 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          },
          J: function(a, b, c, d) {
            try {
              b = z(b);
              var e = d & 256;
              b = Y(a, b, d & 4096);
              return mc(c, e ? Zb(b, true) : Zb(b));
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return -g.Pa;
            }
          },
          x: function(a, b, c, d) {
            Ec = d;
            try {
              b = z(b);
              b = Y(a, b);
              var e = d ? Gc() : 0;
              return na(b, c, e).fd;
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return -g.Pa;
            }
          },
          v: function(a, b, c, d) {
            try {
              b = z(b);
              b = Y(a, b);
              if (0 >= d) return -28;
              var e = S(b).node;
              if (!e) throw new N(44);
              if (!e.La.readlink) throw new N(28);
              var g = e.La.readlink(e);
              var h = Math.min(d, ib(g)), q = m[c + h];
              M(
                g,
                C,
                c,
                d + 1
              );
              m[c + h] = q;
              return h;
            } catch (v) {
              if ("undefined" == typeof X || "ErrnoError" !== v.name) throw v;
              return -v.Pa;
            }
          },
          u: function(a) {
            try {
              return a = z(a), Yb(a), 0;
            } catch (b) {
              if ("undefined" == typeof X || "ErrnoError" !== b.name) throw b;
              return -b.Pa;
            }
          },
          f: function(a, b) {
            try {
              return a = z(a), mc(b, Zb(a));
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          },
          r: function(a, b, c) {
            try {
              b = z(b);
              b = Y(a, b);
              if (c) if (512 === c) Yb(b);
              else return -28;
              else ua(b);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          },
          q: function(a, b, c) {
            try {
              b = z(b);
              b = Y(a, b, true);
              var d = Date.now(), e, g;
              if (c) {
                var h = F[c >> 2] + 4294967296 * E[c + 4 >> 2], q = E[c + 8 >> 2];
                1073741823 == q ? e = d : 1073741822 == q ? e = null : e = 1e3 * h + q / 1e6;
                c += 16;
                h = F[c >> 2] + 4294967296 * E[c + 4 >> 2];
                q = E[c + 8 >> 2];
                1073741823 == q ? g = d : 1073741822 == q ? g = null : g = 1e3 * h + q / 1e6;
              } else g = e = d;
              if (null !== (g ?? e)) {
                a = e;
                var v = S(b, { ab: true }).node;
                Qb(v.La.Ua)(v, { atime: a, mtime: g });
              }
              return 0;
            } catch (u) {
              if ("undefined" == typeof X || "ErrnoError" !== u.name) throw u;
              return -u.Pa;
            }
          },
          m: () => Na(""),
          l: () => {
            Ya = false;
            Hc = 0;
          },
          A: function(a, b) {
            a = -9007199254740992 > a || 9007199254740992 < a ? NaN : Number(a);
            a = new Date(1e3 * a);
            E[b >> 2] = a.getSeconds();
            E[b + 4 >> 2] = a.getMinutes();
            E[b + 8 >> 2] = a.getHours();
            E[b + 12 >> 2] = a.getDate();
            E[b + 16 >> 2] = a.getMonth();
            E[b + 20 >> 2] = a.getFullYear() - 1900;
            E[b + 24 >> 2] = a.getDay();
            var c = a.getFullYear();
            E[b + 28 >> 2] = (0 !== c % 4 || 0 === c % 100 && 0 !== c % 400 ? Jc : Ic)[a.getMonth()] + a.getDate() - 1 | 0;
            E[b + 36 >> 2] = -(60 * a.getTimezoneOffset());
            c = new Date(a.getFullYear(), 6, 1).getTimezoneOffset();
            var d = new Date(a.getFullYear(), 0, 1).getTimezoneOffset();
            E[b + 32 >> 2] = (c != d && a.getTimezoneOffset() == Math.min(d, c)) | 0;
          },
          y: function(a, b, c, d, e, g, h) {
            e = -9007199254740992 > e || 9007199254740992 < e ? NaN : Number(e);
            try {
              var q = T(d);
              if (0 !== (b & 2) && 0 === (c & 2) && 2 !== (q.flags & 2097155)) throw new N(2);
              if (1 === (q.flags & 2097155)) throw new N(2);
              if (!q.Ma.jb) throw new N(43);
              if (!a) throw new N(28);
              var v = q.Ma.jb(q, a, e, b, c);
              var u = v.Xb;
              E[g >> 2] = v.Eb;
              F[h >> 2] = u;
              return 0;
            } catch (x) {
              if ("undefined" == typeof X || "ErrnoError" !== x.name) throw x;
              return -x.Pa;
            }
          },
          z: function(a, b, c, d, e, g) {
            g = -9007199254740992 > g || 9007199254740992 < g ? NaN : Number(g);
            try {
              var h = T(e);
              if (c & 2) {
                c = g;
                if (32768 !== (h.node.mode & 61440)) throw new N(43);
                if (!(d & 2)) {
                  var q = C.slice(a, a + b);
                  h.Ma.kb && h.Ma.kb(h, q, c, b, d);
                }
              }
            } catch (v) {
              if ("undefined" == typeof X || "ErrnoError" !== v.name) throw v;
              return -v.Pa;
            }
          },
          n: (a, b) => {
            Kc[a] && (clearTimeout(Kc[a].id), delete Kc[a]);
            if (!b) return 0;
            var c = setTimeout(() => {
              delete Kc[a];
              Mc(() => Wc(a, performance.now()));
            }, b);
            Kc[a] = { id: c, lc: b };
            return 0;
          },
          B: (a, b, c, d) => {
            var e = (/* @__PURE__ */ new Date()).getFullYear(), g = new Date(e, 0, 1).getTimezoneOffset();
            e = new Date(e, 6, 1).getTimezoneOffset();
            F[a >> 2] = 60 * Math.max(g, e);
            E[b >> 2] = Number(g != e);
            b = (h) => {
              var q = Math.abs(h);
              return `UTC${0 <= h ? "-" : "+"}${String(Math.floor(q / 60)).padStart(2, "0")}${String(q % 60).padStart(2, "0")}`;
            };
            a = b(g);
            b = b(e);
            e < g ? (M(a, C, c, 17), M(b, C, d, 17)) : (M(a, C, d, 17), M(b, C, c, 17));
          },
          d: () => Date.now(),
          s: () => 2147483648,
          c: () => performance.now(),
          o: (a) => {
            var b = C.length;
            a >>>= 0;
            if (2147483648 < a) return false;
            for (var c = 1; 4 >= c; c *= 2) {
              var d = b * (1 + 0.2 / c);
              d = Math.min(d, a + 100663296);
              a: {
                d = (Math.min(2147483648, 65536 * Math.ceil(Math.max(
                  a,
                  d
                ) / 65536)) - Ma.buffer.byteLength + 65535) / 65536 | 0;
                try {
                  Ma.grow(d);
                  La();
                  var e = 1;
                  break a;
                } catch (g) {
                }
                e = void 0;
              }
              if (e) return true;
            }
            return false;
          },
          E: (a, b) => {
            var c = 0, d = 0, e;
            for (e of Pc()) {
              var g = b + c;
              F[a + d >> 2] = g;
              c += M(e, C, g, Infinity) + 1;
              d += 4;
            }
            return 0;
          },
          F: (a, b) => {
            var c = Pc();
            F[a >> 2] = c.length;
            a = 0;
            for (var d of c) a += ib(d) + 1;
            F[b >> 2] = a;
            return 0;
          },
          e: function(a) {
            try {
              var b = T(a);
              pa(b);
              return 0;
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return c.Pa;
            }
          },
          p: function(a, b) {
            try {
              var c = T(a);
              m[b] = c.tty ? 2 : P(c.mode) ? 3 : 40960 === (c.mode & 61440) ? 7 : 4;
              Ia[b + 2 >> 1] = 0;
              H[b + 8 >> 3] = BigInt(0);
              H[b + 16 >> 3] = BigInt(0);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return d.Pa;
            }
          },
          w: function(a, b, c, d) {
            try {
              a: {
                var e = T(a);
                a = b;
                for (var g, h = b = 0; h < c; h++) {
                  var q = F[a >> 2], v = F[a + 4 >> 2];
                  a += 8;
                  var u = cc(e, m, q, v, g);
                  if (0 > u) {
                    var x = -1;
                    break a;
                  }
                  b += u;
                  if (u < v) break;
                  "undefined" != typeof g && (g += u);
                }
                x = b;
              }
              F[d >> 2] = x;
              return 0;
            } catch (D) {
              if ("undefined" == typeof X || "ErrnoError" !== D.name) throw D;
              return D.Pa;
            }
          },
          D: function(a, b, c, d) {
            b = -9007199254740992 > b || 9007199254740992 < b ? NaN : Number(b);
            try {
              if (isNaN(b)) return 61;
              var e = T(a);
              bc(e, b, c);
              H[d >> 3] = BigInt(e.position);
              e.rb && 0 === b && 0 === c && (e.rb = null);
              return 0;
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return g.Pa;
            }
          },
          I: function(a) {
            try {
              var b = T(a);
              return b.Ma?.fsync?.(b);
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return c.Pa;
            }
          },
          t: function(a, b, c, d) {
            try {
              a: {
                var e = T(a);
                a = b;
                for (var g, h = b = 0; h < c; h++) {
                  var q = F[a >> 2], v = F[a + 4 >> 2];
                  a += 8;
                  var u = oa(e, m, q, v, g);
                  if (0 > u) {
                    var x = -1;
                    break a;
                  }
                  b += u;
                  if (u < v) break;
                  "undefined" != typeof g && (g += u);
                }
                x = b;
              }
              F[d >> 2] = x;
              return 0;
            } catch (D) {
              if ("undefined" == typeof X || "ErrnoError" !== D.name) throw D;
              return D.Pa;
            }
          },
          k: Lc
        };
        function Yc() {
          function a() {
            k.calledRun = true;
            if (!Ga) {
              if (!k.noFSInit && !Gb) {
                var b, c;
                Gb = true;
                b ??= k.stdin;
                c ??= k.stdout;
                d ??= k.stderr;
                b ? W("stdin", b) : Xb("/dev/tty", "/dev/stdin");
                c ? W("stdout", null, c) : Xb("/dev/tty", "/dev/stdout");
                d ? W("stderr", null, d) : Xb("/dev/tty1", "/dev/stderr");
                na("/dev/stdin", 0);
                na("/dev/stdout", 1);
                na("/dev/stderr", 1);
              }
              Zc.N();
              Hb = false;
              k.onRuntimeInitialized?.();
              if (k.postRun) for ("function" == typeof k.postRun && (k.postRun = [k.postRun]); k.postRun.length; ) {
                var d = k.postRun.shift();
                Ua.push(d);
              }
              Ta(Ua);
            }
          }
          if (0 < K) Xa = Yc;
          else {
            if (k.preRun) for ("function" == typeof k.preRun && (k.preRun = [k.preRun]); k.preRun.length; ) Wa();
            Ta(Va);
            0 < K ? Xa = Yc : k.setStatus ? (k.setStatus("Running..."), setTimeout(() => {
              setTimeout(() => k.setStatus(""), 1);
              a();
            }, 1)) : a();
          }
        }
        var Zc;
        (async function() {
          function a(c) {
            c = Zc = c.exports;
            k._sqlite3_free = c.P;
            k._sqlite3_value_text = c.Q;
            k._sqlite3_prepare_v2 = c.R;
            k._sqlite3_step = c.S;
            k._sqlite3_reset = c.T;
            k._sqlite3_exec = c.U;
            k._sqlite3_finalize = c.V;
            k._sqlite3_column_name = c.W;
            k._sqlite3_column_text = c.X;
            k._sqlite3_column_type = c.Y;
            k._sqlite3_errmsg = c.Z;
            k._sqlite3_clear_bindings = c._;
            k._sqlite3_value_blob = c.$;
            k._sqlite3_value_bytes = c.aa;
            k._sqlite3_value_double = c.ba;
            k._sqlite3_value_int = c.ca;
            k._sqlite3_value_type = c.da;
            k._sqlite3_result_blob = c.ea;
            k._sqlite3_result_double = c.fa;
            k._sqlite3_result_error = c.ga;
            k._sqlite3_result_int = c.ha;
            k._sqlite3_result_int64 = c.ia;
            k._sqlite3_result_null = c.ja;
            k._sqlite3_result_text = c.ka;
            k._sqlite3_aggregate_context = c.la;
            k._sqlite3_column_count = c.ma;
            k._sqlite3_data_count = c.na;
            k._sqlite3_column_blob = c.oa;
            k._sqlite3_column_bytes = c.pa;
            k._sqlite3_column_double = c.qa;
            k._sqlite3_bind_blob = c.ra;
            k._sqlite3_bind_double = c.sa;
            k._sqlite3_bind_int = c.ta;
            k._sqlite3_bind_text = c.ua;
            k._sqlite3_bind_parameter_index = c.va;
            k._sqlite3_sql = c.wa;
            k._sqlite3_normalized_sql = c.xa;
            k._sqlite3_changes = c.ya;
            k._sqlite3_close_v2 = c.za;
            k._sqlite3_create_function_v2 = c.Aa;
            k._sqlite3_update_hook = c.Ba;
            k._sqlite3_open = c.Ca;
            da = k._malloc = c.Da;
            ea = k._free = c.Ea;
            k._RegisterExtensionFunctions = c.Fa;
            Bb = c.Ga;
            Wc = c.Ha;
            sa = c.Ia;
            y = c.Ja;
            qa = c.Ka;
            Ma = c.M;
            Z = c.O;
            La();
            K--;
            k.monitorRunDependencies?.(K);
            0 == K && Xa && (c = Xa, Xa = null, c());
            return Zc;
          }
          K++;
          k.monitorRunDependencies?.(K);
          var b = { a: Xc };
          if (k.instantiateWasm) return new Promise((c) => {
            k.instantiateWasm(b, (d, e) => {
              c(a(d, e));
            });
          });
          Oa ??= k.locateFile ? k.locateFile("sql-wasm.wasm", Aa) : Aa + "sql-wasm.wasm";
          return a((await Ra(b)).instance);
        })();
        Yc();
        return Module;
      });
      return initSqlJsPromise;
    };
    if (typeof exports2 === "object" && typeof module2 === "object") {
      module2.exports = initSqlJs2;
      module2.exports.default = initSqlJs2;
    } else if (typeof define === "function" && define["amd"]) {
      define([], function() {
        return initSqlJs2;
      });
    } else if (typeof exports2 === "object") {
      exports2["Module"] = initSqlJs2;
    }
  }
});

// tools/probe-data-audit/sync-entry.ts
var sync_entry_exports = {};
__export(sync_entry_exports, {
  database: () => database_exports,
  sync: () => sync_exports
});
module.exports = __toCommonJS(sync_entry_exports);

// electron/main/sync.ts
var sync_exports = {};
__export(sync_exports, {
  getSyncStatus: () => getSyncStatus,
  run: () => run3,
  setSyncBroadcaster: () => setSyncBroadcaster
});

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

// electron/main/database.ts
var database_exports = {};
__export(database_exports, {
  all: () => all,
  clearAll: () => clearAll,
  clearCache: () => clearCache,
  closeDatabase: () => closeDatabase,
  databaseFilePath: () => databaseFilePath,
  exec: () => exec,
  flushNow: () => flushNow,
  get: () => get,
  initDatabase: () => initDatabase,
  run: () => run,
  transaction: () => transaction
});
var import_node_fs2 = __toESM(require("node:fs"));
var import_sql = __toESM(require_sql_wasm());

// src/database/schema.ts
var SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  steam_id          TEXT PRIMARY KEY,
  persona_name      TEXT NOT NULL,
  avatar_url        TEXT NOT NULL,
  profile_url       TEXT NOT NULL,
  country_code      TEXT NOT NULL,
  account_created_at INTEGER,
  last_logoff_at    INTEGER,
  persona_state     INTEGER NOT NULL DEFAULT 0,
  source            TEXT NOT NULL,
  synced_at         INTEGER
);

CREATE TABLE IF NOT EXISTS games (
  app_id                INTEGER PRIMARY KEY,
  name                  TEXT NOT NULL,
  header_image          TEXT NOT NULL,
  capsule_image         TEXT NOT NULL,
  genres                TEXT NOT NULL,
  tags                  TEXT NOT NULL,
  release_date          TEXT NOT NULL,
  developer             TEXT NOT NULL,
  publisher             TEXT NOT NULL,
  price_cents           INTEGER NOT NULL DEFAULT -1,
  original_price_cents  INTEGER NOT NULL DEFAULT -1,
  price_checked_at      INTEGER,
  is_historical_low      INTEGER NOT NULL DEFAULT 0,
  review_percent        INTEGER NOT NULL DEFAULT 0,
  review_count          INTEGER NOT NULL DEFAULT 0,
  playtime_forever_min   INTEGER NOT NULL DEFAULT 0,
  playtime_two_weeks_min INTEGER NOT NULL DEFAULT 0,
  first_played_at       INTEGER,
  last_played_at        INTEGER,
  achievements_total    INTEGER NOT NULL DEFAULT 0,
  achievements_unlocked INTEGER NOT NULL DEFAULT 0,
  rare_achievements     INTEGER NOT NULL DEFAULT 0,
  first_played_estimated INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS play_sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  steam_id    TEXT NOT NULL,
  app_id      INTEGER NOT NULL,
  play_date   TEXT NOT NULL,
  minutes     INTEGER NOT NULL,
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER NOT NULL,
  source      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON play_sessions (play_date);
CREATE INDEX IF NOT EXISTS idx_sessions_app ON play_sessions (app_id);

CREATE TABLE IF NOT EXISTS achievements (
  app_id       INTEGER NOT NULL,
  api_name     TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description  TEXT NOT NULL,
  icon_url     TEXT NOT NULL,
  icon_gray_url TEXT NOT NULL,
  unlocked     INTEGER NOT NULL DEFAULT 0,
  unlocked_at  INTEGER,
  global_percent REAL NOT NULL DEFAULT 0,
  is_rare      INTEGER NOT NULL DEFAULT 0,
  hidden       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (app_id, api_name)
);

CREATE TABLE IF NOT EXISTS wishlist (
  app_id             INTEGER NOT NULL,
  steam_id           TEXT NOT NULL,
  name               TEXT NOT NULL,
  header_image       TEXT NOT NULL,
  added_at           INTEGER NOT NULL,
  priority           INTEGER NOT NULL DEFAULT 1,
  tags               TEXT NOT NULL,
  original_price_cents INTEGER NOT NULL DEFAULT -1,
  final_price_cents  INTEGER NOT NULL DEFAULT -1,
  discount_percent   INTEGER NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'CNY',
  is_historical_low   INTEGER NOT NULL DEFAULT 0,
  historical_low_cents INTEGER NOT NULL DEFAULT -1,
  historical_low_at  INTEGER,
  review_percent     INTEGER NOT NULL DEFAULT 0,
  review_count       INTEGER NOT NULL DEFAULT 0,
  release_date       TEXT NOT NULL,
  notified_at        INTEGER,
  PRIMARY KEY (app_id, steam_id)
);

CREATE TABLE IF NOT EXISTS discounts (
  app_id              INTEGER NOT NULL,
  category            TEXT NOT NULL,
  name                TEXT NOT NULL,
  header_image        TEXT NOT NULL,
  original_price_cents INTEGER NOT NULL DEFAULT -1,
  final_price_cents   INTEGER NOT NULL DEFAULT -1,
  discount_percent    INTEGER NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'CNY',
  is_historical_low    INTEGER NOT NULL DEFAULT 0,
  historical_low_cents INTEGER NOT NULL DEFAULT -1,
  review_percent      INTEGER NOT NULL DEFAULT 0,
  review_count       INTEGER NOT NULL DEFAULT 0,
  tags                TEXT NOT NULL,
  release_date        TEXT NOT NULL,
  store_url           TEXT NOT NULL,
  ends_at             INTEGER,
  fetched_at          INTEGER NOT NULL,
  PRIMARY KEY (app_id, category)
);

CREATE TABLE IF NOT EXISTS price_history (
  app_id               INTEGER NOT NULL,
  captured_at          INTEGER NOT NULL,
  price_cents          INTEGER NOT NULL DEFAULT -1,
  original_price_cents INTEGER NOT NULL DEFAULT -1,
  discount_percent     INTEGER NOT NULL DEFAULT 0,
  is_historical_low     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (app_id, captured_at)
);

CREATE TABLE IF NOT EXISTS reports (
  year              INTEGER PRIMARY KEY,
  total_minutes     INTEGER NOT NULL DEFAULT 0,
  game_count        INTEGER NOT NULL DEFAULT 0,
  achievements_unlocked INTEGER NOT NULL DEFAULT 0,
  busiest_day       TEXT NOT NULL,
  longest_streak    INTEGER NOT NULL DEFAULT 0,
  top_games         TEXT NOT NULL,
  favorite_genre    TEXT NOT NULL,
  genres            TEXT NOT NULL,
  best_hour_range   TEXT NOT NULL,
  hour_distribution TEXT NOT NULL,
  monthly           TEXT NOT NULL,
  top_genre_games   TEXT NOT NULL,
  generated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshots (
  app_id           INTEGER NOT NULL,
  captured_at      INTEGER NOT NULL,
  playtime_minutes INTEGER NOT NULL,
  PRIMARY KEY (app_id, captured_at)
);
`;

// electron/main/database.ts
var SQL = null;
var db = null;
var flushTimer = null;
var dirty = false;
function normalizeParams(params) {
  if (!params) return void 0;
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    const key = k.startsWith("$") || k.startsWith(":") || k.startsWith("@") ? k : `$${k}`;
    out[key] = v === void 0 ? null : v;
  }
  return out;
}
async function initDatabase() {
  if (db) return;
  const wasmBinary = import_node_fs2.default.readFileSync(require.resolve("sql.js/dist/sql-wasm.wasm"));
  SQL = await (0, import_sql.default)({ wasmBinary });
  if (import_node_fs2.default.existsSync(dbPath)) {
    const bytes = import_node_fs2.default.readFileSync(dbPath);
    db = new SQL.Database(bytes);
  } else {
    db = new SQL.Database();
    db.run(SCHEMA_SQL);
    markDirty();
    flushNow();
  }
}
function ensure() {
  if (!db) throw new Error("\u6570\u636E\u5E93\u672A\u521D\u59CB\u5316");
  return db;
}
function markDirty() {
  dirty = true;
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushNow();
  }, 800);
  flushTimer.unref?.();
}
function exec(sql) {
  ensure().run(sql);
  markDirty();
}
function run(sql, params) {
  ensure().run(sql, normalizeParams(params));
  markDirty();
}
function all(sql, params) {
  const stmt = ensure().prepare(sql);
  const bind = normalizeParams(params);
  if (bind) stmt.bind(bind);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}
function get(sql, params) {
  const stmt = ensure().prepare(sql);
  const bind = normalizeParams(params);
  if (bind) stmt.bind(bind);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}
function transaction(fn) {
  const d = ensure();
  d.run("BEGIN");
  try {
    fn();
    d.run("COMMIT");
    markDirty();
  } catch (err) {
    d.run("ROLLBACK");
    throw err;
  }
}
function flushNow() {
  if (!db || !dirty) return;
  const bytes = db.export();
  import_node_fs2.default.writeFileSync(dbPath, Buffer.from(bytes));
  dirty = false;
}
function clearAll() {
  const names = ["users", "games", "play_sessions", "achievements", "wishlist", "discounts", "price_history", "reports", "snapshots"];
  transaction(() => {
    for (const n of names) run(`DELETE FROM ${n}`);
  });
  flushNow();
}
function clearCache() {
  const derived = ["play_sessions", "achievements", "wishlist", "discounts", "price_history", "reports", "snapshots"];
  let cleared = 0;
  transaction(() => {
    for (const n of derived) {
      const row = get(`SELECT COUNT(*) AS c FROM ${n}`);
      cleared += typeof row?.c === "number" ? row.c : 0;
      run(`DELETE FROM ${n}`);
    }
  });
  flushNow();
  return cleared;
}
function closeDatabase() {
  flushNow();
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  db?.close();
  db = null;
  SQL = null;
}
function databaseFilePath() {
  return dbPath;
}

// src/database/queries.ts
var SQL2 = {
  // ---- 基础读写 ----
  user: `SELECT * FROM users LIMIT 1`,
  games: `SELECT * FROM games ORDER BY playtime_forever_min DESC`,
  game: `SELECT * FROM games WHERE app_id = $appId`,
  sessions: `SELECT * FROM play_sessions
             WHERE ($steamId IS NULL OR steam_id = $steamId)
               AND ($appId IS NULL OR app_id = $appId)
             ORDER BY play_date DESC, started_at DESC`,
  achievements: `SELECT * FROM achievements
                WHERE ($appId IS NULL OR app_id = $appId)
                ORDER BY app_id, api_name`,
  wishlist: `SELECT * FROM wishlist ORDER BY added_at DESC`,
  discounts: `SELECT * FROM discounts
              WHERE ($category IS NULL OR category = $category)
              ORDER BY discount_percent DESC`,
  priceHistory: `SELECT * FROM price_history WHERE app_id = $appId ORDER BY captured_at ASC`,
  reports: `SELECT * FROM reports ORDER BY year DESC`,
  // ---- 真 SQL 聚合 ----
  // 每天总时长 + 会话数，用于热力图；按 play_date 分组。
  dayStats: `SELECT play_date AS date, SUM(minutes) AS minutes, COUNT(*) AS session_count
             FROM play_sessions
             GROUP BY play_date
             ORDER BY play_date ASC`,
  // 概览：用标量子查询一次性聚合（本周/今日/最近30天时长、会话数、游戏数、今日解锁成就数）。
  overview: `SELECT
               (SELECT COALESCE(SUM(minutes),0) FROM play_sessions WHERE play_date >= date('now','-7 days')) AS week_minutes,
               (SELECT COALESCE(SUM(minutes),0) FROM play_sessions WHERE play_date >= date('now','-30 days')) AS last30_minutes,
               (SELECT COALESCE(SUM(minutes),0) FROM play_sessions WHERE play_date = date('now')) AS today_minutes,
               (SELECT COUNT(*) FROM play_sessions) AS session_count,
               (SELECT COUNT(DISTINCT app_id) FROM play_sessions) AS game_count,
               (SELECT COUNT(*) FROM achievements WHERE unlocked = 1) AS achievements_unlocked,
               (SELECT COUNT(*) FROM achievements WHERE unlocked = 1 AND date(unlocked_at,'unixepoch') = date('now')) AS today_achievements`
};
var QUERY_MAP = {
  user: SQL2.user,
  games: SQL2.games,
  game: SQL2.game,
  sessions: SQL2.sessions,
  achievements: SQL2.achievements,
  wishlist: SQL2.wishlist,
  discounts: SQL2.discounts,
  priceHistory: SQL2.priceHistory,
  reports: SQL2.reports,
  dayStats: SQL2.dayStats,
  overview: SQL2.overview
};

// electron/main/repository.ts
var num = (v, d = 0) => typeof v === "number" ? v : d;
var str = (v, d = "") => typeof v === "string" ? v : d;
var optNum = (v) => typeof v === "number" ? v : null;
var bool = (v) => v === 1 || v === "1";
function parseArr(v) {
  if (typeof v !== "string" || !v) return [];
  try {
    const a = JSON.parse(v);
    return Array.isArray(a) ? a.map(String) : [];
  } catch {
    return [];
  }
}
function jsonOr(v, fallback) {
  if (typeof v !== "string" || !v) return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}
function rowToUser(r) {
  return {
    steamId: str(r.steam_id),
    personaName: str(r.persona_name),
    avatarUrl: str(r.avatar_url),
    profileUrl: str(r.profile_url),
    countryCode: str(r.country_code),
    accountCreatedAt: optNum(r.account_created_at),
    lastLogoffAt: optNum(r.last_logoff_at),
    personaState: num(r.persona_state),
    source: str(r.source, "demo"),
    syncedAt: optNum(r.synced_at)
  };
}
function rowToGame(r) {
  return {
    appId: num(r.app_id),
    name: str(r.name),
    headerImage: str(r.header_image),
    capsuleImage: str(r.capsule_image),
    genres: parseArr(r.genres),
    tags: parseArr(r.tags),
    releaseDate: str(r.release_date),
    developer: str(r.developer),
    publisher: str(r.publisher),
    priceCents: num(r.price_cents, -1),
    originalPriceCents: num(r.original_price_cents, -1),
    priceCheckedAt: optNum(r.price_checked_at),
    isHistoricalLow: bool(r.is_historical_low),
    reviewPercent: num(r.review_percent),
    reviewCount: num(r.review_count),
    playtimeForeverMin: num(r.playtime_forever_min),
    playtimeTwoWeeksMin: num(r.playtime_two_weeks_min),
    firstPlayedAt: optNum(r.first_played_at),
    lastPlayedAt: optNum(r.last_played_at),
    achievementsTotal: num(r.achievements_total),
    achievementsUnlocked: num(r.achievements_unlocked),
    rareAchievements: num(r.rare_achievements),
    firstPlayedEstimated: bool(r.first_played_estimated)
  };
}
function rowToSession(r) {
  return {
    id: num(r.id),
    steamId: str(r.steam_id),
    appId: num(r.app_id),
    playDate: str(r.play_date),
    minutes: num(r.minutes),
    startedAt: num(r.started_at),
    endedAt: num(r.ended_at),
    source: str(r.source, "demo")
  };
}
function rowToAchievement(r) {
  return {
    appId: num(r.app_id),
    apiName: str(r.api_name),
    displayName: str(r.display_name),
    description: str(r.description),
    iconUrl: str(r.icon_url),
    iconGrayUrl: str(r.icon_gray_url),
    unlocked: bool(r.unlocked),
    unlockedAt: optNum(r.unlocked_at),
    globalPercent: Number(r.global_percent ?? 0),
    isRare: bool(r.is_rare),
    hidden: bool(r.hidden)
  };
}
function rowToWishlist(r) {
  return {
    appId: num(r.app_id),
    steamId: str(r.steam_id),
    name: str(r.name),
    headerImage: str(r.header_image),
    addedAt: num(r.added_at),
    priority: num(r.priority),
    tags: parseArr(r.tags),
    originalPriceCents: num(r.original_price_cents, -1),
    finalPriceCents: num(r.final_price_cents, -1),
    discountPercent: num(r.discount_percent),
    currency: str(r.currency, "CNY"),
    isHistoricalLow: bool(r.is_historical_low),
    historicalLowCents: num(r.historical_low_cents, -1),
    historicalLowAt: optNum(r.historical_low_at),
    reviewPercent: num(r.review_percent),
    reviewCount: num(r.review_count),
    releaseDate: str(r.release_date),
    notifiedAt: optNum(r.notified_at)
  };
}
function rowToDiscount(r) {
  return {
    appId: num(r.app_id),
    name: str(r.name),
    headerImage: str(r.header_image),
    originalPriceCents: num(r.original_price_cents, -1),
    finalPriceCents: num(r.final_price_cents, -1),
    discountPercent: num(r.discount_percent),
    currency: str(r.currency, "CNY"),
    isHistoricalLow: bool(r.is_historical_low),
    historicalLowCents: num(r.historical_low_cents, -1),
    reviewPercent: num(r.review_percent),
    reviewCount: num(r.review_count),
    tags: parseArr(r.tags),
    releaseDate: str(r.release_date),
    storeUrl: str(r.store_url),
    category: str(r.category, "hot"),
    endsAt: optNum(r.ends_at),
    fetchedAt: num(r.fetched_at)
  };
}
function rowToPricePoint(r) {
  return {
    appId: num(r.app_id),
    capturedAt: num(r.captured_at),
    priceCents: num(r.price_cents, -1),
    originalPriceCents: num(r.original_price_cents, -1),
    discountPercent: num(r.discount_percent),
    isHistoricalLow: bool(r.is_historical_low)
  };
}
function rowToReport(r) {
  return {
    year: num(r.year),
    totalMinutes: num(r.total_minutes),
    gameCount: num(r.game_count),
    achievementsUnlocked: num(r.achievements_unlocked),
    busiestDay: jsonOr(r.busiest_day, null),
    longestStreak: num(r.longest_streak),
    topGames: jsonOr(r.top_games, []),
    favoriteGenre: jsonOr(r.favorite_genre, null),
    genres: jsonOr(r.genres, []),
    bestHourRange: jsonOr(r.best_hour_range, null),
    hourDistribution: jsonOr(r.hour_distribution, []),
    monthly: jsonOr(r.monthly, []),
    topGenreGames: jsonOr(r.top_genre_games, []),
    generatedAt: num(r.generated_at)
  };
}
function gameToRow(g) {
  return {
    app_id: g.appId,
    name: g.name,
    header_image: g.headerImage,
    capsule_image: g.capsuleImage,
    genres: JSON.stringify(g.genres),
    tags: JSON.stringify(g.tags),
    release_date: g.releaseDate,
    developer: g.developer,
    publisher: g.publisher,
    price_cents: g.priceCents,
    original_price_cents: g.originalPriceCents,
    price_checked_at: g.priceCheckedAt,
    is_historical_low: g.isHistoricalLow ? 1 : 0,
    review_percent: g.reviewPercent,
    review_count: g.reviewCount,
    playtime_forever_min: g.playtimeForeverMin,
    playtime_two_weeks_min: g.playtimeTwoWeeksMin,
    first_played_at: g.firstPlayedAt,
    last_played_at: g.lastPlayedAt,
    achievements_total: g.achievementsTotal,
    achievements_unlocked: g.achievementsUnlocked,
    rare_achievements: g.rareAchievements,
    first_played_estimated: g.firstPlayedEstimated ? 1 : 0
  };
}
function achievementToRow(a) {
  return {
    app_id: a.appId,
    api_name: a.apiName,
    display_name: a.displayName,
    description: a.description,
    icon_url: a.iconUrl,
    icon_gray_url: a.iconGrayUrl,
    unlocked: a.unlocked ? 1 : 0,
    unlocked_at: a.unlockedAt,
    global_percent: a.globalPercent,
    is_rare: a.isRare ? 1 : 0,
    hidden: a.hidden ? 1 : 0
  };
}
function wishlistToRow(w) {
  return {
    app_id: w.appId,
    steam_id: w.steamId,
    name: w.name,
    header_image: w.headerImage,
    added_at: w.addedAt,
    priority: w.priority,
    tags: JSON.stringify(w.tags),
    original_price_cents: w.originalPriceCents,
    final_price_cents: w.finalPriceCents,
    discount_percent: w.discountPercent,
    currency: w.currency,
    is_historical_low: w.isHistoricalLow ? 1 : 0,
    historical_low_cents: w.historicalLowCents,
    historical_low_at: w.historicalLowAt,
    review_percent: w.reviewPercent,
    review_count: w.reviewCount,
    release_date: w.releaseDate,
    notified_at: w.notifiedAt
  };
}
function discountToRow(d) {
  return {
    app_id: d.appId,
    category: d.category,
    name: d.name,
    header_image: d.headerImage,
    original_price_cents: d.originalPriceCents,
    final_price_cents: d.finalPriceCents,
    discount_percent: d.discountPercent,
    currency: d.currency,
    is_historical_low: d.isHistoricalLow ? 1 : 0,
    historical_low_cents: d.historicalLowCents,
    review_percent: d.reviewPercent,
    review_count: d.reviewCount,
    tags: JSON.stringify(d.tags),
    release_date: d.releaseDate,
    store_url: d.storeUrl,
    ends_at: d.endsAt,
    fetched_at: d.fetchedAt
  };
}
function priceToRow(p) {
  return {
    app_id: p.appId,
    captured_at: p.capturedAt,
    price_cents: p.priceCents,
    original_price_cents: p.originalPriceCents,
    discount_percent: p.discountPercent,
    is_historical_low: p.isHistoricalLow ? 1 : 0
  };
}
function sessionToRow(s) {
  return {
    steam_id: s.steamId,
    app_id: s.appId,
    play_date: s.playDate,
    minutes: s.minutes,
    started_at: s.startedAt,
    ended_at: s.endedAt,
    source: s.source
  };
}
function userToRow(u) {
  return {
    steam_id: u.steamId,
    persona_name: u.personaName,
    avatar_url: u.avatarUrl,
    profile_url: u.profileUrl,
    country_code: u.countryCode,
    account_created_at: u.accountCreatedAt,
    last_logoff_at: u.lastLogoffAt,
    persona_state: u.personaState,
    source: u.source,
    synced_at: u.syncedAt
  };
}
function upsert(table, pk, values) {
  const cols = Object.keys(values);
  const nonPk = cols.filter((c) => !pk.includes(c));
  const colList = cols.join(", ");
  const placeholders = cols.map((c) => `$${c}`).join(", ");
  const guard = (c) => {
    const v = values[c];
    if (v === null) return `${c}=COALESCE($${c}, ${c})`;
    if (typeof v === "string") {
      if (v === "") return `${c}=CASE WHEN $${c} <> '' THEN $${c} ELSE ${c} END`;
      if (v === "[]" || v === "{}") return `${c}=CASE WHEN $${c} NOT IN ('', '[]', '{}') THEN $${c} ELSE ${c} END`;
      return `${c}=$${c}`;
    }
    if (typeof v === "number" && v < 0) return `${c}=CASE WHEN $${c} >= 0 THEN $${c} ELSE ${c} END`;
    return `${c}=$${c}`;
  };
  const updates = nonPk.map(guard).join(", ");
  run(`INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT(${pk.join(",")}) DO UPDATE SET ${updates}`, values);
}
function saveGames(games) {
  transaction(() => games.forEach((g) => upsert("games", ["app_id"], gameToRow(g))));
}
function saveAchievements(list) {
  transaction(() => list.forEach((a) => upsert("achievements", ["app_id", "api_name"], achievementToRow(a))));
}
function saveWishlist(list) {
  transaction(() => list.forEach((w) => upsert("wishlist", ["app_id", "steam_id"], wishlistToRow(w))));
}
function saveDiscounts(list) {
  transaction(() => list.forEach((d) => upsert("discounts", ["app_id", "category"], discountToRow(d))));
}
function savePriceHistory(list) {
  transaction(() => list.forEach((p) => upsert("price_history", ["app_id", "captured_at"], priceToRow(p))));
}
function saveSessions(list) {
  transaction(() => list.forEach((s) => run(
    `INSERT INTO play_sessions (steam_id, app_id, play_date, minutes, started_at, ended_at, source) VALUES ($steam_id,$app_id,$play_date,$minutes,$started_at,$ended_at,$source)`,
    sessionToRow(s)
  )));
}
function saveUser(u) {
  upsert("users", ["steam_id"], userToRow(u));
}
function saveSnapshot(appId, capturedAt, playtime) {
  upsert("snapshots", ["app_id", "captured_at"], { app_id: appId, captured_at: capturedAt, playtime_minutes: playtime });
}
function lastSnapshot(appId) {
  const row = get(`SELECT playtime_minutes FROM snapshots WHERE app_id = $appId ORDER BY captured_at DESC LIMIT 1`, { app_id: appId });
  return row ? num(row.playtime_minutes) : null;
}
function priceLowest(appId) {
  const row = get(`SELECT MIN(price_cents) AS m FROM price_history WHERE app_id = $appId AND price_cents >= 0`, { app_id: appId });
  return row ? optNum(row.m) : null;
}
function loadSnapshot() {
  const u = get("SELECT * FROM users LIMIT 1");
  const count = (t) => num(get(`SELECT COUNT(*) AS c FROM ${t}`)?.c);
  const users = u ? [rowToUser(u)] : [];
  return {
    user: users[0] ?? null,
    games: all("SELECT * FROM games ORDER BY playtime_forever_min DESC").map(rowToGame),
    sessions: all("SELECT * FROM play_sessions ORDER BY play_date DESC").map(rowToSession),
    achievements: all("SELECT * FROM achievements").map(rowToAchievement),
    wishlist: all("SELECT * FROM wishlist").map(rowToWishlist),
    discounts: all("SELECT * FROM discounts").map(rowToDiscount),
    priceHistory: all("SELECT * FROM price_history ORDER BY captured_at").map(rowToPricePoint),
    reports: all("SELECT * FROM reports ORDER BY year DESC").map(rowToReport),
    counts: {
      users: count("users"),
      games: count("games"),
      sessions: count("play_sessions"),
      achievements: count("achievements"),
      wishlist: count("wishlist"),
      discounts: count("discounts"),
      priceHistory: count("price_history"),
      reports: count("reports"),
      snapshots: count("snapshots")
    },
    loadedAt: Date.now()
  };
}

// electron/main/steam-detect.ts
var import_node_child_process = require("node:child_process");
var import_node_fs3 = __toESM(require("node:fs"));
var import_node_path2 = __toESM(require("node:path"));

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
async function proxyLabel(url) {
  if (!import_electron3.app.isReady()) return "\u672A\u77E5";
  try {
    const raw = await import_electron3.session.defaultSession.resolveProxy(url);
    const first = raw.split(";")[0].trim();
    if (!first || /^DIRECT$/i.test(first)) return "\u76F4\u8FDE";
    const mt = first.match(/^(PROXY|HTTPS|SOCKS5?|SOCKS4)\s+(\S+)$/i);
    return mt ? mt[2] : first;
  } catch {
    return "\u672A\u77E5";
  }
}

// electron/main/steam-detect.ts
var STEAM_ID64_BASE = 76561197960265728n;
var API_INFO = "https://api.steampowered.com/ISteamWebAPIUtil/GetServerInfo/v1/";
var STORE_APP = "https://store.steampowered.com/api/appdetails?appids=730&cc=cn";
function run2(cmd, timeoutMs = 5e3) {
  return new Promise((resolve) => {
    (0, import_node_child_process.exec)(cmd, { timeout: timeoutMs, windowsHide: true }, (err, stdout) => {
      resolve(err ? "" : stdout.toString());
    });
  });
}
function parseVdf(text) {
  const re = /"([^"]*)"|([{}])/g;
  const root = {};
  const stack = [root];
  let key = null;
  let m;
  while (m = re.exec(text)) {
    if (m[2] === "{") {
      const obj = {};
      if (key !== null) {
        stack[stack.length - 1][key] = obj;
        stack.push(obj);
        key = null;
      }
    } else if (m[2] === "}") {
      stack.pop();
      key = null;
    } else {
      const val = m[1];
      if (key === null) key = val;
      else {
        stack[stack.length - 1][key] = val;
        key = null;
      }
    }
  }
  return root;
}
function parseRegValues(out) {
  const map = {};
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/^\s+(\S.*?)\s+(REG_[A-Z_]+)\s+(.*?)\s*$/);
    if (m) map[m[1].trim()] = m[3];
  }
  return map;
}
function hexOrNum(v) {
  if (!v) return null;
  const n = /^0x/i.test(v) ? Number.parseInt(v.slice(2), 16) : Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
var EMPTY_REG = { steamPath: null, autoLoginUser: null, activeUser: null, activePid: null, steamExe: null };
async function readRegistry() {
  const out = { ...EMPTY_REG };
  const base = parseRegValues(await run2('reg query "HKCU\\Software\\Valve\\Steam"'));
  out.steamPath = base.SteamPath ?? null;
  out.autoLoginUser = base.AutoLoginUser ?? null;
  out.steamExe = base.SteamExe ?? null;
  const active = parseRegValues(await run2('reg query "HKCU\\Software\\Valve\\Steam\\ActiveProcess"'));
  out.activeUser = hexOrNum(active.ActiveUser);
  out.activePid = hexOrNum(active.pid);
  if (!out.steamPath) {
    out.steamPath = parseRegValues(await run2('reg query "HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v InstallPath')).InstallPath ?? null;
  }
  return out;
}
function steamId3To64(accountId) {
  if (accountId === null || !Number.isInteger(accountId) || accountId <= 0) return null;
  return (STEAM_ID64_BASE + BigInt(accountId)).toString();
}
function parseLibraryFolders(steamPath) {
  const file = import_node_path2.default.join(steamPath, "steamapps", "libraryfolders.vdf");
  if (!import_node_fs3.default.existsSync(file)) return [];
  try {
    const text = import_node_fs3.default.readFileSync(file, "utf8");
    const paths = [...text.matchAll(/"path"\s*"([^"]+)"/g)].map((x) => x[1].replace(/\\\\/g, "\\"));
    return Array.from(new Set(paths));
  } catch {
    return [];
  }
}
async function findPid() {
  const out = await run2('tasklist /FI "IMAGENAME eq steam.exe" /FO CSV /NH', 5e3);
  const mt = out.match(/"steam\.exe","(\d+)"/i);
  return mt ? Number(mt[1]) : null;
}
function readLoginUsers(steamPath) {
  const file = import_node_path2.default.join(steamPath, "config", "loginusers.vdf");
  if (!import_node_fs3.default.existsSync(file)) return [];
  try {
    const root = parseVdf(import_node_fs3.default.readFileSync(file, "utf8"));
    const users = root.users ?? root.Users ?? {};
    const out = [];
    for (const [steamId, block] of Object.entries(users)) {
      if (!block || typeof block !== "object" || !/^\d{17}$/.test(steamId)) continue;
      out.push({
        steamId,
        account: block.AccountName ?? null,
        persona: block.PersonaName ?? null,
        autoLogin: block.AutoLogin === "1",
        timestamp: Number(block.Timestamp ?? 0) || 0,
        mostRecent: block.MostRecent === "1"
      });
    }
    return out;
  } catch {
    return [];
  }
}
function resolveLocalAccount(reg, users, steamPid) {
  const activeFresh = reg.activePid === null || steamPid === null || reg.activePid === steamPid;
  const activeId = steamPid !== null && activeFresh ? steamId3To64(reg.activeUser) : null;
  const byActive = activeId ? users.find((u) => u.steamId === activeId) ?? null : null;
  const sorted = [...users].sort((a, b) => Number(b.mostRecent) - Number(a.mostRecent) || b.timestamp - a.timestamp);
  const who = byActive ?? users.find((u) => u.account === reg.autoLoginUser) ?? sorted[0] ?? null;
  return { loggedIn: !!byActive, who };
}
async function probeApi() {
  const started = Date.now();
  const r = await fetchText(API_INFO, { timeoutMs: 8e3 });
  const ms = Date.now() - started;
  if (r.ok && r.status === 200 && r.body.includes("servertime")) return { ok: true, ms, detail: `HTTP 200 \xB7 ${ms}ms` };
  return { ok: false, ms, detail: r.error ?? `HTTP ${r.status ?? "\u2014"}\uFF08\u54CD\u5E94\u91CC\u6CA1\u6709 servertime\uFF09` };
}
async function probeStore() {
  const started = Date.now();
  const r = await fetchText(STORE_APP, { timeoutMs: 8e3 });
  const ms = Date.now() - started;
  if (r.ok && r.status === 200 && /"?success"?\s*:\s*true/.test(r.body)) return { ok: true, ms, detail: `HTTP 200 \xB7 ${ms}ms` };
  return { ok: false, ms, detail: r.error ?? `HTTP ${r.status ?? "\u2014"}\uFF08\u54CD\u5E94\u4E0D\u662F appdetails\uFF09` };
}
async function detectSteam() {
  const notes = [];
  const reg = await readRegistry().catch(() => ({ ...EMPTY_REG }));
  const installPath = reg.steamPath;
  const installed = !!installPath;
  notes.push(installed ? `\u5DF2\u5B89\u88C5 Steam\uFF1A${installPath}` : "\u672A\u68C0\u6D4B\u5230 Steam \u5B89\u88C5\uFF08\u6CE8\u518C\u8868\u65E0 SteamPath / InstallPath\uFF09");
  const libraryPaths = installed && installPath ? parseLibraryFolders(installPath) : [];
  if (installed) notes.push(libraryPaths.length ? `\u53D1\u73B0 ${libraryPaths.length} \u4E2A\u6E38\u620F\u5E93\u76EE\u5F55` : "\u672A\u89E3\u6790\u5230\u6E38\u620F\u5E93\u76EE\u5F55");
  const steamPid = await findPid().catch(() => null);
  const running = steamPid !== null;
  notes.push(running ? `Steam \u6B63\u5728\u8FD0\u884C\uFF08PID ${steamPid}\uFF09` : "Steam \u5F53\u524D\u672A\u8FD0\u884C");
  const users = installed && installPath ? readLoginUsers(installPath) : [];
  const recentAccounts = users.map((u) => u.account).filter((a) => !!a);
  const { loggedIn, who } = resolveLocalAccount(reg, users, steamPid);
  const lastLoginSteamId = who?.steamId ?? null;
  const lastLoginAccount = who?.account ?? reg.autoLoginUser ?? null;
  const lastLoginPersona = who?.persona ?? null;
  if (loggedIn) notes.push(`\u5DF2\u767B\u5F55\u8D26\u53F7\uFF1A${lastLoginPersona ?? lastLoginAccount}\uFF08${lastLoginAccount}\uFF09`);
  else if (running) notes.push("Steam \u6B63\u5728\u8FD0\u884C\uFF0C\u4F46\u5F53\u524D\u505C\u5728\u767B\u5F55\u754C\u9762\uFF08\u6CE8\u518C\u8868 ActiveUser \u4E3A 0\uFF09");
  else if (who) notes.push(`Steam \u672A\u8FD0\u884C\uFF1B\u672C\u673A\u8BB0\u4F4F\u7684\u8D26\u53F7\uFF1A${lastLoginAccount ?? who.steamId}`);
  else notes.push("\u672A\u68C0\u6D4B\u5230\u5DF2\u767B\u5F55\u8D26\u53F7");
  const [api, store, proxy] = await Promise.all([probeApi(), probeStore(), proxyLabel(API_INFO)]);
  const via = proxy === "\u76F4\u8FDE" ? "\u76F4\u8FDE" : `\u7ECF\u4EE3\u7406 ${proxy}`;
  notes.push(api.ok ? `Steam Web API \u53EF\u8FBE\uFF08${api.detail}\uFF0C${via}\uFF09` : `Steam Web API \u4E0D\u53EF\u8FBE\uFF1A${api.detail}`);
  notes.push(store.ok ? `Steam \u5546\u5E97\u53EF\u8FBE\uFF08${store.detail}\uFF0C${via}\uFF09` : `Steam \u5546\u5E97\u4E0D\u53EF\u8FBE\uFF1A${store.detail}`);
  const networkDetail = api.ok ? `API ${api.detail} \xB7 \u5546\u5E97 ${store.detail} \xB7 ${via}` : `API \u4E0D\u53EF\u8FBE\uFF1A${api.detail} \xB7 \u5546\u5E97${store.ok ? "\u53EF\u8FBE" : "\u4E0D\u53EF\u8FBE"} \xB7 ${via}`;
  return {
    installed,
    installPath,
    libraryPaths,
    running,
    steamPid,
    loggedIn,
    lastLoginAccount,
    lastLoginPersona,
    lastLoginSteamId,
    recentAccounts,
    apiReachable: api.ok,
    storeReachable: store.ok,
    apiLatencyMs: api.ok ? api.ms : null,
    networkDetail,
    checkedAt: Date.now(),
    notes
  };
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
async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let idx = 0;
  async function next() {
    while (idx < items.length) {
      const cur = idx++;
      out[cur] = await worker(items[cur], cur);
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(runners);
  return out;
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
var import_node_url = require("node:url");
var API_BASE = "https://api.steampowered.com";
function apiUrl(path3, params) {
  const key = getSettings().steamApiKey;
  if (!key) throw new Error("\u7F3A\u5C11 Steam API Key\uFF0C\u65E0\u6CD5\u8C03\u7528 Web API");
  const q = new import_node_url.URLSearchParams({ key, ...params });
  return `${API_BASE}${path3}?${q.toString()}`;
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

// electron/main/notifications.ts
var import_electron4 = require("electron");

// electron/shared/channels.ts
var CH = {
  // ---- 应用信息 ----
  appInfo: "app:info",
  openExternal: "app:open-external",
  // ---- Steam 智能检测 ----
  steamDetect: "steam:detect",
  steamLaunch: "steam:launch",
  // ---- 登录 ----
  authOpenIdStart: "auth:openid-start",
  authOpenIdStatus: "auth:openid-status",
  authLogout: "auth:logout",
  authRestore: "auth:restore",
  // ---- 数据库 / 同步 ----
  dbQuery: "db:query",
  dbExport: "db:export",
  dbClearCache: "db:clear-cache",
  dbLoadSnapshot: "db:load-snapshot",
  syncRun: "sync:run",
  syncStatus: "sync:status",
  syncMessage: "sync:message",
  // ---- 设置 ----
  settingsGet: "settings:get",
  settingsSet: "settings:set",
  // ---- 通知 ----
  notify: "notify:notify",
  notifyClicked: "notify:clicked",
  // ---- 导出 ----
  exportWrapped: "export:wrapped",
  exportTable: "export:table",
  // ---- 窗口 ----
  windowMinimize: "window:minimize",
  windowMaximize: "window:maximize",
  windowClose: "window:close",
  windowIsMaximized: "window:is-maximized",
  windowMaximizedChanged: "window:maximized-changed",
  // ---- 导航（通知点击后跳转）----
  navigate: "nav:navigate"
};

// electron/main/notifications.ts
var mainWin = null;
function onNotifyClick(route) {
  if (!mainWin) return;
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show();
  if (route) mainWin.webContents.send(CH.navigate, { route });
}
function notify(payload) {
  try {
    if (!import_electron4.Notification.isSupported()) return Promise.resolve({ ok: false });
    const n = new import_electron4.Notification({ title: payload.title, body: payload.body, silent: false });
    n.on("click", () => onNotifyClick(payload.route));
    n.show();
    return Promise.resolve({ ok: true });
  } catch {
    return Promise.resolve({ ok: false });
  }
}

// src/services/mock/catalog.ts
var CATALOG = [
  { appId: 730, name: "Counter-Strike 2", genres: ["FPS"], tags: ["\u5C04\u51FB", "\u7ADE\u6280", "\u56E2\u961F"], releaseDate: "2023-09-27", developer: "Valve", publisher: "Valve", reviewPercent: 82, reviewCount: 215e4, basePriceCents: 0, baseOriginalPriceCents: 0 },
  { appId: 570, name: "Dota 2", genres: ["\u7B56\u7565"], tags: ["MOBA", "\u7ADE\u6280", "\u56E2\u961F"], releaseDate: "2013-07-09", developer: "Valve", publisher: "Valve", reviewPercent: 88, reviewCount: 158e4, basePriceCents: 0, baseOriginalPriceCents: 0 },
  { appId: 440, name: "Team Fortress 2", genres: ["FPS"], tags: ["\u5C04\u51FB", "\u641E\u7B11", "\u56E2\u961F"], releaseDate: "2007-10-10", developer: "Valve", publisher: "Valve", reviewPercent: 93, reviewCount: 72e4, basePriceCents: 0, baseOriginalPriceCents: 0 },
  { appId: 620, name: "Portal 2", genres: ["\u5192\u9669"], tags: ["\u89E3\u8C1C", "\u5408\u4F5C", "\u79D1\u5E7B"], releaseDate: "2011-04-19", developer: "Valve", publisher: "Valve", reviewPercent: 98, reviewCount: 198e3, basePriceCents: 3700, baseOriginalPriceCents: 3700 },
  { appId: 4e3, name: "Garry's Mod", genres: ["\u6A21\u62DF"], tags: ["\u6C99\u76D2", "\u7269\u7406", "\u521B\u610F"], releaseDate: "2006-11-29", developer: "Facepunch", publisher: "Valve", reviewPercent: 96, reviewCount: 41e4, basePriceCents: 1800, baseOriginalPriceCents: 1800 },
  { appId: 218620, name: "Left 4 Dead 2", genres: ["FPS"], tags: ["\u6050\u6016", "\u5408\u4F5C", "\u4E27\u5C38"], releaseDate: "2009-11-17", developer: "Valve", publisher: "Valve", reviewPercent: 97, reviewCount: 365e3, basePriceCents: 3700, baseOriginalPriceCents: 3700 },
  { appId: 252950, name: "Rocket League", genres: ["\u4F53\u80B2"], tags: ["\u7ADE\u901F", "\u8DB3\u7403", "\u7ADE\u6280"], releaseDate: "2015-07-07", developer: "Psyonix", publisher: "Psyonix", reviewPercent: 94, reviewCount: 88e4, basePriceCents: 0, baseOriginalPriceCents: 0 },
  { appId: 22380, name: "Fallout: New Vegas", genres: ["RPG"], tags: ["\u5E9F\u571F", "\u5F00\u653E\u4E16\u754C", "\u5267\u60C5"], releaseDate: "2010-10-19", developer: "Obsidian", publisher: "Bethesda", reviewPercent: 94, reviewCount: 24e4, basePriceCents: 4900, baseOriginalPriceCents: 4900 },
  { appId: 8930, name: "Sid Meier\u2019s Civilization V", genres: ["\u7B56\u7565"], tags: ["\u56DE\u5408\u5236", "\u5386\u53F2", "4X"], releaseDate: "2010-09-21", developer: "Firaxis", publisher: "2K", reviewPercent: 96, reviewCount: 145e3, basePriceCents: 9900, baseOriginalPriceCents: 9900 },
  { appId: 289070, name: "Sid Meier\u2019s Civilization VI", genres: ["\u7B56\u7565"], tags: ["\u56DE\u5408\u5236", "\u5386\u53F2", "4X"], releaseDate: "2016-10-21", developer: "Firaxis", publisher: "2K", reviewPercent: 84, reviewCount: 198e3, basePriceCents: 19900, baseOriginalPriceCents: 19900 },
  { appId: 346110, name: "ARK: Survival Evolved", genres: ["\u52A8\u4F5C"], tags: ["\u751F\u5B58", "\u5F00\u653E\u4E16\u754C", "\u6050\u9F99"], releaseDate: "2017-08-29", developer: "Studio Wildcard", publisher: "Studio Wildcard", reviewPercent: 68, reviewCount: 41e4, basePriceCents: 9900, baseOriginalPriceCents: 9900 },
  { appId: 374320, name: "DARK SOULS III", genres: ["\u52A8\u4F5C"], tags: ["\u786C\u6838", "\u9B42\u7CFB\u5217", "\u5947\u5E7B"], releaseDate: "2016-04-12", developer: "FromSoftware", publisher: "Bandai Namco", reviewPercent: 92, reviewCount: 24e4, basePriceCents: 29800, baseOriginalPriceCents: 29800 },
  { appId: 335300, name: "Dark Souls II", genres: ["\u52A8\u4F5C"], tags: ["\u786C\u6838", "\u9B42\u7CFB\u5217", "\u5947\u5E7B"], releaseDate: "2014-04-15", developer: "FromSoftware", publisher: "Bandai Namco", reviewPercent: 89, reviewCount: 11e4, basePriceCents: 19800, baseOriginalPriceCents: 19800 },
  { appId: 578080, name: "PUBG: BATTLEGROUNDS", genres: ["FPS"], tags: ["\u5927\u9003\u6740", "\u7ADE\u6280", "\u5C04\u51FB"], releaseDate: "2017-12-21", developer: "PUBG Corp", publisher: "KRAFTON", reviewPercent: 49, reviewCount: 19e5, basePriceCents: 9800, baseOriginalPriceCents: 9800 },
  { appId: 1174180, name: "Red Dead Redemption 2", genres: ["\u5192\u9669"], tags: ["\u5F00\u653E\u4E16\u754C", "\u897F\u90E8", "\u5267\u60C5"], releaseDate: "2019-11-05", developer: "Rockstar", publisher: "Rockstar", reviewPercent: 91, reviewCount: 51e4, basePriceCents: 13900, baseOriginalPriceCents: 13900 },
  { appId: 271590, name: "Grand Theft Auto V", genres: ["\u52A8\u4F5C"], tags: ["\u5F00\u653E\u4E16\u754C", "\u72AF\u7F6A", "\u9A7E\u9A76"], releaseDate: "2015-04-14", developer: "Rockstar", publisher: "Rockstar", reviewPercent: 85, reviewCount: 62e4, basePriceCents: 11900, baseOriginalPriceCents: 11900 },
  { appId: 252490, name: "Rust", genres: ["\u52A8\u4F5C"], tags: ["\u751F\u5B58", "\u591A\u4EBA", "\u5EFA\u9020"], releaseDate: "2018-02-08", developer: "Facepunch", publisher: "Facepunch", reviewPercent: 78, reviewCount: 69e4, basePriceCents: 7e3, baseOriginalPriceCents: 7e3 },
  { appId: 381210, name: "Dead by Daylight", genres: ["\u52A8\u4F5C"], tags: ["\u6050\u6016", "\u975E\u5BF9\u79F0", "\u591A\u4EBA"], releaseDate: "2016-06-14", developer: "Behaviour", publisher: "Behaviour", reviewPercent: 81, reviewCount: 48e4, basePriceCents: 3700, baseOriginalPriceCents: 3700 },
  { appId: 322330, name: "Don\u2019t Starve Together", genres: ["\u6A21\u62DF"], tags: ["\u751F\u5B58", "\u5408\u4F5C", "\u72EC\u7ACB"], releaseDate: "2016-04-21", developer: "Klei", publisher: "Klei", reviewPercent: 95, reviewCount: 215e3, basePriceCents: 2400, baseOriginalPriceCents: 2400 },
  { appId: 945360, name: "Among Us", genres: ["\u72EC\u7ACB"], tags: ["\u793E\u4EA4\u63A8\u7406", "\u591A\u4EBA", "\u4F11\u95F2"], releaseDate: "2018-11-16", developer: "Innersloth", publisher: "Innersloth", reviewPercent: 92, reviewCount: 98e4, basePriceCents: 1800, baseOriginalPriceCents: 1800 },
  { appId: 739630, name: "Phasmophobia", genres: ["\u72EC\u7ACB"], tags: ["\u6050\u6016", "\u5408\u4F5C", "VR"], releaseDate: "2020-10-29", developer: "Kinetic", publisher: "Kinetic", reviewPercent: 95, reviewCount: 42e4, basePriceCents: 5600, baseOriginalPriceCents: 5600 },
  { appId: 632360, name: "Risk of Rain 2", genres: ["\u52A8\u4F5C"], tags: ["Roguelike", "\u5408\u4F5C", "\u5C04\u51FB"], releaseDate: "2020-08-11", developer: "Hopoo", publisher: "Gearbox", reviewPercent: 94, reviewCount: 145e3, basePriceCents: 5600, baseOriginalPriceCents: 5600 },
  { appId: 646570, name: "Slay the Spire", genres: ["\u7B56\u7565"], tags: ["\u5361\u724C", "Roguelike", "\u56DE\u5408\u5236"], releaseDate: "2019-01-23", developer: "MegaCrit", publisher: "MegaCrit", reviewPercent: 97, reviewCount: 145e3, basePriceCents: 5600, baseOriginalPriceCents: 5600 },
  { appId: 588650, name: "Dead Cells", genres: ["\u72EC\u7ACB"], tags: ["Roguelike", "\u5E73\u53F0", "\u52A8\u4F5C"], releaseDate: "2018-08-07", developer: "Motion Twin", publisher: "Motion Twin", reviewPercent: 97, reviewCount: 165e3, basePriceCents: 4800, baseOriginalPriceCents: 4800 },
  { appId: 1063730, name: "New World", genres: ["\u6A21\u62DF"], tags: ["MMO", "\u5F00\u653E\u4E16\u754C", "\u751F\u5B58"], releaseDate: "2021-09-28", developer: "Amazon", publisher: "Amazon", reviewPercent: 58, reviewCount: 26e4, basePriceCents: 9900, baseOriginalPriceCents: 9900 },
  { appId: 1599340, name: "Lost Ark", genres: ["\u6A21\u62DF"], tags: ["MMO", "\u52A8\u4F5C", "RPG"], releaseDate: "2022-02-11", developer: "Smilegate", publisher: "Amazon", reviewPercent: 72, reviewCount: 32e4, basePriceCents: 0, baseOriginalPriceCents: 0 },
  { appId: 413150, name: "Stardew Valley", genres: ["\u6A21\u62DF"], tags: ["\u519C\u573A", "\u6CBB\u6108", "\u50CF\u7D20"], releaseDate: "2016-02-26", developer: "ConcernedApe", publisher: "ConcernedApe", reviewPercent: 98, reviewCount: 38e4, basePriceCents: 3600, baseOriginalPriceCents: 3600 },
  { appId: 105600, name: "Terraria", genres: ["\u72EC\u7ACB"], tags: ["\u6C99\u76D2", "\u63A2\u7D22", "\u5EFA\u9020"], releaseDate: "2011-05-16", developer: "Re-Logic", publisher: "Re-Logic", reviewPercent: 98, reviewCount: 54e4, basePriceCents: 3600, baseOriginalPriceCents: 3600 },
  { appId: 367520, name: "Hollow Knight", genres: ["\u72EC\u7ACB"], tags: ["\u94F6\u6CB3\u6076\u9B54\u57CE", "\u63A2\u7D22", "\u786C\u6838"], releaseDate: "2017-02-24", developer: "Team Cherry", publisher: "Team Cherry", reviewPercent: 98, reviewCount: 215e3, basePriceCents: 4800, baseOriginalPriceCents: 4800 },
  { appId: 1145360, name: "Hades", genres: ["\u72EC\u7ACB"], tags: ["Roguelike", "\u52A8\u4F5C", "\u795E\u8BDD"], releaseDate: "2020-09-17", developer: "Supergiant", publisher: "Supergiant", reviewPercent: 98, reviewCount: 195e3, basePriceCents: 5600, baseOriginalPriceCents: 5600 },
  { appId: 1086940, name: "Baldur\u2019s Gate 3", genres: ["RPG"], tags: ["CRPG", "\u56DE\u5408\u5236", "\u5267\u60C5"], releaseDate: "2023-08-03", developer: "Larian", publisher: "Larian", reviewPercent: 96, reviewCount: 61e4, basePriceCents: 29800, baseOriginalPriceCents: 29800 },
  { appId: 292030, name: "The Witcher 3: Wild Hunt", genres: ["RPG"], tags: ["\u5F00\u653E\u4E16\u754C", "\u5267\u60C5", "\u5947\u5E7B"], releaseDate: "2015-05-19", developer: "CD Projekt", publisher: "CD Projekt", reviewPercent: 97, reviewCount: 69e4, basePriceCents: 12700, baseOriginalPriceCents: 12700 },
  { appId: 1091500, name: "Cyberpunk 2077", genres: ["RPG"], tags: ["\u5F00\u653E\u4E16\u754C", "\u79D1\u5E7B", "\u5267\u60C5"], releaseDate: "2020-12-10", developer: "CD Projekt", publisher: "CD Projekt", reviewPercent: 84, reviewCount: 54e4, basePriceCents: 29800, baseOriginalPriceCents: 29800 },
  { appId: 1245620, name: "ELDEN RING", genres: ["RPG"], tags: ["\u9B42\u7CFB\u5217", "\u5F00\u653E\u4E16\u754C", "\u5947\u5E7B"], releaseDate: "2022-02-25", developer: "FromSoftware", publisher: "Bandai Namco", reviewPercent: 94, reviewCount: 62e4, basePriceCents: 29800, baseOriginalPriceCents: 29800 },
  { appId: 489830, name: "The Elder Scrolls V: Skyrim Special Edition", genres: ["RPG"], tags: ["\u5F00\u653E\u4E16\u754C", "\u5947\u5E7B", "mod"], releaseDate: "2016-10-28", developer: "Bethesda", publisher: "Bethesda", reviewPercent: 93, reviewCount: 33e4, basePriceCents: 8500, baseOriginalPriceCents: 8500 },
  { appId: 377160, name: "Fallout 4", genres: ["RPG"], tags: ["\u5E9F\u571F", "\u5F00\u653E\u4E16\u754C", "\u5C04\u51FB"], releaseDate: "2015-11-10", developer: "Bethesda", publisher: "Bethesda", reviewPercent: 82, reviewCount: 27e4, basePriceCents: 9900, baseOriginalPriceCents: 9900 },
  { appId: 814380, name: "Sekiro: Shadows Die Twice", genres: ["\u52A8\u4F5C"], tags: ["\u786C\u6838", "\u5FCD\u8005", "\u9B42\u7CFB\u5217"], releaseDate: "2019-03-22", developer: "FromSoftware", publisher: "Activision", reviewPercent: 95, reviewCount: 19e4, basePriceCents: 29800, baseOriginalPriceCents: 29800 },
  { appId: 1449850, name: "Monster Hunter Rise", genres: ["\u52A8\u4F5C"], tags: ["\u72E9\u730E", "\u5171\u6597", "\u5F00\u653E\u4E16\u754C"], releaseDate: "2022-01-12", developer: "Capcom", publisher: "Capcom", reviewPercent: 90, reviewCount: 13e4, basePriceCents: 20900, baseOriginalPriceCents: 20900 },
  { appId: 582010, name: "Monster Hunter: World", genres: ["\u52A8\u4F5C"], tags: ["\u72E9\u730E", "\u5171\u6597", "\u5F00\u653E\u4E16\u754C"], releaseDate: "2018-08-09", developer: "Capcom", publisher: "Capcom", reviewPercent: 91, reviewCount: 23e4, basePriceCents: 19900, baseOriginalPriceCents: 19900 },
  { appId: 236390, name: "War Thunder", genres: ["\u6A21\u62DF"], tags: ["\u8F7D\u5177", "\u519B\u4E8B", "\u591A\u4EBA"], releaseDate: "2013-12-21", developer: "Gaijin", publisher: "Gaijin", reviewPercent: 86, reviewCount: 41e4, basePriceCents: 0, baseOriginalPriceCents: 0 },
  { appId: 70, name: "Half-Life", genres: ["\u5192\u9669"], tags: ["\u79D1\u5E7B", "\u5C04\u51FB", "\u5267\u60C5"], releaseDate: "1998-11-19", developer: "Valve", publisher: "Valve", reviewPercent: 97, reviewCount: 52e3, basePriceCents: 0, baseOriginalPriceCents: 0 },
  { appId: 220, name: "Half-Life 2", genres: ["\u5192\u9669"], tags: ["\u79D1\u5E7B", "\u5C04\u51FB", "\u5267\u60C5"], releaseDate: "2004-11-16", developer: "Valve", publisher: "Valve", reviewPercent: 98, reviewCount: 13e4, basePriceCents: 3700, baseOriginalPriceCents: 3700 }
];

// src/services/mock/seed.ts
var SEED = 20240926;
var DEMO_STEAM_ID = "76561198341973281";
var MS_DAY = 864e5;
var START_UTC = Date.UTC(2024, 0, 1);
var TODAY_UTC = Date.UTC(2026, 8, 26);
var TODAY_SEC = TODAY_UTC / 1e3;
var HOLIDAYS = /* @__PURE__ */ new Set(["2024-01-01", "2024-02-10", "2024-05-01", "2024-10-01", "2024-12-25", "2025-01-01", "2025-01-29", "2025-05-01", "2025-10-01", "2025-12-25", "2026-01-01", "2026-02-17", "2026-05-01", "2026-10-01", "2026-12-25"]);
function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var rng = mulberry32(SEED);
var rnd = () => rng();
var rint = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
var rfloat = (min, max) => min + rnd() * (max - min);
var pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// src/services/mock/pricing.ts
var headerUrl = (appId) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
function computeWishlist() {
  const out = [];
  const pool2 = CATALOG.map((_, i) => i);
  const idxs = [];
  for (let k = 0; k < 24 && pool2.length > 0; k++) {
    const j = Math.floor(rnd() * pool2.length);
    idxs.push(pool2[j]);
    pool2.splice(j, 1);
  }
  const discounted = idxs.slice(0, 10);
  const histLowSet = new Set(discounted.slice(0, 4));
  for (const i of idxs) {
    const c = CATALOG[i];
    const original = c.baseOriginalPriceCents > 0 ? c.baseOriginalPriceCents : c.basePriceCents;
    let finalP = original;
    let disc = 0;
    let isLow = false;
    let histLow = original;
    if (discounted.includes(i)) {
      disc = rint(10, 90);
      finalP = Math.round(original * (1 - disc / 100));
      isLow = histLowSet.has(i);
      histLow = isLow ? finalP : Math.round(finalP * rfloat(0.7, 0.95));
    }
    if (histLow > finalP) histLow = finalP;
    const added = TODAY_SEC - rint(30, 900) * 86400;
    const notified = rnd() < 0.12 ? TODAY_SEC - rint(1, 20) * 86400 : null;
    out.push({
      appId: c.appId,
      steamId: DEMO_STEAM_ID,
      name: c.name,
      headerImage: headerUrl(c.appId),
      addedAt: Math.round(added),
      priority: rint(1, 3),
      tags: c.tags,
      originalPriceCents: original,
      finalPriceCents: finalP,
      discountPercent: disc,
      currency: "CNY",
      isHistoricalLow: isLow,
      historicalLowCents: histLow,
      historicalLowAt: isLow ? Math.round(added - rint(10, 400) * 86400) : null,
      reviewPercent: c.reviewPercent,
      reviewCount: c.reviewCount,
      releaseDate: c.releaseDate,
      notifiedAt: notified
    });
  }
  return out;
}
function takeN(arr, n) {
  const pool2 = arr.slice();
  const out = [];
  for (let k = 0; k < n && pool2.length > 0; k++) {
    const j = Math.floor(rnd() * pool2.length);
    out.push(pool2[j]);
    pool2.splice(j, 1);
  }
  return out;
}
function computeDiscounts() {
  const out = [];
  const paid = CATALOG.filter((c) => c.baseOriginalPriceCents > 0);
  const cats = ["hot", "lowest", "toprated", "free"];
  for (let ci = 0; ci < 4; ci++) {
    const cat = cats[ci];
    for (const c of takeN(paid, 10)) {
      const original = c.baseOriginalPriceCents;
      let finalP = original;
      let disc = 0;
      let isLow = false;
      let rev = c.reviewPercent;
      if (cat === "free") {
        finalP = 0;
        disc = 100;
      } else {
        disc = rint(10, 90);
        finalP = Math.round(original * (1 - disc / 100));
        if (cat === "lowest") isLow = true;
        if (cat === "toprated") rev = Math.max(90, rint(90, 99));
      }
      out.push({
        appId: c.appId,
        name: c.name,
        headerImage: headerUrl(c.appId),
        originalPriceCents: original,
        finalPriceCents: finalP,
        discountPercent: disc,
        currency: "CNY",
        isHistoricalLow: isLow,
        historicalLowCents: isLow ? finalP : Math.round(finalP * rfloat(0.7, 0.95)),
        reviewPercent: rev,
        reviewCount: c.reviewCount,
        tags: c.tags,
        releaseDate: c.releaseDate,
        storeUrl: `https://store.steampowered.com/app/${c.appId}/`,
        category: cat,
        endsAt: Math.round(TODAY_SEC + rint(1, 14) * 86400),
        fetchedAt: Math.round(TODAY_SEC)
      });
    }
  }
  return out;
}
function computePriceHistory(appIds) {
  const out = [];
  const start = TODAY_SEC - 180 * 86400;
  for (const id of appIds) {
    const c = CATALOG.find((x) => x.appId === id);
    const base = c && c.baseOriginalPriceCents > 0 ? c.baseOriginalPriceCents : c ? c.basePriceCents : 0;
    const low = base > 0 ? Math.round(base * rfloat(0.4, 0.7)) : 0;
    const lowIdx = rint(0, 25);
    let prev = base;
    for (let k = 0; k <= 25; k++) {
      const cap = start + k * 7 * 86400;
      let price;
      if (k === lowIdx) price = low;
      else {
        const drift = (rnd() - 0.5) * base * 0.1;
        price = Math.round(Math.max(low, Math.min(base, prev + drift)));
        price = Math.round(price / 100) * 100;
      }
      const disc = base > 0 ? Math.round((1 - price / base) * 100) : 0;
      out.push({ appId: id, capturedAt: Math.round(cap), priceCents: price, originalPriceCents: base, discountPercent: disc, isHistoricalLow: price === low });
      prev = price;
    }
  }
  return out;
}
function buildDemoWishlist() {
  return computeWishlist();
}
function buildDemoDiscounts() {
  return computeDiscounts();
}
function buildDemoPriceHistory(appIds) {
  return computePriceHistory(appIds);
}

// src/services/mock/dataset.ts
var ACH_NAMES = ["The First Step", "Tutorial Complete", "First Blood", "Sharpshooter", "Explorer", "Survivor", "Collector", "Night Owl", "Perfectionist", "Boss Slayer", "Speedrunner", "Pacifist", "Completionist", "Team Player", "Lone Wolf", "World Traveler", "Master Crafter", "Legend", "Unstoppable", "Hidden Truth"];
var MAIN = /* @__PURE__ */ new Set([14, 15, 30, 31, 32, 33, 34, 36]);
var NEVER = /* @__PURE__ */ new Set([2, 4, 6, 18, 19, 40]);
var DRIVER = 26;
var STREAK_DAYS = 14;
var nextId = 1;
var fmtDate = (sec) => {
  const d = new Date(sec * 1e3);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};
var parseYMD = (s) => {
  const p = s.split("-").map(Number);
  return [p[0], p[1], p[2]];
};
function dayIndex(startUTC, sec, totalDays) {
  let idx = Math.round((sec * 1e3 - startUTC) / MS_DAY);
  if (idx < 0) idx = 0;
  if (idx > totalDays) idx = totalDays;
  return idx;
}
function achGlobalPercent(appId, i) {
  const h = mulberry32(appId * 131 + i * 977 + 17 >>> 0)();
  if (h < 0.18) return Math.round((0.5 + h / 0.18 * 4.5) * 10) / 10;
  return Math.round((20 + (h - 0.18) / 0.82 * 70) * 10) / 10;
}
function computeGames() {
  return CATALOG.map((c, idx) => {
    const [y, m, d] = parseYMD(c.releaseDate);
    const relSec = Date.UTC(y, m - 1, d) / 1e3;
    let total;
    let twoWeeks = 0;
    if (MAIN.has(idx)) total = rint(12e3, 36e3);
    else if (NEVER.has(idx)) total = rint(20, 110);
    else total = rint(500, 9e3);
    if (idx === DRIVER) {
      total = rint(1800, 2600);
      twoWeeks = rint(300, 1500);
    } else if (MAIN.has(idx) && idx % 2 === 0) twoWeeks = rint(120, 2e3);
    const lastOffset = idx === DRIVER ? 0 : MAIN.has(idx) ? pick([3, 8, 15, 40, 120, 200, 300]) : NEVER.has(idx) ? pick([5, 120, 250, 450, 600, 800]) : rint(2, 900);
    const last = TODAY_SEC - lastOffset * 86400;
    const span = idx === DRIVER ? 13 : MAIN.has(idx) ? rint(300, 1200) : NEVER.has(idx) ? rint(2, 40) : rint(60, 800);
    let first = last - span * 86400;
    if (first < relSec) first = relSec + rint(1, 10) * 86400;
    if (first > last) first = last - 86400;
    const firstEst = Number(c.releaseDate.slice(0, 4)) <= 2021;
    const aTotal = NEVER.has(idx) ? rnd() < 0.3 ? 0 : rint(5, 30) : rint(20, 80);
    const aUnlocked = aTotal === 0 ? 0 : Math.min(aTotal, Math.round(aTotal * rnd()));
    let rare = 0;
    for (let i = 0; i < aUnlocked; i++) if (achGlobalPercent(c.appId, i) < 10) rare++;
    return {
      appId: c.appId,
      name: c.name,
      headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${c.appId}/header.jpg`,
      capsuleImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${c.appId}/capsule_616x353.jpg`,
      genres: c.genres,
      tags: c.tags,
      releaseDate: c.releaseDate,
      developer: c.developer,
      publisher: c.publisher,
      priceCents: c.basePriceCents,
      originalPriceCents: c.baseOriginalPriceCents,
      priceCheckedAt: TODAY_SEC,
      isHistoricalLow: false,
      reviewPercent: c.reviewPercent,
      reviewCount: c.reviewCount,
      playtimeForeverMin: total,
      playtimeTwoWeeksMin: twoWeeks,
      firstPlayedAt: Math.round(first),
      lastPlayedAt: Math.round(last),
      achievementsTotal: aTotal,
      achievementsUnlocked: aUnlocked,
      rareAchievements: rare,
      firstPlayedEstimated: firstEst
    };
  });
}
function splitMinutes(total, n) {
  if (n <= 1) return [total];
  const out = [];
  let rem = total;
  for (let k = 0; k < n - 1; k++) {
    const left = n - k;
    const cap = Math.max(1, rem - 20 * (left - 1));
    let part = Math.round(rem / left + (rnd() - 0.5) * 70);
    part = Math.max(20, Math.min(part, Math.min(240, cap)));
    if (part > rem) part = rem;
    out.push(part);
    rem -= part;
  }
  out.push(rem);
  return out;
}
function sampleDays(from, to, count, weight) {
  const pool2 = [];
  for (let d = from; d <= to; d++) pool2.push({ d, w: weight(d) });
  const take = Math.min(count, pool2.length);
  const picked = [];
  let totalWeight = pool2.reduce((a, p) => a + p.w, 0);
  for (let k = 0; k < take; k++) {
    let r = rnd() * totalWeight;
    let idx = pool2.length - 1;
    for (let i = 0; i < pool2.length; i++) {
      r -= pool2[i].w;
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    picked.push(pool2[idx].d);
    totalWeight -= pool2[idx].w;
    pool2.splice(idx, 1);
  }
  return picked.sort((a, b) => a - b);
}
function computeSessions(games) {
  const sessions = [];
  const totalDays = Math.round((TODAY_UTC - START_UTC) / MS_DAY);
  const dayStartUTC = (d) => START_UTC / 1e3 + d * 86400;
  const dayStartLocal = (d) => {
    const [y, m, day] = parseYMD(fmtDate(dayStartUTC(d)));
    return new Date(y, m - 1, day).getTime() / 1e3;
  };
  const dayWeight = (d) => {
    const sec = dayStartUTC(d);
    const wd = new Date(sec * 1e3).getUTCDay();
    let w = wd === 0 || wd === 6 ? 1.9 : 1;
    if (HOLIDAYS.has(fmtDate(sec))) w += 1.2;
    return w * (0.5 + 0.5 * (d / totalDays));
  };
  const pushSession = (appId, d, minutes) => {
    if (minutes <= 0) return;
    const dayStart = dayStartLocal(d);
    const latest = dayStart + (24 * 60 - minutes) * 60;
    const wanted = dayStart + Math.round(17 * 60 + rnd() * (6 * 60)) * 60;
    const startedAt = Math.min(wanted, latest);
    sessions.push({
      id: nextId++,
      steamId: DEMO_STEAM_ID,
      appId,
      playDate: fmtDate(dayStartUTC(d)),
      minutes,
      startedAt,
      endedAt: startedAt + minutes * 60,
      source: "demo"
    });
  };
  const driver = games[DRIVER];
  let driverRemaining = driver.playtimeForeverMin;
  for (let off = STREAK_DAYS - 1; off >= 0 && driverRemaining >= 40; off--) {
    const chunk = Math.min(driverRemaining - 20, rint(50, 165));
    pushSession(driver.appId, totalDays - off, chunk);
    driverRemaining -= chunk;
  }
  for (let gi = 0; gi < games.length; gi++) {
    const game = games[gi];
    const remaining = gi === DRIVER ? driverRemaining : game.playtimeForeverMin;
    if (remaining <= 0) continue;
    const first = dayIndex(START_UTC, game.firstPlayedAt ?? START_UTC / 1e3, totalDays);
    const last = dayIndex(START_UTC, game.lastPlayedAt ?? TODAY_SEC, totalDays);
    const span = Math.max(1, last - first + 1);
    const segCount = Math.max(1, Math.min(span, Math.round(remaining / 150)));
    const upper = gi === DRIVER ? Math.max(first, last - STREAK_DAYS) : last;
    const fixedDays = [last];
    const extra = segCount > 1 ? sampleDays(first, Math.max(first, upper), segCount - 1, dayWeight) : [];
    const days = Array.from(/* @__PURE__ */ new Set([...fixedDays, ...extra])).sort((a, b) => a - b);
    const parts = splitMinutes(remaining, days.length);
    for (let k = 0; k < days.length; k++) pushSession(game.appId, days[k], parts[k]);
  }
  sessions.sort((a, b) => a.startedAt - b.startedAt);
  return sessions;
}
function computeAchievements(games) {
  const out = [];
  const byApp = /* @__PURE__ */ new Map();
  for (const s of getSessions()) {
    const a = byApp.get(s.appId);
    if (a) a.push(s);
    else byApp.set(s.appId, [s]);
  }
  for (const g of games) {
    if (g.achievementsTotal === 0) continue;
    const gs = byApp.get(g.appId) ?? [];
    for (let i = 0; i < g.achievementsTotal; i++) {
      const unlocked = i < g.achievementsUnlocked;
      const gp = achGlobalPercent(g.appId, i);
      const hash = (g.appId * 31 + i * 17 >>> 0).toString(16).padStart(8, "0");
      const unlockedAt = unlocked ? gs.length > 0 ? gs[Math.min(gs.length - 1, Math.floor(rnd() * gs.length))].startedAt : g.firstPlayedAt ?? null : null;
      out.push({
        appId: g.appId,
        apiName: `ACH_${g.appId}_${i + 1}`,
        displayName: ACH_NAMES[i % ACH_NAMES.length],
        description: `Achievement ${i + 1} for app ${g.appId}`,
        iconUrl: `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${g.appId}/${hash}.jpg`,
        iconGrayUrl: `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${g.appId}/${hash}_gray.jpg`,
        unlocked,
        unlockedAt,
        globalPercent: gp,
        isRare: gp < 10,
        hidden: rnd() < 0.1
      });
    }
  }
  return out;
}
var gamesCache = null;
var sessionsCache = null;
var achCache = null;
function getGames() {
  if (!gamesCache) gamesCache = computeGames();
  return gamesCache;
}
function getSessions() {
  if (!sessionsCache) sessionsCache = computeSessions(getGames());
  return sessionsCache;
}
function buildDemoUser() {
  return {
    steamId: DEMO_STEAM_ID,
    personaName: "NovaSteam",
    avatarUrl: "https://avatars.steamstatic.com/a1b2c3d4e5f60718293a4b5c6d7e8f90.jpg",
    profileUrl: `https://steamcommunity.com/profiles/${DEMO_STEAM_ID}`,
    countryCode: "CN",
    accountCreatedAt: Math.round(Date.UTC(2016, 5, 12) / 1e3),
    lastLogoffAt: Math.round(TODAY_SEC - 3600),
    personaState: 1,
    source: "demo",
    syncedAt: Math.round(TODAY_SEC)
  };
}
function buildDemoGames() {
  return getGames();
}
function buildDemoSessions(games) {
  if (sessionsCache) return sessionsCache;
  sessionsCache = computeSessions(games);
  return sessionsCache;
}
function buildDemoAchievements(games) {
  if (achCache) return achCache;
  achCache = computeAchievements(games);
  return achCache;
}

// electron/main/sync.ts
var lastStatus = { phase: "idle", running: false, message: "", progress: 0, lastSyncAt: null, lastSyncOk: null, lastError: null, source: "demo" };
var broadcast = () => {
};
function setSyncBroadcaster(fn) {
  broadcast = fn;
}
function todayYMD() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function update(p) {
  lastStatus = { ...lastStatus, ...p };
  broadcast(lastStatus);
}
function getSyncStatus() {
  return { ...lastStatus };
}
function buildDemoData() {
  const user = buildDemoUser();
  const games = buildDemoGames();
  const sessions = buildDemoSessions(games);
  const achievements = buildDemoAchievements(games);
  const wishlist = buildDemoWishlist();
  const discounts = buildDemoDiscounts();
  const priceHistory = buildDemoPriceHistory(games.map((g) => g.appId));
  return { user, games, sessions, achievements, wishlist, discounts, priceHistory };
}
async function buildApiData(settings) {
  const now = Math.floor(Date.now() / 1e3);
  const steamId = settings.steamId;
  const user = await getPlayerSummaries(steamId).then((p) => ({
    steamId: p.steamId,
    personaName: p.personaName,
    avatarUrl: p.avatarUrl,
    profileUrl: p.profileUrl,
    countryCode: p.countryCode,
    accountCreatedAt: p.accountCreatedAt,
    lastLogoffAt: p.lastLogoffAt,
    personaState: p.personaState,
    source: "api",
    syncedAt: now
  }));
  const owned = await getOwnedGames(steamId);
  const storeCache = /* @__PURE__ */ new Map();
  await pool(owned, 4, async (g) => {
    storeCache.set(g.appId, await storeAppDetails(g.appId).catch(() => null));
  });
  const games = owned.map((g) => {
    const s = storeCache.get(g.appId);
    return {
      appId: g.appId,
      name: s?.name || g.name,
      headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appId}/header.jpg`,
      capsuleImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appId}/capsule_616x353.jpg`,
      genres: s?.genres || [],
      tags: s?.tags || [],
      releaseDate: s?.releaseDate || "",
      developer: s?.developer || "",
      publisher: s?.publisher || "",
      priceCents: s?.priceCents ?? -1,
      originalPriceCents: s?.originalPriceCents ?? -1,
      priceCheckedAt: now,
      isHistoricalLow: false,
      reviewPercent: s?.reviewPercent || 0,
      reviewCount: s?.reviewCount || 0,
      playtimeForeverMin: g.playtimeForeverMin,
      playtimeTwoWeeksMin: g.playtimeTwoWeeksMin,
      firstPlayedAt: null,
      lastPlayedAt: g.lastPlayedAt,
      achievementsTotal: 0,
      achievementsUnlocked: 0,
      rareAchievements: 0,
      firstPlayedEstimated: true,
      source: "api"
    };
  });
  const today = todayYMD();
  const todayStart = Math.floor(Date.now() / 1e3);
  const sessions = [];
  for (const g of games) {
    const prev = lastSnapshot(g.appId);
    saveSnapshot(g.appId, todayStart, g.playtimeForeverMin);
    if (prev !== null && g.playtimeForeverMin > prev) {
      sessions.push({ id: 0, steamId, appId: g.appId, playDate: today, minutes: g.playtimeForeverMin - prev, startedAt: todayStart, endedAt: todayStart, source: "api" });
    }
  }
  const achievements = [];
  const firstByGame = /* @__PURE__ */ new Map();
  await pool(owned, 4, async (g) => {
    try {
      const [pa, gp, schema] = await Promise.all([
        getPlayerAchievements(steamId, g.appId),
        getGlobalAchievementPercentagesForApp(g.appId).catch(() => ({})),
        getAchievementSchema(g.appId).catch(() => /* @__PURE__ */ new Map())
      ]);
      let total = 0, unlocked = 0, rare = 0;
      for (const a of pa.achievements) {
        const sc = schema.get(a.apiName);
        const pct = gp[a.apiName] ?? 0;
        const isRare = pct > 0 && pct < 10;
        if (isRare && a.unlocked) rare++;
        if (a.unlocked) {
          unlocked++;
          if (a.unlockTime) {
            const cur = firstByGame.get(g.appId);
            if (!cur || a.unlockTime < cur) firstByGame.set(g.appId, a.unlockTime);
          }
        }
        total++;
        achievements.push({
          appId: g.appId,
          apiName: a.apiName,
          displayName: a.displayName || sc?.displayName || "",
          description: a.description || sc?.description || "",
          iconUrl: sc?.iconUrl ?? "",
          iconGrayUrl: sc?.iconGrayUrl ?? "",
          unlocked: a.unlocked,
          unlockedAt: a.unlockTime,
          globalPercent: pct,
          isRare,
          hidden: sc?.hidden ?? false
        });
      }
      const game = games.find((x) => x.appId === g.appId);
      if (game) {
        game.achievementsTotal = total;
        game.achievementsUnlocked = unlocked;
        game.rareAchievements = rare;
      }
    } catch {
    }
  });
  for (const s of sessions) {
    const cur = firstByGame.get(s.appId);
    if (!cur || s.startedAt < cur) firstByGame.set(s.appId, s.startedAt);
  }
  for (const g of games) {
    const f = firstByGame.get(g.appId) ?? null;
    if (f) {
      g.firstPlayedAt = f;
      g.firstPlayedEstimated = false;
    }
  }
  const wlRaw = await getWishlist(steamId);
  const wishlist = [];
  await pool(wlRaw, 4, async (w) => {
    const s = await storeAppDetails(w.appId).catch(() => null);
    const orig = s?.originalPriceCents ?? -1;
    const fin = s?.priceCents ?? -1;
    wishlist.push({
      appId: w.appId,
      steamId,
      name: s?.name || w.name,
      headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${w.appId}/header.jpg`,
      addedAt: w.addedAt,
      priority: w.priority,
      tags: w.tags,
      originalPriceCents: orig,
      finalPriceCents: fin,
      // 折扣率是派生值：价格拿不到时用 -1（未知）而不是 0，
      // 否则会被 upsert 当场写进去，出现「价格保留旧值、折扣却变成无折扣」的自相矛盾
      discountPercent: orig > 0 && fin >= 0 ? Math.round((1 - fin / orig) * 100) : -1,
      currency: "CNY",
      isHistoricalLow: false,
      historicalLowCents: -1,
      historicalLowAt: null,
      reviewPercent: s?.reviewPercent || 0,
      reviewCount: s?.reviewCount || 0,
      releaseDate: s?.releaseDate || "",
      notifiedAt: null
    });
  });
  const featured = await storeFeaturedCategories().catch(() => ({ specials: [], freeAppIds: [] }));
  const discounts = [];
  const added = /* @__PURE__ */ new Set();
  const pushDiscount = (s, category) => {
    if (added.has(s.appId)) return;
    added.add(s.appId);
    discounts.push(mkDiscount(s, category, now));
  };
  await pool(featured.specials, 4, async (sp) => {
    const s = await storeAppDetails(sp.appId).catch(() => null);
    if (!s) return;
    if (!s.endsAt && sp.endsAt) s.endsAt = sp.endsAt;
    if (s.priceCents === 0 && s.originalPriceCents > 0) pushDiscount(s, "free");
    else if (s.priceCents > 0 && s.originalPriceCents > s.priceCents) pushDiscount(s, "hot");
  });
  await pool(featured.freeAppIds, 4, async (appId) => {
    if (added.has(appId)) return;
    const s = await storeAppDetails(appId).catch(() => null);
    if (s && s.priceCents === 0 && s.originalPriceCents > 0) pushDiscount(s, "free");
  });
  const samples = [];
  for (const g of games) if (g.priceCents >= 0) samples.push({ appId: g.appId, priceCents: g.priceCents, originalPriceCents: g.originalPriceCents });
  for (const w of wishlist) if (w.finalPriceCents >= 0) samples.push({ appId: w.appId, priceCents: w.finalPriceCents, originalPriceCents: w.originalPriceCents });
  for (const d of discounts) if (d.finalPriceCents >= 0) samples.push({ appId: d.appId, priceCents: d.finalPriceCents, originalPriceCents: d.originalPriceCents });
  const priceHistory = [];
  const lowByApp = /* @__PURE__ */ new Map();
  const isLowByApp = /* @__PURE__ */ new Map();
  const bestByApp = /* @__PURE__ */ new Map();
  for (const s of samples) {
    if (!lowByApp.has(s.appId)) lowByApp.set(s.appId, priceLowest(s.appId) ?? -1);
    const prevLow = lowByApp.get(s.appId) ?? -1;
    const isLow = prevLow >= 0 && s.priceCents <= prevLow;
    const best = prevLow < 0 ? s.priceCents : Math.min(prevLow, s.priceCents);
    lowByApp.set(s.appId, best);
    bestByApp.set(s.appId, best);
    if (isLow) isLowByApp.set(s.appId, true);
    priceHistory.push({
      appId: s.appId,
      capturedAt: now,
      priceCents: s.priceCents,
      originalPriceCents: s.originalPriceCents,
      discountPercent: s.originalPriceCents > 0 ? Math.round((1 - s.priceCents / s.originalPriceCents) * 100) : 0,
      isHistoricalLow: isLow
    });
  }
  for (const g of games) g.isHistoricalLow = isLowByApp.get(g.appId) ?? false;
  for (const d of discounts) {
    d.isHistoricalLow = isLowByApp.get(d.appId) ?? false;
    d.historicalLowCents = bestByApp.get(d.appId) ?? -1;
  }
  for (const w of wishlist) {
    w.isHistoricalLow = isLowByApp.get(w.appId) ?? false;
    const best = bestByApp.get(w.appId);
    if (best !== void 0) {
      w.historicalLowCents = best;
      if (w.isHistoricalLow) w.historicalLowAt = now;
    }
  }
  return { user, games, sessions, achievements, wishlist, discounts, priceHistory };
}
function mkDiscount(s, category, now) {
  const orig = s.originalPriceCents, fin = s.priceCents, disc = orig > 0 && fin >= 0 ? Math.round((1 - fin / orig) * 100) : 0;
  return {
    appId: s.appId,
    name: s.name,
    headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${s.appId}/header.jpg`,
    originalPriceCents: orig,
    finalPriceCents: fin,
    discountPercent: disc,
    currency: "CNY",
    isHistoricalLow: false,
    historicalLowCents: -1,
    reviewPercent: s.reviewPercent,
    reviewCount: s.reviewCount,
    tags: s.tags,
    releaseDate: s.releaseDate,
    storeUrl: `https://store.steampowered.com/app/${s.appId}/`,
    category,
    endsAt: s.endsAt,
    fetchedAt: now
  };
}
function persist(d, full) {
  if (full) clearAll();
  saveUser(d.user);
  saveGames(d.games);
  if (d.sessions.length) saveSessions(d.sessions);
  if (d.achievements.length) saveAchievements(d.achievements);
  if (d.wishlist.length) saveWishlist(d.wishlist);
  if (d.discounts.length) saveDiscounts(d.discounts);
  if (d.priceHistory.length) savePriceHistory(d.priceHistory);
  return { users: 1, games: d.games.length, sessions: d.sessions.length, achievements: d.achievements.length, wishlist: d.wishlist.length, discounts: d.discounts.length, priceHistory: d.priceHistory.length };
}
function fireNotifications(settings) {
  const snap = loadSnapshot();
  if (settings.notifyWishlistDrop) {
    const drops = snap.wishlist.filter((w) => w.discountPercent > 0);
    if (drops.length) notify({ title: "\u613F\u671B\u5355\u964D\u4EF7", body: `${drops.length} \u6B3E\u613F\u671B\u5355\u6E38\u620F\u6B63\u5728\u6253\u6298`, route: "wishlist" });
  }
  if (settings.notifyHistoricalLow) {
    const lows = snap.discounts.filter((d) => d.isHistoricalLow);
    if (lows.length) notify({ title: "\u53F2\u4F4E\u63D0\u9192", body: `${lows.length} \u6B3E\u6E38\u620F\u8FBE\u5230\u5386\u53F2\u6700\u4F4E\u4EF7`, route: "store" });
  }
  if (settings.notifyFreeGame) {
    const free = snap.discounts.filter((d) => d.category === "free" || d.finalPriceCents === 0);
    if (free.length) notify({ title: "\u9650\u65F6\u514D\u8D39", body: `${free.length} \u6B3E\u6E38\u620F\u5F53\u524D\u53EF\u514D\u8D39\u9886\u53D6`, route: "store" });
  }
}
async function run3(options) {
  const settings = getSettings();
  let source;
  if (options?.source) source = options.source;
  else if (settings.steamId && settings.steamApiKey) source = "api";
  else if (settings.enableDemoData) source = "demo";
  else source = "local";
  update({ running: true, phase: "idle", source, lastError: null, lastSyncOk: null, message: `\u5F00\u59CB\u540C\u6B65\uFF08${source}\uFF09`, progress: 0 });
  try {
    if (source === "local" && !settings.enableDemoData) throw new Error("\u672A\u914D\u7F6E API Key \u4E14\u672A\u5F00\u542F\u6F14\u793A\u6570\u636E\uFF0C\u65E0\u6CD5\u540C\u6B65");
    if (source === "api") {
      update({ phase: "detecting", message: "\u68C0\u6D4B Steam \u5BA2\u6237\u7AEF\u4E0E\u7F51\u7EDC", progress: 5 });
      await detectSteam().catch(() => null);
    } else {
      update({ phase: "detecting", message: "\u6F14\u793A\u6A21\u5F0F\uFF1A\u8DF3\u8FC7\u672C\u5730\u68C0\u6D4B", progress: 5 });
    }
    update({ phase: "profile", message: "\u83B7\u53D6\u73A9\u5BB6\u8D44\u6599", progress: 20 });
    const data = source === "api" ? await buildApiData(settings) : buildDemoData();
    update({ phase: "games", message: "\u5199\u5165\u6E38\u620F\u5E93", progress: 45 });
    const counts = persist(data, source === "demo" || !!options?.full);
    update({ phase: "achievements", message: "\u5199\u5165\u6210\u5C31", progress: 65 });
    update({ phase: "wishlist", message: "\u5199\u5165\u613F\u671B\u5355", progress: 80 });
    update({ phase: "prices", message: "\u5199\u5165\u4EF7\u683C\u91C7\u6837\u4E0E\u6298\u6263", progress: 95 });
    fireNotifications(settings);
    const t = Date.now();
    update({ phase: "done", running: false, message: "\u540C\u6B65\u5B8C\u6210", progress: 100, lastSyncAt: t, lastSyncOk: true });
    return { ok: true, counts };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    update({ phase: "failed", running: false, message: `\u540C\u6B65\u5931\u8D25\uFF1A${msg}`, lastSyncOk: false, lastError: msg });
    return { ok: false, error: msg };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  database,
  sync
});
