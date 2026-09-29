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
          var fs6 = require("node:fs");
          Aa = __dirname + "/";
          Ca = (a) => {
            a = Da(a) ? new URL(a) : a;
            return fs6.readFileSync(a);
          };
          Ba = async (a) => {
            a = Da(a) ? new URL(a) : a;
            return fs6.readFileSync(a, void 0);
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
                  c = fs6.readSync(d, b, 0, 256);
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

// node_modules/react/cjs/react.production.js
var require_react_production = __commonJS({
  "node_modules/react/cjs/react.production.js"(exports2) {
    "use strict";
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
    var REACT_PORTAL_TYPE = Symbol.for("react.portal");
    var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
    var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
    var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
    var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
    var REACT_CONTEXT_TYPE = Symbol.for("react.context");
    var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
    var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
    var REACT_MEMO_TYPE = Symbol.for("react.memo");
    var REACT_LAZY_TYPE = Symbol.for("react.lazy");
    var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
    var REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition");
    var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
    function getIteratorFn(maybeIterable) {
      if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
      maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
      return "function" === typeof maybeIterable ? maybeIterable : null;
    }
    var ReactNoopUpdateQueue = {
      isMounted: function() {
        return false;
      },
      enqueueForceUpdate: function() {
      },
      enqueueReplaceState: function() {
      },
      enqueueSetState: function() {
      }
    };
    var assign = Object.assign;
    var emptyObject = {};
    function Component(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    Component.prototype.isReactComponent = {};
    Component.prototype.setState = function(partialState, callback) {
      if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
        throw Error(
          "takes an object of state variables to update or a function which returns an object of state variables."
        );
      this.updater.enqueueSetState(this, partialState, callback, "setState");
    };
    Component.prototype.forceUpdate = function(callback) {
      this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
    };
    function ComponentDummy() {
    }
    ComponentDummy.prototype = Component.prototype;
    function PureComponent(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
    pureComponentPrototype.constructor = PureComponent;
    assign(pureComponentPrototype, Component.prototype);
    pureComponentPrototype.isPureReactComponent = true;
    var isArrayImpl = Array.isArray;
    function noop() {
    }
    var ReactSharedInternals = { H: null, A: null, T: null, S: null };
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function ReactElement(type, key, props) {
      var refProp = props.ref;
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref: void 0 !== refProp ? refProp : null,
        props
      };
    }
    function cloneAndReplaceKey(oldElement, newKey) {
      return ReactElement(oldElement.type, newKey, oldElement.props);
    }
    function isValidElement(object) {
      return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    function escape(key) {
      var escaperLookup = { "=": "=0", ":": "=2" };
      return "$" + key.replace(/[=:]/g, function(match) {
        return escaperLookup[match];
      });
    }
    var userProvidedKeyEscapeRegex = /\/+/g;
    function getElementKey(element, index) {
      return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
    }
    function resolveThenable(thenable) {
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
        default:
          switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
            function(fulfilledValue) {
              "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
            },
            function(error) {
              "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
            }
          )), thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
          }
      }
      throw thenable;
    }
    function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
      var type = typeof children;
      if ("undefined" === type || "boolean" === type) children = null;
      var invokeCallback = false;
      if (null === children) invokeCallback = true;
      else
        switch (type) {
          case "bigint":
          case "string":
          case "number":
            invokeCallback = true;
            break;
          case "object":
            switch (children.$$typeof) {
              case REACT_ELEMENT_TYPE:
              case REACT_PORTAL_TYPE:
                invokeCallback = true;
                break;
              case REACT_LAZY_TYPE:
                return invokeCallback = children._init, mapIntoArray(
                  invokeCallback(children._payload),
                  array,
                  escapedPrefix,
                  nameSoFar,
                  callback
                );
            }
        }
      if (invokeCallback)
        return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
          return c;
        })) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(
          callback,
          escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(
            userProvidedKeyEscapeRegex,
            "$&/"
          ) + "/") + invokeCallback
        )), array.push(callback)), 1;
      invokeCallback = 0;
      var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
      if (isArrayImpl(children))
        for (var i = 0; i < children.length; i++)
          nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if (i = getIteratorFn(children), "function" === typeof i)
        for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
          nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if ("object" === type) {
        if ("function" === typeof children.then)
          return mapIntoArray(
            resolveThenable(children),
            array,
            escapedPrefix,
            nameSoFar,
            callback
          );
        array = String(children);
        throw Error(
          "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
        );
      }
      return invokeCallback;
    }
    function mapChildren(children, func, context) {
      if (null == children) return children;
      var result = [], count = 0;
      mapIntoArray(children, result, "", "", function(child) {
        return func.call(context, child, count++);
      });
      return result;
    }
    function lazyInitializer(payload) {
      if (-1 === payload._status) {
        var ctor = payload._result, thenable = ctor();
        thenable.then(
          function(moduleObject) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 1, payload._result = moduleObject, void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
          },
          function(error) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 2, payload._result = error, void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
          }
        );
        -1 === payload._status && (payload._status = 0, payload._result = thenable);
      }
      if (1 === payload._status) return payload._result.default;
      throw payload._result;
    }
    var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
      if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
        var event = new window.ErrorEvent("error", {
          bubbles: true,
          cancelable: true,
          message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
          error
        });
        if (!window.dispatchEvent(event)) return;
      } else if ("object" === typeof process && "function" === typeof process.emit) {
        process.emit("uncaughtException", error);
        return;
      }
      console.error(error);
    };
    function startTransition(scope) {
      var prevTransition = ReactSharedInternals.T, currentTransition = {};
      currentTransition.types = null !== prevTransition ? prevTransition.types : null;
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
        null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
        "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
      } catch (error) {
        reportGlobalError(error);
      } finally {
        null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
      }
    }
    function addTransitionType(type) {
      var transition = ReactSharedInternals.T;
      if (null !== transition) {
        var transitionTypes = transition.types;
        null === transitionTypes ? transition.types = [type] : -1 === transitionTypes.indexOf(type) && transitionTypes.push(type);
      } else startTransition(addTransitionType.bind(null, type));
    }
    var Children = {
      map: mapChildren,
      forEach: function(children, forEachFunc, forEachContext) {
        mapChildren(
          children,
          function() {
            forEachFunc.apply(this, arguments);
          },
          forEachContext
        );
      },
      count: function(children) {
        var n = 0;
        mapChildren(children, function() {
          n++;
        });
        return n;
      },
      toArray: function(children) {
        return mapChildren(children, function(child) {
          return child;
        }) || [];
      },
      only: function(children) {
        if (!isValidElement(children))
          throw Error(
            "React.Children.only expected to receive a single React element child."
          );
        return children;
      }
    };
    exports2.Activity = REACT_ACTIVITY_TYPE;
    exports2.Children = Children;
    exports2.Component = Component;
    exports2.Fragment = REACT_FRAGMENT_TYPE;
    exports2.Profiler = REACT_PROFILER_TYPE;
    exports2.PureComponent = PureComponent;
    exports2.StrictMode = REACT_STRICT_MODE_TYPE;
    exports2.Suspense = REACT_SUSPENSE_TYPE;
    exports2.ViewTransition = REACT_VIEW_TRANSITION_TYPE;
    exports2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
    exports2.__COMPILER_RUNTIME = {
      __proto__: null,
      c: function(size) {
        return ReactSharedInternals.H.useMemoCache(size);
      }
    };
    exports2.addTransitionType = addTransitionType;
    exports2.cache = function(fn) {
      return function() {
        return fn.apply(null, arguments);
      };
    };
    exports2.cacheSignal = function() {
      return null;
    };
    exports2.cloneElement = function(element, config, children) {
      if (null === element || void 0 === element)
        throw Error(
          "The argument must be a React element, but you passed " + element + "."
        );
      var props = assign({}, element.props), key = element.key;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
      var propName = arguments.length - 2;
      if (1 === propName) props.children = children;
      else if (1 < propName) {
        for (var childArray = Array(propName), i = 0; i < propName; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      return ReactElement(element.type, key, props);
    };
    exports2.createContext = function(defaultValue) {
      defaultValue = {
        $$typeof: REACT_CONTEXT_TYPE,
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        _threadCount: 0,
        Provider: null,
        Consumer: null
      };
      defaultValue.Provider = defaultValue;
      defaultValue.Consumer = {
        $$typeof: REACT_CONSUMER_TYPE,
        _context: defaultValue
      };
      return defaultValue;
    };
    exports2.createElement = function(type, config, children) {
      var propName, props = {}, key = null;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
      var childrenLength = arguments.length - 2;
      if (1 === childrenLength) props.children = children;
      else if (1 < childrenLength) {
        for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      if (type && type.defaultProps)
        for (propName in childrenLength = type.defaultProps, childrenLength)
          void 0 === props[propName] && (props[propName] = childrenLength[propName]);
      return ReactElement(type, key, props);
    };
    exports2.createRef = function() {
      return { current: null };
    };
    exports2.forwardRef = function(render) {
      return { $$typeof: REACT_FORWARD_REF_TYPE, render };
    };
    exports2.isValidElement = isValidElement;
    exports2.lazy = function(ctor) {
      return {
        $$typeof: REACT_LAZY_TYPE,
        _payload: { _status: -1, _result: ctor },
        _init: lazyInitializer
      };
    };
    exports2.memo = function(type, compare) {
      return {
        $$typeof: REACT_MEMO_TYPE,
        type,
        compare: void 0 === compare ? null : compare
      };
    };
    exports2.startTransition = startTransition;
    exports2.unstable_useCacheRefresh = function() {
      return ReactSharedInternals.H.useCacheRefresh();
    };
    exports2.use = function(usable) {
      return ReactSharedInternals.H.use(usable);
    };
    exports2.useActionState = function(action, initialState, permalink) {
      return ReactSharedInternals.H.useActionState(action, initialState, permalink);
    };
    exports2.useCallback = function(callback, deps) {
      return ReactSharedInternals.H.useCallback(callback, deps);
    };
    exports2.useContext = function(Context) {
      return ReactSharedInternals.H.useContext(Context);
    };
    exports2.useDebugValue = function() {
    };
    exports2.useDeferredValue = function(value, initialValue) {
      return ReactSharedInternals.H.useDeferredValue(value, initialValue);
    };
    exports2.useEffect = function(create, deps) {
      return ReactSharedInternals.H.useEffect(create, deps);
    };
    exports2.useEffectEvent = function(callback) {
      return ReactSharedInternals.H.useEffectEvent(callback);
    };
    exports2.useId = function() {
      return ReactSharedInternals.H.useId();
    };
    exports2.useImperativeHandle = function(ref, create, deps) {
      return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
    };
    exports2.useInsertionEffect = function(create, deps) {
      return ReactSharedInternals.H.useInsertionEffect(create, deps);
    };
    exports2.useLayoutEffect = function(create, deps) {
      return ReactSharedInternals.H.useLayoutEffect(create, deps);
    };
    exports2.useMemo = function(create, deps) {
      return ReactSharedInternals.H.useMemo(create, deps);
    };
    exports2.useOptimistic = function(passthrough, reducer) {
      return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
    };
    exports2.useReducer = function(reducer, initialArg, init) {
      return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
    };
    exports2.useRef = function(initialValue) {
      return ReactSharedInternals.H.useRef(initialValue);
    };
    exports2.useState = function(initialState) {
      return ReactSharedInternals.H.useState(initialState);
    };
    exports2.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
      return ReactSharedInternals.H.useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
      );
    };
    exports2.useTransition = function() {
      return ReactSharedInternals.H.useTransition();
    };
    exports2.version = "19.3.0";
  }
});

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports2, module2) {
    "use strict";
    "production" !== process.env.NODE_ENV && (function() {
      function defineDeprecationWarning(methodName, info) {
        Object.defineProperty(Component.prototype, methodName, {
          get: function() {
            console.warn(
              "%s(...) is deprecated in plain JavaScript React classes. %s",
              info[0],
              info[1]
            );
          }
        });
      }
      function getIteratorFn(maybeIterable) {
        if (null === maybeIterable || "object" !== typeof maybeIterable)
          return null;
        maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
        return "function" === typeof maybeIterable ? maybeIterable : null;
      }
      function warnNoop(publicInstance, callerName) {
        publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
        var warningKey = publicInstance + "." + callerName;
        didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error(
          "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
          callerName,
          publicInstance
        ), didWarnStateUpdateForUnmountedComponent[warningKey] = true);
      }
      function Component(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function ComponentDummy() {
      }
      function PureComponent(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function noop() {
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
          case REACT_ACTIVITY_TYPE:
            return "Activity";
          case REACT_VIEW_TRANSITION_TYPE:
            return "ViewTransition";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_CONTEXT_TYPE:
              return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
          return "<...>";
        try {
          var name = getComponentNameFromType(type);
          return name ? "<" + name + ">" : "<...>";
        } catch (x) {
          return "<...>";
        }
      }
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      function UnknownOwner() {
        return Error("react-stack-top-frame");
      }
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.defineProperty(type, "_debugStack", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      function cloneAndReplaceKey(oldElement, newKey) {
        newKey = ReactElement(
          oldElement.type,
          newKey,
          oldElement.props,
          oldElement._owner,
          oldElement._debugStack,
          oldElement._debugTask
        );
        oldElement._store && (newKey._store.validated = oldElement._store.validated);
        return newKey;
      }
      function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
      }
      function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      function escape(key) {
        var escaperLookup = { "=": "=0", ":": "=2" };
        return "$" + key.replace(/[=:]/g, function(match) {
          return escaperLookup[match];
        });
      }
      function getElementKey(element, index) {
        return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index.toString(36);
      }
      function resolveThenable(thenable) {
        switch (thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenable.reason;
          default:
            switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
              function(fulfilledValue) {
                "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
              },
              function(error) {
                "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            )), thenable.status) {
              case "fulfilled":
                return thenable.value;
              case "rejected":
                throw thenable.reason;
            }
        }
        throw thenable;
      }
      function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
        var type = typeof children;
        if ("undefined" === type || "boolean" === type) children = null;
        var invokeCallback = false;
        if (null === children) invokeCallback = true;
        else
          switch (type) {
            case "bigint":
            case "string":
            case "number":
              invokeCallback = true;
              break;
            case "object":
              switch (children.$$typeof) {
                case REACT_ELEMENT_TYPE:
                case REACT_PORTAL_TYPE:
                  invokeCallback = true;
                  break;
                case REACT_LAZY_TYPE:
                  return invokeCallback = children._init, mapIntoArray(
                    invokeCallback(children._payload),
                    array,
                    escapedPrefix,
                    nameSoFar,
                    callback
                  );
              }
          }
        if (invokeCallback) {
          invokeCallback = children;
          callback = callback(invokeCallback);
          var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
          isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
            return c;
          })) : null != callback && (isValidElement(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(
            callback,
            escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(
              userProvidedKeyEscapeRegex,
              "$&/"
            ) + "/") + childKey
          ), "" !== nameSoFar && null != invokeCallback && isValidElement(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
          return 1;
        }
        invokeCallback = 0;
        childKey = "" === nameSoFar ? "." : nameSoFar + ":";
        if (isArrayImpl(children))
          for (var i = 0; i < children.length; i++)
            nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if (i = getIteratorFn(children), "function" === typeof i)
          for (i === children.entries && (didWarnAboutMaps || console.warn(
            "Using Maps as children is not supported. Use an array of keyed ReactElements instead."
          ), didWarnAboutMaps = true), children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
            nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if ("object" === type) {
          if ("function" === typeof children.then)
            return mapIntoArray(
              resolveThenable(children),
              array,
              escapedPrefix,
              nameSoFar,
              callback
            );
          array = String(children);
          throw Error(
            "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
          );
        }
        return invokeCallback;
      }
      function mapChildren(children, func, context) {
        if (null == children) return children;
        var result = [], count = 0;
        mapIntoArray(children, result, "", "", function(child) {
          return func.call(context, child, count++);
        });
        return result;
      }
      function lazyInitializer(payload) {
        if (-1 === payload._status) {
          var resolveDebugValue = null, rejectDebugValue = null, ioInfo = payload._ioInfo;
          null != ioInfo && (ioInfo.start = ioInfo.end = performance.now(), ioInfo.value = new Promise(function(resolve, reject) {
            resolveDebugValue = resolve;
            rejectDebugValue = reject;
          }));
          ioInfo = payload._result;
          var thenable = ioInfo();
          thenable.then(
            function(moduleObject) {
              if (0 === payload._status || -1 === payload._status) {
                payload._status = 1;
                payload._result = moduleObject;
                var _ioInfo = payload._ioInfo;
                if (null != _ioInfo) {
                  _ioInfo.end = performance.now();
                  var debugValue = null == moduleObject ? void 0 : moduleObject.default;
                  resolveDebugValue(debugValue);
                  _ioInfo.value.status = "fulfilled";
                  _ioInfo.value.value = debugValue;
                }
                void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
              }
            },
            function(error) {
              if (0 === payload._status || -1 === payload._status) {
                payload._status = 2;
                payload._result = error;
                var _ioInfo2 = payload._ioInfo;
                null != _ioInfo2 && (_ioInfo2.end = performance.now(), _ioInfo2.value.then(noop, noop), rejectDebugValue(error), _ioInfo2.value.status = "rejected", _ioInfo2.value.reason = error);
                void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            }
          );
          ioInfo = payload._ioInfo;
          if (null != ioInfo) {
            var displayName = thenable.displayName;
            "string" === typeof displayName && (ioInfo.name = displayName);
          }
          -1 === payload._status && (payload._status = 0, payload._result = thenable);
        }
        if (1 === payload._status)
          return ioInfo = payload._result, void 0 === ioInfo && console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
            ioInfo
          ), "default" in ioInfo || console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
            ioInfo
          ), ioInfo.default;
        throw payload._result;
      }
      function resolveDispatcher() {
        var dispatcher = ReactSharedInternals.H;
        null === dispatcher && console.error(
          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
        );
        return dispatcher;
      }
      function releaseAsyncTransition() {
        ReactSharedInternals.asyncTransitions--;
      }
      function startTransition(scope) {
        var prevTransition = ReactSharedInternals.T, currentTransition = {};
        currentTransition.types = null !== prevTransition ? prevTransition.types : null;
        currentTransition._updatedFibers = /* @__PURE__ */ new Set();
        ReactSharedInternals.T = currentTransition;
        try {
          var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
          null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
          "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && (ReactSharedInternals.asyncTransitions++, returnValue.then(releaseAsyncTransition, releaseAsyncTransition), returnValue.then(noop, reportGlobalError));
        } catch (error) {
          reportGlobalError(error);
        } finally {
          null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn(
            "Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."
          )), null !== prevTransition && null !== currentTransition.types && (null !== prevTransition.types && prevTransition.types !== currentTransition.types && console.error(
            "We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."
          ), prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
        }
      }
      function addTransitionType(type) {
        var transition = ReactSharedInternals.T;
        if (null !== transition) {
          var transitionTypes = transition.types;
          null === transitionTypes ? transition.types = [type] : -1 === transitionTypes.indexOf(type) && transitionTypes.push(type);
        } else
          0 === ReactSharedInternals.asyncTransitions && console.error(
            "addTransitionType can only be called inside a `startTransition()` callback. It must be associated with a specific Transition."
          ), startTransition(addTransitionType.bind(null, type));
      }
      function enqueueTask(task) {
        if (null === enqueueTaskImpl)
          try {
            var requireString = ("require" + Math.random()).slice(0, 7);
            enqueueTaskImpl = (module2 && module2[requireString]).call(
              module2,
              "timers"
            ).setImmediate;
          } catch (_err) {
            enqueueTaskImpl = function(callback) {
              false === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = true, "undefined" === typeof MessageChannel && console.error(
                "This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."
              ));
              var channel = new MessageChannel();
              channel.port1.onmessage = callback;
              channel.port2.postMessage(void 0);
            };
          }
        return enqueueTaskImpl(task);
      }
      function aggregateErrors(errors) {
        return 1 < errors.length && "function" === typeof AggregateError ? new AggregateError(errors) : errors[0];
      }
      function popActScope(prevActQueue, prevActScopeDepth) {
        prevActScopeDepth !== actScopeDepth - 1 && console.error(
          "You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. "
        );
        actScopeDepth = prevActScopeDepth;
      }
      function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
        var queue = ReactSharedInternals.actQueue;
        if (null !== queue)
          if (0 !== queue.length)
            try {
              flushActQueue(queue);
              enqueueTask(function() {
                return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
              });
              return;
            } catch (error) {
              ReactSharedInternals.thrownErrors.push(error);
            }
          else ReactSharedInternals.actQueue = null;
        0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
      }
      function flushActQueue(queue) {
        if (!isFlushing) {
          isFlushing = true;
          var i = 0;
          try {
            for (; i < queue.length; i++) {
              var callback = queue[i];
              do {
                ReactSharedInternals.didUsePromise = false;
                var continuation = callback(false);
                if (null !== continuation) {
                  if (ReactSharedInternals.didUsePromise) {
                    queue[i] = callback;
                    queue.splice(0, i);
                    return;
                  }
                  callback = continuation;
                } else break;
              } while (1);
            }
            queue.length = 0;
          } catch (error) {
            queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
          } finally {
            isFlushing = false;
          }
        }
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
        isMounted: function() {
          return false;
        },
        enqueueForceUpdate: function(publicInstance) {
          warnNoop(publicInstance, "forceUpdate");
        },
        enqueueReplaceState: function(publicInstance) {
          warnNoop(publicInstance, "replaceState");
        },
        enqueueSetState: function(publicInstance) {
          warnNoop(publicInstance, "setState");
        }
      }, assign = Object.assign, emptyObject = {};
      Object.freeze(emptyObject);
      Component.prototype.isReactComponent = {};
      Component.prototype.setState = function(partialState, callback) {
        if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
          throw Error(
            "takes an object of state variables to update or a function which returns an object of state variables."
          );
        this.updater.enqueueSetState(this, partialState, callback, "setState");
      };
      Component.prototype.forceUpdate = function(callback) {
        this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
      };
      var deprecatedAPIs = {
        isMounted: [
          "isMounted",
          "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
        ],
        replaceState: [
          "replaceState",
          "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
        ]
      };
      for (fnName in deprecatedAPIs)
        deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
      ComponentDummy.prototype = Component.prototype;
      deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
      deprecatedAPIs.constructor = PureComponent;
      assign(deprecatedAPIs, Component.prototype);
      deprecatedAPIs.isPureReactComponent = true;
      var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = {
        H: null,
        A: null,
        T: null,
        S: null,
        actQueue: null,
        asyncTransitions: 0,
        isBatchingLegacy: false,
        didScheduleLegacyUpdate: false,
        didUsePromise: false,
        thrownErrors: [],
        getCurrentStack: null,
        recentlyCreatedOwnerStacks: 0
      }, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
        return null;
      };
      deprecatedAPIs = {
        react_stack_bottom_frame: function(callStackForError) {
          return callStackForError();
        }
      };
      var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
      var didWarnAboutElementRef = {};
      var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(
        deprecatedAPIs,
        UnknownOwner
      )();
      var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
      var didWarnAboutMaps = false, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
        if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
          var event = new window.ErrorEvent("error", {
            bubbles: true,
            cancelable: true,
            message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
            error
          });
          if (!window.dispatchEvent(event)) return;
        } else if ("object" === typeof process && "function" === typeof process.emit) {
          process.emit("uncaughtException", error);
          return;
        }
        console.error(error);
      }, didWarnAboutMessageChannel = false, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = false, isFlushing = false, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
        queueMicrotask(function() {
          return queueMicrotask(callback);
        });
      } : enqueueTask;
      deprecatedAPIs = Object.freeze({
        __proto__: null,
        c: function(size) {
          return resolveDispatcher().useMemoCache(size);
        }
      });
      var fnName = {
        map: mapChildren,
        forEach: function(children, forEachFunc, forEachContext) {
          mapChildren(
            children,
            function() {
              forEachFunc.apply(this, arguments);
            },
            forEachContext
          );
        },
        count: function(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        },
        toArray: function(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        },
        only: function(children) {
          if (!isValidElement(children))
            throw Error(
              "React.Children.only expected to receive a single React element child."
            );
          return children;
        }
      };
      exports2.Activity = REACT_ACTIVITY_TYPE;
      exports2.Children = fnName;
      exports2.Component = Component;
      exports2.Fragment = REACT_FRAGMENT_TYPE;
      exports2.Profiler = REACT_PROFILER_TYPE;
      exports2.PureComponent = PureComponent;
      exports2.StrictMode = REACT_STRICT_MODE_TYPE;
      exports2.Suspense = REACT_SUSPENSE_TYPE;
      exports2.ViewTransition = REACT_VIEW_TRANSITION_TYPE;
      exports2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
      exports2.__COMPILER_RUNTIME = deprecatedAPIs;
      exports2.act = function(callback) {
        var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
        actScopeDepth++;
        var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = false;
        try {
          var result = callback();
        } catch (error) {
          ReactSharedInternals.thrownErrors.push(error);
        }
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        if (null !== result && "object" === typeof result && "function" === typeof result.then) {
          var thenable = result;
          queueSeveralMicrotasks(function() {
            didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
              "You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"
            ));
          });
          return {
            then: function(resolve, reject) {
              didAwaitActCall = true;
              thenable.then(
                function(returnValue) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  if (0 === prevActScopeDepth) {
                    try {
                      flushActQueue(queue), enqueueTask(function() {
                        return recursivelyFlushAsyncActWork(
                          returnValue,
                          resolve,
                          reject
                        );
                      });
                    } catch (error$0) {
                      ReactSharedInternals.thrownErrors.push(error$0);
                    }
                    if (0 < ReactSharedInternals.thrownErrors.length) {
                      var _thrownError = aggregateErrors(
                        ReactSharedInternals.thrownErrors
                      );
                      ReactSharedInternals.thrownErrors.length = 0;
                      reject(_thrownError);
                    }
                  } else resolve(returnValue);
                },
                function(error) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(
                    ReactSharedInternals.thrownErrors
                  ), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
                }
              );
            }
          };
        }
        var returnValue$jscomp$0 = result;
        popActScope(prevActQueue, prevActScopeDepth);
        0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
          didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
            "A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"
          ));
        }), ReactSharedInternals.actQueue = null);
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        return {
          then: function(resolve, reject) {
            didAwaitActCall = true;
            0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
              return recursivelyFlushAsyncActWork(
                returnValue$jscomp$0,
                resolve,
                reject
              );
            })) : resolve(returnValue$jscomp$0);
          }
        };
      };
      exports2.addTransitionType = addTransitionType;
      exports2.cache = function(fn) {
        return function() {
          return fn.apply(null, arguments);
        };
      };
      exports2.cacheSignal = function() {
        return null;
      };
      exports2.captureOwnerStack = function() {
        var getCurrentStack = ReactSharedInternals.getCurrentStack;
        return null === getCurrentStack ? null : getCurrentStack();
      };
      exports2.cloneElement = function(element, config, children) {
        if (null === element || void 0 === element)
          throw Error(
            "The argument must be a React element, but you passed " + element + "."
          );
        var props = assign({}, element.props), key = element.key, owner = element._owner;
        if (null != config) {
          var JSCompiler_inline_result;
          a: {
            if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(
              config,
              "ref"
            ).get) && JSCompiler_inline_result.isReactWarning) {
              JSCompiler_inline_result = false;
              break a;
            }
            JSCompiler_inline_result = void 0 !== config.ref;
          }
          JSCompiler_inline_result && (owner = getOwner());
          hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
          for (propName in config)
            !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
        }
        var propName = arguments.length - 2;
        if (1 === propName) props.children = children;
        else if (1 < propName) {
          JSCompiler_inline_result = Array(propName);
          for (var i = 0; i < propName; i++)
            JSCompiler_inline_result[i] = arguments[i + 2];
          props.children = JSCompiler_inline_result;
        }
        props = ReactElement(
          element.type,
          key,
          props,
          owner,
          element._debugStack,
          element._debugTask
        );
        for (key = 2; key < arguments.length; key++)
          validateChildKeys(arguments[key]);
        return props;
      };
      exports2.createContext = function(defaultValue) {
        defaultValue = {
          $$typeof: REACT_CONTEXT_TYPE,
          _currentValue: defaultValue,
          _currentValue2: defaultValue,
          _threadCount: 0,
          Provider: null,
          Consumer: null
        };
        defaultValue.Provider = defaultValue;
        defaultValue.Consumer = {
          $$typeof: REACT_CONSUMER_TYPE,
          _context: defaultValue
        };
        defaultValue._currentRenderer = null;
        defaultValue._currentRenderer2 = null;
        return defaultValue;
      };
      exports2.createElement = function(type, config, children) {
        for (var i = 2; i < arguments.length; i++)
          validateChildKeys(arguments[i]);
        var propName;
        i = {};
        var key = null;
        if (null != config)
          for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = true, console.warn(
            "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform"
          )), hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key), config)
            hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i[propName] = config[propName]);
        var childrenLength = arguments.length - 2;
        if (1 === childrenLength) i.children = children;
        else if (1 < childrenLength) {
          for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++)
            childArray[_i] = arguments[_i + 2];
          Object.freeze && Object.freeze(childArray);
          i.children = childArray;
        }
        if (type && type.defaultProps)
          for (propName in childrenLength = type.defaultProps, childrenLength)
            void 0 === i[propName] && (i[propName] = childrenLength[propName]);
        key && defineKeyPropWarningGetter(
          i,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        (propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++) ? (childArray = Error.stackTraceLimit, Error.stackTraceLimit = 10, childrenLength = Error("react-stack-top-frame"), Error.stackTraceLimit = childArray) : childrenLength = unknownOwnerDebugStack;
        return ReactElement(
          type,
          key,
          i,
          getOwner(),
          childrenLength,
          propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
      exports2.createRef = function() {
        var refObject = { current: null };
        Object.seal(refObject);
        return refObject;
      };
      exports2.forwardRef = function(render) {
        null != render && render.$$typeof === REACT_MEMO_TYPE ? console.error(
          "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))."
        ) : "function" !== typeof render ? console.error(
          "forwardRef requires a render function but was given %s.",
          null === render ? "null" : typeof render
        ) : 0 !== render.length && 2 !== render.length && console.error(
          "forwardRef render functions accept exactly two parameters: props and ref. %s",
          1 === render.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined."
        );
        null != render && null != render.defaultProps && console.error(
          "forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?"
        );
        var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render }, ownName;
        Object.defineProperty(elementType, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
          }
        });
        return elementType;
      };
      exports2.isValidElement = isValidElement;
      exports2.lazy = function(ctor) {
        ctor = { _status: -1, _result: ctor };
        var lazyType = {
          $$typeof: REACT_LAZY_TYPE,
          _payload: ctor,
          _init: lazyInitializer
        }, ioInfo = {
          name: "lazy",
          start: -1,
          end: -1,
          value: null,
          owner: null,
          debugStack: Error("react-stack-top-frame"),
          debugTask: console.createTask ? console.createTask("lazy()") : null
        };
        ctor._ioInfo = ioInfo;
        lazyType._debugInfo = [{ awaited: ioInfo }];
        return lazyType;
      };
      exports2.memo = function(type, compare) {
        null == type && console.error(
          "memo: The first argument must be a component. Instead received: %s",
          null === type ? "null" : typeof type
        );
        compare = {
          $$typeof: REACT_MEMO_TYPE,
          type,
          compare: void 0 === compare ? null : compare
        };
        var ownName;
        Object.defineProperty(compare, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
          }
        });
        return compare;
      };
      exports2.startTransition = startTransition;
      exports2.unstable_useCacheRefresh = function() {
        return resolveDispatcher().useCacheRefresh();
      };
      exports2.use = function(usable) {
        return resolveDispatcher().use(usable);
      };
      exports2.useActionState = function(action, initialState, permalink) {
        return resolveDispatcher().useActionState(
          action,
          initialState,
          permalink
        );
      };
      exports2.useCallback = function(callback, deps) {
        return resolveDispatcher().useCallback(callback, deps);
      };
      exports2.useContext = function(Context) {
        var dispatcher = resolveDispatcher();
        Context.$$typeof === REACT_CONSUMER_TYPE && console.error(
          "Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?"
        );
        return dispatcher.useContext(Context);
      };
      exports2.useDebugValue = function(value, formatterFn) {
        return resolveDispatcher().useDebugValue(value, formatterFn);
      };
      exports2.useDeferredValue = function(value, initialValue) {
        return resolveDispatcher().useDeferredValue(value, initialValue);
      };
      exports2.useEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useEffect(create, deps);
      };
      exports2.useEffectEvent = function(callback) {
        return resolveDispatcher().useEffectEvent(callback);
      };
      exports2.useId = function() {
        return resolveDispatcher().useId();
      };
      exports2.useImperativeHandle = function(ref, create, deps) {
        return resolveDispatcher().useImperativeHandle(ref, create, deps);
      };
      exports2.useInsertionEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useInsertionEffect(create, deps);
      };
      exports2.useLayoutEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useLayoutEffect(create, deps);
      };
      exports2.useMemo = function(create, deps) {
        return resolveDispatcher().useMemo(create, deps);
      };
      exports2.useOptimistic = function(passthrough, reducer) {
        return resolveDispatcher().useOptimistic(passthrough, reducer);
      };
      exports2.useReducer = function(reducer, initialArg, init) {
        return resolveDispatcher().useReducer(reducer, initialArg, init);
      };
      exports2.useRef = function(initialValue) {
        return resolveDispatcher().useRef(initialValue);
      };
      exports2.useState = function(initialState) {
        return resolveDispatcher().useState(initialState);
      };
      exports2.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
        return resolveDispatcher().useSyncExternalStore(
          subscribe,
          getSnapshot,
          getServerSnapshot
        );
      };
      exports2.useTransition = function() {
        return resolveDispatcher().useTransition();
      };
      exports2.version = "19.3.0";
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    })();
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports2, module2) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module2.exports = require_react_production();
    } else {
      module2.exports = require_react_development();
    }
  }
});

