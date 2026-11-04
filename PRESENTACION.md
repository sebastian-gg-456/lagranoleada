# Presentación — La gran emboscada

**TP Final Integrador · Sebastian Gonzales Garcia · Proyecto individual en Phaser 3, Vite y JavaScript.**

**Jugar localmente:** doble clic en `INICIAR.bat`, o `npm install` + `npm run dev` y abrir `http://localhost:5173`. No hay deploy público: `npm run build` genera `dist/`, listo para publicar en cualquier hosting estático.

**Duración orientativa:** 10 minutos de exposición y 5 de demo.

---

## 1. Idea del juego (1 min)

- Supervivencia sin fin por oleadas en una caverna, en una sola pantalla con cámara fija.
- El jugador elige **1 de 5 mapas** (Caverna ancestral y cuatro variantes de cristales) y **1 de 4 personajes**.
- El objetivo es **sobrevivir la mayor cantidad de oleadas posible** y superar el récord guardado. No hay victoria final: la partida termina cuando la vida llega a 0.
- Cada 5 oleadas aparece un **jefe exclusivo**, sin enemigos comunes en esa oleada.
- El jugador se mueve, salta, encadena combos, defiende, rueda y usa una habilidad propia por personaje.
- Foco del TP: **combate sincronizado con animaciones, IA de enemigos, navegación entre plataformas y escenarios variables**.
- La dificultad crece con la oleada: más vida, más cantidad y más velocidad, con topes para no saturar (máximo 36 enemigos y velocidad 185).

---

## 2. Escenas y flujo del juego (1 min)

| Escena | Función |
|---|---|
| Boot / Load | Carga el manifiesto de recursos, animaciones, sonido y texturas generadas |
| Menu | Inicio, mapas, personajes, Campo libre, opciones, tutorial y créditos |
| Game | Oleadas, combate, enemigos, jefes, HUD y pausa |
| Training | Práctica de personaje con el Maestro Muñeco |
| AILab | Laboratorio de IA con BFS/A*, rutas y escenarios variables |
| Overlay | Pausa, opciones en partida y Game Over |

- HUD con retrato, barra roja de vida, puntaje y oleada a la derecha; barra destacada de 800 px para el jefe.
- Pausa automática al perder foco, pantalla completa, escalado 16:9 y récord en `localStorage`.
- Audio: música del Japanese Music Pack y efectos sintetizados, con volúmenes separados.

---

## 3. Personajes y controles (1,5 min)

| Acción | Teclado | Mando estándar |
|---|---|---|
| Mover | A/D o flechas | Stick / D-pad |
| Saltar | Espacio | A |
| Básico / combo | J | X |
| Secundario / carga | K | Y |
| Habilidad | L | B |
| Defender (mantener) | S / Abajo | RB |
| Rodar | Shift | LB |
| Pausa | Esc | Start |
| Probar siguiente jefe | 5 | — |
| Hablar con el muñeco | Enter | A |
| BFS/A*, ruta y variante (Lab) | Q / E / R | — |

| Personaje | X | Y | B |
|---|---|---|---|
| **Leaf Ranger** | Golpe cercano `1_atk` | Flecha; carga 1,5 s para área o veneno (10/s durante 5 s) | `3_atk` + lluvia de flechas, recarga 9 s |
| **Water Priestess** | Combo `1_atk → 2_atk → 3_atk` | `sp_atk` frontal: 100 de daño y congelación de 3 s | Cura 25, máximo 100, recarga 15 s |
| **Ground Monk** | Combo de 3 golpes | `sp_atk` con dos contactos | Meditación 3 s: +50% daño y 30% resistencia durante 8 s |
| **Crystal Mauler** | Combo de 2 golpes; aéreo `air_atk` | `3_atk` de área, solo en suelo | `sp_atk`, solo en suelo, recarga 10 s |

- Los combos aceptan una pulsación en cola y tienen una ventana de 1 segundo al terminar la animación.
- Mantener X no repite automáticamente; rodar cancela el ataque y la pulsación en cola.

---

## 4. Combate sincronizado por fotogramas (2 min)

Los golpes no aplican daño al pulsar: se disparan en **fotogramas concretos de la animación**.

| Personaje | Fotogramas de contacto (base 1) |
|---|---|
| Leaf Ranger | `1_atk`: 5 · `2_atk`: 9 · `air_atk`: 6 · `3_atk`: 9 (lluvia al aterrizar) |
| Crystal Mauler | `1_atk`: 4 · `2_atk`: 4 · `3_atk`: 11 · `air_atk`: 4 · `sp_atk`: 9 |
| Ground Monk | `1_atk`: 2 · `2_atk`: 2, 6 y 9 · `3_atk`: 2, 6, 9 y 17 · `sp_atk`: 8 y 18 |
| Water Priestess | `1_atk`: 3 · `2_atk`: 3 y 15 · `3_atk`: 3, 15 y 22 · `air_atk`: 4 · `sp_atk`: 13 · `heal`: 8 |

