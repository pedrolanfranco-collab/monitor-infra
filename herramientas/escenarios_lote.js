/* Lote de escenarios que se corre por defecto con `node herramientas/escenarios.js`.
   Prueba que cerrar una llave corte el flujo, y a quién se lo corta. */
const { escenario, base, ORIGEN } = require('./escenarios.js');

const E = Object.values(ORIGEN.elems);
const adj = {};
Object.keys(ORIGEN.elems).forEach(i => adj[i] = []);
ORIGEN.conns.forEach(c => { adj[c.from].push(c.to); adj[c.to].push(c.from); });

console.log('\n' + '='.repeat(64));
console.log('1. CADA LLAVE DE BEBEDERO — debe cortar SOLO su bebedero');
console.log('='.repeat(64));

const bebs = E.filter(e => e.type === 'bebedero');
let propias = 0, fugas = [];
bebs.forEach(b => {
  const llave = adj[b.id].map(i => ORIGEN.elems[i])
    .find(v => v && ['llave_agua','llave_t','llave_x'].includes(v.type));
  if (!llave) return;
  const perdieron = escenario(`Cerrar "${llave.name}" (llave de ${b.name})`, [llave.id]);
  if (perdieron.length === 1 && perdieron[0] === b.name) propias++;
  else if (perdieron.length !== 1) fugas.push({ llave: llave.name, beb: b.name, perdieron });
});

console.log('\n' + '='.repeat(64));
console.log('2. CERRAR CADA TANQUE — debe cortar todo su sistema');
console.log('='.repeat(64));
E.filter(e => e.type === "tanque").forEach(t => escenario(`Cerrar "${t.name}"`, [t.id]));

console.log('\n' + '='.repeat(64));
console.log('3. COMBINACIONES');
console.log('='.repeat(64));
escenario('Cerrar los DOS tanques del Cerro (solo abastece la Casa)',
  E.filter(e => e.type === 'tanque' && /Cerro/.test(e.name)).map(e => e.id));
escenario('Cerrar los DOS tanques de la Casa (solo abastece el Cerro)',
  E.filter(e => e.type === 'tanque' && /Casa/.test(e.name)).map(e => e.id));
escenario('Cerrar TODOS los tanques (nadie debería tener agua)',
  E.filter(e => e.type === 'tanque').map(e => e.id));

console.log('\n' + '='.repeat(64));
console.log('4. LLAVES TRONCALES — las que cortan a más de un bebedero');
console.log('='.repeat(64));
const troncales = [];
E.filter(e => ['llave_agua','llave_t','llave_x','distribuidor_t','distribuidor_x'].includes(e.type) && e.on)
  .forEach(l => {
    const { correr } = require('./escenarios.js');
    const r = correr([l.id]);
    const p = [...base.conAgua].filter(n => !r.conAgua.has(n));
    if (p.length > 1) troncales.push({ llave: l.name, corta: p });
  });
troncales.sort((a, b) => b.corta.length - a.corta.length)
  .forEach(t => console.log(`  "${t.llave}" corta ${t.corta.length} bebederos: ${t.corta.join(', ')}`));
if (!troncales.length) console.log('  (ninguna llave corta a más de un bebedero)');

console.log('\n' + '='.repeat(64));
console.log('RESUMEN');
console.log('='.repeat(64));
console.log('  Llaves de bebedero que cortan exactamente su bebedero:', propias);
if (fugas.length) {
  console.log('  Llaves que NO se comportan así:');
  fugas.forEach(f => console.log(`     "${f.llave}" (de ${f.beb}) corta: ${f.perdieron.join(', ') || 'nada'}`));
}