// tools/probe-features/features-entry.ts
var features_entry_exports = {};
__export(features_entry_exports, {
  ACHIEVEMENT_ICON_BASE: () => ACHIEVEMENT_ICON_BASE,
  ACH_FAILED_META_KEY: () => ACH_FAILED_META_KEY,
  ACH_MAX_RETRY: () => ACH_MAX_RETRY,
  BACKUP_PREFIX: () => BACKUP_PREFIX,
  DASHBOARD_CARDS: () => DASHBOARD_CARDS,
  DATA_PACK_FORMAT: () => DATA_PACK_FORMAT,
  DATA_PACK_VERSION: () => DATA_PACK_VERSION,
  DEFAULT_START_MINUTE_OF_DAY: () => DEFAULT_START_MINUTE_OF_DAY,
  DIAGNOSE_TARGETS: () => DIAGNOSE_TARGETS,
  MANUAL_MAX_MINUTES: () => MANUAL_MAX_MINUTES,
  MANUAL_MIN_MINUTES: () => MANUAL_MIN_MINUTES,
  MIGRATIONS: () => MIGRATIONS,
  NOTE_MAX_LEN: () => NOTE_MAX_LEN,
  SAMPLE_KEEP_DAYS: () => SAMPLE_KEEP_DAYS,
  SCHEMA_VERSION: () => SCHEMA_VERSION,
  SNAPSHOT_KEEP_ROWS: () => SNAPSHOT_KEEP_ROWS,
  SteamHttpError: () => SteamHttpError,
  achievementSavings: () => achievementSavings,
  addManualSession: () => addManualSession,
  all: () => all,
  applyDataPack: () => applyDataPack,
  backupStatus: () => backupStatus,
  backupsDir: () => backupsDir,
  buildDataPack: () => buildDataPack,
  buildVerdict: () => buildVerdict,
  clearCache: () => clearCache,
  clearCoverCache: () => clearCoverCache,
  clearNote: () => clearNote,
  configWarning: () => configWarning,
  coverCacheStats: () => coverCacheStats,
  currentLogFile: () => currentLogFile,
  databaseFileSize: () => databaseFileSize,
  detectAccountSwitch: () => detectAccountSwitch,
  diagnoseNetwork: () => diagnoseNetwork,
  exec: () => exec,
  expandAchievement: () => expandAchievement,
  flushLogs: () => flushLogs,
  get: () => get,
  getDatabaseHealth: () => getDatabaseHealth,
  getMeta: () => getMeta,
  initDatabase: () => initDatabase,
  initLogger: () => initLogger,
  lastSnapshot: () => lastSnapshot,
  libraryValue: () => libraryValue,
  listAppSessions: () => listAppSessions,
  listLogFiles: () => listLogFiles,
  listNotes: () => listNotes,
  listPicks: () => listPicks,
  loadRetries: () => loadRetries,
  loadSnapshot: () => loadSnapshot,
  logError: () => logError,
  logInfo: () => logInfo,
  logsDir: () => logsDir,
  markWishlistNotified: () => markWishlistNotified,
  maybeBackup: () => maybeBackup,
  normalizeSettings: () => normalizeSettings,
  parseDataPack: () => parseDataPack,
  parseProxyEndpoint: () => parseProxyEndpoint,
  pickKey: () => pickKey,
  planAchievementTargets: () => planAchievementTargets,
  planNotifications: () => planNotifications,
  priceLowest: () => priceLowest,
  priceTrend: () => priceTrend,
  pruneBackupFiles: () => pruneBackupFiles,
  prunePickedUnlocked: () => prunePickedUnlocked,
  pruneSamples: () => pruneSamples,
  purgePreviousAccount: () => purgePreviousAccount,
  rarestUnlocked: () => rarestUnlocked,
  readLogTail: () => readLogTail,
  removeManualSession: () => removeManualSession,
  run: () => run,
  runBackup: () => runBackup,
  saveNote: () => saveNote,
  saveRetries: () => saveRetries,
  saveSnapshot: () => saveSnapshot,
  saveUser: () => saveUser,
  setMeta: () => setMeta,
  stampGameOwners: () => stampGameOwners,
  toCoverCacheUrl: () => toCoverCacheUrl,
  toSnapshotAchievement: () => toSnapshotAchievement,
  togglePick: () => togglePick,
  transaction: () => transaction,
  vacuum: () => vacuum,
  visibleCards: () => visibleCards
});
module.exports = __toCommonJS(features_entry_exports);

