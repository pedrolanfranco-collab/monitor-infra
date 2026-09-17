# -*- coding: utf-8 -*-
from fpdf import FPDF
from fpdf.fonts import FontFace
from fpdf.enums import TableCellFillMode, TableBordersLayout

GREEN=(27,94,32); GREEN2=(46,92,50); GREY=(90,107,92); TEXT=(29,43,31)
SUB=(65,96,63); HEAD_BG=(232,245,233); ALT_BG=(247,251,247)
BOX_BG=(244,250,244); ASK_BG=(255,248,241)
BRD=(217,232,218); BRD2=(200,230,201); ACC=(46,125,50); ORANGE=(230,81,0)

W = 178.0  # ancho útil (A4 210 - 2*16)

class Doc(FPDF):
    def footer(self): pass

pdf = Doc(orientation="P", unit="mm", format="A4")
pdf.set_auto_page_break(True, margin=16)
pdf.set_margins(16, 18, 16)
pdf.add_font("rs", "",  "fuentes/sans.ttf")
pdf.add_font("rs", "B", "fuentes/sansb.ttf")
pdf.set_title("Sensor de nivel del tanque australiano — Establecimiento La Vuelta")
pdf.set_author("Pedro Lanfranco")
pdf.add_page()

def txt(t, size=10, style="", color=TEXT, align="J", h=4.55, w=W, after=1.8, md=True, x=None):
    pdf.set_font("rs", style, size); pdf.set_text_color(*color)
    if x is not None: pdf.set_x(x)
    pdf.multi_cell(w, h, t, align=align, markdown=md, new_x="LMARGIN", new_y="NEXT")
    if after: pdf.ln(after)

def h1(t):
    if pdf.will_page_break(18): pdf.add_page()
    pdf.ln(2.4)
    pdf.set_font("rs", "B", 12.5); pdf.set_text_color(*GREEN)
    pdf.cell(0, 6, t, new_x="LMARGIN", new_y="NEXT")
    y = pdf.get_y() + 0.6
    pdf.set_draw_color(*(165,214,167)); pdf.set_line_width(0.5)
    pdf.line(16, y, 16 + W, y)
    pdf.ln(2.5)

def h2(t):
    pdf.ln(1.6)
    pdf.set_font("rs", "B", 10.6); pdf.set_text_color(*GREEN2)
    pdf.cell(0, 5.4, t, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1.0)

def bullets(items, size=10, indent=4.0, rpad=0.0):
    """Cada viñeta decide el salto de página ANTES de dibujarse, para que el punto
    no quede huérfano al pie mientras el texto se va a la página siguiente."""
    tw = W - indent - 3.2 - rpad
    pdf.set_text_color(*TEXT)
    for it in items:
        pdf.set_font("rs", "", size)
        y_ref = pdf.get_y()
        with pdf.offset_rendering() as dry:
            pdf.set_xy(16 + indent + 3.2, y_ref)
            pdf.multi_cell(tw, 4.45, it, align="J", markdown=True,
                           new_x="LMARGIN", new_y="NEXT")
            need = pdf.get_y() - y_ref
        if dry.page_break_triggered or pdf.will_page_break(need):
            pdf.add_page()
        y0 = pdf.get_y()
        pdf.set_xy(16 + indent, y0); pdf.cell(3.2, 4.45, "•")
        pdf.set_xy(16 + indent + 3.2, y0)
        pdf.multi_cell(tw, 4.45, it, align="J", markdown=True,
                       new_x="LMARGIN", new_y="NEXT")
        pdf.ln(0.5)

def table(widths, rows, first_bold=False, right_cols=()):
    pdf.set_fill_color(*ALT_BG)   # fpdf2 usa el fill vigente para las filas alternas
    head = FontFace(emphasis="BOLD", color=GREEN, fill_color=HEAD_BG)
    with pdf.table(col_widths=widths, width=W, line_height=4.6,
                   text_align="LEFT", padding=(1.5, 2.0, 1.5, 2.0),
                   headings_style=head, cell_fill_color=ALT_BG,
                   cell_fill_mode=TableCellFillMode.ROWS,
                   borders_layout=TableBordersLayout.ALL) as t:
        pdf.set_draw_color(*BRD); pdf.set_line_width(0.15)
        pdf.set_font("rs", "", 9.2); pdf.set_text_color(*TEXT)
        for ri, r in enumerate(rows):
            row = t.row()
            for ci, c in enumerate(r):
                style = FontFace(emphasis="BOLD") if (ri > 0 and first_bold and ci == 0) else None
                row.cell(c, style=style,
                         align="RIGHT" if (ri > 0 and ci in right_cols) else "LEFT")
    pdf.ln(2.0)

