import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = process.env.PORT || 3000
const MAX_PLAYERS_PER_ROOM = 4

const rooms = new Map()

function generateRoomCode() {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
	let code = ''
	for (let i = 0; i < 4; i++) {
		code += chars[Math.floor(Math.random() * chars.length)]
	}
	if (rooms.has(code)) {
		return generateRoomCode()
	}
	return code
}

const httpServer = createServer()
const io = new Server(httpServer, {
	cors: {
		origin: '*',
		methods: ['GET', 'POST']
	}
})

io.on('connection', (socket) => {
	console.log(`Player connected: ${socket.id}`)
	let currentRoom = null

	socket.on('create-room', (callback) => {
		const code = generateRoomCode()
		rooms.set(code, {
			players: new Map(),
			host: socket.id
		})
		currentRoom = code
		socket.join(code)
		rooms.get(code).players.set(socket.id, { id: socket.id })

		console.log(`Room created: ${code} by ${socket.id}`)
		callback({ success: true, code, playerId: socket.id })
	})

	socket.on('join-room', (code, callback) => {
		const upperCode = code.toUpperCase()
		const room = rooms.get(upperCode)

		if (!room) {
			callback({ success: false, error: 'Room not found' })
			return
		}

		if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
			callback({ success: false, error: 'Room is full' })
			return
		}

		currentRoom = upperCode
		socket.join(upperCode)
		room.players.set(socket.id, { id: socket.id })

		socket.to(upperCode).emit('player-joined', { id: socket.id })

		const existingPlayers = Array.from(room.players.keys()).filter((id) => id !== socket.id)

		console.log(`Player ${socket.id} joined room ${upperCode}. Players: ${room.players.size}`)
		callback({
			success: true,
			code: upperCode,
			playerId: socket.id,
			players: existingPlayers
		})
	})

	socket.on('player-state', (state) => {
		if (!currentRoom) return
		socket.to(currentRoom).emit('player-state', {
			id: socket.id,
			...state
		})
	})

	socket.on('disconnect', () => {
		console.log(`Player disconnected: ${socket.id}`)

		if (currentRoom && rooms.has(currentRoom)) {
			const room = rooms.get(currentRoom)
			room.players.delete(socket.id)

			socket.to(currentRoom).emit('player-left', { id: socket.id })

			if (room.players.size === 0) {
				rooms.delete(currentRoom)
				console.log(`Room ${currentRoom} deleted (empty)`)
			}
		}
	})

	socket.on('room-info', (callback) => {
		if (!currentRoom || !rooms.has(currentRoom)) {
			callback({ success: false })
			return
		}

		const room = rooms.get(currentRoom)
		callback({
			success: true,
			playerCount: room.players.size,
			maxPlayers: MAX_PLAYERS_PER_ROOM
		})
	})
})

httpServer.listen(PORT, () => {
	console.log(`
╔════════════════════════════════════════╗
║     Multiplayer Server Running         ║
║                                        ║
║   Local:   http://localhost:${PORT}       ║
║                                        ║
║   Share your local IP with friends     ║
║   to let them connect!                 ║
╚════════════════════════════════════════╝
`)
})