// electron/main/net-diagnose.ts
var import_node_net = __toESM(require("node:net"));

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
        const raw = Buffer.concat(chunks);
        finish({ ok: status < 500, status, body: raw.toString("utf8"), raw, error: null });
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
          const raw = Buffer.concat(chunks);
          resolve({ ok: status !== null && status < 500, status, body: raw.toString("utf8"), raw, error: null, via: "node" });
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
async function proxyLabel(url) {
  if (!import_electron.app.isReady()) return "\u672A\u77E5";
  try {
    const raw = await import_electron.session.defaultSession.resolveProxy(url);
    const first = raw.split(";")[0].trim();
    if (!first || /^DIRECT$/i.test(first)) return "\u76F4\u8FDE";
    const mt = first.match(/^(PROXY|HTTPS|SOCKS5?|SOCKS4)\s+(\S+)$/i);
    return mt ? mt[2] : first;
  } catch {
    return "\u672A\u77E5";
  }
}

// electron/main/settings.ts
var import_node_fs = __toESM(require("node:fs"));
var import_electron3 = require("electron");

// src/types/steam.ts
var ACHIEVEMENT_ICON_BASE = "https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/";
var ACHIEVEMENT_ICON_RE = /^https?:\/\/[^/]+\/steamcommunity\/public\/images\/apps\/\d+\/(.+)$/;
function toSnapshotAchievement(a) {
  const cut = (url) => ACHIEVEMENT_ICON_RE.exec(url)?.[1] ?? url;
  const { iconUrl, iconGrayUrl, ...rest } = a;
  return { ...rest, iconFile: cut(iconUrl), iconGrayFile: cut(iconGrayUrl) };
}
function expandAchievement(a) {
  const { iconFile, iconGrayFile, ...rest } = a;
  const full = (file) => !file || /^https?:/i.test(file) ? file : `${ACHIEVEMENT_ICON_BASE}${a.appId}/${file}`;
  return { ...rest, iconUrl: full(iconFile), iconGrayUrl: full(iconGrayFile) };
}
function achievementSavings(a) {
  const s = toSnapshotAchievement(a);
  return a.iconUrl.length + a.iconGrayUrl.length - s.iconFile.length - s.iconGrayFile.length;
}
var DEFAULT_SETTINGS = {
  autoLaunch: false,
  minimizeToTray: true,
  autoSync: true,
  syncIntervalMin: 30,
  notifyWishlistDrop: true,
  notifyHistoricalLow: true,
  notifyFreeGame: true,
  notifyAchievementHunt: true,
  priceAlerts: [],
  theme: "dark",
  steamApiKey: "",
  steamId: "",
  personaName: "",
  avatarUrl: "",
  countryCode: "CN",
  enableDemoData: true,
  accountSwitchPolicy: "clear",
  autoBackup: true,
  autoBackupKeep: 7
};

// electron/main/paths.ts
var import_node_path = __toESM(require("node:path"));
var import_electron2 = require("electron");
var userDataDir = import_electron2.app.getPath("userData");
var dbPath = import_node_path.default.join(userDataDir, "steam-insight.db");
var settingsPath = import_node_path.default.join(userDataDir, "settings.json");
var appVersion = import_electron2.app.getVersion();

// electron/main/settings.ts
var cache = load();
function sanitizeAlerts(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const a = item;
    const appId = Number(a.appId);
    const thresholdCents = Number(a.thresholdCents);
    if (!Number.isInteger(appId) || appId <= 0) continue;
    if (!Number.isFinite(thresholdCents) || thresholdCents < 0) continue;
    const notifiedAt = Number(a.notifiedAt);
    const notifiedPriceCents = Number(a.notifiedPriceCents);
    out.push({
      appId,
      thresholdCents: Math.round(thresholdCents),
      notifiedAt: Number.isFinite(notifiedAt) && notifiedAt > 0 ? Math.round(notifiedAt) : null,
      notifiedPriceCents: Number.isFinite(notifiedPriceCents) && notifiedPriceCents >= 0 ? Math.round(notifiedPriceCents) : null
    });
  }
  return out;
}
function normalizeSettings(raw) {
  const merged = { ...DEFAULT_SETTINGS, ...raw ?? {} };
  merged.priceAlerts = sanitizeAlerts(merged.priceAlerts);
  if (![15, 30, 60].includes(merged.syncIntervalMin)) merged.syncIntervalMin = DEFAULT_SETTINGS.syncIntervalMin;
  if (typeof merged.countryCode !== "string" || !/^[A-Za-z]{2}$/.test(merged.countryCode)) merged.countryCode = DEFAULT_SETTINGS.countryCode;
  if (merged.accountSwitchPolicy !== "clear" && merged.accountSwitchPolicy !== "keep") {
    merged.accountSwitchPolicy = DEFAULT_SETTINGS.accountSwitchPolicy;
  }
  if (!Number.isFinite(merged.autoBackupKeep) || merged.autoBackupKeep < 1) merged.autoBackupKeep = DEFAULT_SETTINGS.autoBackupKeep;
  merged.autoBackupKeep = Math.min(30, Math.max(1, Math.round(merged.autoBackupKeep)));
  merged.autoBackup = Boolean(merged.autoBackup);
  return merged;
}
function load() {
  try {
    const raw = import_node_fs.default.readFileSync(settingsPath, "utf8");
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
function getSettings() {
  return { ...cache };
}

// electron/main/logger.ts
var import_node_fs2 = __toESM(require("node:fs"));
var import_node_path2 = __toESM(require("node:path"));
var import_electron4 = require("electron");
var RETENTION_DAYS = 7;
var FLUSH_DELAY_MS = 400;
var dir = "";
var ready = false;
var buffer = [];
var flushTimer = null;
function logsDir() {
  return dir || (dir = import_node_path2.default.join(userDataDir, "logs"));
}
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function currentLogFile() {
  return import_node_path2.default.join(logsDir(), `app-${ymd(/* @__PURE__ */ new Date())}.log`);
}
function stamp() {
  const d = /* @__PURE__ */ new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${ymd(d)} ${hh}:${mm}:${ss}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}
function renderExtra(extra) {
  if (!extra) return "";
  const parts = [];
  for (const [k, v] of Object.entries(extra)) {
    if (v === void 0) continue;
    const text = v === null ? "null" : typeof v === "object" ? JSON.stringify(v) : String(v);
    parts.push(`${k}=${text.replace(/\s*\r?\n\s*/g, " ")}`);
  }
  return parts.length ? " " + parts.join(" ") : "";
}
function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushLogs();
  }, FLUSH_DELAY_MS);
  flushTimer.unref?.();
}
function flushLogs() {
  if (!buffer.length) return;
  const text = buffer.join("");
  buffer.length = 0;
  try {
    import_node_fs2.default.appendFileSync(currentLogFile(), text, "utf8");
  } catch {
  }
}
function log(level, tag, message, extra) {
  buffer.push(`${stamp()} [${level.padEnd(5)}] [${tag}] ${message}${renderExtra(extra)}
`);
  if (buffer.length >= 200) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushLogs();
    return;
  }
  scheduleFlush();
}
var logInfo = (tag, message, extra) => log("INFO", tag, message, extra);
var logWarn = (tag, message, extra) => log("WARN", tag, message, extra);
var logError = (tag, message, extra) => log("ERROR", tag, message, extra);
function pruneOldLogs() {
  const cutoff = /* @__PURE__ */ new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffKey = ymd(cutoff);
  let removed = 0;
  try {
    for (const name of import_node_fs2.default.readdirSync(logsDir())) {
      const m = /^app-(\d{4}-\d{2}-\d{2})\.log$/.exec(name);
      if (!m) continue;
      if (m[1] < cutoffKey) {
        try {
          import_node_fs2.default.unlinkSync(import_node_path2.default.join(logsDir(), name));
          removed += 1;
        } catch {
        }
      }
    }
  } catch {
  }
  return removed;
}
function installCrashHandlers() {
  process.on("uncaughtException", (err) => {
    logError("crash", "uncaughtException", { name: err.name, message: err.message, stack: err.stack });
    flushLogs();
    try {
      import_electron4.dialog.showErrorBox("Steam Insight \u9047\u5230\u672A\u5904\u7406\u7684\u9519\u8BEF", `${err.name}: ${err.message}

\u8BE6\u7EC6\u65E5\u5FD7\uFF1A${currentLogFile()}`);
    } catch {
    }
    import_electron4.app.exit(1);
  });
  process.on("unhandledRejection", (reason2) => {
    const message = reason2 instanceof Error ? reason2.message : String(reason2);
    const stack = reason2 instanceof Error ? reason2.stack : void 0;
    logError("crash", "unhandledRejection", { message, stack });
    flushLogs();
  });
}
function initLogger() {
  if (ready) return;
  ready = true;
  try {
    import_node_fs2.default.mkdirSync(logsDir(), { recursive: true });
  } catch {
  }
  const removed = pruneOldLogs();
  logInfo("app", "\u65E5\u5FD7\u7CFB\u7EDF\u542F\u52A8", { dir: logsDir(), retentionDays: RETENTION_DAYS, pruned: removed, version: import_electron4.app.getVersion() });
  installCrashHandlers();
  flushLogs();
}
function readLogTail(maxLines = 400) {
  try {
    const text = import_node_fs2.default.readFileSync(currentLogFile(), "utf8");
    const lines = text.split(/\r?\n/).filter((l) => l !== "");
    return lines.slice(-maxLines);
  } catch {
    return [];
  }
}
function listLogFiles() {
  try {
    return import_node_fs2.default.readdirSync(logsDir()).filter((n) => /^app-\d{4}-\d{2}-\d{2}\.log$/.test(n)).sort().map((name) => {
      let bytes = 0;
      try {
        bytes = import_node_fs2.default.statSync(import_node_path2.default.join(logsDir(), name)).size;
      } catch {
      }
      return { name, bytes };
    });
  } catch {
    return [];
  }
}

