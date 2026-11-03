# La gran emboscada — Phaser 3

Juego web de supervivencia 2D con oleadas infinitas. Proyecto independiente de Unity.

**Integrante:** Sebastian Gonzales Garcia

## Abrir el juego

Requiere Node.js 20.19+ o 22.12+.

En Windows, hacé doble clic en **INICIAR.bat**. Se abre el navegador; dejá la ventana de consola abierta mientras jugás.

También podés usar una terminal en esta carpeta:

```sh
npm install
npm run dev
```

Abrí la dirección que muestra Vite (normalmente http://localhost:5173). No abras `index.html` haciendo doble clic: los recursos necesitan un servidor HTTP.

## Contenido

- Menú principal, selección de cinco mapas, selección de cuatro personajes, Campo libre, opciones, ayuda y créditos.
- Leaf Ranger con arco, Crystal Mauler con golpe pesado, Ground Monk con ataques rápidos y Water Priestess con magia.
- Movimiento, salto, defensa, rodar con invulnerabilidad breve, daño, muerte y recuperación de vida.
- Plataformas de caverna elevadas en los cinco mapas, enemigos que saltan y ataque secundario con K o el botón Y del mando.
- HUD con retrato del personaje, barra roja de vida y puntaje a la derecha.
- Tres enemigos Fantasy: Mushroom, Skeleton y Flying Eye. Goblin y el hongo Forest fueron retirados del combate. Oleadas sin límite, con cantidad simultánea y velocidad acotadas.
- Cada cinco oleadas aparece un jefe en un enfrentamiento exclusivo: **Morgath, Devorador del Abismo** (Demon Slime), **Hrímgar, Titán del Invierno** (Frost Guardian) y **Asterión, Azote del Laberinto** (Minotaur), en rotación. Tienen gran tamaño y barra de vida de 800 px; sus golpes quitan 38, 42 y 45 de vida respectivamente antes de resistencias. Usan sus ataques originales `cleave`, `1_atk` y `atk_1`. Los tres packs están dibujados mirando a la izquierda, así que la orientación se invierte respecto de la posición del jugador para que caminen de frente; el Minotauro apoya los pies en el suelo con su origen ajustado a 0,9. El alcance frontal de sus golpes se redujo a 180 px, con activación a 150 px.
- Pausa, reinicio, regreso al menú, Game Over y récord persistente mediante localStorage.
- Música del pack Japanese Music Pack, efectos sintetizados y volúmenes independientes. La música empieza al iniciar una partida.
- Pantalla completa y escalado de pantalla 16:9. La pérdida de foco pausa automáticamente.

## Controles

| Acción | Teclado | Mando estándar |
|---|---|---|
| Mover | A/D o flechas | Stick izquierdo / D-pad |
| Saltar | Espacio | A |
| Atacar | J | X |
| Ataque secundario | K | Y |
| Habilidad del personaje | L | B |
| Defender (mantener) | S / Abajo | RB |
| Rodar | Shift | LB |
| Pausa | Esc | Start |
| Probar siguiente jefe | 5 | — |
| Hablar con el muñeco (Campo libre) | Enter | A |
| Cambiar algoritmo (Laboratorio IA) | Q | — |
| Cambiar ruta (Laboratorio IA) | E | — |
| Generar escenario (Laboratorio IA) | R | — |
| Navegar menús | Arriba/abajo | D-pad / stick |
| Confirmar | Enter / Espacio | A |
| Volver | Esc | B |

Conectá el mando y pulsá un botón para que el navegador lo detecte. Las etiquetas corresponden al mapeo estándar de Xbox; otros mandos compatibles usan las posiciones equivalentes. Los botones de menú también funcionan con mouse. El juego está pensado para computadora y mando, sin controles táctiles de combate.

El mapeo estándar de Xbox/PlayStation queda activo por defecto. El menú de tutorial ya no muestra el botón **Calibrar mando**; las asignaciones personalizadas guardadas en partidas anteriores se siguen aplicando por identificador de mando. La rodada queda en el LB físico y el secundario en Y.

Durante una partida, **5** reinicia el encuentro en la siguiente oleada múltiplo de cinco, conservando personaje y mapa, con 100 de vida y puntaje reiniciado. Podés pulsarlo otra vez para pasar al siguiente jefe; limpia enemigos, proyectiles y eventos anteriores.

### Combate por personaje

- **Leaf Ranger:** X usa `1_atk` como golpe cercano. Soltar Y antes de 1,5 segundos prepara `2_atk`; mantenerlo 1,5 segundos prepara una flecha cargada con 50% de probabilidad de área y 50% de veneno (10 de daño por segundo durante 5 segundos). El proyectil sale en el fotograma de disparo, no al iniciar la animación. En el aire Y usa `air_atk`, con impacto reforzado al cargar medio segundo. B usa `3_atk` seguido de lluvia de flechas y sus efectos; recarga de 9 segundos.
- **Water Priestess:** X encadena `1_atk → 2_atk → 3_atk`; en el aire usa `air_atk`. Y usa `sp_atk` sin proyectiles: la esfera explota en el fotograma 13 y causa 100 de daño frontal una sola vez. Desde el fotograma 23 empieza la fase de hielo, que congela durante 3 segundos sin daño adicional, también a quienes entren después. B usa `heal`: recupera 25 de vida en el fotograma 8, sin superar 100, cada 15 segundos; a vida completa no consume la habilidad.
- **Ground Monk:** X encadena `1_atk → 2_atk → 3_atk`. Y usa `sp_atk`. B usa `meditate`: permanece quieto 3 segundos; recibir daño interrumpe la meditación. Al completarla gana +50% de daño y 30% de resistencia durante 8 segundos. Recarga de 18 segundos desde la activación, incluso si se interrumpe.
- **Crystal Mauler:** X encadena `1_atk → 2_atk`; en el aire usa `air_atk`. Y usa `3_atk` con daño de área, exclusivamente en suelo. B usa `sp_atk`, también solo en suelo, con recarga de 10 segundos. Pulsarlos en el aire no consume la habilidad.

Para continuar un combo, pulsá X otra vez: si lo pulsás durante el básico, se guarda una pulsación y el siguiente golpe comienza al terminar la animación. También podés pulsarlo durante el segundo posterior al final. Agua y monje encadenan tres básicos; cristal encadena dos. Mantener X no repite automáticamente. Rodar cancela también el golpe en cola. Las habilidades B se activan en el suelo. El indicador inferior muestra la carga, la recarga o el beneficio de meditación.

### Hitboxes y fluidez

Los golpes usan rectángulos horizontales delante de quien ataca y se comparan con el cuerpo físico del enemigo: no alcanzan por detrás ni a enemigos en otra altura. Los impactos y disparos están asociados a fotogramas concretos de cada animación; los combos de varios golpes tienen varios contactos, sin daño duplicado por permanecer en un fotograma. La lluvia de flechas daña al aterrizar.

Durante ataques, carga, habilidades y defensa no se puede caminar ni iniciar un salto, y la dirección permanece fija. Un ataque iniciado en el aire conserva la caída por gravedad. La rodada con **LB / Shift** permite cancelar un ataque en suelo y elimina sus contactos pendientes. Recibir daño no agrega aturdimiento ni interrumpe el ataque en curso. Se mantiene la invulnerabilidad breve posterior al daño.

Los impactos del elfo conservan la dirección de la flecha. La lluvia se ancla al suelo o plataforma bajo cada flecha; los impactos aéreos se apoyan en esa superficie, sin quedar flotando. El monje adelanta el contacto de tierra del tercer básico al fotograma 17 y el primero del especial al 8 (el segundo sigue en el 18).

Los ataques del jugador son un poco más ágiles (12 FPS para básicos/aéreos, 11 para variantes de combo y 10 para especiales). Los enemigos también golpean durante su animación y conservan la orientación mientras atacan. Congelarlos detiene su cuerpo y animación durante 3 segundos y cancela su golpe pendiente.

RB bloquea el daño mientras se mantiene: reproduce `defend` hasta el fotograma 13 del elfo, 7 de Water Priestess, 10 de Ground Monk o 5 de Crystal Mauler, sostiene esa pose y reproduce los fotogramas restantes al soltarlo. Durante la salida ya no bloquea. Las animaciones `take_hit` y `death` responden al daño y la derrota.

Los GIF `*_sample` del elfo son ejemplos compuestos: el juego combina los PNG de ataque, proyectiles e impactos originales para recrear veneno, área, ataque aéreo reforzado y lluvia de flechas.

### Enemigos

- **Flying Eye:** patrulla arriba mientras el jugador pisa el piso principal y ataca cuando este deja el piso. Cada ojo recibe al azar un rol: **francotirador** (dispara proyectiles con `Attack3` desde media distancia y solo retrocede si lo tienen muy encima), **embestidor** (se coloca sobre el jugador y se lanza como un misil sin explosión con `Attack2`, 16 de daño) o **mordedor** (se acerca y muerde con `Attack`, con embestidas ocasionales). Esperan entre 1,8 y 4,7 s entre ataques según el tipo. Al morir cae por gravedad, reproduce los dos primeros fotogramas y sostiene el segundo hasta tocar suelo o plataforma; entonces reproduce el resto.
- **Mushroom:** alterna `Attack` y `Attack2`, ambos cuerpo a cuerpo y con 10 de daño.
- **Skeleton:** golpe normal de 10 y ataque largo de 18, con solo 25 px más de alcance y 1,05 s de recuperación vulnerable. Levanta el escudo durante 0,85 s ante ataques cercanos o de forma ocasional, con 4,2 s entre defensas. Bloquea daño e impactos envenenados nuevos; no elimina veneno ya aplicado.
- **Percepción y decisiones:** el esqueleto patrulla horizontalmente por el suelo y solo combate cuando detecta al jugador cerca, en su mismo nivel; no lo persigue arriba. El hongo usa la posición y superficie actuales del jugador para calcular una ruta, conserva el último objetivo de superficie mientras el jugador está en el aire y recorre la ruta plataforma por plataforma (con impulso de salto según la altura de la siguiente parada) hasta llegar al jugador, aunque esté en una plataforma muy alta. El Ojo Volador patrulla arriba mientras el jugador pisa el piso principal; en cuanto este deja el piso (plataforma o aire) entra en persecución/ataque. Los estados de NPC se muestran en el Laboratorio de IA.

El tutorial muestra una tabla ampliada de acciones y botones, con iconos originales de Xbox y equivalentes de PlayStation (L1 para rodar, R1 para defender). Se retiró el bloque inferior de descripciones para ampliar textos e imágenes; las habilidades se detallan aquí y en la selección de personaje.

## Campo libre y laboratorio de IA

Desde el menú inicial, elegí **Campo libre** y luego una de sus modalidades:

- **Práctica de personaje:** seleccioná uno de los cuatro personajes. La escena no tiene plataformas ni oleadas; podés caminar, saltar y probar ataques contra un muñeco indestructible. Pulsá **A** en el mando o **Enter** para hablar con el Maestro Muñeco, que describe en pocas líneas el estilo de combate del personaje (por ejemplo, la elfa destaca a distancia). Se mueve al recibir golpes y cuenta los impactos y el último daño.
- **Laboratorio de IA:** también permite elegir personaje. Muestra hongos que siguen rutas, un esqueleto que patrulla el piso y un Ojo Volador que solo fija como objetivo al jugador fuera del piso principal. Los trazos muestran las rutas de los hongos y las plataformas rojas señalan superficies expuestas. Cambiá los métodos mientras el juego corre con los botones en pantalla o Q/E; **R** genera otra variante de plataformas y riesgos.

### Búsqueda y navegación

- **BFS (búsqueda en anchura):** encuentra una ruta con la menor cantidad de transiciones/saltos. Trata las conexiones como si tuvieran el mismo costo; por eso no garantiza la ruta de menor distancia física.
- **A\*:** usa distancia geométrica como heurística y busca reducir la distancia del recorrido. La calidad depende de la heurística y de las conexiones representadas en el grafo.
- **Ruta corta:** usa BFS por cantidad de transiciones o A\* por distancia.
- **Ruta segura:** BFS evita plataformas marcadas como expuestas y busca otra ruta; A\* agrega un costo alto por aterrizar en esas plataformas. Si no hay alternativa, BFS permite una ruta con riesgo antes que no encontrar camino.

Cada variante se genera con una semilla reproducible y cambia posiciones/alturas de plataformas, además de zonas expuestas. El laboratorio reconstruye el grafo y recalcula los recorridos; no es solo un cambio visual.

Los comportamientos se implementan como FSM con estados visibles como `patrol`, `pursue`, `chase`, `jump`, `attack`, `defend`, `recover`, `hurt`, `frozen` y `dead`; las transiciones dependen de la superficie del jugador, distancia, temporizadores y estados de daño/defensa. La especificación previa a la implementación está en [spec/campo-libre-ia.md](./spec/campo-libre-ia.md).

## Organización

```text
public/assets/
  enemigos/     Fantasy, sus versiones adicionales y Forest
  jefes/        DemonSlime, FrostGuardian y Minotaur
  personajes/   LeafRanger, CrystalMauler, GroundMonk y WaterPriestess
  fondos/       CrystalCave y ParallaxCave
  audio/        Japanese Music Pack
  controles/    Iconos de controles
  extras/       Shadow Series
  manifest.json
src/main.js     Escenas, controles, presentación y combate
src/combat.js   Acciones, fotogramas, proyectiles y efectos del jugador
src/enemies.js  IA, escudo, ataques y proyectiles enemigos
src/gamepad.js  Asignación estándar y calibraciones por mando
src/rules.js    Reglas de oleadas y guardado
src/navigation.js Grafos de plataformas, BFS, A* y escenarios procedurales
spec/           Especificaciones breves y criterios de aceptación
```

Los packs se conservan en el proyecto; el manifiesto selecciona las animaciones utilizadas. Los fondos cristal usan la imagen compuesta de cada set; Parallax Cave utiliza sus nueve capas. La cámara es fija. Minotaur usa desvanecimiento al morir porque su pack gratuito no trae esa animación.

Los documentos originales y licencias se conservan dentro de los packs cuando están incluidos. Revisalos antes de redistribuir los recursos. `npm run assets` vuelve a preparar los recursos desde las carpetas originales ubicadas junto al proyecto; no hace falta ejecutarlo para jugar porque `public/assets` ya está preparado. Si algún pack original ya no está disponible, el script conserva el paquete previamente preparado en `public/assets` en lugar de fallar.

## Verificación y distribución

```sh
npm test
npm run build
npx playwright install chromium
node scripts/smoke.mjs
node scripts/combat-smoke.mjs
node scripts/revision-smoke.mjs
node scripts/boss-smoke.mjs
npm run ai-smoke
```

`npm run build` genera `dist/`, listo para publicar en un alojamiento estático. `npm run preview` permite revisar esa versión localmente. La prueba de navegador verifica carga, menús, previews completos, plataformas, salto enemigo a plataformas, movimiento, salto, ataque básico, secundario, aéreo y especial, defensa, pausa con opciones, derrota, guardado, reinicio y jefe. El récord y las opciones son locales a cada navegador/origen.

`combat-smoke.mjs` ejecuta por separado la verificación de todos los contactos por fotograma, orientación, rectángulos frontales, movimiento tras recibir daño, cancelación y congelación. También está incluida en `smoke.mjs`. `scripts/inspect-attacks.mjs` genera láminas de los fotogramas originales en `test-results/` para revisar los momentos de contacto. `REPORTE.txt` conserva las rondas anteriores y agrega las nuevas al historial.

`revision-smoke.mjs` verifica controles X/Y/B/LB/RB en los cuatro personajes, inmovilidad al atacar, restricciones aéreas de cristal, efectos del elfo, saltos enemigos, escudo y variantes de golpes, patrulla/proyectil/embestida/mordisco/muerte del ojo y los tres jefes. Genera capturas del tutorial, efectos y jefes en `test-results/`.

También ejecuta `verify-controls.mjs`: pulsa botones mediante Gamepad API para comprobar combos completos, Y sin rodada, habilidades B, LB, calibración de un mando no estándar conservada tras recargar, acceso a los tres jefes con 5 y tiempos nuevos del ojo.

`boss-smoke.mjs` revisa que el tutorial no muestre la calibración, que Morgath mire en la dirección en la que camina, que su golpe alcance a 120 px pero no a 210 px y que los pies y el cuerpo del Minotauro queden apoyados en el suelo (origen 0,9). Genera capturas en `test-results/`.

`npm run ai-smoke` recorre Campo libre, verifica la escena de práctica y el diálogo activado por A, y cambia los métodos/rutas y la variante del Laboratorio de IA.
