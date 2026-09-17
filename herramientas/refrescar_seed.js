/* Paso 4: refresca el seed embebido en index.html con los datos reales + cotas,
   y arregla la decodificacion para que no rompa los acentos. */
const fs = require('fs');
const HTML = "C:/Users/Pedro/repos/monitor-infra/index.html";
const DATOS = __dirname + "/monitor_infra_con_cotas.json";

const d = JSON.parse(fs.readFileSync(DATOS, 'utf8'));
const seed = { elems: d.elems, conns: d.conns, hist: [] };
const json = JSON.stringify(seed);
const b64 = Buffer.from(json, 'utf8').toString('base64');

let html = fs.readFileSync(HTML, 'utf8');

// La llamada actual: localStorage.setItem(LS,atob('....'));
const re = /localStorage\.setItem\(LS,\s*atob\('([A-Za-z0-9+/=]+)'\)\);/;
const m = html.match(re);
if (!m) { console.error('No encontre la llamada atob() del seed'); process.exit(1); }

const viejo = JSON.parse(Buffer.from(m[1], 'base64').toString('latin1'));
console.log('Seed VIEJO :', Object.keys(viejo.elems).length, 'elementos,', (viejo.conns||[]).length, 'conexiones');
console.log('Seed NUEVO :', Object.keys(seed.elems).length, 'elementos,', seed.conns.length, 'conexiones,',
            Object.values(seed.elems).filter(e => e.cota != null).length, 'con cota');

// atob() devuelve Latin-1: hay que reinterpretar los bytes como UTF-8 o se rompen los acentos
const nuevo =
  "localStorage.setItem(LS,new TextDecoder().decode(Uint8Array.from(atob('" + b64 +
  "'),function(c){return c.charCodeAt(0);})));";

html = html.replace(re, nuevo);
fs.writeFileSync(HTML, html);

/* verificacion: decodificar igual que lo hara el navegador */
const m2 = fs.readFileSync(HTML, 'utf8').match(/atob\('([A-Za-z0-9+/=]+)'\)/);
const vuelta = JSON.parse(Buffer.from(m2[1], 'base64').toString('utf8'));
const nombres = Object.values(vuelta.elems).map(e => e.name);
const rotos = nombres.filter(n => /Ã|Â/.test(n));
const conAcento = nombres.filter(n => /[áéíóúñÁÉÍÓÚÑ]/.test(n));

console.log('\nVERIFICACION del seed reescrito:');
console.log('  elementos    :', Object.keys(vuelta.elems).length, '| conexiones:', vuelta.conns.length);
console.log('  con cota     :', Object.values(vuelta.elems).filter(e => e.cota != null).length);
console.log('  con acentos  :', conAcento.length, conAcento.length ? '-> ' + conAcento.slice(0, 4).join(', ') : '');
console.log('  nombres rotos:', rotos.length, rotos.length ? 'FALLA -> ' + rotos.join(', ') : 'ninguno, OK');
console.log('  identico a los datos de origen?',
  JSON.stringify(vuelta.elems) === JSON.stringify(seed.elems) ? 'SI' : 'NO');