// electron/main/net-diagnose.ts
var DIAGNOSE_TARGETS = [
  { label: "api.steampowered.com", url: "https://api.steampowered.com/ISteamWebAPIUtil/GetServerInfo/v1/", kind: "api" },
  { label: "steamcommunity.com", url: "https://steamcommunity.com/openid/login", kind: "community" },
  { label: "store.steampowered.com", url: "https://store.steampowered.com/api/appdetails?appids=570&cc=cn&l=schinese", kind: "store" },
  { label: "avatars.steamstatic.com", url: "https://avatars.steamstatic.com/", kind: "cdn" },
  { label: "cdn.cloudflare.steamstatic.com", url: "https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg", kind: "cdn" }
];
function probeTcp(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok) => {
      if (!settled) {
        settled = true;
        resolve(ok);
      }
    };
    let socket;
    try {
      socket = import_node_net.default.connect({ host, port });
    } catch {
      done(false);
      return;
    }
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => {
      socket.destroy();
      done(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      done(false);
    });
    socket.on("error", () => {
      done(false);
    });
  });
}
function parseProxyEndpoint(proxy) {
  const text = proxy.trim();
  if (!text || text === "\u76F4\u8FDE" || text === "\u672A\u77E5") return null;
  const m = /^\[?([^\][:]+)\]?:(\d{1,5})$/.exec(text);
  if (!m) return null;
  const port = Number(m[2]);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return null;
  return { host: m[1], port };
}
async function runCheck(target) {
  const started = Date.now();
  const res = await fetchText(target.url, { timeoutMs: 1e4 });
  const ms = Date.now() - started;
  const ok = res.ok && res.status !== null && res.status < 500;
  return { label: target.label, kind: target.kind, ok, status: res.status, via: res.via, ms, error: res.error };
}
function looksLikeLocalRefusal(text) {
  return /127\.0\.0\.1|ECONNREFUSED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_CLOSED|ECONNRESET/i.test(text);
}
function buildVerdict(checks, proxy, proxyReachable) {
  const total = checks.length;
  const failed = checks.filter((c) => !c.ok);
  const okCount = total - failed.length;
  const median = (list) => {
    if (!list.length) return 0;
    const sorted = [...list].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  if (okCount === total) {
    const via = proxy === "\u76F4\u8FDE" ? "\u76F4\u8FDE" : `\u7ECF\u4EE3\u7406 ${proxy}`;
    return {
      level: "ok",
      title: "\u7F51\u7EDC\u6B63\u5E38",
      detail: `${total}/${total} \u4E2A\u57DF\u540D\u53EF\u8FBE \xB7 ${via} \xB7 \u4E2D\u4F4D\u8017\u65F6 ${median(checks.map((c) => c.ms))}ms`,
      actions: []
    };
  }
  const failedKinds = new Set(failed.map((c) => c.kind));
  const allErrors = failed.map((c) => c.error ?? `HTTP ${c.status ?? "\u2014"}`).join(" / ");
  if (okCount === 0) {
    if (proxyReachable === false && proxy !== "\u76F4\u8FDE") {
      return {
        level: "error",
        title: `\u7CFB\u7EDF\u4EE3\u7406\u6307\u5411 ${proxy}\uFF0C\u4F46\u8BE5\u7AEF\u53E3\u6CA1\u6709\u7A0B\u5E8F\u5728\u76D1\u542C`,
        detail: "\u8BF7\u6C42\u5168\u90E8\u5361\u5728\u4E00\u4E2A\u5DF2\u7ECF\u9000\u51FA\u7684\u4EE3\u7406\u4E0A\u3002\u8FD9\u4E5F\u662F Steam \u5BA2\u6237\u7AEF\u4F1A\u6389\u7EBF\u5E76\u8F6C\u5165\u79BB\u7EBF\u7684\u5E38\u89C1\u6210\u56E0\u3002",
        actions: [
          `\u91CD\u65B0\u6253\u5F00\u4EE3\u7406\u5BA2\u6237\u7AEF\uFF08VPN / Clash / Watt \u7B49\uFF09\uFF0C\u786E\u8BA4\u5B83\u6062\u590D\u76D1\u542C ${proxy}`,
          "\u6216\u5173\u95ED\u7CFB\u7EDF\u624B\u52A8\u4EE3\u7406\uFF1AWindows \u8BBE\u7F6E \u2192 \u7F51\u7EDC\u548C Internet \u2192 \u4EE3\u7406 \u2192 \u624B\u52A8\u8BBE\u7F6E\u4EE3\u7406"
        ]
      };
    }
    if (failed.some((c) => looksLikeLocalRefusal(c.error ?? ""))) {
      return {
        level: "error",
        title: "Steam \u57DF\u540D\u88AB\u89E3\u6790\u5230 127.0.0.1\uFF0C\u4F46\u90A3\u91CC\u6CA1\u6709\u7A0B\u5E8F\u5E94\u7B54",
        detail: "\u8FD9\u662F\u52A0\u901F\u5668\uFF08Steam++ / Watt Toolkit\uFF09\u9000\u51FA\u540E\u6B8B\u7559 hosts \u52AB\u6301\u7684\u5178\u578B\u8868\u73B0\uFF1A\u57DF\u540D\u6307\u5411\u672C\u673A\uFF0C\u672C\u5730\u53CD\u4EE3\u5374\u5DF2\u505C\u6B62\u3002",
        actions: [
          "\u6253\u5F00 Steam++ / Watt Toolkit \u5E76\u786E\u8BA4\u52A0\u901F\u5DF2\u5F00\u542F\uFF08\u5B83\u4F1A\u91CD\u65B0\u63A5\u7BA1 80/443 \u672C\u5730\u53CD\u4EE3\uFF09",
          "\u6216\u5728\u52A0\u901F\u5668\u91CC\u70B9\u300C\u8FD8\u539F hosts\u300D\uFF0C\u4E4B\u540E\u6539\u7528\u5176\u5B83\u65B9\u5F0F\u8BBF\u95EE Steam"
        ]
      };
    }
    return {
      level: "error",
      title: "\u65E0\u6CD5\u8BBF\u95EE Steam",
      detail: allErrors,
      actions: ["\u786E\u8BA4\u8FD9\u53F0\u673A\u5668\u5DF2\u8054\u7F51", "\u786E\u8BA4\u6CA1\u6709\u5B89\u5168\u8F6F\u4EF6 / \u9632\u706B\u5899\u62E6\u622A Steam \u57DF\u540D", "\u53EF\u70B9\u300C\u91CD\u65B0\u68C0\u6D4B\u300D\u91CD\u8BD5\u4E00\u6B21"]
    };
  }
  const business = ["api", "community", "store"];
  const businessAllFailed = business.every((k) => failedKinds.has(k));
  const cdnAllOk = checks.filter((c) => c.kind === "cdn").every((c) => c.ok);
  if (businessAllFailed && cdnAllOk) {
    return {
      level: "warn",
      title: "\u52A0\u901F\u5668\u4F3C\u4E4E\u6CA1\u5728\u8FD0\u884C\uFF1ASteam \u57DF\u540D\u4E0D\u53EF\u8FBE\uFF0C\u4F46\u56FE\u7247 CDN \u6B63\u5E38",
      detail: "\u5C01\u9762\u80FD\u663E\u793A\u3001\u540C\u6B65\u4E00\u5B9A\u5931\u8D25 \u2014\u2014 \u56E0\u4E3A CDN \u57DF\u540D\u4E0D\u5728\u52A0\u901F\u5668\u7684 hosts \u52AB\u6301\u540D\u5355\u91CC\uFF0C\u4E1A\u52A1\u57DF\u540D\u5374\u5728\u3002",
      actions: [
        "\u6253\u5F00 Steam++ / Watt Toolkit \u5E76\u786E\u8BA4\u52A0\u901F\u5DF2\u5F00\u542F",
        "\u6216\u5728\u52A0\u901F\u5668\u91CC\u70B9\u300C\u8FD8\u539F hosts\u300D\u540E\u91CD\u65B0\u68C0\u6D4B"
      ]
    };
  }
  return {
    level: "warn",
    title: `\u90E8\u5206\u57DF\u540D\u4E0D\u53EF\u8FBE\uFF08${okCount}/${total} \u901A\uFF09`,
    detail: `\u4E0D\u53EF\u8FBE\uFF1A${failed.map((c) => c.label).join("\u3001")} \u2014\u2014 ${allErrors}`,
    actions: ["\u70B9\u300C\u91CD\u65B0\u68C0\u6D4B\u300D\u91CD\u8BD5\u4E00\u6B21\uFF0C\u7F51\u7EDC\u6296\u52A8\u4E0E\u4EE3\u7406\u5207\u6362\u90FD\u4F1A\u9020\u6210\u5076\u53D1\u5931\u8D25"]
  };
}
function configWarning(level, config) {
  if (level === "ok" && !config.apiKeySet && config.activeSource !== "api") {
    return "\u7F51\u7EDC\u6B63\u5E38\uFF0C\u4F46\u5C1A\u672A\u586B\u5199 Steam Web API Key\uFF08\u4E5F\u6CA1\u6709\u767B\u5F55\u6001\uFF09\u2014\u2014 \u5F53\u524D\u53EA\u80FD\u770B\u5185\u7F6E\u6F14\u793A\u6570\u636E\u3002\u53EF\u5728\u300CSteam \u8D26\u53F7\u4E0E API\u300D\u91CC\u586B\u5165 Key\uFF0C\u5E76\u628A Steam \u9690\u79C1\u8BBE\u7F6E\u4E2D\u7684\u300C\u6E38\u620F\u8BE6\u60C5\u300D\u8BBE\u4E3A\u516C\u5F00\u3002";
  }
  if (level === "ok" && !config.steamIdSet) {
    return "\u5C1A\u672A\u786E\u5B9A SteamID64\u3002\u53EF\u70B9\u767B\u5F55\u6309\u94AE\u7528 OpenID \u786E\u8BA4\u8EAB\u4EFD\uFF0C\u6216\u624B\u52A8\u586B\u5199\u3002";
  }
  return null;
}
async function diagnoseNetwork() {
  const started = Date.now();
  const proxy = await proxyLabel(DIAGNOSE_TARGETS[0].url).catch(() => "\u672A\u77E5");
  const endpoint = parseProxyEndpoint(proxy);
  const proxyReachable = endpoint ? await probeTcp(endpoint.host, endpoint.port) : null;
  const checks = await Promise.all(DIAGNOSE_TARGETS.map(runCheck));
  const verdict = buildVerdict(checks, proxy, proxyReachable);
  const s = getSettings();
  const config = {
    apiKeySet: s.steamApiKey.trim().length > 0,
    steamIdSet: s.steamId.trim().length > 0,
    demoDataEnabled: s.enableDemoData,
    autoSync: s.autoSync,
    syncIntervalMin: s.syncIntervalMin,
    activeSource: s.steamId && s.steamApiKey ? "api" : s.enableDemoData ? "demo" : "local"
  };
  const result = {
    checkedAt: Date.now(),
    proxy,
    proxyReachable,
    checks,
    okCount: checks.filter((c) => c.ok).length,
    total: checks.length,
    level: verdict.level,
    title: verdict.title,
    detail: verdict.detail,
    actions: verdict.actions,
    config,
    configWarning: configWarning(verdict.level, config)
  };
  logInfo("net", "\u8FDE\u901A\u6027\u81EA\u68C0\u5B8C\u6210", {
    level: result.level,
    ok: `${result.okCount}/${result.total}`,
    proxy,
    proxyReachable,
    elapsedMs: Date.now() - started
  });
  return result;
}

// electron/main/datapack.ts
var import_electron5 = require("electron");

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
  synced_at         INTEGER,
  -- F-6\uFF1ASteam \u7B49\u7EA7\u4E0E\u5FBD\u7AE0\uFF08v5 \u8FC1\u79FB\u8865\u7684\u5217\uFF1B\u53D6\u503C\u6BCF\u6B21\u540C\u6B65\u8986\u76D6\uFF09
  level             INTEGER NOT NULL DEFAULT 0,
  badge_count       INTEGER NOT NULL DEFAULT 0,
  badge_xp          INTEGER NOT NULL DEFAULT 0,
  player_xp         INTEGER NOT NULL DEFAULT 0,
  xp_to_next        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS games (
  app_id                INTEGER PRIMARY KEY,
  /**
   * \u8FD9\u4E00\u884C\u5C5E\u4E8E\u54EA\u4E2A Steam \u8D26\u53F7\u3002**\u4E0D\u53C2\u4E0E\u4E3B\u952E**\uFF08\u6539\u4E3B\u952E\u9700\u8981\u91CD\u5EFA\u6574\u8868 + \u6539\u52A8\u6240\u6709\u67E5\u8BE2\uFF0C
   * \u89C1 docs/ROADMAP-V2.md \u7684\u8BF4\u660E\uFF09\uFF0C\u53EA\u7528\u4E8E\u300C\u6362\u8D26\u53F7\u300D\u68C0\u6D4B\uFF1A
   * \u5E93\u91CC\u7684 steam_id \u4E0E\u5F53\u524D\u8BBE\u7F6E\u4E0D\u4E00\u81F4\u65F6\uFF0C\u754C\u9762\u660E\u786E\u544A\u77E5\u300C\u6574\u5E93\u5C06\u88AB\u65B0\u8D26\u53F7\u66FF\u6362\u300D\uFF0C
   * \u800C\u4E0D\u662F\u8BA9\u7528\u6237\u53D1\u73B0 69 \u6B3E\u6E38\u620F\u65E0\u58F0\u6D88\u5931\u3002
   * \u7A7A\u4E32 = \u672C\u6B21\u8FC1\u79FB\u524D\u5199\u5165\u7684\u5386\u53F2\u884C\uFF08\u6765\u6E90\u672A\u77E5\uFF09\u3002
   */
  steam_id              TEXT NOT NULL DEFAULT '',
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
  notified_at         INTEGER,
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

-- \u6CE8\uFF1A\u8FD9\u91CC\u6CA1\u6709 reports \u8868\u3002\u5B83\u81EA\u5EFA\u6210\u8D77\u4ECE\u65E0\u4EBA\u5199\u5165\uFF0Cv4 \u8FC1\u79FB\u5DF2\u628A\u5B83 DROP \u6389\uFF08\u89C1 MIGRATIONS[4]\uFF09\u3002
CREATE TABLE IF NOT EXISTS snapshots (
  app_id           INTEGER NOT NULL,
  captured_at      INTEGER NOT NULL,
  playtime_minutes INTEGER NOT NULL,
  -- v7\uFF08V5/O-1\uFF09\uFF1A\u8FD9\u884C\u5FEB\u7167\u5C5E\u4E8E\u54EA\u4E2A\u8D26\u53F7\u3002\u4E0E games.steam_id \u540C\u7B56\u7565\uFF1A\u4E0D\u53C2\u4E0E\u4E3B\u952E\uFF08\u6539\u4E3B\u952E\u8981\u91CD\u5EFA\u6574\u8868\uFF09\uFF0C
  -- \u7A7A\u4E32 = v7 \u4E4B\u524D\u5199\u5165\u7684\u5386\u53F2\u884C\u3002\u6709\u4E86\u5B83\uFF0C\u6362\u8D26\u53F7\u6E05\u7406\u4ECE\u300C\u6574\u8868 DELETE\u300D\u53D8\u6210\u6309\u8D26\u53F7\u7CBE\u786E\u5220\uFF0C
  -- \u5DEE\u5206\u57FA\u51C6\u4E5F\u53EA\u8BFB\u5F53\u524D\u8D26\u53F7\u7684\u884C \u2014\u2014 \u65E7\u8D26\u53F7\u7684 playtime \u4E0D\u518D\u53EF\u80FD\u88AB\u5F53\u6210\u65B0\u8D26\u53F7\u7684\u5DEE\u5206\u57FA\u51C6\u751F\u6210\u5E7D\u7075\u4F1A\u8BDD\u3002
  steam_id         TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (app_id, captured_at)
);

-- \u4E3B\u8FDB\u7A0B\u81EA\u5DF1\u8981\u7528\u7684\u5C0F\u72B6\u6001\uFF08\u952E\u503C\u5BF9\uFF09\u3002\u4E0E\u4E1A\u52A1\u6570\u636E\u5206\u5F00\u5B58\uFF0C\u6E05\u7F13\u5B58 / \u5168\u91CF\u91CD\u7B97\u65F6**\u4E0D**\u88AB\u6E05\u6389\u3002
-- \u5F53\u524D\u7528\u9014\uFF1A\u8BB0\u5F55\u300C\u7A00\u6709\u6210\u5C31\u8FFD\u730E\u63D0\u9192\u4E0A\u6B21\u5F39\u51FA\u7684\u65E5\u671F\u300D\uFF0C\u5B9E\u73B0\u300C\u6BCF\u5929\u6700\u591A\u4E00\u6B21\u300D\u3002
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- \u300C\u6211\u7684\u8BC4\u5206\u4E0E\u7B14\u8BB0\u300D\uFF1A\u7528\u6237\u81EA\u5DF1\u7ED9\u6E38\u620F\u6253\u5206\u3001\u5199\u5907\u6CE8\u3002\u7EAF\u672C\u5730\uFF0C\u4E0D\u8FDB\u6570\u636E\u5305\u4E4B\u5916\u7684\u4EFB\u4F55\u7F51\u7EDC\u3002
-- \u4E3A\u4EC0\u4E48\u5355\u72EC\u5EFA\u8868\u800C\u4E0D\u662F\u585E\u8FDB games\uFF1A\u8FD9\u4E9B\u662F**\u7528\u6237\u4EA7\u751F\u7684**\u5185\u5BB9\uFF0C\u4E0E Steam \u540C\u6B65\u4E0B\u6765\u7684\u6570\u636E\u751F\u547D\u5468\u671F\u4E0D\u540C \u2014\u2014
-- \u51FA\u5E93 / \u6362\u8D26\u53F7 / \u6E05\u7F13\u5B58\u91CD\u65B0\u540C\u6B65\u90FD\u4E0D\u5E94\u8BE5\u628A\u5B83\u4EEC\u6D17\u6389\uFF08games \u884C\u4F1A\u88AB purgeStale \u5220\u9664\uFF09\u3002
CREATE TABLE IF NOT EXISTS game_notes (
  app_id     INTEGER PRIMARY KEY,
  rating     INTEGER NOT NULL DEFAULT 0,
  note       TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT '',
  tags       TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL
);

-- \u300C\u6211\u7684\u8FFD\u730E\u6E05\u5355\u300D\uFF1A\u624B\u52A8\u6311\u51E0\u4E2A\u7A00\u6709\u6210\u5C31\u76EF\u7740\u3002\u9ED8\u8BA4\u6E05\u5355\u662F\u5168\u81EA\u52A8\u7B97\u7684\uFF08isRare && !unlocked\uFF09\uFF0C
-- \u8FD9\u5F20\u8868\u8BB0\u5F55\u7528\u6237\u989D\u5916\u624B\u52A8\u52FE\u9009\u7684\u90A3\u4E9B\uFF1B\u4E3B\u952E\u4E0E achievements \u5BF9\u9F50\uFF0C\u907F\u514D\u6307\u5411\u4E0D\u5B58\u5728\u7684\u6210\u5C31\u3002
CREATE TABLE IF NOT EXISTS hunt_picks (
  app_id    INTEGER NOT NULL,
  api_name  TEXT NOT NULL,
  added_at  INTEGER NOT NULL,
  PRIMARY KEY (app_id, api_name)
);
`;
var SCHEMA_VERSION = 7;
var MIGRATIONS = {
  1: `ALTER TABLE discounts ADD COLUMN notified_at INTEGER;`,
  // CREATE TABLE IF NOT EXISTS 天然幂等：重复执行不会报错（迁移号没写进去时也能自愈）
  2: `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
  /**
   * v3 = 「采样保留策略 + 笔记/追猎表」。
   *
   * 这里**必须有一条语句**（哪怕没有 DDL 变更）：`migrate()` 对缺失的版本号是 `continue`，
   * 留空会让老库永远停在 user_version=2，每次启动都重跑一遍。
   *
   * games.steam_id 用 ADD COLUMN 而不是重建主键：SQLite 改不了主键，
   * 真要 (steam_id, app_id) 联合主键就得「建新表 → 拷数据 → 删旧表 → 改名」，
   * 那会牵动所有查询、数据包与导出。取舍见 docs/ROADMAP-V2.md。
   */
  3: `CREATE TABLE IF NOT EXISTS game_notes (app_id INTEGER PRIMARY KEY, rating INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS hunt_picks (app_id INTEGER NOT NULL, api_name TEXT NOT NULL, added_at INTEGER NOT NULL, PRIMARY KEY (app_id, api_name));
      ALTER TABLE games ADD COLUMN steam_id TEXT NOT NULL DEFAULT '';`,
  /**
   * v4 = 删掉 `reports` 表（BUG-9）。
   *
   * 这张表从建库起就没人写入：`saveReport()` 与 `lastSnapshotTime()` 全仓库零调用，
   * 但 `loadSnapshot` 每次冷启动都要 `SELECT * FROM reports` 并跨 IPC 传一份恒为空的结果。
   * 年度报告是**由会话与成就现算**的（见 `buildWrapped`），留一张永远空的表只会误导后来的人
   * 以为「这里应该有个归档逻辑」。
   *
   * 这里用 DROP 而不是放任不管：空表现在无害，但下一次有人看到它就会去接一段不需要的写入逻辑。
   * 该表从未被写入任何数据，DROP 不损失任何东西。
   */
  4: `DROP TABLE IF EXISTS reports;`,
  /**
   * v5 = `users` 补「Steam 等级 / 徽章」四列（F-6）。
   *
   * 用 ADD COLUMN + 默认值 0：等级是**每次同步覆盖**的派生数据，
   * 老行取不到时读到 0 就等于「没拉到」，界面按未显示处理即可，不需要重建表。
   */
  5: `ALTER TABLE users ADD COLUMN level INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN badge_count INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN badge_xp INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN player_xp INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN xp_to_next INTEGER NOT NULL DEFAULT 0;`,
  /**
   * v6 = `game_notes` 补「状态 / 标签」（V4 / F-4）。
   *
   * 让笔记从「纯文本 + 评分」升级成结构化：status（想玩 / 在玩 / 弃坑）和 tags。
   * 两个新列都用带默认值的 ADD COLUMN，老行读到空串 / 空数组即「未设置」，界面按未填写处理。
   * `tags` 用 JSON 字符串存（与 games.tags 同约定）。
   */
  6: `ALTER TABLE game_notes ADD COLUMN status TEXT NOT NULL DEFAULT '';
      ALTER TABLE game_notes ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';`,
  /**
   * v7 = `snapshots` 补「账号」列（V5 优化 1）。
   *
   * 与 games.steam_id（v3）同款做法：ADD COLUMN + 默认空串，不重建主键。
   * 老行（steam_id=''）是升级前写入的，属于升级前的那个账号 —— 差分基准读取时
   * 用 `steam_id = 当前 OR steam_id = ''` 兼容它们（与 loadSnapshot 读 play_sessions 的口径一致），
   * 新写入的行都带真实 steam_id；而换账号清理会把空串行一并删掉
   * （空串行必然属于「换出去的那个账号」，留着就可能给新账号当差分基准生成幽灵会话）。
   */
  7: `ALTER TABLE snapshots ADD COLUMN steam_id TEXT NOT NULL DEFAULT '';`
};

// electron/main/database.ts
var import_node_fs3 = __toESM(require("node:fs"));
var import_sql = __toESM(require_sql_wasm());
var SQL = null;
var db = null;
var flushTimer2 = null;
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
  const wasmBinary = import_node_fs3.default.readFileSync(require.resolve("sql.js/dist/sql-wasm.wasm"));
  SQL = await (0, import_sql.default)({ wasmBinary });
  if (import_node_fs3.default.existsSync(dbPath)) {
    const bytes = import_node_fs3.default.readFileSync(dbPath);
    db = new SQL.Database(bytes);
    migrate();
  } else {
    db = new SQL.Database();
    db.run(SCHEMA_SQL);
    db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    markDirty();
    flushNow();
  }
}
function schemaVersion() {
  const row = get("PRAGMA user_version");
  return row ? Number(row.user_version) || 0 : 0;
}
function migrate() {
  const from = schemaVersion();
  if (from >= SCHEMA_VERSION) return;
  for (let v = from + 1; v <= SCHEMA_VERSION; v++) {
    const sql = MIGRATIONS[v];
    if (!sql) continue;
    try {
      exec("BEGIN");
      try {
        exec(sql);
        exec(`PRAGMA user_version = ${v}`);
        exec("COMMIT");
      } catch (err) {
        try {
          exec("ROLLBACK");
        } catch {
        }
        throw err;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/duplicate column|already exists/i.test(msg)) exec(`PRAGMA user_version = ${v}`);
      else throw err;
    }
  }
}
function ensure() {
  if (!db) throw new Error("\u6570\u636E\u5E93\u672A\u521D\u59CB\u5316");
  return db;
}
function markDirty() {
  dirty = true;
  if (flushTimer2) return;
  flushTimer2 = setTimeout(() => {
    flushTimer2 = null;
    flushNow();
  }, 800);
  flushTimer2.unref?.();
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
  try {
    const bind = normalizeParams(params);
    if (bind) stmt.bind(bind);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    return rows;
  } finally {
    stmt.free();
  }
}
function get(sql, params) {
  const stmt = ensure().prepare(sql);
  try {
    const bind = normalizeParams(params);
    if (bind) stmt.bind(bind);
    const row = stmt.step() ? stmt.getAsObject() : null;
    return row;
  } finally {
    stmt.free();
  }
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
  import_node_fs3.default.writeFileSync(dbPath, Buffer.from(bytes));
  dirty = false;
}
function clearCache() {
  const derived = ["play_sessions", "achievements", "wishlist", "discounts", "price_history", "snapshots"];
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
function vacuum() {
  const before = databaseFileSize();
  ensure().run("VACUUM");
  markDirty();
  flushNow();
  return { before, after: databaseFileSize() };
}
function databaseFileSize() {
  try {
    return import_node_fs3.default.statSync(dbPath).size;
  } catch {
    return 0;
  }
}

// electron/main/datapack.ts
var SYNC_TABLES = ["users", "games", "play_sessions", "achievements", "wishlist", "discounts", "price_history", "snapshots"];
var USER_TABLES = ["game_notes", "hunt_picks"];
var TABLES = [...SYNC_TABLES, ...USER_TABLES];
var DATA_PACK_FORMAT = "steam-insight-datapack";
var DATA_PACK_VERSION = 1;
function tableColumns(table) {
  return all(`PRAGMA table_info(${table})`).map((r) => ({
    name: String(r.name),
    type: String(r.type ?? ""),
    notNull: Number(r.notnull) === 1,
    dflt: r.dflt_value === null || r.dflt_value === void 0 ? null : String(r.dflt_value)
  }));
}
function fallbackValue(col) {
  if (col.dflt !== null) return col.dflt;
  const t = col.type.toUpperCase();
  if (t.includes("INT") || t.includes("REAL") || t.includes("NUM") || t.includes("DEC") || t.includes("BOOL")) return 0;
  return "";
}
function insertRows(table, rows, cols) {
  let written = 0;
  for (const row of rows) {
    const use = [];
    const values = {};
    let fromSource = false;
    for (const col of cols) {
      if (Object.prototype.hasOwnProperty.call(row, col.name)) {
        use.push(col.name);
        values[col.name] = row[col.name] ?? null;
        fromSource = true;
      } else if (col.notNull) {
        use.push(col.name);
        values[col.name] = fallbackValue(col);
      }
    }
    if (!fromSource) continue;
    const placeholders = use.map((c) => `$${c}`).join(", ");
    run(`INSERT OR REPLACE INTO ${table} (${use.join(", ")}) VALUES (${placeholders})`, values);
    written += 1;
  }
  return written;
}
function countOf(table) {
  const row = all(`SELECT COUNT(*) AS c FROM ${table}`)[0];
  return row ? Number(row.c) || 0 : 0;
}
function buildDataPack() {
  const data = {};
  const counts = {};
  for (const t of TABLES) {
    data[t] = all(`SELECT * FROM ${t}`);
    counts[t] = data[t].length;
  }
  return {
    format: DATA_PACK_FORMAT,
    version: DATA_PACK_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    appVersion,
    steamId: getSettings().steamId || null,
    counts,
    data,
    note: "\u4E0D\u542B Steam API Key\uFF08\u8FC1\u79FB\u540E\u8BF7\u5728\u65B0\u673A\u91CD\u65B0\u586B\u5199\uFF09\u3002\u4E0D\u542B\u6D3E\u751F\u62A5\u544A\uFF0C\u5BFC\u5165\u540E\u7531\u672C\u5730\u6570\u636E\u91CD\u65B0\u751F\u6210\u3002\u542B\u4F60\u81EA\u5DF1\u7684\u8BC4\u5206 / \u7B14\u8BB0 / \u8FFD\u730E\u6E05\u5355\uFF08game_notes / hunt_picks\uFF09\u3002"
  };
}
function parseDataPack(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("\u4E0D\u662F\u5408\u6CD5\u7684 JSON \u6587\u4EF6");
  }
  if (typeof raw !== "object" || raw === null) throw new Error("\u6570\u636E\u5305\u5185\u5BB9\u4E0D\u662F\u5BF9\u8C61");
  const obj = raw;
  if (obj.format !== DATA_PACK_FORMAT) throw new Error("\u4E0D\u662F Steam Insight \u6570\u636E\u5305\uFF08format \u5B57\u6BB5\u4E0D\u5339\u914D\uFF09");
  const version = Number(obj.version);
  if (!Number.isInteger(version) || version < 1) throw new Error("\u6570\u636E\u5305\u7248\u672C\u53F7\u7F3A\u5931\u6216\u975E\u6CD5");
  if (version > DATA_PACK_VERSION) {
    throw new Error(`\u6570\u636E\u5305\u7248\u672C ${version} \u9AD8\u4E8E\u5F53\u524D\u7A0B\u5E8F\u652F\u6301\u7684 ${DATA_PACK_VERSION}\uFF0C\u8BF7\u5148\u5347\u7EA7 Steam Insight`);
  }
  const src = obj.data;
  if (typeof src !== "object" || src === null) throw new Error("\u6570\u636E\u5305\u91CC\u6CA1\u6709 data \u5B57\u6BB5");
  const data = {};
  let totalRows = 0;
  for (const t of TABLES) {
    const rows = src[t];
    if (rows === void 0) continue;
    if (!Array.isArray(rows)) throw new Error(`\u8868 ${t} \u7684\u5185\u5BB9\u4E0D\u662F\u6570\u7EC4`);
    const clean = rows.filter((r) => typeof r === "object" && r !== null && !Array.isArray(r));
    if (clean.length !== rows.length) throw new Error(`\u8868 ${t} \u91CC\u6709 ${rows.length - clean.length} \u884C\u4E0D\u662F\u5BF9\u8C61`);
    data[t] = clean;
    totalRows += clean.length;
  }
  return { pack: { ...obj, version, data }, totalRows };
}
function wipeAll() {
  for (const t of SYNC_TABLES) run(`DELETE FROM ${t}`);
}
function applyDataPack(parsed, mode) {
  const written = {};
  const before = {};
  for (const t of TABLES) before[t] = countOf(t);
  transaction(() => {
    if (mode === "replace") {
      wipeAll();
      for (const t of USER_TABLES) if (parsed.pack.data[t]) run(`DELETE FROM ${t}`);
    }
    for (const t of TABLES) {
      const rows = parsed.pack.data[t];
      if (!rows || !rows.length) continue;
      written[t] = insertRows(t, rows, tableColumns(t));
    }
  });
  flushNow();
  const after = {};
  for (const t of TABLES) after[t] = countOf(t);
  return { mode, totalRows: Object.values(written).reduce((a, b) => a + b, 0), written, before, after };
}

