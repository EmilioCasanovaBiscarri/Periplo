import './style.css'
import marca from './marca.svg?raw'
import {
  ESTADISTICAS_INICIALES,
  PALABRAS_POR_DIA,
  numeroDelDia,
  opcionesDePalabra,
  origenUltimo,
  palabrasDelDia,
  rachaVigente,
  registrarDia,
  textoCompartir,
  type Estadisticas,
} from './juego'
import { PALABRAS, type Lengua, type Palabra } from './palabras'

const CLAVE = 'periplo:v2'

const INTRO =
  'Cada palabra del español ha hecho un viaje. Almohada llegó del árabe, chocolate del náhuatl y cancha del quechua. Cada día te esperan tres palabras nuevas: adivina de dónde vienen, descubre su historia y comparte tu resultado.'

interface Guardado {
  estadisticas: Estadisticas
  /** Respuestas del día en curso, para retomar la partida al volver. */
  partida?: { dia: number; elecciones: Lengua[] }
}

function cargar(): Guardado {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (crudo) return JSON.parse(crudo) as Guardado
  } catch {
    // Sin almacenamiento (modo privado, etc.): se juega igual, sin memoria.
  }
  return { estadisticas: { ...ESTADISTICAS_INICIALES } }
}

function guardar(g: Guardado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(g))
  } catch {
    // Ídem.
  }
}

// Solo para pruebas en local (Mac o móvil en la misma red): ?reiniciar borra la partida y la racha.
if (/^(localhost|127\.|10\.|192\.168\.)/.test(location.hostname) && new URLSearchParams(location.search).has('reiniciar')) {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // Sin almacenamiento no hay nada que borrar.
  }
  history.replaceState(null, '', location.pathname)
}

const app = document.getElementById('app')!
const aviso = document.getElementById('aviso')!
const reglas = document.getElementById('reglas') as HTMLDialogElement
const ventanaEstadisticas = document.getElementById('ventana-estadisticas') as HTMLDialogElement

// Las reglas y las estadísticas se cierran con sus botones, con Escape (nativo del diálogo) o tocando fuera.
for (const dialogo of [reglas, ventanaEstadisticas]) {
  dialogo.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => dialogo.close()))
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo) dialogo.close()
  })
}

let guardado = cargar()
let diaMostrado = 0
/** Palabra en pantalla (0, 1, 2) o PALABRAS_POR_DIA para el resumen del día. */
let vista = 0

