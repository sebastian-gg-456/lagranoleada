# La gran emboscada — Phaser 3

Juego web de supervivencia 2D con oleadas infinitas. Proyecto independiente de Unity.

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

- Menú principal, selección de cinco mapas, selección de cuatro personajes, opciones, ayuda y créditos.
- Leaf Ranger con arco, Crystal Mauler con golpe pesado, Ground Monk con ataques rápidos y Water Priestess con magia.
- Movimiento, salto, defensa, rodar con invulnerabilidad breve, daño, muerte y recuperación de vida.
- Plataformas de caverna elevadas en los cinco mapas, enemigos que saltan y ataque secundario con K o el botón Y del mando.
- HUD con retrato del personaje, barra roja de vida y puntaje a la derecha.
- Cinco enemigos de los packs Fantasy y Forest. Oleadas sin límite, con cantidad simultánea y velocidad acotadas.
- Jefe cada cinco oleadas: Demon Slime, Frost Guardian y Minotaur en rotación. Los jefes avanzados agregan ataques de zona anunciados en rojo; saltá o rodá para evitarlos.
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
| Navegar menús | Arriba/abajo | D-pad / stick |
| Confirmar | Enter / Espacio | A |
| Volver | Esc | B |

Conectá el mando y pulsá un botón para que el navegador lo detecte. Las etiquetas corresponden al mapeo estándar de Xbox; otros mandos compatibles usan las posiciones equivalentes. Los botones de menú también funcionan con mouse. El juego está pensado para computadora y mando, sin controles táctiles de combate.

### Combate por personaje

- **Leaf Ranger:** X usa `1_atk` como golpe cercano. Soltar Y antes de 1,5 segundos prepara `2_atk`; mantenerlo 1,5 segundos prepara una flecha cargada con 50% de probabilidad de área y 50% de veneno (10 de daño por segundo durante 5 segundos). El proyectil sale en el fotograma de disparo, no al iniciar la animación. En el aire Y usa `air_atk`, con impacto reforzado al cargar medio segundo. B usa `3_atk` seguido de lluvia de flechas y sus efectos; recarga de 9 segundos.
- **Water Priestess:** X encadena `1_atk → 2_atk → 3_atk`; en el aire usa `air_atk`. Y usa `sp_atk` sin disparar proyectiles: al llegar al fotograma 23 causa 100 de daño en un rectángulo frontal y congela durante 3 segundos. Los fotogramas posteriores solo congelan; quienes entren después del impacto no reciben daño de ese hechizo. B usa `heal`: recupera 25 de vida en el fotograma 8, sin superar 100, cada 15 segundos; a vida completa no consume la habilidad.
- **Ground Monk:** X encadena `1_atk → 2_atk → 3_atk`. Y usa `sp_atk`. B usa `meditate`: permanece quieto 3 segundos; recibir daño interrumpe la meditación. Al completarla gana +50% de daño y 30% de resistencia durante 8 segundos. Recarga de 18 segundos desde la activación, incluso si se interrumpe.
- **Crystal Mauler:** X encadena `1_atk → 2_atk`; en el aire usa `air_atk`. Y usa `3_atk` con daño de área. B usa `sp_atk`, con recarga de 10 segundos.

Para continuar un combo, pulsá X nuevamente al terminar la animación; la ventana es de 1 segundo. Las habilidades B se activan en el suelo. El indicador inferior muestra la carga, la recarga o el beneficio de meditación.

### Hitboxes y fluidez

Los golpes usan rectángulos horizontales delante de quien ataca y se comparan con el cuerpo físico del enemigo: no alcanzan por detrás ni a enemigos en otra altura. Los impactos y disparos están asociados a fotogramas concretos de cada animación; los combos de varios golpes tienen varios contactos, sin daño duplicado por permanecer en un fotograma. La lluvia de flechas daña al aterrizar.

Durante un ataque podés desplazarte al 85% de la velocidad normal y saltar, conservando la dirección de la animación. La rodada permite cancelar un ataque y elimina sus contactos pendientes. Recibir daño no inmoviliza ni interrumpe el ataque en curso; la reacción visual de daño tampoco bloquea movimiento, salto, defensa o rodada. Se mantiene la invulnerabilidad breve posterior al daño.

Los ataques del jugador son un poco más ágiles (12 FPS para básicos/aéreos, 11 para variantes de combo y 10 para especiales). Los enemigos también golpean durante su animación y conservan la orientación mientras atacan. Congelarlos detiene su cuerpo y animación durante 3 segundos y cancela su golpe pendiente.

RB bloquea el daño mientras se mantiene: reproduce `defend` hasta el fotograma 13 del elfo, 7 de Water Priestess, 10 de Ground Monk o 5 de Crystal Mauler, sostiene esa pose y reproduce los fotogramas restantes al soltarlo. Durante la salida ya no bloquea. Las animaciones `take_hit` y `death` responden al daño y la derrota.

Los GIF `*_sample` del elfo son ejemplos compuestos: el juego combina los PNG de ataque, proyectiles e impactos originales para recrear veneno, área, ataque aéreo reforzado y lluvia de flechas.

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
src/rules.js    Reglas de oleadas y guardado
```

Los packs se conservan en el proyecto; el manifiesto selecciona las animaciones utilizadas. Los fondos cristal usan la imagen compuesta de cada set; Parallax Cave utiliza sus nueve capas. La cámara es fija. Forest y Minotaur están incorporados al combate; Minotaur usa desvanecimiento al morir porque su pack gratuito no trae esa animación.

Los documentos originales y licencias se conservan dentro de los packs cuando están incluidos. Revisalos antes de redistribuir los recursos. `npm run assets` vuelve a preparar los recursos desde las carpetas originales ubicadas junto al proyecto; no hace falta ejecutarlo para jugar porque `public/assets` ya está preparado.

## Verificación y distribución

```sh
npm test
npm run build
npx playwright install chromium
node scripts/smoke.mjs
node scripts/combat-smoke.mjs
```

`npm run build` genera `dist/`, listo para publicar en un alojamiento estático. `npm run preview` permite revisar esa versión localmente. La prueba de navegador verifica carga, menús, previews completos, plataformas, salto enemigo a plataformas, movimiento, salto, ataque básico, secundario, aéreo y especial, defensa, pausa con opciones, derrota, guardado, reinicio y jefe. El récord y las opciones son locales a cada navegador/origen.

`combat-smoke.mjs` ejecuta por separado la verificación de todos los contactos por fotograma, orientación, rectángulos frontales, movimiento tras recibir daño, cancelación y congelación. También está incluida en `smoke.mjs`. `scripts/inspect-attacks.mjs` genera láminas de los fotogramas originales en `test-results/` para revisar los momentos de contacto. `REPORTE.txt` conserva las rondas anteriores y agrega las nuevas al historial.