// electron/main/notify-plan.ts
var yuan = (cents) => `\xA5${(cents / 100).toFixed(2)}`;
function ymd2(d = /* @__PURE__ */ new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function countdown(endsAt, nowSec = Math.floor(Date.now() / 1e3)) {
  if (!endsAt || endsAt <= nowSec) return "";
  const left = endsAt - nowSec;
  const hours = left / 3600;
  if (hours >= 48) return `\u8FD8\u5269 ${Math.floor(hours / 24)} \u5929`;
  if (hours >= 24) return "\u8FD8\u5269 1 \u5929\u591A";
  if (hours >= 1) return `\u8FD8\u5269 ${Math.floor(hours)} \u5C0F\u65F6`;
  return `\u4E0D\u5230 ${Math.max(1, Math.round(left / 60))} \u5206\u949F`;
}
function gapToLow(finalCents, lowCents) {
  if (lowCents === null || lowCents === void 0 || lowCents < 0) return null;
  const gap = finalCents - lowCents;
  return gap > 0 ? gap : 0;
}
function planNotifications(snap, settings, seen) {
  const verdicts = [];
  if (settings.notifyWishlistDrop) {
    const fresh = snap.wishlist.filter(
      (w) => w.discountPercent > 0 && !w.notifiedAt && !seen.has(`wishlist:${w.appId}:${w.finalPriceCents}`)
    );
    if (fresh.length > 0) {
      const cheapest = fresh.reduce((m, w) => w.finalPriceCents < m.finalPriceCents ? w : m, fresh[0]);
      const gap = gapToLow(cheapest.finalPriceCents, cheapest.historicalLowCents);
      const gapText = gap === null ? "" : gap === 0 ? "\uFF0C\u5DF2\u8FBE\u672C\u673A\u53F2\u4F4E" : `\uFF0C\u8DDD\u672C\u673A\u53F2\u4F4E\u8FD8\u5DEE ${yuan(gap)}`;
      const body = fresh.length === 1 ? `\u300A${cheapest.name}\u300B\u964D\u5230 ${yuan(cheapest.finalPriceCents)}\uFF08\u7701 ${cheapest.discountPercent}%\uFF09${gapText}` : `${fresh.length} \u6B3E\u613F\u671B\u5355\u6E38\u620F\u6B63\u5728\u6253\u6298\uFF0C\u6700\u4F4E\u300A${cheapest.name}\u300B${yuan(cheapest.finalPriceCents)}${gapText}`;
      verdicts.push({
        title: "\u613F\u671B\u5355\u964D\u4EF7",
        body,
        route: "wishlist",
        keys: fresh.map((w) => `wishlist:${w.appId}:${w.finalPriceCents}`),
        wishlistTargets: fresh.map((w) => ({ appId: w.appId, steamId: w.steamId })),
        discountTargets: [],
        alertTargets: [],
        markHuntNotified: false
      });
    }
  }
  if (settings.notifyHistoricalLow) {
    const fresh = snap.discounts.filter(
      (d) => d.isHistoricalLow && !d.notifiedAt && !seen.has(`low:${d.appId}:${d.finalPriceCents}`)
    );
    if (fresh.length > 0) {
      const cheapest = fresh.reduce((m, d) => d.finalPriceCents < m.finalPriceCents ? d : m, fresh[0]);
      const left = countdown(cheapest.endsAt);
      const leftText = left ? `\uFF0C\u4FC3\u9500${left}` : "";
      verdicts.push({
        title: "\u53F2\u4F4E\u63D0\u9192",
        body: fresh.length === 1 ? `\u300A${cheapest.name}\u300B\u8FBE\u5230\u672C\u673A\u53F2\u4F4E ${yuan(cheapest.finalPriceCents)}${leftText}` : `${fresh.length} \u6B3E\u6E38\u620F\u8FBE\u5230\u5386\u53F2\u6700\u4F4E\u4EF7\uFF0C\u6700\u4F4E\u300A${cheapest.name}\u300B${yuan(cheapest.finalPriceCents)}${leftText}`,
        route: "store",
        keys: fresh.map((d) => `low:${d.appId}:${d.finalPriceCents}`),
        wishlistTargets: [],
        discountTargets: fresh.map((d) => d.appId),
        alertTargets: [],
        markHuntNotified: false
      });
    }
  }
  if (settings.notifyFreeGame) {
    const fresh = snap.discounts.filter(
      (d) => d.category === "free" && d.finalPriceCents === 0 && d.originalPriceCents > 0 && !d.notifiedAt && !seen.has(`free:${d.appId}`)
    );
    if (fresh.length > 0) {
      const soonest = fresh.reduce((m, d) => {
        if (!d.endsAt) return m;
        return m === null || d.endsAt < m ? d.endsAt : m;
      }, null);
      const left = countdown(soonest);
      verdicts.push({
        title: "\u9650\u65F6\u514D\u8D39",
        body: `${fresh.length} \u6B3E\u6E38\u620F\u5F53\u524D\u53EF\u514D\u8D39\u9886\u53D6${left ? `\uFF0C\u9886\u53D6\u622A\u6B62${left}` : ""}`,
        route: "store",
        keys: fresh.map((d) => `free:${d.appId}`),
        wishlistTargets: [],
        discountTargets: fresh.map((d) => d.appId),
        alertTargets: [],
        markHuntNotified: false
      });
    }
  }
  if (settings.priceAlerts.length > 0) {
    const priceOf = /* @__PURE__ */ new Map();
    const nameOf2 = /* @__PURE__ */ new Map();
    for (const g of snap.games) {
      if (g.priceCents >= 0) priceOf.set(g.appId, g.priceCents);
      nameOf2.set(g.appId, g.name);
    }
    for (const w of snap.wishlist) {
      if (w.finalPriceCents >= 0) priceOf.set(w.appId, w.finalPriceCents);
      nameOf2.set(w.appId, w.name);
    }
    for (const d of snap.discounts) {
      if (d.finalPriceCents >= 0) priceOf.set(d.appId, d.finalPriceCents);
      nameOf2.set(d.appId, d.name);
    }
    const hits = [];
    for (const a of settings.priceAlerts) {
      const price = priceOf.get(a.appId);
      if (price === void 0 || price < 0) continue;
      if (price > a.thresholdCents) continue;
      if (a.notifiedPriceCents !== null && price >= a.notifiedPriceCents) continue;
      const key = `alert:${a.appId}:${price}`;
      if (seen.has(key)) continue;
      hits.push({ appId: a.appId, name: nameOf2.get(a.appId) ?? `App ${a.appId}`, price, threshold: a.thresholdCents });
    }
    if (hits.length > 0) {
      const cheapest = hits.reduce((min, h) => h.price < min.price ? h : min, hits[0]);
      verdicts.push({
        title: "\u8FBE\u5230\u4F60\u7684\u5FC3\u7406\u4EF7",
        body: hits.length === 1 ? `\u300A${cheapest.name}\u300B\u73B0\u5728 ${yuan(cheapest.price)}\uFF0C\u5DF2\u4F4E\u4E8E\u4F60\u8BBE\u5B9A\u7684 ${yuan(cheapest.threshold)}` : `${hits.length} \u6B3E\u6E38\u620F\u964D\u5230\u4F60\u7684\u5FC3\u7406\u4EF7\u4EE5\u4E0B\uFF0C\u6700\u4F4E\u300A${cheapest.name}\u300B${yuan(cheapest.price)}`,
        route: "wishlist",
        keys: hits.map((h) => `alert:${h.appId}:${h.price}`),
        wishlistTargets: [],
        discountTargets: [],
        alertTargets: hits.map((h) => ({ appId: h.appId, priceCents: h.price })),
        markHuntNotified: false
      });
    }
  }
  if (settings.notifyAchievementHunt && snap.huntNotifiedOn !== ymd2()) {
    const rareLocked = snap.achievements.filter((a) => a.isRare && !a.unlocked);
    if (rareLocked.length > 0) {
      const remainingByApp = /* @__PURE__ */ new Map();
      for (const a of rareLocked) remainingByApp.set(a.appId, (remainingByApp.get(a.appId) ?? 0) + 1);
      const progressOf = new Map(snap.games.map((g) => [g.appId, g]));
      let best = null;
      for (const [appId, remaining] of remainingByApp) {
        const g = progressOf.get(appId);
        if (!g || g.achievementsTotal <= 0) continue;
        const percent = g.achievementsUnlocked / g.achievementsTotal * 100;
        if (!best || percent > best.percent || percent === best.percent && remaining < best.remaining) {
          best = { appId, remaining, percent };
        }
      }
      const closest = best ? `${nameOf(snap, best.appId)}\u8FD8\u5DEE ${best.remaining} \u4E2A` : "";
      verdicts.push({
        title: "\u7A00\u6709\u6210\u5C31\u8FFD\u730E",
        body: `\u8FD8\u6709 ${rareLocked.length} \u4E2A\u7A00\u6709\u6210\u5C31\u672A\u89E3\u9501${closest ? `\uFF0C\u6700\u8FD1\u7684\u662F${closest}` : ""}`,
        route: "hunt",
        keys: [`hunt:${ymd2()}:${rareLocked.length}`],
        wishlistTargets: [],
        discountTargets: [],
        alertTargets: [],
        markHuntNotified: true
      });
    }
  }
  return verdicts;
}
function nameOf(snap, appId) {
  return snap.games.find((g) => g.appId === appId)?.name ?? `App ${appId}`;
}
function markWishlistNotified(targets, at) {
  for (const t of targets) {
    run("UPDATE wishlist SET notified_at = $at WHERE app_id = $appId AND steam_id = $steamId", {
      at,
      appId: t.appId,
      steamId: t.steamId
    });
  }
}

// src/utils/library.ts
function hoursPerYuanOf(minutes, cents) {
  return cents > 0 ? minutes * 100 / (60 * cents) : 0;
}
function libraryValue(games, options = {}) {
  const bestLimit = options.bestLimit ?? 5;
  const sunkLimit = options.sunkLimit ?? 8;
  let currentTotalCents = 0;
  let originalTotalCents = 0;
  let totalMinutes = 0;
  let pricedCount = 0;
  let freeCount = 0;
  let unknownCount = 0;
  let onSaleCount = 0;
  let salePercentSum = 0;
  const valued = [];
  const sunk = [];
  for (const g of games) {
    if (g.priceCents < 0) {
      unknownCount += 1;
    } else if (g.priceCents === 0) {
      freeCount += 1;
    } else {
      pricedCount += 1;
      currentTotalCents += g.priceCents;
      const original = g.originalPriceCents > 0 ? g.originalPriceCents : g.priceCents;
      originalTotalCents += original;
      totalMinutes += g.playtimeForeverMin;
      if (original > g.priceCents) {
        onSaleCount += 1;
        salePercentSum += Math.round((1 - g.priceCents / original) * 100);
      }
      if (g.playtimeForeverMin > 0) valued.push({ game: g, hoursPerYuan: hoursPerYuanOf(g.playtimeForeverMin, g.priceCents) });
      else sunk.push({ game: g, priceCents: g.priceCents });
    }
  }
  const sunkSorted = sunk.sort((a, b) => b.priceCents - a.priceCents);
  const sunkShown = sunkSorted.slice(0, sunkLimit);
  return {
    pricedCount,
    freeCount,
    unknownCount,
    currentTotalCents,
    originalTotalCents,
    onSaleCount,
    weightedDiscountPercent: originalTotalCents > 0 ? (1 - currentTotalCents / originalTotalCents) * 100 : 0,
    averageSaleDiscountPercent: onSaleCount > 0 ? salePercentSum / onSaleCount : 0,
    totalMinutes,
    hoursPerYuanCurrent: hoursPerYuanOf(totalMinutes, currentTotalCents),
    hoursPerYuanOriginal: hoursPerYuanOf(totalMinutes, originalTotalCents),
    playedCount: games.filter((g) => g.playtimeForeverMin > 0).length,
    bestValue: valued.sort((a, b) => b.hoursPerYuan - a.hoursPerYuan || b.game.playtimeForeverMin - a.game.playtimeForeverMin).slice(0, bestLimit),
    // 合计必须与**展示出来的那几行**一致：清单被截断后还按全量合计，
    // 界面上「这些游戏合计 ¥X」就会变成一个看着很确定、实则对不上的数字。
    sunkCost: sunkShown,
    sunkCostTotalCents: sunkShown.reduce((acc, s) => acc + s.priceCents, 0),
    sunkCostAllCount: sunkSorted.length,
    sunkCostAllTotalCents: sunkSorted.reduce((acc, s) => acc + s.priceCents, 0)
  };
}

// src/utils/format.ts
var CNY = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" });

// src/utils/analytics.ts
function rarestUnlocked(achievements, games, limit = 12) {
  const index = new Map(games.map((g) => [g.appId, g]));
  return achievements.filter((a) => a.unlocked && a.globalPercent > 0).sort((a, b) => a.globalPercent - b.globalPercent || (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0)).slice(0, limit).map((a) => ({
    ...a,
    gameName: index.get(a.appId)?.name ?? `App ${a.appId}`,
    gameHeader: index.get(a.appId)?.headerImage ?? ""
  }));
}
function priceTrend(points, windowDays = 90, nowSec = Math.floor(Date.now() / 1e3)) {
  if (points.length < 2) return null;
  const threshold = nowSec - windowDays * 86400;
  const window2 = points.filter((p) => p.capturedAt >= threshold).sort((a, b) => a.capturedAt - b.capturedAt);
  if (window2.length < 2) return null;
  let runs = 0;
  let discountPoints = 0;
  let discountSum = 0;
  let inRun = false;
  for (const p of window2) {
    const on = p.discountPercent > 0;
    if (on) {
      if (!inRun) runs += 1;
      discountPoints += 1;
      discountSum += p.discountPercent;
    }
    inRun = on;
  }
  let lowest = window2[0];
  for (const p of window2) if (p.priceCents >= 0 && p.priceCents < lowest.priceCents) lowest = p;
  const current = window2[window2.length - 1];
  const gap = current.priceCents - lowest.priceCents;
  return {
    windowDays,
    points: window2.length,
    discountRuns: runs,
    avgDiscountPercent: discountPoints > 0 ? discountSum / discountPoints : 0,
    lowestCents: lowest.priceCents,
    lowestAt: lowest.capturedAt,
    currentCents: current.priceCents,
    gapToLowestCents: gap > 0 ? gap : 0,
    discountDaysPercent: Math.round(discountPoints / window2.length * 100)
  };
}

// electron/main/mappers.ts
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
    syncedAt: optNum(r.synced_at),
    // F-6：等级/徽章。老库没有这几列（v5 才补），num() 对 undefined 返回默认值 0，天然兼容。
    level: num(r.level),
    badgeCount: num(r.badge_count),
    badgeXp: num(r.badge_xp),
    playerXp: num(r.player_xp),
    xpToNext: num(r.xp_to_next)
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
    fetchedAt: num(r.fetched_at),
    notifiedAt: optNum(r.notified_at)
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
function rowToGameNote(r) {
  return {
    appId: num(r.app_id),
    rating: num(r.rating),
    note: str(r.note),
    status: str(r.status),
    tags: parseArr(r.tags),
    updatedAt: num(r.updated_at)
  };
}
function rowToHuntPick(r) {
  return { appId: num(r.app_id), apiName: str(r.api_name), addedAt: num(r.added_at) };
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
    synced_at: u.syncedAt,
    level: u.level ?? 0,
    badge_count: u.badgeCount ?? 0,
    badge_xp: u.badgeXp ?? 0,
    player_xp: u.playerXp ?? 0,
    xp_to_next: u.xpToNext ?? 0
  };
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
  // 用户自己的内容：不分账号、全表返回（体量 = 用户实际写了多少条，几十行量级）
  gameNotes: `SELECT * FROM game_notes ORDER BY updated_at DESC`,
  huntPicks: `SELECT * FROM hunt_picks ORDER BY added_at DESC`,
  // ---- 真 SQL 聚合 ----
  // 每天总时长 + 会话数，用于热力图；按 play_date 分组。
  dayStats: `SELECT play_date AS date, SUM(minutes) AS minutes, COUNT(*) AS session_count
             FROM play_sessions
             WHERE ($steamId IS NULL OR steam_id = $steamId)
             GROUP BY play_date
             ORDER BY play_date ASC`,
  /**
   * 概览：用标量子查询一次性聚合（本周/今日/最近30天时长、会话数、游戏数、今日解锁成就数）。
   *
   * ⚠️ 日期边界一律用**参数**（`$today` / `$day7` / `$day30` / `$todayStart` / `$tomorrowStart`），
   * 不许写 SQLite 的 `date('now')` —— 那是 **UTC**，而 `play_date` 存的是**本地**日期
   * （sync.ts 的 todayYMD() 用 getFullYear/getMonth/getDate）。在 UTC+8 下两者每天有 8 小时不一致，
   * 「今天」/「本周」的窗口会整体错位一天，凌晨到早上这段时间 `today_minutes` 恒为 0。
   * 时间戳同理：`unlocked_at` 与本地零点比，而不是 `date(unlocked_at,'unixepoch') = date('now')`。
   * 这些参数由 `aggregateDefaults()` 在**每次调用时**按本地时区现算，不能在模块加载时冻结。
   */
  overview: `SELECT
               (SELECT COALESCE(SUM(minutes),0) FROM play_sessions
                 WHERE play_date >= $day7 AND ($steamId IS NULL OR steam_id = $steamId)) AS week_minutes,
               (SELECT COALESCE(SUM(minutes),0) FROM play_sessions
                 WHERE play_date >= $day30 AND ($steamId IS NULL OR steam_id = $steamId)) AS last30_minutes,
               (SELECT COALESCE(SUM(minutes),0) FROM play_sessions
                 WHERE play_date = $today AND ($steamId IS NULL OR steam_id = $steamId)) AS today_minutes,
               (SELECT COUNT(*) FROM play_sessions
                 WHERE ($steamId IS NULL OR steam_id = $steamId)) AS session_count,
               (SELECT COUNT(DISTINCT app_id) FROM play_sessions
                 WHERE ($steamId IS NULL OR steam_id = $steamId)) AS game_count,
               (SELECT COUNT(*) FROM achievements WHERE unlocked = 1) AS achievements_unlocked,
               (SELECT COUNT(*) FROM achievements WHERE unlocked = 1
                 AND unlocked_at >= $todayStart AND unlocked_at < $tomorrowStart) AS today_achievements`
};
var PRUNE_SQL = {
  /**
   * price_history：删掉 90 天以前、且「不是当天最后一笔、也不是该游戏历史最低那一笔」的行。
   *
   * - 90 天内一行不删 —— `isHistoricalLow` 的唯一依据就是这些采样，删了就再也算不准；
   * - 90 天以外每天留最后一笔（收盘价），保留长期走势的形状；
   * - 另外**无论多久都留该游戏的历史最低那一笔**，保证 `priceLowest()` 永远返回真值。
   */
  priceHistory: `DELETE FROM price_history
                 WHERE captured_at < $cutoff
                   AND rowid NOT IN (
                     SELECT MAX(rowid) FROM price_history
                     WHERE captured_at < $cutoff
                     GROUP BY app_id, date(captured_at, 'unixepoch')
                   )
                   AND NOT (price_cents >= 0 AND price_cents = (
                     SELECT MIN(p2.price_cents) FROM price_history p2 WHERE p2.app_id = price_history.app_id
                   ))`,
  /**
   * snapshots：每款游戏只留最近 2 条。
   *
   * 它的唯一用途是「与上一次快照做差分」（sync.ts 的 lastSnapshot()），
   * 更早的快照从来没有被任何代码读过 —— 纯占体积。
   * 留 2 条而不是 1 条，是为了让 lastSnapshot() 在这次采样写入后依然能读到基准值。
   */
  snapshots: `DELETE FROM snapshots
              WHERE rowid IN (
                SELECT rowid FROM snapshots s
                WHERE (SELECT COUNT(*) FROM snapshots s2
                       WHERE s2.app_id = s.app_id AND s2.captured_at > s.captured_at) >= 2
              )`
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
  dayStats: SQL2.dayStats,
  overview: SQL2.overview,
  gameNotes: SQL2.gameNotes,
  huntPicks: SQL2.huntPicks
};