def box(draw_body, bg=BOX_BG, accent=ACC, border=BRD2, pad=3.4):
    """Mide el alto real con el render en seco de fpdf2 y recién ahí pinta el marco."""
    def measure():
        y0 = pdf.get_y()
        with pdf.offset_rendering() as dry:
            pdf.set_xy(16 + pad, y0 + pad)
            draw_body(measure=True)
            y1 = pdf.get_y()
        return y0, y1, dry.page_break_triggered

    y0, y1, broke = measure()
    if broke:                      # no entra entero: empieza en página nueva
        pdf.add_page()
        y0, y1, _ = measure()
    h = y1 - y0 + pad
    pdf.set_fill_color(*bg); pdf.set_draw_color(*border); pdf.set_line_width(0.2)
    pdf.rect(16, y0, W, h, style="DF")
    pdf.set_fill_color(*accent)
    pdf.rect(16, y0, 1.2, h, style="F")
    pdf.set_xy(16 + pad, y0 + pad)
    draw_body(measure=False)
    pdf.set_y(y0 + h)
    pdf.ln(2.2)

# ── PORTADA ──────────────────────────────────────────────────
y0 = pdf.get_y()
pdf.set_fill_color(*ACC); pdf.rect(16, y0, 1.6, 13.5, style="F")
pdf.set_xy(20.5, y0)
pdf.set_font("rs", "B", 19); pdf.set_text_color(*GREEN)
pdf.cell(0, 8.6, "Sensor de nivel del tanque australiano", new_x="LMARGIN", new_y="NEXT")
pdf.set_xy(20.5, pdf.get_y())
pdf.set_font("rs", "", 11); pdf.set_text_color(*SUB)
pdf.cell(0, 5.4, "Qué estamos haciendo en el campo y dónde entra el sensor",
         new_x="LMARGIN", new_y="NEXT")
pdf.ln(4.2)

def meta(pairs):
    for i, (lab, val) in enumerate(pairs):
        sep = "" if i == len(pairs) - 1 else "   ·   "
        pdf.set_font("rs", "B", 8.8); wl = pdf.get_string_width(lab)
        pdf.set_font("rs", "", 8.8);  wv = pdf.get_string_width(val + sep)
        if pdf.get_x() + wl + wv > 16 + W:      # no entra: renglón nuevo
            pdf.ln(4.4); pdf.set_x(16)
        pdf.set_font("rs", "B", 8.8); pdf.set_text_color(*GREEN2)
        pdf.cell(wl, 4.4, lab)
        pdf.set_font("rs", "", 8.8); pdf.set_text_color(*GREY)
        pdf.cell(wv, 4.4, val + sep)
    pdf.ln(4.8)

meta([("Establecimiento: ", "La Vuelta — Departamento de Rivera, Uruguay"),
      ("Actividad: ", "ganadería extensiva"),
      ("Fecha: ", "17 de setiembre de 2026")])
meta([("Para: ", "equipo de la aplicación del sensor de nivel"),
      ("Contacto: ", "Pedro Lanfranco")])
pdf.ln(1.6)

h1("1. En una página: para qué les escribimos")
txt("En el campo el agua es el factor que manda sobre el pastoreo: un potrero con pasto pero sin "
    "bebedero andando no sirve, y una llave cerrada por olvido puede dejar veinte bebederos secos "
    "sin que nadie se entere hasta que se ve la hacienda amontonada en un alambrado. Para resolver "
    "eso desarrollamos **dos aplicaciones propias** que hoy están en uso: una lleva la **hacienda "
    "potrero por potrero** y la otra es un **monitor de la red hidráulica y eléctrica** que sabe, "
    "en cada momento, qué bebedero y qué potrero tienen agua.")
txt("Las dos funcionan enteramente sin conexión, porque en el campo no hay señal confiable. Y las "
    "dos tienen hoy **un solo dato que se carga a mano: si el tanque tiene agua o no**. Ese es "
    "exactamente el dato que mide el sensor de ustedes. Si podemos leerlo, todo el resto del "
    "cálculo —bebederos, potreros, avisos— pasa de ser una suposición a ser información real.")

# KPIs
kpis = [("81","PUNTOS","RELEVADOS"),("4","TANQUES /","RESERVAS"),("21","BEBEDEROS",""),
        ("31","LLAVES","DE CORTE"),("58","TRAMOS DE","CAÑERÍA"),("31","POTREROS","")]
