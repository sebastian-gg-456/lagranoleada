# Especificacion: campo libre y laboratorio de IA

## Alcance

Desde el menu inicial, Campo libre ofrece practica de personaje y laboratorio
de IA. La practica permite elegir personaje, moverse sobre un piso sin
plataformas y probar ataques contra un muñeco de entrenamiento. El boton A
del mando muestra la explicacion de las habilidades del personaje.

El laboratorio permite seleccionar BFS o A* y recorrido corto o seguro,
observar rutas de NPC sobre plataformas y generar variantes del escenario
que cambien la topologia y los riesgos del recorrido.

## Comportamiento de NPC

- Skeleton patrulla horizontalmente por el suelo y solo combate al jugador
  cuando ambos estan en el suelo; no persigue plataformas altas.
- Mushroom calcula rutas hacia el jugador y salta entre superficies para
  alcanzarlo, incluso cuando el jugador cambia de plataforma.
- Flying Eye patrulla en la zona superior mientras el jugador esta en el
  suelo; al detectar al jugador en una plataforma, lo persigue y ataca.

## Busqueda y navegacion

- BFS encuentra rutas de menor cantidad de saltos en grafos de costo uniforme.
- A* usa distancia como heuristica y minimiza el costo de recorrido.
- La navegacion corta minimiza distancia/transiciones.
- La navegacion segura penaliza superficies expuestas. Las rutas se dibujan
  y se pueden cambiar en vivo desde el laboratorio.

## Escenarios y controles

- Cada variante cambia plataformas y/o la ubicacion de zonas expuestas; debe
  poder regenerarse durante el laboratorio.
- En el laboratorio: Q cambia BFS/A*, E cambia corto/seguro y R genera otra
  variante. La interfaz muestra el metodo, variante y explicacion.
- En practica: A del mando o Enter abre el dialogo del muñeco; Escape vuelve
  al selector de Campo libre.

## Criterios de aceptacion

1. Los tres tipos de NPC cumplen sus reglas de percepcion y movimiento.
2. Pruebas unitarias cubren BFS, A*, costo seguro y variantes de escenario.
3. La interfaz permite comparar ambos algoritmos y navegaciones mientras se
   observan rutas de NPC en el laboratorio.
4. Regenerar el escenario cambia superficies/rutas y vuelve a calcularlas.
5. Se puede seleccionar cada personaje y probar sus acciones en el piso;
   el muñeco no muere y explica los controles al pulsar A.
