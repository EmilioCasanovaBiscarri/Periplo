import { LENGUAS, PESO_LENGUA, type Lengua, type Palabra } from './palabras'

/** Día en que se publicaron las palabras del día #1 (fecha local del jugador). */
export const INICIO = { anio: 2026, mes: 9, dia: 30 }

export const PALABRAS_POR_DIA = 3

const MS_DIA = 86_400_000

/** Número del día (#1, #2…) según la fecha local. */
export function numeroDelDia(fecha: Date): number {
  const hoy = Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  const inicio = Date.UTC(INICIO.anio, INICIO.mes - 1, INICIO.dia)
  return Math.max(1, Math.floor((hoy - inicio) / MS_DIA) + 1)
}

/** Las palabras del día, consecutivas en el listado y recorriéndolo en ciclo. */
export function palabrasDelDia(numero: number, palabras: Palabra[]): Palabra[] {
  return Array.from(
    { length: PALABRAS_POR_DIA },
    (_, i) => palabras[((numero - 1) * PALABRAS_POR_DIA + i) % palabras.length],
  )
}

export function origenUltimo(palabra: Palabra): Lengua {
  return palabra.cadena[0].lengua
}

/** Generador pseudoaleatorio determinista (mulberry32): todos ven las mismas opciones. */
function aleatorio(semilla: number): () => number {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

function barajar<T>(lista: T[], rnd: () => number): T[] {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

/** Elige `n` lenguas distintas al azar, con probabilidad proporcional a su peso. */
function elegirPonderado(lenguas: Lengua[], n: number, rnd: () => number): Lengua[] {
  const restantes = [...lenguas]
  const elegidas: Lengua[] = []
  while (elegidas.length < n && restantes.length) {
    let x = rnd() * restantes.reduce((suma, l) => suma + (PESO_LENGUA.get(l) ?? 1), 0)
    let i = 0
    for (; i < restantes.length - 1; i++) {
      x -= PESO_LENGUA.get(restantes[i]) ?? 1
      if (x < 0) break
    }
    elegidas.push(...restantes.splice(i, 1))
  }
  return elegidas
}

/**
 * Cuatro opciones para la palabra `indice` del día: el origen último, una lengua intermedia
 * de la cadena si la hay (la trampa: «periplo» pasó por el latín, pero viene del griego)
 * y el resto al azar, con más probabilidad para las lenguas de origen más habituales.
 */
export function opcionesDePalabra(numero: number, indice: number, palabra: Palabra, cantidad = 4): Lengua[] {
  const rnd = aleatorio(numero * 7919 + indice * 104_729)
  const correcta = origenUltimo(palabra)
  const intermedias = [...new Set(palabra.cadena.map((p) => p.lengua))].filter((l) => l !== correcta)
  // Sin parada intermedia, el latín y el griego se hacen de trampa mutuamente.
  const rival = { latín: 'griego', griego: 'latín' }[correcta]
  const trampa = intermedias.length ? [intermedias[Math.floor(rnd() * intermedias.length)]] : rival ? [rival] : []
  const relleno = elegirPonderado(
    LENGUAS.filter((l) => l !== correcta && !trampa.includes(l)),
    cantidad - 1 - trampa.length,
    rnd,
  )
  return barajar([correcta, ...trampa, ...relleno], rnd)
}

export interface Estadisticas {
  /** Días completados (las tres palabras jugadas). */
  dias: number
  palabras: number
  aciertos: number
  racha: number
  mejorRacha: number
  ultimoDiaCompletado: number
}

export const ESTADISTICAS_INICIALES: Estadisticas = {
  dias: 0,
  palabras: 0,
  aciertos: 0,
  racha: 0,
  mejorRacha: 0,
  ultimoDiaCompletado: 0,
}

/**
 * Registra un día completado. La racha cuenta los días seguidos en que se juegan
 * todas las palabras, se acierte o no. Registrar dos veces el mismo día no cuenta.
 */
export function registrarDia(e: Estadisticas, dia: number, resultados: boolean[]): Estadisticas {
  if (e.ultimoDiaCompletado === dia) return e
  const racha = e.ultimoDiaCompletado === dia - 1 ? e.racha + 1 : 1
  return {
    dias: e.dias + 1,
    palabras: e.palabras + resultados.length,
    aciertos: e.aciertos + resultados.filter(Boolean).length,
    racha,
    mejorRacha: Math.max(e.mejorRacha, racha),
    ultimoDiaCompletado: dia,
  }
}

/** La racha se pierde si el jugador se salta un día. */
export function rachaVigente(e: Estadisticas, hoy: number): number {
  return e.ultimoDiaCompletado >= hoy - 1 ? e.racha : 0
}

/** Una marca por palabra: ▰ acertada, ▱ fallada. «Periplo nº 7 ▰▱▰ 2/3 aciertos» y el enlace. */
export function textoCompartir(numero: number, resultados: boolean[]): string {
  const marcas = resultados.map((r) => (r ? '▰' : '▱')).join('')
  const aciertos = resultados.filter(Boolean).length
  return `Periplo nº ${numero} ${marcas} ${aciertos}/${resultados.length} aciertos\nemiliocasanovabiscarri.github.io/Periplo`
}
