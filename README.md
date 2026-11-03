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
| Defender | S / Abajo | D-pad abajo |
| Rodar | Shift | B |
| Pausa | Esc | Start |
| Navegar menús | Arriba/abajo | D-pad / stick |
| Confirmar | Enter / Espacio | A |
| Volver | Esc | B |

Conectá el mando y pulsá un botón para que el navegador lo detecte. Las etiquetas corresponden al mapeo estándar de Xbox; otros mandos compatibles usan las posiciones equivalentes. Los botones de menú también funcionan con mouse. El juego está pensado para computadora y mando, sin controles táctiles de combate.

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
```

`npm run build` genera `dist/`, listo para publicar en un alojamiento estático. `npm run preview` permite revisar esa versión localmente. La prueba de navegador verifica carga, menús, previews completos, plataformas, salto enemigo a plataformas, movimiento, salto, ataque básico, secundario, aéreo y especial, defensa, pausa con opciones, derrota, guardado, reinicio y jefe. El récord y las opciones son locales a cada navegador/origen.
