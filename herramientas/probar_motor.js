/* Corre el calcStates() REAL de index.html contra un archivo de datos, en Node.
   Uso: node herramientas/probar_motor.js <datos.json> [--sin <nombre del tanque a apagar>]

   Extrae la funcion del HTML en vez de reimplementarla: una reimplementacion
   puede coincidir con lo que uno cree que hace el codigo y no con lo que hace. */
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
};
const JUNC = ['distribuidor_t','distribuidor_x','llave_t','llave_x'];

function extraer(html, nombre) {
  const i = html.indexOf('function ' + nombre + '(');
  if (i < 0) throw new Error('no encontre ' + nombre + ' en el HTML');
  let d = 0;
  for (let k = html.indexOf('{', i); k < html.length; k++) {
    if (html[k] === '{') d++;
    else if (html[k] === '}') { d--; if (!d) return html.slice(i, k + 1); }
  }
}

function correr(S, htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const src = extraer(html, 'calcStates') + '\n' + extraer(html, 'ptInPoly');
  const ctx = { S, T, JUNC, console };
  vm.createContext(ctx);
  vm.runInContext(src + '\nglobalThis.__r=calcStates();', ctx);
  return ctx.__r;
}

const datos = process.argv[2];
if (!datos) { console.error('Uso: node probar_motor.js <datos.json> [--sin <tanque>]'); process.exit(1); }
const apagar = process.argv.includes('--sin') ? process.argv[process.argv.indexOf('--sin') + 1] : null;

const S = JSON.parse(fs.readFileSync(datos, 'utf8'));
if (apagar) {
  let n = 0;
  Object.values(S.elems).forEach(e => {
    if (e.type === 'tanque' && e.name.toLowerCase().includes(apagar.toLowerCase())) { e.on = false; n++; }
  });
  console.log('Tanques apagados que contienen', JSON.stringify(apagar) + ':', n, '\n');
}

const r = correr(S, path.join(__dirname, '..', 'index.html'));
const E = S.elems;
console.log('Con agua   :', r.watered.size);
console.log('Energizados:', r.energized.size);

const beb = Object.values(E).filter(e => e.type === 'bebedero');
console.log('\nBebederos con agua:', beb.filter(b => r.watered.has(b.id)).length, 'de', beb.length);
beb.filter(b => !r.watered.has(b.id))
   .forEach(b => console.log('   sin agua:', b.name, b.cota != null ? '(' + b.cota + ' m)' : '(sin cota)'));

const pot = Object.values(E).filter(e => e.type === 'potrero');
console.log('\nPotreros con agua:', pot.filter(p => r.watered.has(p.id)).length, 'de', pot.length);
