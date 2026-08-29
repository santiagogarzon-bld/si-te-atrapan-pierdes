# GameEngine del juego de cartas

Primera fase del MVP: un motor autoritativo en TypeScript, completamente independiente de HTTP, WebSocket y Socket.IO.

## Uso

```bash
npm install
npm run check
```

La API pública se exporta desde `src/game/index.ts`. `GameEngine` recibe órdenes identificadas únicamente por IDs (`playerId`, `cardId`) y valida el estado real antes de mutarlo. `getState()` entrega una copia para persistencia interna; `getPlayerView(playerId)` construye una vista segura para transportar a un cliente.

## Decisiones de esta fase

- Todas las mutaciones son síncronas y están centralizadas en `GameEngine`; una futura cola por sala podrá serializar eventos Socket.IO alrededor del motor.
- `SWAP_TRAP_CARD` solo se permite al jugador vivo que tiene el turno. El intercambio no genera eventos públicos.
- Una acusación puede originarse desde cualquier jugador vivo y dirigirse a cualquier otro jugador vivo, incluso fuera del turno del acusador.
- La penalización por acusación falsa está centralizada en `gameConfig.ts` y actualmente es `NONE`.
- Los comodines trampa se crean fuera del mazo principal.
- El comodín A descarta la pila anterior definitivamente, mantiene `activeValue` y deja una nueva pila formada por A.
- Al tomar la pila, el motor exige que quede una carta numérica en el mazo para poder iniciar la siguiente pila; de lo contrario produce un error controlado.

## Próxima integración

La capa de salas será propietaria de una instancia de `GameEngine`. Socket.IO deberá traducir eventos a llamadas del motor, capturar `GameError` y enviar a cada socket su propia `getPlayerView`; nunca debe emitir `getState()`.
