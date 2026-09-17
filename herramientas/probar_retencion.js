/* Verifica que la válvula de retención deje pasar el agua en un solo sentido.
   Uso: node herramientas/probar_retencion.js [datos.json] */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const T = {
  energizador:{net:'elec',src:true,valve:true}, llave_elec:{net:'elec',valve:true},
  bomba:{net:'elec',valve:true}, poste_t:{net:'elec'}, poste_x:{net:'elec'},
  bomba_solar:{net:'agua',src:true,valve:true}, tanque:{net:'agua',src:true,valve:true},
  llave_agua:{net:'agua',valve:true}, llave_t:{net:'agua',valve:true},
  llave_x:{net:'agua',valve:true}, distribuidor_t:{net:'agua',valve:true},
  distribuidor_x:{net:'agua',valve:true}, bebedero:{net:'agua'}, potrero:{net:'both'},
  sin_clasificar:{net:'agua'}, valvula_retencion:{net:'agua',valve:true},
};
const JUNC = ['distribuidor_t','distribuidor_x','llave_t','llave_x'];

const H = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const ex = n => { const i = H.indexOf('function ' + n + '('); let d = 0;
  for (let k = H.indexOf('{', i); k < H.length; k++) {
    if (H[k] === '{') d++; else if (H[k] === '}') { d--; if (!d) return H.slice(i, k + 1); } } };
const MOTOR = ex('calcStates') + '\n' + ex('ptInPoly');

const ORIGEN = JSON.parse(fs.readFileSync(
  process.argv[2] || 'C:/Users/Pedro/Downloads/monitor_infra_CON_COTAS.json', 'utf8'));

function conAgua(S) {
  const ctx = { S, T, JUNC, console }; vm.createContext(ctx);
  vm.runInContext(MOTOR + '\nglobalThis.__r=calcStates();', ctx);
  const b = Object.values(S.elems).filter(e => e.type === 'bebedero');
  return new Set(b.filter(x => ctx.__r.watered.has(x.id)).map(x => x.name));
}

function preparar(salidaHacia) {
  const S = JSON.parse(JSON.stringify(ORIGEN));
  const v = Object.values(S.elems).find(e => /retenc/i.test(e.name));
  if (!v) { console.error('No hay válvula de retención en los datos'); process.exit(1); }
  v.type = 'valvula_retencion';
  v.salidaHacia = salidaHacia === null ? null : salidaHacia;
  return { S, v };
}

const v0 = Object.values(ORIGEN.elems).find(e => /retenc/i.test(e.name));
const vecinos = ORIGEN.conns.filter(c => c.from === v0.id || c.to === v0.id)
  .map(c => c.from === v0.id ? c.to : c.from);

const sinSentido = conAgua(preparar(null).S);
console.log('Sin sentido definido (como estaba):', sinSentido.size, 'bebederos con agua');

let ok = 0, fallos = [];
vecinos.forEach(dest => {
  const { S } = preparar(dest);
  const r = conAgua(S);
  const perdieron = [...sinSentido].filter(n => !r.has(n));
  console.log('\nSale hacia "' + ORIGEN.elems[dest].name + '":', r.size, 'con agua');
  console.log('   pierden:', perdieron.length ? perdieron.join(', ') : '— ninguno —');
});

/* el sentido correcto es el que NO deja a nadie sin agua */
const bueno = vecinos.find(d => conAgua(preparar(d).S).size === sinSentido.size);
const malo = vecinos.find(d => d !== bueno);
console.log('\n' + '='.repeat(60));
if (bueno && malo) {
  const rMalo = conAgua(preparar(malo).S);
  console.log('CORRECTO  : sale hacia "' + ORIGEN.elems[bueno].name + '" — no pierde ningún bebedero');
  console.log('AL REVÉS  : sale hacia "' + ORIGEN.elems[malo].name + '" — quedan ' + rMalo.size +
              ', se pierden ' + (sinSentido.size - rMalo.size));
  console.log('\nLa regla de un solo sentido SÍ tiene efecto: el motor la respeta.');
} else {
  console.log('Los dos sentidos dan lo mismo: la válvula no está en serie o falta algún caño.');
}