function esc(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function render() {
  const dia = numeroDelDia(new Date())
  if (dia !== diaMostrado) {
    diaMostrado = dia
    vista = Math.min(eleccionesDe(dia).length, PALABRAS_POR_DIA)
  }
  const palabras = palabrasDelDia(dia, PALABRAS)
  const elecciones = eleccionesDe(dia)
  if (elecciones.length === PALABRAS_POR_DIA) avisarAlmanaque(dia, resultados(palabras, elecciones))

  app.innerHTML = `
    <header>
      <button id="abrir-estadisticas" class="boton-estadisticas" type="button" aria-label="Estadísticas">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V11M10 20V5M16 20v-7M22 20H2"/></svg>
      </button>
      <div class="titulo">
        <img class="logo" src="icons/icon.svg" alt="" width="40" height="40" />
        <h1>${marca}</h1>
      </div>
      <button id="ayuda" class="boton-ayuda" type="button" aria-label="Cómo se juega">?</button>
    </header>

    ${vista < PALABRAS_POR_DIA ? progreso(palabras, elecciones) : ''}
    ${vista < PALABRAS_POR_DIA ? reto(dia, vista, palabras[vista], elecciones) : resumen(dia, palabras, elecciones)}
  `

  app.querySelectorAll<HTMLButtonElement>('.opcion').forEach((b) =>
    b.addEventListener('click', () => responder(dia, vista, b.dataset.lengua as Lengua)),
  )
  app.querySelector('#seguir')?.addEventListener('click', () => {
    vista++
    render()
    scrollTo({ top: 0, behavior: 'smooth' })
  })
  app.querySelector('#compartir')?.addEventListener('click', () => compartir(dia, resultados(palabras, elecciones)))
  app.querySelector('#ayuda')?.addEventListener('click', () => reglas.showModal())
  app.querySelector('#abrir-estadisticas')?.addEventListener('click', () => {
    ventanaEstadisticas.querySelector('#estadisticas-cuerpo')!.innerHTML = panelEstadisticas(dia)
    ventanaEstadisticas.showModal()
  })
}

interface ResultadoAlmanaque {
  aciertos: number
  total: number
  racha: number
}

/**
 * Con las palabras de hoy ya jugadas, la mano ☜ marca Periplo como «Hecho» en Almanaque,
 * y su hoja muestra los aciertos del día y la racha.
 */
function avisarAlmanaque(dia: number, aciertos: boolean[]) {
  const w = window as Window & { almanaqueHecho?: (r: ResultadoAlmanaque) => void }
  const avisar = () =>
    w.almanaqueHecho?.({
      aciertos: aciertos.filter(Boolean).length,
      total: aciertos.length,
      racha: rachaVigente(guardado.estadisticas, dia),
    })
  // Vite pone este módulo antes que volver-almanaque.js: en la primera pintada el script aún
  // no ha corrido, pero lo hace antes de DOMContentLoaded.
  if (w.almanaqueHecho) avisar()
  else document.addEventListener('DOMContentLoaded', avisar, { once: true })
}

function eleccionesDe(dia: number): Lengua[] {
  return guardado.partida?.dia === dia ? guardado.partida.elecciones : []
}

function resultados(palabras: Palabra[], elecciones: Lengua[]): boolean[] {
  return elecciones.map((eleccion, i) => eleccion === origenUltimo(palabras[i]))
}

function progreso(palabras: Palabra[], elecciones: Lengua[]): string {
  const aciertos = resultados(palabras, elecciones)
  const puntos = palabras
    .map((_, i) => {
      const estado = i < aciertos.length ? (aciertos[i] ? 'bien' : 'mal') : ''
      return `<li class="${estado} ${i === vista ? 'actual' : ''}"></li>`
    })
    .join('')
  const texto = vista < PALABRAS_POR_DIA ? `Palabra ${vista + 1} de ${PALABRAS_POR_DIA}` : 'Resultado del día'
  return `<nav class="progreso" aria-label="${texto}"><ol>${puntos}</ol><span>${texto}</span></nav>`
}

function reto(dia: number, indice: number, palabra: Palabra, elecciones: Lengua[]): string {
  const correcta = origenUltimo(palabra)
  const eleccion = elecciones[indice]
  const jugado = eleccion !== undefined
  const opciones = opcionesDePalabra(dia, indice, palabra)
    .map((lengua) => {
      const estado = !jugado ? '' : lengua === correcta ? 'correcta' : lengua === eleccion ? 'fallada' : 'apagada'
      return `<button class="opcion ${estado}" data-lengua="${esc(lengua)}" ${jugado ? 'disabled' : ''}>${esc(lengua)}</button>`
    })
    .join('')
  const ultima = indice === PALABRAS_POR_DIA - 1

  return `
    <section class="reto">
      <p class="pregunta">¿De qué lengua procede en último término…</p>
      <p class="palabra">${esc(palabra.palabra)}</p>
      <div class="opciones">${opciones}</div>
      ${elecciones.length === 0 ? `<p class="pista">${INTRO}</p>` : ''}
    </section>

    ${
      jugado
        ? `<section class="revelacion">
            <p class="veredicto ${eleccion === correcta ? 'bien' : 'mal'}">${eleccion === correcta ? '¡Acertaste!' : 'Esta vez no.'}</p>
            ${viaje(palabra)}
          </section>
          <section class="pie">
            <button id="seguir" class="boton">${ultima ? 'Ver resultado' : 'Siguiente palabra'}</button>
          </section>`
        : ''
    }
  `
}

/** La cadena etimológica de la palabra y su nota. */
function viaje(palabra: Palabra): string {
  const pasos = palabra.cadena
    .map(
      (p) => `
        <li>
          <span class="lengua">${esc(p.variante ?? p.lengua)}</span>
          <span class="forma">${esc(p.forma)}</span>
          ${p.significado ? `<span class="significado">«${esc(p.significado)}»</span>` : ''}
        </li>`,
    )
    .join('')
  return `
    <ol class="cadena">
      ${pasos}
      <li class="destino">
        <span class="lengua">español</span>
        <span class="forma">${esc(palabra.palabra)}</span>
      </li>
    </ol>
    ${palabra.nota ? `<p class="nota">${esc(palabra.nota)}</p>` : ''}
  `
}

/** Días, aciertos y rachas: al final de la partida y en la ventana de estadísticas. */
function panelEstadisticas(dia: number): string {
  const e = guardado.estadisticas
  const porcentaje = e.palabras ? Math.round((e.aciertos / e.palabras) * 100) : 0
  return `
    <section class="estadisticas">
      <div><strong>${e.dias}</strong><span>días</span></div>
      <div><strong>${porcentaje}%</strong><span>aciertos</span></div>
      <div><strong>${rachaVigente(e, dia)}</strong><span>racha</span></div>
      <div><strong>${e.mejorRacha}</strong><span>mejor racha</span></div>
    </section>`
}

/** Frase de la ficha final según los aciertos del día (0 a 3). */
const FRASES = [
  'Hoy las palabras han viajado sin ti.',
  'Un viaje bien trazado. Algo es algo.',
  'Casi todos los rumbos bien trazados.',
  'Ni una palabra perdida en el camino.',
]

/** Velero: marca de la ficha final, lleno si se acertó la palabra y hueco si no. */
const VELERO = 'M11 2.5V15H4.5ZM13 5.5 19 15h-6ZM2.5 17h19l-3 4h-13Z'

function resumen(dia: number, palabras: Palabra[], elecciones: Lengua[]): string {
  const aciertos = resultados(palabras, elecciones)
  const total = aciertos.filter(Boolean).length
  const veleros = aciertos
    .map((a) => `<svg class="${a ? 'bien' : 'mal'}" viewBox="0 0 24 24" aria-hidden="true"><path d="${VELERO}"/></svg>`)
    .join('')
  const lista = palabras
    .map(
      (palabra, i) => `
        <li>
          <details>
            <summary>
              <span class="marca-resultado ${aciertos[i] ? 'bien' : 'mal'}" aria-label="${aciertos[i] ? 'Acierto' : 'Fallo'}">${aciertos[i] ? '✓' : '✗'}</span>
              <span class="palabra-resumen">${esc(palabra.palabra)}</span>
              <span class="origen-resumen">${esc(origenUltimo(palabra))}</span>
            </summary>
            ${viaje(palabra)}
          </details>
        </li>`,
    )
    .join('')

  return `
    <section class="resumen" aria-label="Resultado de hoy">
      <div class="ficha">
        <p class="marcas" role="img" aria-label="${total} ${total === 1 ? 'acierto' : 'aciertos'} de ${PALABRAS_POR_DIA}">${veleros}</p>
        <h2>${total} <small>de ${PALABRAS_POR_DIA}</small></h2>
        <p class="frase">${FRASES[total]}</p>
      </div>
      <ol class="lista-resumen" aria-label="Toca una palabra para repasar su viaje">${lista}</ol>
    </section>

    ${panelEstadisticas(dia)}

    <section class="pie">
      <button id="compartir" class="boton">Compartir</button>
      <a class="boton boton-almanaque" data-almanaque-volver hidden href="https://joseleking.github.io/Almanaque/">☜ Regresar al Almanaque</a>
    </section>
    <p class="siguiente">Nuevas palabras en <time id="cuenta">${cuentaAtras()}</time></p>
    <p class="creditos">
      Etimologías basadas en el DLE y en el
      <a href="https://en.wiktionary.org" target="_blank" rel="noopener">Wikcionario</a> (CC BY-SA 4.0).
    </p>
  `
}

function responder(dia: number, indice: number, eleccion: Lengua) {
  const elecciones = eleccionesDe(dia)
  if (elecciones.length !== indice) return
  const nuevas = [...elecciones, eleccion]
  let estadisticas = guardado.estadisticas
  if (nuevas.length === PALABRAS_POR_DIA) {
    estadisticas = registrarDia(estadisticas, dia, resultados(palabrasDelDia(dia, PALABRAS), nuevas))
  }
  guardado = { estadisticas, partida: { dia, elecciones: nuevas } }
  guardar(guardado)
  render()
  app.querySelector('.revelacion')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function compartir(dia: number, aciertos: boolean[]) {
  const texto = textoCompartir(dia, aciertos)
  try {
    if (navigator.share) {
      await navigator.share({ text: texto })
      return
    }
    await navigator.clipboard.writeText(texto)
    mostrarAviso('Resultado copiado')
  } catch (err) {
    if ((err as Error).name !== 'AbortError') mostrarAviso('No se pudo compartir')
  }
}

function mostrarAviso(texto: string) {
  aviso.textContent = texto
  aviso.classList.add('visible')
  setTimeout(() => aviso.classList.remove('visible'), 2000)
}

function cuentaAtras(): string {
  const ahora = new Date()
  const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1)
  const s = Math.max(0, Math.floor((manana.getTime() - ahora.getTime()) / 1000))
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${dos(Math.floor(s / 3600))}:${dos(Math.floor(s / 60) % 60)}:${dos(s % 60)}`
}

// Cada segundo: actualiza la cuenta atrás y, si ha cambiado el día, trae las palabras nuevas.
setInterval(() => {
  if (numeroDelDia(new Date()) !== diaMostrado) return render()
  const cuenta = document.getElementById('cuenta')
  if (cuenta) cuenta.textContent = cuentaAtras()
}, 1000)

render()
retirarPortada()

/**
 * La portada con el icono se ve al menos PORTADA_MS desde que se abre la app y luego se desvanece.
 * Si tarda en pintarse (la primera visita), se queda al menos PINTADA_MS desde entonces.
 */
function retirarPortada() {
  const PORTADA_MS = 1500
  const PINTADA_MS = 1400
  const FUNDIDO_MS = 500
  const portada = document.getElementById('portada')
  if (!portada) return
  const pintada = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? performance.now()
  setTimeout(
    () => {
      portada.classList.add('oculta')
      setTimeout(() => portada.remove(), FUNDIDO_MS)
    },
    Math.max(0, PORTADA_MS - performance.now(), PINTADA_MS - (performance.now() - pintada)),
  )
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('sw.js')
}
