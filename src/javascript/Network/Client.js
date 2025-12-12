import { io } from 'socket.io-client'
import EventEmitter from '../Utils/EventEmitter.js'

export default class NetworkClient extends EventEmitter {
	constructor() {
		super()

		this.socket = null
		this.connected = false
		this.roomCode = null
		this.playerId = null
		this.isHost = false

		// State sending rate (ms)
		this.sendRate = 1000 / 30 // 30 times per second
		this.lastSendTime = 0
	}

	connect(serverUrl = 'http://localhost:3000') {
		return new Promise((resolve, reject) => {
			this.socket = io(serverUrl, {
				transports: ['websocket']
			})

			this.socket.on('connect', () => {
				console.log('Connected to server')
				this.connected = true
				resolve()
			})

			this.socket.on('connect_error', (error) => {
				console.error('Connection error:', error)
				reject(error)
			})

			this.socket.on('disconnect', () => {
				console.log('Disconnected from server')
				this.connected = false
				this.trigger('disconnected')
			})

			// Handle other players' state updates
			this.socket.on('player-state', (state) => {
				this.trigger('player-state', [state])
			})

			// Handle player joining
			this.socket.on('player-joined', (data) => {
				console.log('Player joined:', data.id)
				this.trigger('player-joined', [data])
			})

			// Handle player leaving
			this.socket.on('player-left', (data) => {
				console.log('Player left:', data.id)
				this.trigger('player-left', [data])
			})
		})
	}

	createRoom() {
		return new Promise((resolve, reject) => {
			this.socket.emit('create-room', (response) => {
				if (response.success) {
					this.roomCode = response.code
					this.playerId = response.playerId
					this.isHost = true
					console.log(`Room created: ${this.roomCode}`)
					resolve(response)
				} else {
					reject(new Error(response.error))
				}
			})
		})
	}

	joinRoom(code) {
		return new Promise((resolve, reject) => {
			this.socket.emit('join-room', code, (response) => {
				if (response.success) {
					this.roomCode = response.code
					this.playerId = response.playerId
					this.isHost = false
					console.log(`Joined room: ${this.roomCode}`)
					resolve(response)
				} else {
					reject(new Error(response.error))
				}
			})
		})
	}

	sendState(state) {
		if (!this.connected || !this.roomCode) return

		const now = performance.now()
		if (now - this.lastSendTime < this.sendRate) return

		this.lastSendTime = now
		this.socket.emit('player-state', state)
	}

	getRoomInfo() {
		return new Promise((resolve) => {
			this.socket.emit('room-info', (response) => {
				resolve(response)
			})
		})
	}

	disconnect() {
		if (this.socket) {
			this.socket.disconnect()
			this.socket = null
			this.connected = false
			this.roomCode = null
			this.playerId = null
		}
	}
}
