# La Trampa — multijugador 3D

Juego web de cartas competitivo para 2 a 6 personas. El servidor es la única autoridad sobre turnos, cartas, trampas, acusaciones y victoria; el navegador solo solicita acciones y representa la vista privada que recibe.

## Experiencia 3D

Mesa 3D interactiva construida en Three.js con un diorama de bosque, seis personajes cartoon, iluminación cálida, sombras, animación de respiración y parpadeo, cartas que vuelan desde el jugador hasta la pila y un indicador de turno. Los modelos y texturas de cartas se generan localmente con geometría y canvas; no necesitan servicios de assets.

Incluye salas con código de seis caracteres, lobby y host, partida en tiempo real, reconexión mediante token secreto, cartas numéricas y comodines A/B, toma de pila, zona de trampa, acusaciones, eliminación, condiciones de victoria, historial público, interfaz responsive y contenedores Docker.

Los estados están en memoria. Reiniciar el backend elimina las salas activas; `RoomManager` deja una frontera clara para sustituir este almacenamiento por Redis más adelante.

## Arquitectura

```text
client/                    React + Vite + Three.js + Zustand + Socket.IO Client
  src/components/         Cartas, jugadores, modal y registro
  src/components/scene/   Diorama 3D, cámara y animaciones del estado público
  src/pages/              Inicio, lobby y partida
  src/store.ts             Estado del cliente y reconexión
src/
  game/                    GameEngine sin dependencias de red
    rules/                 Reglas pequeñas y reutilizables
  rooms/RoomManager.ts     Salas, sesiones y cola de acciones
  socket/socketHandlers.ts Validación, transporte y vistas privadas
  shared/contracts.ts      Contrato tipado de eventos
  serverApp.ts             Composición testeable del servidor
  server.ts                Punto de entrada
tests/                     Pruebas unitarias e integración Socket.IO
```

`GameEngine` no importa Express ni Socket.IO. Cada sala serializa sus mutaciones mediante `runExclusive`, evitando que dos clics rápidos modifiquen el mismo estado simultáneamente. Después de una acción pública, el servidor recorre los jugadores conectados y construye una vista diferente con `getPlayerView(playerId)`.

Un intercambio de trampa es especial: solo se devuelve el nuevo estado privado al actor y no se emite ningún evento público.

## Reglas resumidas

- El mazo principal contiene cuatro copias de cada número del 2 al 12 y cuatro comodines de cada tipo: 52 cartas.
- Cada jugador comienza con tres cartas y dos espacios secretos que contienen A y B fuera del mazo principal.
- Una carta numérica debe ser igual o superior al valor activo.
- A puede jugarse siempre, conserva el valor activo y borra la pila anterior.
- B puede jugarse siempre y reinicia el valor activo a 2.
- Después de jugar se roba hasta tener tres cartas, siempre que queden cartas en el mazo.
- Un jugador sin jugada válida debe recoger la pila; una carta numérica del mazo inicia la siguiente.
- En su turno puede intercambiar una carta de la mano con una de la zona secreta. La trampa puede acusarse hasta justo antes de que vuelva a empezar su turno.
- Cualquier jugador vivo puede acusar a otro jugador vivo. Si acierta, el acusado queda eliminado; una acusación falsa no tiene penalización.
- Gana quien deja su mano vacía o queda como único jugador vivo. Las dos cartas secretas no cuentan para ganar por descarte.

## Ejecución local

Requiere Node.js 22 o superior.

```bash
# Terminal 1: backend
npm install
cp .env.example .env
npm run dev

# Terminal 2: frontend
cd client
npm install
cp .env.example .env
npm run dev
```

Abre `http://localhost:5173`. Para probar multijugador, usa otro navegador o una ventana de incógnito y entra con el código mostrado por el anfitrión. Las pestañas del mismo perfil comparten identidad.

Para jugar desde un teléfono u otro equipo en la misma red, abre `http://IP-DEL-EQUIPO:5173`. Vite redirige `/socket.io` al backend, por lo que no debes configurar `localhost` en el teléfono. Ambos procesos deben estar activos y el puerto 5173 debe ser accesible en tu red.

### Controles