// electron/main/user-data.ts
var SAMPLE_KEEP_DAYS = 90;
var SNAPSHOT_KEEP_ROWS = 2;
function pruneSamples(nowSec = Math.floor(Date.now() / 1e3)) {
  const cutoff = nowSec - SAMPLE_KEEP_DAYS * 86400;
  const count = (t) => num(get(`SELECT COUNT(*) AS c FROM ${t}`)?.c);
  const beforeP = count("price_history");
  const beforeS = count("snapshots");
  transaction(() => {
    run(PRUNE_SQL.priceHistory, { cutoff });
    run(PRUNE_SQL.snapshots);
  });
  return { priceHistory: beforeP - count("price_history"), snapshots: beforeS - count("snapshots") };
}
var NOTE_MAX_LEN = 2e3;
var clampRating = (v) => !Number.isFinite(v) ? 0 : Math.max(0, Math.min(5, Math.round(v)));
var listNotes = () => all("SELECT * FROM game_notes ORDER BY updated_at DESC").map(rowToGameNote);
var listPicks = () => all("SELECT * FROM hunt_picks ORDER BY added_at DESC").map(rowToHuntPick);
function saveNote(appId, patch) {
  if (!Number.isInteger(appId) || appId <= 0) return null;
  const prev = get("SELECT * FROM game_notes WHERE app_id = $appId", { appId });
  const rating = clampRating(patch.rating ?? (prev ? num(prev.rating) : 0));
  const note = (patch.note ?? (prev ? str(prev.note) : "")).slice(0, NOTE_MAX_LEN);
  const status = (patch.status ?? (prev ? str(prev.status) : "")).slice(0, 16);
  const prevTags = prev ? parseArr(prev.tags) : [];
  const tags = patch.tags ?? prevTags;
  if (rating === 0 && note === "" && status === "" && tags.length === 0) {
    run("DELETE FROM game_notes WHERE app_id = $appId", { appId });
    return null;
  }
  const updatedAt = Math.floor(Date.now() / 1e3);
  run(
    `INSERT INTO game_notes (app_id, rating, note, status, tags, updated_at) VALUES ($appId, $rating, $note, $status, $tags, $updatedAt)
     ON CONFLICT(app_id) DO UPDATE SET rating = $rating, note = $note, status = $status, tags = $tags, updated_at = $updatedAt`,
    { appId, rating, note, status, tags: JSON.stringify(tags), updatedAt }
  );
  return { appId, rating, note, status, tags, updatedAt };
}
function clearNote(appId) {
  run("DELETE FROM game_notes WHERE app_id = $appId", { appId });
  return true;
}
function togglePick(appId, apiName, picked) {
  if (!Number.isInteger(appId) || appId <= 0 || !apiName) return false;
  if (picked) {
    run(
      `INSERT INTO hunt_picks (app_id, api_name, added_at) VALUES ($appId, $apiName, $addedAt)
       ON CONFLICT(app_id, api_name) DO NOTHING`,
      { appId, apiName, addedAt: Math.floor(Date.now() / 1e3) }
    );
  } else {
    run("DELETE FROM hunt_picks WHERE app_id = $appId AND api_name = $apiName", { appId, apiName });
  }
  return picked;
}
function prunePickedUnlocked() {
  const before = num(get("SELECT COUNT(*) AS c FROM hunt_picks")?.c);
  run(
    `DELETE FROM hunt_picks WHERE EXISTS (
       SELECT 1 FROM achievements a
       WHERE a.app_id = hunt_picks.app_id
         AND a.api_name = hunt_picks.api_name
         AND a.unlocked = 1
     )`
  );
  return before - num(get("SELECT COUNT(*) AS c FROM hunt_picks")?.c);
}
function detectAccountSwitch(currentSteamId) {
  const row = get(`SELECT steam_id, COUNT(*) AS c FROM games WHERE steam_id <> '' GROUP BY steam_id ORDER BY c DESC LIMIT 1`);
  if (!row) return null;
  const previousSteamId = str(row.steam_id);
  if (!previousSteamId || previousSteamId === currentSteamId) return null;
  return { previousSteamId, previousGames: num(row.c), currentSteamId };
}
function stampGameOwners(steamId) {
  if (!steamId) return 0;
  const before = num(get(`SELECT COUNT(*) AS c FROM games WHERE steam_id <> $sid`, { sid: steamId })?.c);
  run(`UPDATE games SET steam_id = $sid WHERE steam_id = ''`, { sid: steamId });
  return before;
}
function purgePreviousAccount(keepSteamId) {
  const countSessions = () => num(get("SELECT COUNT(*) AS c FROM play_sessions")?.c);
  const countSnapshots = () => num(get(`SELECT COUNT(*) AS c FROM snapshots WHERE steam_id <> $sid`, { sid: keepSteamId })?.c);
  const beforeSessions = countSessions();
  const beforeSnapshots = countSnapshots();
  transaction(() => {
    run(`DELETE FROM play_sessions WHERE steam_id <> '' AND steam_id <> $sid`, { sid: keepSteamId });
    run(`DELETE FROM snapshots WHERE steam_id <> $sid`, { sid: keepSteamId });
  });
  return { sessions: beforeSessions - countSessions(), snapshots: beforeSnapshots - countSnapshots() };
}