- Los contactos usan un **rectángulo horizontal delante del actor** y se comparan con el cuerpo físico real: no golpean por detrás ni a otra altura.
- El daño total de un combo se reparte entre sus contactos; cada contacto se ejecuta una sola vez.
- El agua causa 100 de daño al explotar la esfera en el fotograma 13 y, desde el 23, congela 3 s sin daño adicional.
- La defensa reproduce `defend` hasta un fotograma por personaje (13, 7, 10 o 5), sostiene la pose y bloquea mientras se mantiene.
- Rodar cancela el ataque en suelo y elimina los contactos pendientes; los proyectiles ya lanzados siguen su curso.
- Los enemigos también golpean dentro de su animación y no se giran mientras atacan.

---

## 5. Enemigos e IA (2 min)

| Enemigo | Comportamiento | Ataques |
|---|---|---|
| **Mushroom** | Usa el grafo de superficies, sigue una ruta plataforma por plataforma y salta con impulso según la altura del siguiente destino | `Attack` / `Attack2`, 10 de daño |
| **Skeleton** | Patrulla el piso principal; solo combate si el jugador está cerca y en el mismo nivel; no persigue plataformas altas | Golpe 10 y ataque largo 18; escudo de 0,85 s con 4,2 s entre defensas |
| **Flying Eye** | Patrulla arriba mientras el jugador pisa el piso; persigue cuando el jugador está en plataforma o en el aire | Rol aleatorio: francotirador (proyectil), embestidor (misil de 16) o mordedor (10) |

**FSM visible en el Laboratorio de IA:** `patrol`, `pursue`, `chase`, `jump`, `attack`, `defend`, `recover`, `hurt`, `frozen`, `dash` y `dead`.

- El esqueleto levanta el escudo ante ataques cercanos o de forma ocasional; bloquea daño nuevo, pero no cura veneno ya aplicado.
- El ojo volador espera entre 1,8 y 4,7 s entre ataques según su rol; al morir cae por gravedad y reproduce la muerte en dos fases.
- Congelar o herir cancela el ataque o la embestida pendiente.
- Los enemigos solo saltan hacia un jugador apoyado en una superficie elevada, no porque el jugador esté en el aire.

---

## 6. Jefes y oleadas (1 min)

| Jefe | Pack | Daño | Escala | Aparece en |
|---|---|---|---|---|
| **MORGATH · Devorador del Abismo** | Demon Slime | 38 | 2,8 | Oleadas 5, 20, 35… |
| **HRÍMGAR · Titán del Invierno** | Frost Guardian | 42 | 3,1 | Oleadas 10, 25, 40… |
| **ASTERIÓN · Azote del Laberinto** | Minotaur | 45 | 2,8 | Oleadas 15, 30, 45… |

- En cada múltiplo de 5 la oleada es **solo jefe**, con vida `900 + oleada × 90` y barra destacada de 800 px con nombre.
- Los tres packs están dibujados mirando a la izquierda (`nativeFacing: -1`), así que la orientación se invierte para que caminen de frente.
- Alcance frontal reducido a 180 px, con activación a 150 px.
- El Minotauro apoya los pies en el suelo con origen 0,9; su pack no trae animación de muerte, así que usa desvanecimiento.
- La tecla **5** permite saltar directamente al siguiente jefe conservando mapa y personaje.

---

## 7. Navegación y búsqueda (2 min)

- El escenario se representa como un **grafo de superficies**: nodos del piso y plataformas, conectados solo si el salto es alcanzable (subida máxima 160 px).
- `nearestSurfaceNode` ubica al NPC y al jugador en el nodo correspondiente según su posición y altura.

| Algoritmo | Qué garantiza | Uso en el juego |
|---|---|---|
| **BFS** | Ruta con la menor cantidad de transiciones/saltos | Referencia de camino con costos uniformes |
| **A\*** | Ruta de menor costo usando distancia geométrica como heurística | Navegación principal del hongo en partida |

| Navegación | Comportamiento |
|---|---|
| **Corta** | Minimiza transiciones (BFS) o distancia estimada (A\*) |
| **Segura** | Evita plataformas marcadas como expuestas; A\* les suma un costo alto |

- En el Laboratorio: **Q** alterna BFS/A\*, **E** cambia corta/segura y **R** genera otra variante. También hay botones en pantalla.
- La ruta se dibuja sobre el escenario y se recalcula al cambiar de objetivo o de variante.

---

## 8. Escenarios variables (1 min)

- `generateScenario(seed)` usa un generador congruencial lineal: la misma semilla produce exactamente el mismo escenario.
- Cada variante cambia posición, altura y ancho de 4 plataformas, y marca 1 o 2 zonas expuestas.
- Al generar otra variante, el Laboratorio **reconstruye el grafo** y vuelve a calcular las rutas: no es solo un cambio visual.
- Las pruebas verifican que la generación es repetible por semilla y que distintas semillas alteran las plataformas.
- En partida, los 5 mapas tienen plataformas fijas preparadas por `scripts/prepare-assets.mjs`; la variación procedural está concentrada en el Laboratorio de IA.

---

## 9. Campo libre: práctica y laboratorio (1 min)

