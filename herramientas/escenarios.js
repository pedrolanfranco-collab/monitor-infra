/* Corre escenarios de apertura/cierre contra el calcStates() REAL del index.html
   y muestra qué bebederos se quedan sin agua en cada uno.
   Uso: node herramientas/escenarios.js <datos.json>

   La pregunta que responde: ¿cerrar una llave corta de verdad el flujo, y a
   quién se lo corta? */
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
  sin_clasificar:{net:'agua'},
};
const JUNC = ['distribuidor_t','distribuidor_x','llave_t','llave_x'];

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extraer(n){
  const i = HTML.indexOf('function ' + n + '(');
  let d = 0;
  for (let k = HTML.indexOf('{', i); k < HTML.length; k++) {
    if (HTML[k] === '{') d++;
    else if (HTML[k] === '}') { d--; if (!d) return HTML.slice(i, k + 1); }
  }
}
const MOTOR = extraer('calcStates') + '\n' + extraer('ptInPoly');

const ORIGEN = JSON.parse(fs.readFileSync(process.argv[2] || 'C:/Users/Pedro/Downloads/monitor_infra_CON_COTAS.json', 'utf8'));

/* `cerrar` son IDS, no nombres: hay nombres repetidos (Llave B 3 x2, T x3,
   Paso Zanja Caño x4) y buscar por nombre agarra el elemento equivocado. */
function correr(cerrar) {
  const S = JSON.parse(JSON.stringify(ORIGEN));
  const tocados = [];
  (cerrar || []).forEach(id => {
    const e = S.elems[id];
    if (!e) { tocados.push('NO EXISTE: ' + id); return; }
    e.on = false;
    tocados.push(e.name);
  });
  const ctx = { S, T, JUNC, console };
  vm.createContext(ctx);
  vm.runInContext(MOTOR + '\nglobalThis.__r=calcStates();', ctx);
  const beb = Object.values(S.elems).filter(x => x.type === 'bebedero');
  return {
    S, tocados,
    conAgua: new Set(beb.filter(b => ctx.__r.watered.has(b.id)).map(b => b.name)),
    totalBeb: beb.length,
    potreros: Object.values(S.elems).filter(x => x.type === 'potrero' && ctx.__r.watered.has(x.id)).length,
  };
}

const base = correr([]);
console.log('BASE — como está hoy');
console.log('  bebederos con agua:', base.conAgua.size, 'de', base.totalBeb, '| potreros con agua:', base.potreros);
console.log('  sin agua:', [...Object.values(ORIGEN.elems)].filter(e => e.type === 'bebedero' && !base.conAgua.has(e.name)).map(e => e.name).join(', '));

function escenario(titulo, cerrar) {
  const r = correr(cerrar);
  const perdieron = [...base.conAgua].filter(n => !r.conAgua.has(n));
  console.log('\n' + titulo);
  console.log('  se cierra:', r.tocados.join(', '));
  console.log('  bebederos con agua:', r.conAgua.size, '(' + (r.conAgua.size - base.conAgua.size) + ')',
              '| potreros:', r.potreros, '(' + (r.potreros - base.potreros) + ')');
  console.log('  se quedan SIN agua:', perdieron.length ? perdieron.join(', ') : '— ninguno —');
  return perdieron;
}

module.exports = { correr, escenario, base, ORIGEN };

if (require.main === module) {
  const args = process.argv.slice(3);
  if (args.length) {
    // Por comodidad desde la línea de comandos sí se aceptan nombres, pero se
    // avisa si el nombre está repetido.
    const ids = args.map(n => {
      const c = Object.values(ORIGEN.elems).filter(x => x.name === n);
      if (c.length > 1) console.log(`AVISO: "${n}" aparece ${c.length} veces; se usa el primero`);
      return c[0] ? c[0].id : n;
    });
    escenario('ESCENARIO A PEDIDO', ids);
  } else require('./escenarios_lote.js');
}
