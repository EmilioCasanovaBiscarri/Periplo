# Periplo

Juego de origen de las palabras, estilo Wordle: tres palabras al día. Adivina de qué
lengua procede cada una **en último término** y descubre su viaje hasta el español.

## Reglas

- Tres palabras al día, las mismas para todos. Cambian a medianoche (hora local).
- Cuatro opciones y un solo intento por palabra. Se pregunta por el **origen último** (la lengua
  más antigua documentada en la cadena etimológica), no por la inmediata: «periplo»
  pasó por el latín, pero viene del griego. Por eso una de las opciones suele ser
  una lengua intermedia de la cadena.
- La racha cuenta los días seguidos en que se juegan las tres palabras, se acierte o no;
  saltarse un día (o dejarlo a medias) la reinicia.
- Almohada, chocolate y cancha no están en el juego porque el texto de bienvenida las usa
  como ejemplo (y revelaría la respuesta).

## Desarrollo

```sh
npm install
npm run dev      # servidor local (añade --host para probarlo desde el móvil en la misma red)
npm test         # lógica del juego y validación de datos
npm run build    # genera dist/, lista para publicar (p. ej. en GitHub Pages)
npm run icons    # regenera public/icons a partir de assets/ (usa sips, de macOS)
```

## Estructura

- `src/palabras.ts`: las palabras con su cadena etimológica (de la forma más
  antigua a la más reciente). El origen último es el primer paso de la cadena.
- `src/juego.ts`: lógica pura (palabra del día, opciones, racha).
- `src/main.ts`: interfaz.
- `sw.js`: service worker para jugar sin conexión (la build le inyecta la lista de ficheros).

## Palabras

900 palabras: 24 escritas a mano (`PROPIAS` en `src/palabras.ts`, con notas) y 876 extraídas del
Wikcionario con revisión manual (`src/palabras-wikcionario.json`; ver `scripts/wikcionario/`).
El orden decide qué palabras tocan cada día (tres consecutivas), así que una vez publicado el juego
no hay que reordenar ni borrar: las nuevas se añaden al final.

## Licencia de los datos

Las etimologías de `src/palabras-wikcionario.json` proceden del [Wikcionario](https://en.wiktionary.org)
(vía [kaikki.org](https://kaikki.org)) y se distribuyen bajo
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). El juego lo indica en la pantalla de resultado.

## Derechos de autor

© 2026 Emilio Casanova Biscarri. Todos los derechos reservados. El código, los textos y los diseños de este repositorio no pueden copiarse ni reutilizarse sin permiso, salvo los datos indicados en «Licencia de los datos», que conservan su propia licencia.
