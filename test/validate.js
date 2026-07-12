/*!
 * validate.js — Banco de validación y regresión del motor ETHOS Ácido-Base.
 *
 *   node validate.js              → corre los 50 casos: foto de 3 capas + chequeo de regresión
 *   node validate.js --snapshot   → regenera el snapshot dorado (tras un cambio intencional del motor)
 *
 * DOS mecanismos, complementarios:
 *  (1) FOTO DE 3 CAPAS — reporte de calidad clínica contra la vara acordada con Eddy:
 *        C1 simples: primario exacto (>98% es la meta)
 *        C2 SEGURIDAD: patología grave nunca perdida (meta = 0) + sin sobrediagnóstico
 *        C3 mixto/triple: DETECTAR complejidad + advertir (no exige clavar cada componente)
 *      OJO: la clasificación usa un matcher texto→familia sobre dxPrimary. Es una APROXIMACIÓN.
 *      Como aprendimos a la mala, la rúbrica es más frágil que el motor: un "fallo" aquí es,
 *      con más frecuencia, un bug del matcher que del motor. Adjudicar a mano antes de creer.
 *  (2) REGRESIÓN (snapshot dorado) — el pass/fail DURO. Compara la salida actual del motor,
 *      caso por caso, contra la salida conocida-buena guardada en snapshot.json. No depende del
 *      matcher: si alguien cambia una fórmula y mueve un resultado, este test lo delata. exit 1.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { runCase, HTML_PATH } = require('./harness');
const CASES = require('./ab_casos.json');
const SNAP_PATH = path.join(__dirname, 'snapshot.json');

// —— clasificador texto→familia (aproximado; ver nota arriba) ——
function fam(t) {
  t = (t || '').toLowerCase();
  if (/mixt|triple|combinad|sobreañadid|fuerzas opuestas/.test(t)) return 'MIXTA';
  if (/acidosis respiratoria|acidosis resp/.test(t)) return 'RESP_AC';
  if (/alcalosis respiratoria|alcalosis resp/.test(t)) return 'RESP_ALC';
  if (/acidosis metaból|acidosis metabólica|hagma|nagma|hiperclor|láctic|cetoacid|acidosis de ag/.test(t)) return 'MET_AC';
  if (/alcalosis metaból|alcalosis metabólica/.test(t)) return 'MET_ALC';
  if (/normal|sin trastorno/.test(t)) return 'NORMAL';
  return '?';
}
// huella estable de un resultado, para el snapshot de regresión
function fingerprint(r) {
  if (!r || r.error) return { error: (r && r.error) || 'null' };
  return {
    dxKey: r.dxKey,
    dxPrimary: r.dxPrimary,
    nConcomitantes: (r.concomitantes || []).length,
    tripleDetected: !!r.tripleDetected,
    agCorr: r.agInfo ? r.agInfo.agCorr : null,
  };
}

const SNAPSHOT_MODE = process.argv.includes('--snapshot');

// —— generar snapshot dorado ——
if (SNAPSHOT_MODE) {
  const snap = {};
  for (const c of CASES) snap[c.id] = fingerprint(runCase(c.labs));
  fs.writeFileSync(SNAP_PATH, JSON.stringify(snap, null, 2) + '\n');
  console.log(`Snapshot dorado regenerado: ${Object.keys(snap).length} casos → snapshot.json`);
  console.log('Motor leído de:', HTML_PATH);
  process.exit(0);
}

// —— correr: foto de 3 capas + regresión ——
let c1 = { ok: 0, n: 0 }, c3 = { ok: 0, n: 0, miss: [] }, safety = [];
const current = {};
for (const c of CASES) {
  const r = runCase(c.labs);
  current[c.id] = fingerprint(r);
  if (!r || r.error) { safety.push([c.id, c.dificultad, 'CRASH/null']); continue; }
  const f = fam(r.dxPrimary), e = fam(c.esperado.primario), nc = (r.concomitantes || []).length;
  // "advirtió complejidad" incluye las alertas (r.alerts): el motor puede surfacear un
  // 2º componente como alerta (p.ej. "posible componente láctico") sin contarlo como
  // trastorno formal — y eso, según la vara C3, es un acierto: detectó y advirtió.
  const na = (r.alerts || []).length;
  const complejo = r.tripleDetected || nc > 0 || na > 0 || f === 'MIXTA' || /crónic|concomitante|oculta|sobreañadid/i.test(r.dxPrimary || '');
  if (c.dificultad === 'simple') { c1.n++; if (f === e) c1.ok++; }
  if (c.dificultad === 'mixto' || c.dificultad === 'triple') { c3.n++; if (complejo) c3.ok++; else c3.miss.push(c.id); }
  // C2 seguridad: motor no nombra patología alguna pero el caso la tiene
  if (f === 'NORMAL' && nc === 0 && !r.tripleDetected && e !== 'NORMAL') safety.push([c.id, c.dificultad, `dxPrimary=‹${(r.dxPrimary || '').slice(0, 40)}›`]);
}

const pct = (a, b) => (100 * a / b).toFixed(0) + '%';
console.log('\n╔══ FOTO 3 CAPAS — motor canónico (index.html), ' + CASES.length + ' casos ══╗');
console.log('  C1 · simples, primario exacto ........ ' + c1.ok + '/' + c1.n + ' (' + pct(c1.ok, c1.n) + ')');
console.log('  C2 · SEGURIDAD, patología perdida .... ' + safety.length + '/' + CASES.length + (safety.length === 0 ? '  ✓ CERO' : ''));
console.log('  C3 · mixto/triple, detectó complejo .. ' + c3.ok + '/' + c3.n + ' (' + pct(c3.ok, c3.n) + ')');
if (c3.miss.length) console.log('       no detectó: ' + c3.miss.join(', ') + '  (revisar: límite del método vs mejora real)');
if (safety.length) { console.log('  ⚠ Capa 2 — revisar (recuerda: puede ser bug del matcher):'); safety.forEach(s => console.log('     ' + s.join(' '))); }
console.log('╚════════════════════════════════════════════════════════════════╝');

// —— chequeo de regresión (pass/fail duro) ——
let regFails = 0;
if (fs.existsSync(SNAP_PATH)) {
  const golden = require(SNAP_PATH);
  for (const c of CASES) {
    const g = JSON.stringify(golden[c.id]), n = JSON.stringify(current[c.id]);
    if (g !== n) {
      regFails++;
      console.log(`\n  ✗ REGRESIÓN en ${c.id}:\n     antes: ${g}\n     ahora: ${n}`);
    }
  }
  if (regFails === 0) console.log('\nRegresión: ' + CASES.length + '/' + CASES.length + ' casos idénticos al snapshot dorado. ✓');
  else console.log(`\nRegresión: ${regFails} caso(s) cambiaron. Si el cambio fue intencional: node validate.js --snapshot`);
} else {
  console.log('\n(No hay snapshot dorado aún. Genéralo con: node validate.js --snapshot)');
}
process.exit(regFails > 0 ? 1 : 0);