// electron/main/repository.ts
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
function saveUser(u) {
  upsert("users", ["steam_id"], userToRow(u));
}
function saveSnapshot(appId, capturedAt, playtime, steamId) {
  upsert("snapshots", ["app_id", "captured_at"], { app_id: appId, captured_at: capturedAt, playtime_minutes: playtime, steam_id: steamId });
}
function lastSnapshot(appId, steamId) {
  const row = get(
    `SELECT playtime_minutes FROM snapshots WHERE app_id = $appId AND (steam_id = $steamId OR steam_id = '') ORDER BY captured_at DESC LIMIT 1`,
    { appId, steamId }
  );
  return row ? num(row.playtime_minutes) : null;
}
function priceLowest(appId) {
  const row = get(`SELECT MIN(price_cents) AS m FROM price_history WHERE app_id = $appId AND price_cents >= 0`, { appId });
  return row ? optNum(row.m) : null;
}
function getMeta(key) {
  const row = get("SELECT value FROM meta WHERE key = $key", { key });
  return row ? str(row.value) : null;
}
function setMeta(key, value) {
  run("INSERT INTO meta (key, value) VALUES ($key, $value) ON CONFLICT(key) DO UPDATE SET value = $value", { key, value });
}
function loadSnapshot(currentSteamId = "") {
  const u = get("SELECT * FROM users LIMIT 1");
  const count = (t) => num(get(`SELECT COUNT(*) AS c FROM ${t}`)?.c);
  const users = u ? [rowToUser(u)] : [];
  const ownerSteamId = users[0]?.steamId ?? null;
  return {
    user: users[0] ?? null,
    games: all("SELECT * FROM games ORDER BY playtime_forever_min DESC").map(rowToGame),
    sessions: (ownerSteamId ? all(
      `SELECT * FROM play_sessions WHERE steam_id = $steam_id OR steam_id = '' ORDER BY play_date DESC`,
      { steam_id: ownerSteamId }
    ) : all("SELECT * FROM play_sessions ORDER BY play_date DESC")).map(rowToSession),
    // 成就：走更紧凑的传输形态（图标只带文件名），4536 条约省 0.8 MB IPC 负载。
    // 渲染层用 expandAchievement() 拼回完整 URL，界面代码不用改。
    achievements: all("SELECT * FROM achievements").map(rowToAchievement).map(toSnapshotAchievement),
    wishlist: all("SELECT * FROM wishlist").map(rowToWishlist),
    discounts: all("SELECT * FROM discounts").map(rowToDiscount),
    priceHistory: all("SELECT * FROM price_history ORDER BY captured_at").map(rowToPricePoint),
    notes: listNotes(),
    picks: listPicks(),
    accountSwitch: currentSteamId ? detectAccountSwitch(currentSteamId) : null,
    counts: {
      users: count("users"),
      games: count("games"),
      sessions: count("play_sessions"),
      achievements: count("achievements"),
      wishlist: count("wishlist"),
      discounts: count("discounts"),
      priceHistory: count("price_history"),
      snapshots: count("snapshots"),
      gameNotes: count("game_notes"),
      huntPicks: count("hunt_picks")
    },
    loadedAt: Date.now()
  };
}

// src/utils/picks.ts
var pickKey = (appId, apiName) => `${appId}:${apiName}`;

// electron/main/api-base.ts
var SteamHttpError = class extends Error {
  constructor(status, kind, message) {
    super(message);
    this.status = status;
    this.kind = kind;
    this.name = "SteamHttpError";
  }
};

// electron/main/achievement-sync.ts
var ACH_FAILED_META_KEY = "ach_failed";
var ACH_MAX_RETRY = 5;
function loadRetries() {
  const attempts = /* @__PURE__ */ new Map();
  const retryAppIds = /* @__PURE__ */ new Set();
  let raw = null;
  try {
    raw = JSON.parse(getMeta(ACH_FAILED_META_KEY) || "{}");
  } catch {
    raw = {};
  }
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) {
      const appId = Number(k);
      const n = typeof v === "number" ? v : 0;
      if (!Number.isFinite(appId)) continue;
      if (n >= ACH_MAX_RETRY) continue;
      attempts.set(appId, n);
      retryAppIds.add(appId);
    }
  }
  return { retryAppIds, attempts };
}
function saveRetries(attempts) {
  if (!attempts.size) {
    setMeta(ACH_FAILED_META_KEY, "{}");
    return;
  }
  setMeta(ACH_FAILED_META_KEY, JSON.stringify(Object.fromEntries(attempts)));
}
function planAchievementTargets(games, playedAppIds, counts, retryAppIds = /* @__PURE__ */ new Set()) {
  for (const g of games) {
    const c = counts.get(g.appId);
    if (c) {
      g.achievementsTotal = c[0];
      g.achievementsUnlocked = c[1];
      g.rareAchievements = c[2];
    }
  }
  return games.filter((g) => playedAppIds.has(g.appId) || !counts.has(g.appId) || retryAppIds.has(g.appId));
}

