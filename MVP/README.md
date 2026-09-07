# La Trampa — MVP multijugador

Juego web de cartas competitivo para 2 a 6 personas. El servidor es la única autoridad sobre turnos, cartas, trampas, acusaciones y victoria; el navegador solo solicita acciones y representa la vista privada que recibe.

## Estado del MVP

Incluye salas con código de seis caracteres, lobby y host, partida en tiempo real, reconexión mediante token secreto, cartas numéricas y comodines A/B, toma de pila, zona de trampa, acusaciones, eliminación, condiciones de victoria, historial público, interfaz responsive y contenedores Docker.

Los estados están en memoria. Reiniciar el backend elimina las salas activas; `RoomManager` deja una frontera clara para sustituir este almacenamiento por Redis más adelante.

## Arquitectura

```text
client/                    React + Vite + Zustand + Socket.IO Client
  src/components/         Cartas, jugadores, modal y registro
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

Abre `http://localhost:5173`. Para probar multijugador, usa otra ventana o navegador y entra con el código mostrado por el host.

Variables del backend:

```text
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
```

Variable del frontend:

```text
VITE_API_URL=http://localhost:3000
```

## Docker

```bash
docker compose up --build
```

La interfaz queda disponible en `http://localhost:8080` y el backend en `http://localhost:3000`. El endpoint `GET /health` responde `{ "ok": true }`.

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