- Arrastra la escena para girar la cámara; el botón de flecha circular recupera la vista inicial.
- Selecciona una carta de tu mano y pulsa **Jugar carta**. Las cartas bloqueadas se muestran atenuadas.
- Abre **Zona secreta**, selecciona una carta de la mano y una secreta y confirma el intercambio.
- Si no puedes jugar, aparece **Recoger pila**. Puedes acusar desde la lista de jugadores.
- El botón de sonido activa señales de jugada. El botón de destello reduce el movimiento; respeta inicialmente la preferencia del sistema.
- **Cómo jugar** explica las reglas. Los diálogos se pueden cerrar con Escape y mantienen el foco del teclado.

La vista 3D necesita WebGL 2. Si no está disponible, aparece un aviso y los controles de la partida siguen siendo utilizables.

Variables del backend:

```text
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
```

Variable opcional del frontend (vacía usa el mismo origen y el proxy; configura una URL solo si alojas el backend por separado):

```text
VITE_API_URL=
```

## Docker

Desde la carpeta `MVP`:

```bash
docker compose up -d --build --wait
docker compose ps
```

Abre `http://localhost:8080`, o `http://IP-DEL-EQUIPO:8080` desde otro dispositivo en la misma red. Nginx sirve la versión 3D y redirige Socket.IO al backend por la red interna de Docker. Solo se publica el puerto del frontend; no hace falta abrir el puerto 3000.

El frontend espera a que el backend esté saludable. Ambos contenedores tienen comprobaciones de salud y reinicio automático. `GET /healthz` comprueba Nginx y `GET /health` comprueba el backend a través del proxy. Las imágenes se construyen en varias etapas; el backend ejecuta únicamente dependencias de producción como usuario `node`, y el frontend final contiene Nginx y los archivos compilados.

Para cambiar el puerto externo:

```bash
FRONTEND_PORT=8090 docker compose up -d --build --wait
```

`FRONTEND_PORT` también se puede definir en `MVP/.env`. Compose deja `VITE_API_URL` vacío durante la compilación para que cada navegador use la dirección con la que abrió el juego. Los archivos `.env`, `node_modules` y las compilaciones locales se excluyen de los contextos de construcción.

```bash
docker compose logs -f
docker compose down
```

Las salas siguen almacenadas en memoria: reiniciar o recrear el backend elimina las partidas activas.

## Verificación

```bash
npm run check
```

Ese comando verifica tipos, ejecuta 21 pruebas unitarias del motor, ejecuta una integración real con dos clientes Socket.IO y compila backend y frontend para producción.

## Eventos WebSocket

Cliente → servidor:

- `CREATE_ROOM { name }`
- `JOIN_ROOM { name, roomCode }`
- `RECONNECT_PLAYER { roomCode, sessionToken }`
- `START_GAME {}`
- `PLAY_CARD { cardId }`
- `SWAP_TRAP_CARD { handCardId, trapCardId }`
- `TAKE_PILE {}`
- `ACCUSE_PLAYER { accusedPlayerId }`
- `LEAVE_ROOM {}`

Servidor → cliente:

- `ROOM_CREATED`, `ROOM_UPDATED`
- `GAME_STARTED`, `GAME_STATE_UPDATED`
- `PLAYER_JOINED`, `PLAYER_LEFT`, `PLAYER_RECONNECTED`
- `PLAYER_ELIMINATED`, `GAME_FINISHED`, `GAME_ERROR`

Todas las solicitudes reciben además un acknowledgement `{ ok: true }` o `{ ok: false, error: { code, message } }`. El cliente nunca envía objetos de carta como fuente de verdad: solamente UUIDs.

## Reconexión y privacidad

Al crear o entrar en una sala se guarda `{ roomCode, playerId, sessionToken }` en `localStorage`. Tras reconectar, el backend localiza la identidad por el token —no por `socket.id`—, invalida el socket anterior y restaura la vista privada.

Una vista ajena solo contiene ID, nombre, cantidad de cartas, conexión, vida y turno. Nunca contiene mano, zona secreta, token ni `pendingCheat`. El estado interno completo no se emite por Socket.IO.

## Decisiones y límites actuales

- No hay autenticación ni base de datos, según el alcance inicial.
- La penalización por acusación falsa está centralizada y configurada como `NONE`.
- El intercambio secreto se restringe al jugador vivo que tiene el turno.
- Una desconexión no elimina al jugador: la partida conserva sus cartas y turno para permitir su regreso.
- Si al recoger la pila el mazo ya no contiene una carta numérica, el motor devuelve `DECK_HAS_NO_NUMBER_CARDS`; el reglamento original no define reciclaje del mazo.