// electron/main/manual-sessions.ts
var MANUAL_MIN_MINUTES = 1;
var MANUAL_MAX_MINUTES = 1440;
var DEFAULT_START_MINUTE_OF_DAY = 20 * 60;
function localTodayYMD() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isValidYmd(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const probe = new Date(y, m - 1, d);
  return probe.getFullYear() === y && probe.getMonth() === m - 1 && probe.getDate() === d;
}
function localTimeToSeconds(playDate, minuteOfDay) {
  const [y, m, d] = playDate.split("-").map(Number);
  const base = new Date(y, m - 1, d, 0, 0, 0, 0);
  return Math.floor(base.getTime() / 1e3) + minuteOfDay * 60;
}
function addManualSession(steamId, patch) {
  const fail = (error) => ({ ok: false, error });
  if (!steamId) return fail("\u5C1A\u672A\u767B\u5F55 Steam \u8D26\u53F7\uFF0C\u65E0\u6CD5\u8865\u5F55\u4F1A\u8BDD");
  if (!Number.isInteger(patch.appId) || patch.appId <= 0) return fail("\u6E38\u620F ID \u4E0D\u5408\u6CD5");
  const game = get("SELECT app_id, name FROM games WHERE app_id = $appId", { appId: patch.appId });
  if (!game) return fail("\u6E38\u620F\u5E93\u91CC\u6CA1\u6709\u8FD9\u6B3E\u6E38\u620F\uFF0C\u8BF7\u5148\u5B8C\u6210\u4E00\u6B21\u540C\u6B65");
  if (!isValidYmd(patch.playDate)) return fail("\u65E5\u671F\u683C\u5F0F\u5E94\u4E3A YYYY-MM-DD\uFF0C\u4E14\u5FC5\u987B\u662F\u771F\u5B9E\u5B58\u5728\u7684\u65E5\u671F");
  if (patch.playDate > localTodayYMD()) return fail("\u4E0D\u80FD\u7ED9\u672A\u6765\u8865\u5F55\u4F1A\u8BDD");
  const minutes = Math.round(patch.minutes);
  if (!Number.isFinite(minutes) || minutes < MANUAL_MIN_MINUTES || minutes > MANUAL_MAX_MINUTES) {
    return fail(`\u65F6\u957F\u9700\u5728 ${MANUAL_MIN_MINUTES}\u2013${MANUAL_MAX_MINUTES} \u5206\u949F\u4E4B\u95F4`);
  }
  const rawMinuteOfDay = patch.startMinuteOfDay ?? DEFAULT_START_MINUTE_OF_DAY;
  if (!Number.isFinite(rawMinuteOfDay)) return fail("\u5F00\u59CB\u65F6\u95F4\u4E0D\u5408\u6CD5");
  const minuteOfDay = Math.min(1439, Math.max(0, Math.round(rawMinuteOfDay)));
  const startedAt = localTimeToSeconds(patch.playDate, minuteOfDay);
  const endedAt = startedAt + minutes * 60;
  run(
    `INSERT INTO play_sessions (steam_id, app_id, play_date, minutes, started_at, ended_at, source)
     VALUES ($steam_id,$app_id,$play_date,$minutes,$started_at,$ended_at,'manual')`,
    { steam_id: steamId, app_id: patch.appId, play_date: patch.playDate, minutes, started_at: startedAt, ended_at: endedAt }
  );
  const row = get("SELECT MAX(id) AS id FROM play_sessions");
  const id = row ? num(row.id) : 0;
  logInfo("session", "\u624B\u52A8\u8865\u5F55\u4F1A\u8BDD", { appId: patch.appId, playDate: patch.playDate, minutes, minuteOfDay, id });
  return { ok: true, id, startedAt, endedAt };
}
function removeManualSession(sessionId) {
  if (!Number.isInteger(sessionId) || sessionId <= 0) return { ok: false, removed: 0 };
  const exists = get("SELECT id FROM play_sessions WHERE id = $id AND source = $src", { id: sessionId, src: "manual" });
  if (!exists) return { ok: false, removed: 0 };
  run("DELETE FROM play_sessions WHERE id = $id AND source = $src", { id: sessionId, src: "manual" });
  logInfo("session", "\u5220\u9664\u624B\u52A8\u8865\u5F55\u4F1A\u8BDD", { id: sessionId });
  return { ok: true, removed: 1 };
}
function listAppSessions(appId) {
  return all(
    `SELECT id, play_date, minutes, source FROM play_sessions
     WHERE app_id = $appId ORDER BY play_date DESC, started_at DESC LIMIT 200`,
    { appId }
  ).map((r) => ({ id: num(r.id), playDate: str(r.play_date), minutes: num(r.minutes), source: str(r.source) }));
}

// electron/main/auto-backup.ts
var import_node_fs4 = __toESM(require("node:fs"));
var import_node_path3 = __toESM(require("node:path"));
var BACKUP_PREFIX = "steam-insight-backup-";
var K_AT = "backup_last_at";
var K_PATH = "backup_last_path";
var K_ERROR = "backup_last_error";
var K_ROWS = "backup_last_rows";
function metaGet(key) {
  const row = get("SELECT value FROM meta WHERE key = $key", { key });
  return row ? String(row.value) : null;
}
function metaSet(key, value) {
  run("INSERT OR REPLACE INTO meta (key, value) VALUES ($key,$value)", { key, value });
}
function backupsDir() {
  return import_node_path3.default.join(userDataDir, "backups");
}
function ensureDir() {
  const dir2 = backupsDir();
  if (!import_node_fs4.default.existsSync(dir2)) import_node_fs4.default.mkdirSync(dir2, { recursive: true });
  return dir2;
}
function stamp2(d = /* @__PURE__ */ new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
function localDayKey(seconds) {
  const d = new Date(seconds * 1e3);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function listFiles() {
  const dir2 = backupsDir();
  if (!import_node_fs4.default.existsSync(dir2)) return [];
  return import_node_fs4.default.readdirSync(dir2).filter((n) => n.startsWith(BACKUP_PREFIX) && n.endsWith(".json")).map((name) => {
    const st = import_node_fs4.default.statSync(import_node_path3.default.join(dir2, name));
    return { name, bytes: st.size, at: Math.floor(st.mtimeMs / 1e3) };
  }).sort((a, b) => b.at - a.at);
}
function pruneBackupFiles(keep) {
  const limit = Math.max(1, Math.floor(keep) || 1);
  const files = listFiles();
  if (files.length <= limit) return 0;
  let removed = 0;
  for (const f of files.slice(limit)) {
    try {
      import_node_fs4.default.unlinkSync(import_node_path3.default.join(backupsDir(), f.name));
      removed += 1;
    } catch (e) {
      logWarn("backup", "\u5220\u9664\u65E7\u5907\u4EFD\u5931\u8D25", { file: f.name, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return removed;
}
function runBackup(reason2) {
  const settings = getSettings();
  try {
    const dir2 = ensureDir();
    const pack = buildDataPack();
    const rows = Object.values(pack.counts).reduce((a, b) => a + b, 0);
    const file = import_node_path3.default.join(dir2, `${BACKUP_PREFIX}${stamp2()}.json`);
    import_node_fs4.default.writeFileSync(file, JSON.stringify(pack), "utf8");
    const removed = pruneBackupFiles(settings.autoBackupKeep);
    metaSet(K_AT, String(Math.floor(Date.now() / 1e3)));
    metaSet(K_PATH, file);
    metaSet(K_ROWS, String(rows));
    metaSet(K_ERROR, "");
    logInfo("backup", "\u5DF2\u5199\u5165\u81EA\u52A8\u5907\u4EFD", { reason: reason2, file, rows, removed });
    return { ok: true, filePath: file, rows, removed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    metaSet(K_ERROR, msg);
    logError("backup", "\u5199\u5165\u81EA\u52A8\u5907\u4EFD\u5931\u8D25", { error: msg, reason: reason2 });
    return { ok: false, error: msg };
  }
}
function maybeBackup(reason2) {
  const settings = getSettings();
  if (!settings.autoBackup) return null;
  const lastAt = Number(metaGet(K_AT) ?? 0);
  const nowSec = Math.floor(Date.now() / 1e3);
  if (lastAt > 0 && localDayKey(lastAt) === localDayKey(nowSec)) return null;
  if (lastAt > 0 && nowSec - lastAt < 20 * 3600) return null;
  return runBackup(reason2);
}
function backupStatus() {
  const settings = getSettings();
  const files = listFiles();
  const rawError = metaGet(K_ERROR);
  return {
    enabled: settings.autoBackup,
    keep: settings.autoBackupKeep,
    dir: backupsDir(),
    files,
    totalBytes: files.reduce((n, f) => n + f.bytes, 0),
    lastAt: Number(metaGet(K_AT) ?? 0) || null,
    lastPath: metaGet(K_PATH),
    lastRows: Number(metaGet(K_ROWS) ?? 0) || 0,
    lastError: rawError && rawError.length > 0 ? rawError : null
  };
}

// electron/main/db-health.ts
var DAY = 86400;
var TABLES2 = [
  { table: "users", label: "\u8D26\u53F7", timeColumn: "synced_at" },
  { table: "games", label: "\u6E38\u620F\u5E93", timeColumn: "price_checked_at" },
  { table: "play_sessions", label: "\u6E38\u73A9\u8BB0\u5F55", timeColumn: "started_at" },
  { table: "achievements", label: "\u6210\u5C31", timeColumn: "unlocked_at" },
  { table: "wishlist", label: "\u613F\u671B\u5355", timeColumn: "added_at" },
  { table: "discounts", label: "\u6298\u6263", timeColumn: "fetched_at" },
  { table: "price_history", label: "\u4EF7\u683C\u91C7\u6837", timeColumn: "captured_at" },
  { table: "snapshots", label: "\u5DEE\u5206\u5FEB\u7167", timeColumn: "captured_at" },
  { table: "game_notes", label: "\u6211\u7684\u7B14\u8BB0", timeColumn: "updated_at" },
  { table: "hunt_picks", label: "\u8FFD\u730E\u6E05\u5355", timeColumn: "added_at" }
];
function getDatabaseHealth() {
  const now = Math.floor(Date.now() / 1e3);
  const since = now - 7 * DAY;
  let earliest = null;
  const tables = TABLES2.map((t) => {
    const total = num(get(`SELECT COUNT(*) AS c FROM ${t.table}`)?.c ?? 0);
    const last7 = num(get(`SELECT COUNT(*) AS c FROM ${t.table} WHERE ${t.timeColumn} >= $since`, { since })?.c ?? 0);
    const first = get(`SELECT MIN(${t.timeColumn}) AS m FROM ${t.table} WHERE ${t.timeColumn} IS NOT NULL AND ${t.timeColumn} > 0`);
    const firstTs = first ? num(first.m) : 0;
    if (firstTs > 0 && (earliest === null || firstTs < earliest)) earliest = firstTs;
    return { table: t.table, label: t.label, rows: total, last7 };
  });
  const totalRows = tables.reduce((n, t) => n + t.rows, 0);
  const last7Rows = tables.reduce((n, t) => n + t.last7, 0);
  const fileBytes = databaseFileSize();
  const observedDays = earliest === null ? 1 : Math.min(7, Math.max(1, Math.ceil((now - earliest) / DAY)));
  const perDay = last7Rows / observedDays;
  const bytesPerRow = totalRows > 0 ? fileBytes / totalRows : 0;
  const projectedYearRows = Math.round(perDay * 365);
  return {
    fileBytes,
    totalRows,
    tables,
    growth: {
      last7Rows,
      observedDays,
      perDay: Math.round(perDay * 10) / 10,
      projectedYearRows,
      projectedYearBytes: Math.round(projectedYearRows * bytesPerRow),
      bytesPerRow: Math.round(bytesPerRow * 10) / 10
    },
    hasEnoughHistory: earliest !== null && now - earliest >= 2 * DAY
  };
}

// src/hooks/usePersistedState.ts
var import_react = __toESM(require_react());

// src/hooks/useDashboardLayout.ts
var DASHBOARD_CARDS = [
  { key: "stats", label: "\u901F\u89C8\u7EDF\u8BA1", hint: "\u672C\u5468\u65F6\u957F / \u8FDE\u7EED\u5929\u6570 / \u672C\u5468 TOP / \u964D\u4EF7\u6570" },
  { key: "today", label: "\u4ECA\u65E5\u6458\u8981", hint: "\u4ECA\u65E5\u65F6\u957F\u3001\u6210\u5C31\u4E0E\u53F2\u4F4E\u4E00\u53E5\u8BDD\u6982\u89C8" },
  { key: "chart-week", label: "\u672C\u5468\u6BCF\u65E5\u6E38\u620F\u65F6\u95F4", hint: "\u672C\u5468 7 \u5929\u67F1\u72B6\u56FE" },
  { key: "chart-trend", label: "\u6BCF\u65E5\u8D8B\u52BF", hint: "\u6BCF\u65E5\u65F6\u957F\u66F2\u7EBF\u4E0E 7 \u65E5\u79FB\u52A8\u5E73\u5747" },
  { key: "recent", label: "\u6700\u8FD1\u6E38\u73A9", hint: "\u6309\u6700\u540E\u542F\u52A8\u65F6\u95F4\u6392\u5E8F\u7684\u6E38\u620F\u6A2A\u6392" }
];
var DEFAULT_ORDER = DASHBOARD_CARDS.map((c) => c.key);
function normalize(raw) {
  const known = new Set(DEFAULT_ORDER);
  const order = raw.order.filter((k) => known.has(k));
  for (const k of DEFAULT_ORDER) if (!order.includes(k)) order.push(k);
  const hidden = raw.hidden.filter((k) => known.has(k) && order.includes(k));
  return { order, hidden };
}
function visibleCards(layout) {
  const { order, hidden } = normalize(layout);
  return order.filter((k) => !hidden.includes(k));
}

// src/components/ui/GameCover.tsx
var import_react2 = __toESM(require_react());
function toCoverCacheUrl(src) {
  const m = src.match(/\/steam\/apps\/(\d{2,10})\//);
  if (!m) return src;
  return `si-cover://cover/${m[1]}.jpg?u=${encodeURIComponent(src)}`;
}

// electron/main/cover-cache.ts
var import_node_fs5 = __toESM(require("node:fs"));
var import_node_path4 = __toESM(require("node:path"));
var import_electron6 = require("electron");
function coverDir() {
  return import_node_path4.default.join(userDataDir, "covers");
}
function coverCacheStats() {
  const dir2 = coverDir();
  let count = 0;
  let totalBytes = 0;
  try {
    for (const name of import_node_fs5.default.readdirSync(dir2)) {
      try {
        const st = import_node_fs5.default.statSync(import_node_path4.default.join(dir2, name));
        if (st.isFile()) {
          count += 1;
          totalBytes += st.size;
        }
      } catch {
      }
    }
  } catch {
  }
  return { count, totalBytes };
}
function clearCoverCache() {
  const dir2 = coverDir();
  let cleared = 0;
  try {
    const names = import_node_fs5.default.readdirSync(dir2);
    for (const name of names) {
      try {
        import_node_fs5.default.rmSync(import_node_path4.default.join(dir2, name), { force: true });
        cleared += 1;
      } catch (e) {
        logWarn("cover", "\u5220\u9664\u5355\u4E2A\u5C01\u9762\u7F13\u5B58\u6587\u4EF6\u5931\u8D25\uFF0C\u5DF2\u8DF3\u8FC7", { name, error: String(e) });
      }
    }
  } catch {
    return { ok: true, cleared: 0 };
  }
  logInfo("cover", "\u5C01\u9762\u7F13\u5B58\u5DF2\u6E05\u7406", { cleared });
  return { ok: true, cleared };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ACHIEVEMENT_ICON_BASE,
  ACH_FAILED_META_KEY,
  ACH_MAX_RETRY,
  BACKUP_PREFIX,
  DASHBOARD_CARDS,
  DATA_PACK_FORMAT,
  DATA_PACK_VERSION,
  DEFAULT_START_MINUTE_OF_DAY,
  DIAGNOSE_TARGETS,
  MANUAL_MAX_MINUTES,
  MANUAL_MIN_MINUTES,
  MIGRATIONS,
  NOTE_MAX_LEN,
  SAMPLE_KEEP_DAYS,
  SCHEMA_VERSION,
  SNAPSHOT_KEEP_ROWS,
  SteamHttpError,
  achievementSavings,
  addManualSession,
  all,
  applyDataPack,
  backupStatus,
  backupsDir,
  buildDataPack,
  buildVerdict,
  clearCache,
  clearCoverCache,
  clearNote,
  configWarning,
  coverCacheStats,
  currentLogFile,
  databaseFileSize,
  detectAccountSwitch,
  diagnoseNetwork,
  exec,
  expandAchievement,
  flushLogs,
  get,
  getDatabaseHealth,
  getMeta,
  initDatabase,
  initLogger,
  lastSnapshot,
  libraryValue,
  listAppSessions,
  listLogFiles,
  listNotes,
  listPicks,
  loadRetries,
  loadSnapshot,
  logError,
  logInfo,
  logsDir,
  markWishlistNotified,
  maybeBackup,
  normalizeSettings,
  parseDataPack,
  parseProxyEndpoint,
  pickKey,
  planAchievementTargets,
  planNotifications,
  priceLowest,
  priceTrend,
  pruneBackupFiles,
  prunePickedUnlocked,
  pruneSamples,
  purgePreviousAccount,
  rarestUnlocked,
  readLogTail,
  removeManualSession,
  run,
  runBackup,
  saveNote,
  saveRetries,
  saveSnapshot,
  saveUser,
  setMeta,
  stampGameOwners,
  toCoverCacheUrl,
  toSnapshotAchievement,
  togglePick,
  transaction,
  vacuum,
  visibleCards
});
/*! Bundled license information:

react/cjs/react.production.js:
  (**
   * @license React
   * react.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
