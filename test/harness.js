/*!
 * harness.js — Carga el motor clínico canónico DIRECTAMENTE desde ../index.html
 * y lo ejecuta en Node, sin extraer ni reescribir una sola fórmula.
 *
 * Cómo: extrae los bloques <script> del index.html publicado, los ejecuta en un
 * sandbox (vm) con un DOM simulado, hace que getElementById() lea de un objeto
 * de entrada, e intercepta renderResult() para capturar el objeto de resultado.
 * Ventaja: SIEMPRE prueba el motor que está publicado; si el index.html cambia,
 * este harness prueba la versión nueva automáticamente (no hay copia congelada).
 *
 * API:  const { runCase } = require('./harness');
 *       const r = runCase({ pH:7.2, paco2:24, hco3:9, na:140, cl:104, alb:4 });
 *       // r.dxKey, r.dxPrimary, r.concomitantes, r.tripleDetected, r.agInfo, ...
 */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');

function loadEngine() {
  const src = fs.readFileSync(HTML_PATH, 'utf8');
  let code = ''; const re = /<script>([\s\S]*?)<\/script>/g; let m;
  while ((m = re.exec(src)) !== null) code += m[1] + '\n;\n';

  let INPUT = {}, CTX = {}, CAPTURED = null;
  const noop = () => {};
  function makeEl(id) {
    return new Proxy({
      get value() { if (id in CTX) return CTX[id]; const v = INPUT[id]; return v == null ? '' : String(v); },
      set value(x) {}, get checked() { return !!CTX['__chk_' + id]; },
      set textContent(x) {}, get textContent() { return ''; },
      set innerHTML(x) {}, get innerHTML() { return ''; },
      classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
      style: {}, dataset: {}, options: [], selectedIndex: 0,
    }, { get(t, p) { if (p in t) return t[p]; return typeof t[p] === 'function' ? t[p] : noop; } });
  }
  const documentStub = new Proxy({
    getElementById: (id) => makeEl(id),
    querySelector: () => makeEl('q'), querySelectorAll: () => [],
    createElement: () => makeEl('c'), addEventListener: noop, body: makeEl('body'),
    documentElement: makeEl('html'), head: makeEl('head'),
  }, { get(t, p) { if (p in t) return t[p]; return noop; } });

  const universal = new Proxy(function () {}, { get: () => universal, apply: () => universal, construct: () => universal });
  const windowStub = new Proxy({
    document: documentStub, addEventListener: noop,
    matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    location: { href: '', search: '', hash: '' }, navigator: {},
    requestAnimationFrame: noop, setTimeout: noop, setInterval: noop,
    BroadcastChannel: universal, indexedDB: universal, console,
  }, { get(t, p) { if (p in t) return t[p]; return universal; } });

  const ctx = vm.createContext({
    document: documentStub, window: windowStub, console, Math, JSON,
    parseFloat, parseInt, isNaN, String, Number, Object, Array, Date: universal,
    localStorage: windowStub.localStorage, navigator: {}, location: windowStub.location,
    matchMedia: windowStub.matchMedia, requestAnimationFrame: noop, setTimeout: noop,
    setInterval: noop, BroadcastChannel: universal, indexedDB: universal, alert: noop,
  });
  vm.runInContext(code, ctx, { filename: 'index.html:<script>' });
  ctx.renderResult = (r) => { CAPTURED = r; };

  // Mapa banco→ids del motor (glucosa→glic es el mapeo clave)
  const MAP = { pH: 'ph', paco2: 'paco2', hco3: 'hco3', na: 'na', cl: 'cl', k: 'k', alb: 'alb',
    lactato: 'lactato', glucosa: 'glic', crea: 'crea', glic: 'glic', pao2: 'pao2',
    fio2: 'fio2', peep: 'peep', osmolgap: 'osmolgap' };

  function runCase(labs, ctxSel) {
    INPUT = {}; CTX = {}; CAPTURED = null;
    for (const [k, val] of Object.entries(labs)) INPUT[MAP[k] || k] = val;
    // selects con default seguro; el banco no trae cetonemia/sensorio estructurados
    CTX['paco2Unit'] = 'mmhg'; CTX['cetonemia'] = ''; CTX['sensorio'] = '';
    CTX['sampleType'] = ''; CTX['o2device'] = '';
    Object.assign(CTX, ctxSel || {});
    try { ctx.analyze(); } catch (e) { return { error: e.message }; }
    return CAPTURED;
  }
  return { runCase, HTML_PATH };
}

module.exports = loadEngine();