**Práctica de personaje**
- Piso sin plataformas ni oleadas, con un muñeco indestructible que se balancea al recibir golpes y cuenta impactos y último daño.
- **A del mando o Enter** abre el diálogo del **Maestro Muñeco**, con retrato propio. Cada personaje tiene tres frases que describen su estilo.
- El diálogo avanza por flanco de pulsación, se cierra solo y no se reinicia hasta volver a pulsar.

**Laboratorio de IA**
- Dos hongos que siguen rutas, un esqueleto que patrulla y un ojo volador que solo fija al jugador fuera del piso.
- Muestra el estado de cada NPC, las rutas y las plataformas expuestas.
- Permite comparar BFS/A\* y ruta corta/segura mientras el juego corre.

---

## 10. Verificación y proceso (1 min)

| Comando | Qué comprueba |
|---|---|
| `npm test` | 10 pruebas unitarias de reglas, combate y navegación |
| `node scripts/smoke.mjs` | Flujo completo: menús, mapas, personajes, combate, pausa, derrota, récord y jefe |
| `node scripts/combat-smoke.mjs` | Contactos por fotograma, hitboxes, orientación, cancelación y congelación |
| `node scripts/revision-smoke.mjs` | Controles X/Y/B/LB/RB, restricciones, enemigos y jefes |
| `node scripts/boss-smoke.mjs` | Tutorial, orientación, alcance y apoyo del Minotauro |
| `npm run ai-smoke` | Campo libre, diálogo, BFS/A\*, rutas y variantes |
| `node scripts/eye-roles.mjs` | Roles del ojo volador: disparo, embestida y mordida |
| `npm run build` | Build de producción en `dist/` |

- Las pruebas de navegador usan **Playwright con Chromium headless**.
- El proceso está documentado en **REPORTE.txt**, con 9 rondas acumulativas: pedido, cambios, archivos y verificación.
- Antes de implementar Campo libre se escribió **`spec/campo-libre-ia.md`**, con alcance y criterios de aceptación.
- **Nota para la exposición:** el reporte aclara que en las rondas 6 a 8 OpenCode no se usó con el código del proyecto, aunque los créditos del juego lo mencionan. Conviene unificar ese mensaje antes de presentar.

---

## 11. Demo (5 min)

Orden sugerido:

1. Abrir con `INICIAR.bat` o `npm run dev`. Mostrar menú principal, récord y opciones.
2. Entrar a **Jugar**, recorrer los 5 mapas y ver el preview completo con las capas Parallax.
3. Elegir un personaje y mostrar su descripción y animación en el selector.
4. En partida: moverse, saltar, combo con X, secundario con Y y habilidad con B.
5. Mostrar defensa con RB/S y rodada con LB/Shift.
6. Usar la tecla **5** para saltar a un jefe y mostrar la barra de vida destacada.
7. Ir a **Campo libre → Práctica**, golpear al muñeco y abrir su diálogo con A/Enter.
8. Ir a **Laboratorio de IA**: alternar BFS/A\* con Q, ruta corta/segura con E y generar otra variante con R.
9. Provocar una derrota, mostrar Game Over, récord y reintentar.
10. Cerrar con `npm run build` y mencionar que `dist/` queda listo para publicar.

Plan B si falla el entorno: usar `npm run preview` sobre el build ya generado.

---

## 12. Limitaciones y trabajo futuro (1 min)

Limitaciones actuales:

- No hay deploy público: se juega en local o desde el `dist/` generado.
- Sin controles táctiles ni versión móvil; está pensado para teclado y mando.
- Cámara fija y mapas con plataformas predefinidas; la variación procedural está solo en el Laboratorio.
- El mando físico del usuario no se probó: se validó con Gamepad API simulado y calibración por dispositivo.
- Algunas animaciones preparadas (`slide`, `surf`, `jump`) no se usan en una acción de juego.
- El Minotauro no tiene animación de muerte propia y usa desvanecimiento.
- Solo existe una spec formal; el resto del proceso queda en REPORTE.txt.
- No hay sistema de progresión, inventario ni selector de semilla para la partida principal.

Trabajo futuro:

- Publicar el build en Vercel/Netlify y agregar enlace.
- Probar mandos físicos y ampliar la calibración.
- Llevar la generación procedural del Laboratorio a las partidas normales.
- Agregar más variantes de enemigos y jefes.
- Unificar el relato sobre el uso de OpenCode en créditos y reporte.

---

## 13. Cierre

- **Qué se logró:** un juego jugable y completo en su flujo, con 5 mapas, 4 personajes, combate por fotogramas, 3 enemigos con IA propia, 3 jefes, oleadas infinitas, Campo libre, Laboratorio de IA con BFS/A\* y escenarios variables.
- **Qué se aprendió sobre IA:** la percepción y la FSM se entienden mejor cuando se ven en pantalla; separar navegación y comportamiento permitió probar ambos con `node --test`.
- **Dónde están los materiales:** `README.md` (instalación, controles y verificación), `REPORTE.txt` (historial de las 9 rondas), `spec/campo-libre-ia.md` (spec de Campo libre), `GDD_La_Gran_Emboscada.pdf` y el código en `src/`.