pdf.ln(1.0)
ky = pdf.get_y(); kw = W/6; kh = 15.0
for i,(v,l1,l2) in enumerate(kpis):
    x = 16 + i*kw
    pdf.set_fill_color(*BOX_BG); pdf.set_draw_color(*BRD2); pdf.set_line_width(0.2)
    pdf.rect(x+0.6, ky, kw-1.2, kh, style="DF")
    pdf.set_xy(x+0.6, ky+2.0)
    pdf.set_font("rs","B",15); pdf.set_text_color(*GREEN)
    pdf.cell(kw-1.2, 6.2, v, align="C")
    pdf.set_xy(x+0.6, ky+8.4)
    pdf.set_font("rs","",6.2); pdf.set_text_color(*GREY)
    pdf.cell(kw-1.2, 2.9, l1, align="C")
    pdf.set_xy(x+0.6, ky+11.1)
    pdf.cell(kw-1.2, 2.9, l2, align="C")
pdf.set_y(ky+kh); pdf.ln(3.4)

h1("2. Las dos aplicaciones")
table([38,70,70], [
  ["", "App de potreros y hacienda", "Monitor hidráulico y eléctrico"],
  ["Qué resuelve","Dónde está cada lote de animales, cuántos hay y cuánta carga soporta cada potrero.",
   "Por dónde corre el agua y la energía, y quién queda sin servicio si se abre o cierra una llave."],
  ["Estado","En uso diario. Dos establecimientos: La Vuelta (31 potreros) y María Laura (4).",
   "En uso. Versión 61.4, con los 81 puntos de la red ya cargados y cotas de cada uno."],
  ["Formato","Aplicación web instalable (un solo archivo HTML, sin servidor propio).",
   "Aplicación web instalable (PWA con service worker y caché propia)."],
  ["Sin conexión","100 %. Los cambios se encolan y se sincronizan cuando vuelve la señal.",
   "100 %. Todo el estado vive en el dispositivo; el respaldo es un archivo JSON."],
  ["Sincronización","Por eventos entre celular y PC: nadie pisa el trabajo del otro, sin importar quién tuvo señal primero.",
   "Exportación e importación de respaldo entre dispositivos."],
], first_bold=True)

h2("2.1. App de potreros y hacienda — funcionalidades")
bullets([
 "**Mapa real del establecimiento** con los polígonos de cada potrero sobre imagen satelital, importados desde KMZ.",
 "**Existencias por potrero y categoría** (bovinos, ovinos, equinos), con altas, bajas y movimientos entre potreros desde el celular.",
 "**Dueño por partida de animales** en los campos con hacienda de varias personas, de modo que el dueño viaja con los animales en cada movimiento.",
 "**Unidades ganaderas y dotación**: coeficientes UG editables por categoría y cálculo automático de la carga por hectárea de cada potrero.",
 "**Alertas** por sobrecarga y por situaciones que requieren atención.",
 "**Carga por voz**: se dicta el movimiento en lenguaje natural y la app lo interpreta. Es el único lugar donde usamos IA; los cálculos y las alertas son reglas fijas, auditables y offline.",
 "**Aguadas e instalaciones** marcadas sobre el mapa.",
 "**Salidas**: reporte en PDF, planilla Excel, KML para Google Earth y respaldo en JSON.",
 "**Dos variantes de la misma app**: la de PC con los reportes pesados, y la del celular aliviana lo que no se usa a caballo y suma GPS para saber en qué potrero está uno parado.",
])

h2("2.2. Monitor hidráulico y eléctrico — funcionalidades")
bullets([
 "**Toda la red sobre el mapa**: tanques, bombas (eléctrica y solar), llaves de corte, T y cruces, uniones, bebederos y potreros. Se importa desde KMZ del relevamiento a campo.",
 "**Motor de propagación**: partiendo de cada tanque y de cada energizador, calcula qué elementos quedan con agua y con energía siguiendo la cañería real, respetando llaves cerradas y salidas individuales de cada distribuidor.",
 "**Gravedad y cotas**: los 81 puntos tienen cota cargada (de 166 a 197,2 m). El agua no se le asigna a un punto más alto que el tanque del que cuelga, y cada tanque se evalúa con su propia cota. Sin esto, el sistema mentía en la parte alta del campo.",
 "**Simulación antes de operar**: antes de confirmar la apertura o el cierre de una llave, muestra qué potreros y bebederos van a quedar con agua y cuáles sin ella. Después de la maniobra emite el reporte completo del resultado.",
 "**Aviso de bebederos sin agua separando las dos causas**, que se arreglan de manera muy distinta: sin agua por llave cerrada (y dice cuál llave, por nombre) o sin caño hasta ningún tanque.",
 "**Conexiones pendientes**: lista los elementos que no llegan a ningún tanque y propone los vecinos más cercanos, con la distancia en metros, para completar el trazado.",
 "**Esquema de red** en diagrama, además del mapa, con el sentido de circulación del agua y de la energía.",
 "**Estado por potrero**: un potrero figura con agua si tiene adentro un bebedero con agua. Este es el punto donde el monitor se toca con la app de hacienda.",
 "**Registro de operaciones**: quién abrió o cerró qué y cuándo.",
 "**GPS** para ubicarse en el mapa mientras se recorre, respaldo en JSON con aviso de respaldo vencido, y PIN para las acciones destructivas.",
])

