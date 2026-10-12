import { describe, expect, it } from 'vitest'
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
} from './juego'
import { LENGUAS, PALABRAS } from './palabras'

describe('palabras del día', () => {
  it('numera desde el día de inicio y cambia a medianoche local', () => {
    expect(numeroDelDia(new Date(2026, 8, 30, 0, 0))).toBe(1)
    expect(numeroDelDia(new Date(2026, 8, 30, 23, 59))).toBe(1)
    expect(numeroDelDia(new Date(2026, 9, 1, 0, 0))).toBe(2)
    expect(numeroDelDia(new Date(2027, 8, 30))).toBe(366)
  })

  it('no se ve afectada por el cambio de hora', () => {
    expect(numeroDelDia(new Date(2026, 9, 26, 12))).toBe(27)
    expect(numeroDelDia(new Date(2027, 2, 29, 12))).toBe(181)
  })

  it('da tres palabras distintas cada día, sin repetir las del día anterior', () => {
    for (let n = 1; n <= 200; n++) {
      const hoy = palabrasDelDia(n, PALABRAS)
      expect(hoy).toHaveLength(PALABRAS_POR_DIA)
      expect(new Set(hoy).size).toBe(PALABRAS_POR_DIA)
      for (const p of palabrasDelDia(n + 1, PALABRAS)) expect(hoy).not.toContain(p)
    }
  })

  it('empieza por el principio del listado', () => {
    expect(palabrasDelDia(1, PALABRAS)).toEqual(PALABRAS.slice(0, PALABRAS_POR_DIA))
  })
})

describe('opciones', () => {
  it('son 4 lenguas distintas, deterministas y con la correcta', () => {
    for (let n = 1; n <= 200; n++) {
      palabrasDelDia(n, PALABRAS).forEach((palabra, i) => {
        const opciones = opcionesDePalabra(n, i, palabra)
        expect(opciones).toHaveLength(4)
        expect(new Set(opciones).size).toBe(4)
        expect(opciones).toContain(origenUltimo(palabra))
        expect(opcionesDePalabra(n, i, palabra)).toEqual(opciones)
      })
    }
  })

  it('no delatan la respuesta: en las palabras latinas suele aparecer también el griego', () => {
    let latinas = 0
    let conGriego = 0
    for (let n = 1; n <= 300; n++) {
      palabrasDelDia(n, PALABRAS).forEach((palabra, i) => {
        if (origenUltimo(palabra) !== 'latín') return
        latinas++
        if (opcionesDePalabra(n, i, palabra).includes('griego')) conGriego++
      })
    }
    expect(conGriego / latinas).toBeGreaterThan(0.4)
  })

  it('enfrentan latín y griego cuando no hay parada intermedia', () => {
    const analisis = PALABRAS.find((p) => p.palabra === 'análisis')!
    expect(opcionesDePalabra(10, 2, analisis)).toContain('latín')
  })

  it('incluyen una lengua intermedia como trampa', () => {
    const periplo = PALABRAS.find((p) => p.palabra === 'periplo')!
    expect(opcionesDePalabra(1, 0, periplo)).toContain('latín')
  })
})

describe('racha', () => {
  it('cuenta días completados seguidos, aciertes o no', () => {
    let e = registrarDia(ESTADISTICAS_INICIALES, 1, [true, true, true])
    e = registrarDia(e, 2, [false, false, false])
    e = registrarDia(e, 3, [true, false, true])
    expect(e).toMatchObject({ dias: 3, palabras: 9, aciertos: 5, racha: 3, mejorRacha: 3 })
  })

  it('no cuenta dos veces el mismo día', () => {
    const e = registrarDia(ESTADISTICAS_INICIALES, 1, [true, true, true])
    expect(registrarDia(e, 1, [true, true, true])).toBe(e)
  })

  it('se pierde si te saltas un día', () => {
    let e = registrarDia(ESTADISTICAS_INICIALES, 1, [true, true, true])
    e = registrarDia(e, 2, [true, true, true])
    expect(rachaVigente(e, 3)).toBe(2)
    expect(rachaVigente(e, 4)).toBe(0)
    e = registrarDia(e, 4, [true, true, true])
    expect(e).toMatchObject({ racha: 1, mejorRacha: 2 })
  })
})

describe('compartir', () => {
  it('muestra una casilla por palabra sin revelar respuestas', () => {
    expect(textoCompartir(5, [true, false, true])).toBe('Periplo nº 5 ▰▱▰ 2/3 aciertos\nemiliocasanovabiscarri.github.io/Periplo')
  })
})

describe('datos', () => {
  it('tiene 900 palabras únicas, cada una con su cadena', () => {
    expect(PALABRAS).toHaveLength(900)
    expect(new Set(PALABRAS.map((p) => p.palabra)).size).toBe(PALABRAS.length)
    for (const p of PALABRAS) {
      expect(p.cadena.length, p.palabra).toBeGreaterThan(0)
      for (const paso of p.cadena) {
        expect(paso.lengua, p.palabra).toBeTruthy()
        expect(paso.forma.trim(), p.palabra).not.toBe('')
      }
    }
  })

  it('ofrece como opción cualquier origen último', () => {
    for (const p of PALABRAS) expect(LENGUAS).toContain(origenUltimo(p))
  })

  it('no incluye las palabras que el texto de la portada usa como ejemplo', () => {
    for (const ejemplo of ['almohada', 'chocolate', 'cancha']) {
      expect(PALABRAS.map((p) => p.palabra)).not.toContain(ejemplo)
    }
  })
})
