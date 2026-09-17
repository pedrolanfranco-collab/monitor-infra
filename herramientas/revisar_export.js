/* Diagnostica un export del monitor ANTES de confiar en el.
   Uso: node herramientas/revisar_export.js <archivo.json>

   Existe porque el 16/9/2026 un export resulto ser el seed de fabrica y no los
   datos reales: se habia abierto la app en Chrome, y el localStorage no se
   comparte entre navegadores. La senal es 100 elementos / 14 conexiones / 0
   historial. */
const fs = require('fs');
const path = require('path');

const archivo = process.argv[2];
if (!archivo) { console.error('Falta el archivo. Uso: node revisar_export.js <archivo.json>'); process.exit(1); }

const S = JSON.parse(fs.readFileSync(archivo, 'utf8'));
const E = S.elems || {};
const conns = S.conns || [];
const hist = S.hist || [];
const puntos = Object.values(E).filter(e => e.geom && e.geom.type === 'Point');

console.log('Archivo:', path.basename(archivo));
console.log('  elementos:', Object.keys(E).length, '| conexiones:', conns.length, '| historial:', hist.length);

/* 1. es el seed? */
const HTML = path.join(__dirname, '..', 'index.html');
let esSeed = false;
try {
  const h = fs.readFileSync(HTML, 'utf8');
  const b = h.match(/atob\('([A-Za-z0-9+/=]+)'\)/);
  if (b) {
    const seed = JSON.parse(Buffer.from(b[1], 'base64').toString('utf8'));
    // El seed se genera DESDE un export real, asi que los ids coinciden a
    // proposito. Lo que lo delata es el historial vacio: el seed lo guarda en [].
    esSeed = hist.length === 0
          && Object.keys(seed.elems).sort().join() === Object.keys(E).sort().join()
          && (seed.conns || []).length === conns.length;
  }
} catch (e) {}
console.log('\n1. Es el seed de fabrica?', esSeed
  ? 'SI -- NO son datos reales, es una instalacion recien inicializada.\n'
  + '      Abrir la app en el navegador donde se viene usando (Brave) y exportar de nuevo.'
  : 'no, son datos propios');
if (!esSeed && hist.length === 0) console.log('   AVISO: historial vacio. Un uso real deja movimientos en el LOG.');

/* 2. cotas */
const conCota = puntos.filter(e => e.cota != null);
console.log('\n2. Cotas:', conCota.length, 'de', puntos.length, 'puntos');
if (conCota.length) {
  const v = conCota.map(e => e.cota);
  console.log('   rango:', Math.min(...v), 'a', Math.max(...v), 'm | desnivel', (Math.max(...v) - Math.min(...v)).toFixed(1), 'm');
}
Object.values(E).filter(e => e.type === 'tanque')
  .forEach(t => console.log('   tanque', JSON.stringify(t.name), '->', t.cota != null ? t.cota + ' m' : 'SIN COTA'));

/* 3. topologia: islas y elementos sin camino a un tanque */
const adj = {}; Object.keys(E).forEach(i => adj[i] = []);
conns.forEach(c => { if (adj[c.from]) adj[c.from].push(c.to); if (adj[c.to]) adj[c.to].push(c.from); });
const visto = new Set(), islas = [];
Object.keys(E).forEach(i => {
  if (visto.has(i)) return;
  const q = [i], g = []; visto.add(i);
  while (q.length) { const x = q.shift(); g.push(x); adj[x].forEach(y => { if (!visto.has(y)) { visto.add(y); q.push(y); } }); }
  if (g.length > 1) islas.push(g);
});
console.log('\n3. Topologia: ' + islas.length + ' isla(s) conectada(s)');
islas.sort((a, b) => b.length - a.length).forEach((g, n) => {
  const tq = g.filter(i => E[i].type === 'tanque').map(i => E[i].name);
  console.log('   isla ' + (n + 1) + ':', g.length, 'elementos | tanques:', tq.join(', ') || 'NINGUNO');
});
if (islas.length > 1) console.log('   La red esta partida: el agua no puede pasar de una isla a otra.');

const tanques = Object.values(E).filter(e => e.type === 'tanque').map(e => e.id);
const alc = new Set(tanques), q = [...tanques];
while (q.length) { const x = q.shift(); (adj[x] || []).forEach(y => { if (!alc.has(y)) { alc.add(y); q.push(y); } }); }
const sueltos = puntos.filter(e => !alc.has(e.id));
console.log('\n4. Sin camino a ningun tanque:', sueltos.length, 'de', puntos.length);
sueltos.filter(e => e.type === 'bebedero').forEach(e => console.log('   BEBEDERO sin agua por falta de cano:', e.name));

/* 5. elementos apilados y nombres repetidos */
const d = (a, b) => Math.sqrt(((a.geom.lat - b.geom.lat) * 111000) ** 2 + ((a.geom.lng - b.geom.lng) * 95000) ** 2);
let apilados = 0;
for (let i = 0; i < puntos.length; i++)
  for (let j = i + 1; j < puntos.length; j++)
    if (d(puntos[i], puntos[j]) < 2) apilados++;
console.log('\n5. Pares de elementos apilados (<2 m, se ven como un solo pin):', apilados);

const nom = {};
puntos.forEach(e => (nom[e.name] = nom[e.name] || []).push(e));
const rep = Object.entries(nom).filter(([k, v]) => v.length > 1);
console.log('   nombres repetidos:', rep.length);
rep.forEach(([k, v]) => console.log('     ' + JSON.stringify(k), 'x' + v.length));

/* 6. acentos rotos */
const rotos = Object.values(E).filter(e => /Ã|Â/.test(e.name || ''));
console.log('\n6. Nombres con acentos rotos:', rotos.length, rotos.length ? '-> ' + rotos.map(e => e.name).join(', ') : '');