h1("3. Cómo está la red hoy")
txt("El relevamiento está terminado y cargado. La red no es una sola: son **cuatro sistemas** que "
    "hoy trabajan separados, y una parte de los accesorios relevados todavía no tiene cañería "
    "dibujada que los una a un tanque.")
table([82,26,70], [
  ["Sistema","Elementos","Observación"],
  ["Tanque Cerro Sur","35","El más extendido del campo"],
  ["Tanque Casa Norte","16","Alimentado por bomba eléctrica"],
  ["Tanque Cerro Norte","8","Alimentado por bomba solar"],
  ["Tanque Casa Sur","1","Sin trazado propio todavía"],
  ["Sin conectar a ningún tanque","21","Uniones, pasos de zanja y bebederos por vincular"],
], right_cols=(1,))
txt("Sobre esa base la aplicación ya calculó un **trazado propuesto para completar la red**: "
    "23 tramos por un total aproximado de **2.621 metros** de cañería, de los cuales el tramo "
    "determinante es la **unión del sistema del Cerro con el de la Casa: 279 metros**. Con esa "
    "unión hecha, un mismo tanque puede cubrir potreros que hoy dependen de otro, y ahí el nivel "
    "de cada tanque pasa a ser una decisión de manejo diaria y no un dato de curiosidad.")

h1("4. Dónde entra el sensor de ustedes")
txt("El monitor ya sabe, para cada tanque, **a qué llega el agua de ese tanque**. Lo que no sabe "
    "es **cuánta agua hay en el tanque**: hoy el tanque tiene un estado de dos posiciones —con "
    "agua o sin agua— que alguien pone a mano. Todo lo demás se deduce solo:")

FLOW_SRC = "**SENSOR DE NIVEL**  →  estado del tanque  →  motor de propagación"
FLOW_NOTE = "(cañería + cotas + llaves)"
FLOW_OUT = ["21 bebederos con / sin agua",
            "potreros con / sin agua",
            "aviso: “B 7 sin agua — cerrada: Llave B 7”",
            "app de hacienda: carga sobre potreros con agua"]
