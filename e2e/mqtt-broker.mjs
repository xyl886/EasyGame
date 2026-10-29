import { createServer } from 'node:http'
import { Aedes } from 'aedes'
import { WebSocketServer, createWebSocketStream } from 'ws'

const PORT = Number(process.env.MQTT_BROKER_PORT ?? 8888)
const broker = await Aedes.createBroker()
const server = createServer()
const wss = new WebSocketServer({ server })

wss.on('connection', (socket, request) => {
  const stream = createWebSocketStream(socket)
  broker.handle(stream, request)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[e2e-mqtt] broker listening on ws://127.0.0.1:${PORT}/mqtt`)
})

function shutdown() {
  wss.close()
  server.close()
  broker.close()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
