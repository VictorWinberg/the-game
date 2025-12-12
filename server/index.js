import { createServer } from 'http'
import { Server } from 'socket.io'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { networkInterfaces } from 'os'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST_DIR = join(__dirname, '..', 'dist')

const PORT = process.env.PORT || 3000

const MIME_TYPES = {
	'.html': 'text/html',
	'.js': 'application/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.glb': 'model/gltf-binary',
	'.gltf': 'model/gltf+json',
	'.mp3': 'audio/mpeg',
	'.wav': 'audio/wav',
	'.ogg': 'audio/ogg'
}
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
	return 'TITS'
}

const httpServer = createServer((req, res) => {
	let filePath = req.url === '/' ? '/index.html' : req.url

	// Remove query strings
	filePath = filePath.split('?')[0]

	const fullPath = join(DIST_DIR, filePath)

	if (existsSync(fullPath)) {
		try {
			const content = readFileSync(fullPath)
			const ext = extname(filePath)
			const contentType = MIME_TYPES[ext] || 'application/octet-stream'
			res.writeHead(200, { 'Content-Type': contentType })
			res.end(content)
		} catch (err) {
			res.writeHead(500)
			res.end('Server Error')
		}
	} else {
		// For SPA routing, serve index.html for non-asset requests
		if (!extname(filePath)) {
			try {
				const content = readFileSync(join(DIST_DIR, 'index.html'))
				res.writeHead(200, { 'Content-Type': 'text/html' })
				res.end(content)
			} catch (err) {
				res.writeHead(404)
				res.end('Not Found')
			}
		} else {
			res.writeHead(404)
			res.end('Not Found')
		}
	}
})

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

function getLocalIP() {
	const nets = networkInterfaces()
	for (const name of Object.keys(nets)) {
		for (const net of nets[name]) {
			if (net.family === 'IPv4' && !net.internal) {
				return net.address
			}
		}
	}
	return 'localhost'
}

httpServer.listen(PORT, '0.0.0.0', () => {
	const localIP = getLocalIP()
	console.log(`
╔════════════════════════════════════════════════════╗
║         🚗 Multiplayer Game Server 🚗              ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║   Game is running!                                 ║
║                                                    ║
║   YOU play at:                                     ║
║   → http://localhost:${PORT}                          ║
║                                                    ║
║   FRIENDS join at:                                 ║
║   → http://${localIP}:${PORT}                       ║
║                                                    ║
║   1. Open the game in your browser                 ║
║   2. Click "Host Game" to get a room code          ║
║   3. Share the code with your friends!             ║
║                                                    ║
╚════════════════════════════════════════════════════╝
`)
})