def flow_body(measure):
    pdf.set_x(16 + 3.4); pdf.set_font("rs", "", 9.6); pdf.set_text_color(*TEXT)
    pdf.multi_cell(W - 6.8, 4.6, FLOW_SRC, markdown=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(16 + 3.4); pdf.set_font("rs", "", 8.6); pdf.set_text_color(*GREY)
    pdf.multi_cell(W - 6.8, 4.0, FLOW_NOTE, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1.2)
    for o in FLOW_OUT:
        y = pdf.get_y()
        pdf.set_xy(16 + 9.0, y)
        pdf.set_font("rs", "B", 9.4); pdf.set_text_color(*ACC)
        pdf.cell(5.0, 4.4, "→")
        pdf.set_xy(16 + 14.0, y)
        pdf.set_font("rs", "", 9.4); pdf.set_text_color(*TEXT)
        pdf.multi_cell(W - 17.4, 4.4, o, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(0.4)
box(flow_body, accent=BRD2)

txt("Es decir: **un solo dato de ustedes se multiplica por toda la red**. Reemplazar ese "
    "interruptor manual por la lectura del sensor es, para nosotros, la mejora individual más "
    "grande que le podemos hacer al sistema hoy. Y hacia adelante, con nivel medido en el tiempo "
    "podemos calcular el **consumo real por día** y cruzarlo contra las unidades ganaderas que la "
    "otra app ya tiene cargadas en los potreros que cuelgan de ese tanque: eso nos permitiría "
    "anticipar el faltante de agua **antes** de que el tanque se vacíe, que es el problema que de "
    "verdad cuesta plata.")

ASK = [
 "**Acceso a la lectura desde afuera de su app** — una consulta HTTPS que devuelva el dato en JSON, o un aviso automático a una dirección nuestra cuando hay lectura nueva. Con cualquiera de las dos formas nos arreglamos.",
 "**Contenido mínimo de esa lectura**: identificador del tanque, nivel (en porcentaje, centímetros o metros cúbicos, como lo tengan), fecha y hora de la medición, y estado del equipo (batería y última comunicación). El estado del equipo importa tanto como el nivel: necesitamos poder distinguir “el tanque está vacío” de “hace seis horas que el sensor no habla”.",
 "**Histórico** de al menos los últimos meses, para calcular consumo y tendencia.",
 "**Umbrales configurables** con aviso automático cuando el nivel baja de cierto punto.",
 "**Varios tanques en una misma cuenta**: tenemos cuatro puntos de reserva y la idea es instrumentarlos progresivamente.",
 "**Comportamiento sin cobertura**: saber cada cuánto transmite el equipo, qué pasa si pierde señal y si guarda las lecturas para mandarlas después. En este campo la señal es intermitente y todo nuestro sistema está diseñado para eso.",
]
def ask_body(measure):
    pdf.set_x(16+3.4); pdf.set_font("rs","B",10.6); pdf.set_text_color(*ORANGE)
    pdf.multi_cell(W-6.8, 5.2, "Lo que necesitaríamos de la aplicación del sensor",
                   new_x="LMARGIN", new_y="NEXT"); pdf.ln(0.8)
    pdf.set_x(16+3.4); pdf.set_font("rs","",10); pdf.set_text_color(*TEXT)
    pdf.multi_cell(W-6.8, 4.7, "Ordenado por importancia para nosotros:",
                   new_x="LMARGIN", new_y="NEXT"); pdf.ln(1.0)
    bullets(ASK, indent=3.4+3.0, rpad=3.4)
box(ask_body, bg=ASK_BG, accent=ORANGE, border=(255,224,178))

def own_body(measure):
    pdf.set_x(16+3.4); pdf.set_font("rs","B",10.6); pdf.set_text_color(*GREEN)
    pdf.multi_cell(W-6.8, 5.2, "De nuestro lado", new_x="LMARGIN", new_y="NEXT"); pdf.ln(1.0)
    bullets(["No necesitamos que ustedes integren nada ni que desarrollen a medida: con poder leer el dato alcanza, la integración la hacemos nosotros.",
             "No vamos a comandar nada a través de ustedes: el sensor es de lectura, las maniobras de llaves y bombas siguen siendo manuales y registradas en el monitor.",
             "Podemos trabajar contra un equipo de prueba antes de instrumentar los cuatro tanques."],
            indent=3.4+3.0, rpad=3.4)
box(own_body)

h1("5. Qué resolvería, en concreto")
table([68,110], [
  ["Situación de hoy","Con la lectura del sensor integrada"],
  ["El estado del tanque se carga a mano y depende de que alguien haya ido a mirarlo.","El estado se actualiza solo y el resto de la red se recalcula en el momento."],
  ["Un bebedero seco se descubre cuando se ve la hacienda amontonada.","El aviso aparece en la aplicación, con el bebedero y la causa probable identificados."],
  ["Antes de mover hacienda a un potrero hay que ir a verificar el agua.","La app de hacienda ya sabe si ese potrero tiene agua asegurada."],
  ["No sabemos cuánta agua consume realmente cada sistema.","Consumo por día y por sistema, cruzable contra las unidades ganaderas cargadas."],
  ["El dimensionamiento de la red se decide por criterio.","Se decide con la curva de consumo medida de cada tanque."],
])

h1("6. Próximo paso")
txt("Nos sirve una conversación técnica corta con quien maneje la parte de datos de la "
    "aplicación, para ver de qué manera podemos leer las mediciones y con qué frecuencia. Con eso "
    "definido, la integración del lado nuestro es acotada: es un solo punto del sistema el que cambia.")

pdf.ln(4)
y = pdf.get_y()
pdf.set_draw_color(*BRD2); pdf.set_line_width(0.2); pdf.line(16, y, 16+W, y)
pdf.ln(1.8)
pdf.set_font("rs","",8.4); pdf.set_text_color(*(107,125,109))
pdf.multi_cell(W, 4.0, "Establecimiento La Vuelta — Rivera, Uruguay · Monitor hidráulico y "
               "eléctrico v61.4 · Informe preparado el 17/09/2026 para el equipo de la "
               "aplicación del sensor de nivel.", new_x="LMARGIN", new_y="NEXT")

import sys
pdf.output(sys.argv[1])
print("paginas:", pdf.pages_count)
