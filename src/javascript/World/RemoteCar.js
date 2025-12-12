import * as THREE from 'three'
import CANNON from 'cannon'
import Songs from '../Data/Songs.js'

export default class RemoteCar {
	constructor(_options) {
		this.id = _options.id
		this.time = _options.time
		this.resources = _options.resources
		this.objects = _options.objects
		this.physics = _options.physics
		this.shadows = _options.shadows
		this.materials = _options.materials
		this.config = _options.config

		// Player info
		this.username = _options.username || null
		this.color = _options.color || 'orange'

		// Now Playing (100% chance for debugging)
		this.nowPlaying = null
		if (Math.random() < 1.0) {
			this.nowPlaying = Songs[Math.floor(Math.random() * Songs.length)]
			console.log('RemoteCar assigned song:', this.nowPlaying)
		}

		// Container for all car meshes
		this.container = new THREE.Object3D()
		this.position = new THREE.Vector3()

		// Interpolation state
		this.targetPosition = new THREE.Vector3()
		this.currentPosition = new THREE.Vector3()
		this.targetQuaternion = new THREE.Quaternion()
		this.currentSteering = 0
		this.targetSteering = 0

		// Interpolation speed
		this.lerpFactor = 0.2

		this.setModels()
		this.setChassis()
		this.setWheels()
		this.setPhysicsBody()
		this.setUpdate()
	}

	setModels() {
		this.models = {}

		// Use default car models (not cyber truck for remote players)
		this.models.chassis = this.resources.items.carDefaultChassis
		this.models.wheel = this.resources.items.carDefaultWheel
	}

	setChassis() {
		this.chassis = {}
		this.chassis.offset = new THREE.Vector3(0, 0, -0.28)
		const sceneClone = this.models.chassis.scene.clone(true)
		this.chassis.object = this.objects.getConvertedMesh(sceneClone.children, { duplicated: true })
		this.container.add(this.chassis.object)

		// Apply car color
		this.applyColor(this.color)

		// Add username label if available
		if (this.username) {
			this.setUsernameLabel()
		}

		this.shadows.add(this.chassis.object, { sizeX: 3, sizeY: 2, offsetZ: 0.2 })
	}

	setWheels() {
		this.wheels = {}
		const wheelSceneClone = this.models.wheel.scene.clone(true)
		this.wheels.object = this.objects.getConvertedMesh(wheelSceneClone.children, { duplicated: true })
		this.wheels.items = []

		// Wheel positions relative to chassis (matching Physics.js)
		this.wheels.offsets = [
			new THREE.Vector3(0.635, 0.39, 0), // Front left
			new THREE.Vector3(0.635, -0.39, 0), // Front right
			new THREE.Vector3(-0.475, 0.39, 0), // Back left
			new THREE.Vector3(-0.475, -0.39, 0) // Back right
		]

		for (let i = 0; i < 4; i++) {
			const object = this.wheels.object.clone()
			this.wheels.items.push(object)
			this.container.add(object)
		}
	}

	setPhysicsBody() {
		// Create a kinematic body for collision
		// Kinematic bodies can push dynamic bodies but aren't affected by forces
		const chassisWidth = 1.02
		const chassisHeight = 1.16
		const chassisDepth = 2.03

		const shape = new CANNON.Box(new CANNON.Vec3(chassisDepth * 0.5, chassisWidth * 0.5, chassisHeight * 0.5))

		this.body = new CANNON.Body({
			mass: 0, // Mass 0 = kinematic/static
			shape: shape,
			type: CANNON.Body.KINEMATIC
		})

		// Set collision material for friction/restitution
		this.body.material = this.physics.materials.items.dummy

		this.physics.world.addBody(this.body)
	}

	setUpdate() {
		this.time.on('tick', () => {
			// Interpolate the base position (without offset)
			this.currentPosition.lerp(this.targetPosition, this.lerpFactor)

			// Apply position with offset to visual
			this.chassis.object.position.copy(this.currentPosition).add(this.chassis.offset)

			// Interpolate rotation
			this.chassis.object.quaternion.slerp(this.targetQuaternion, this.lerpFactor)

			// Update physics body to match visual position (for collisions)
			this.body.position.copy(this.currentPosition)
			this.body.quaternion.copy(this.chassis.object.quaternion)

			// Interpolate steering
			this.currentSteering = THREE.MathUtils.lerp(this.currentSteering, this.targetSteering, this.lerpFactor)

			// Update wheel positions
			this.updateWheels()

			// Update position reference
			this.position.copy(this.chassis.object.position)
		})
	}

	updateWheels() {
		const wheelRadius = 0.25

		for (let i = 0; i < 4; i++) {
			const wheel = this.wheels.items[i]
			const offset = this.wheels.offsets[i]

			// Position wheel relative to current position (not chassis visual which has offset)
			wheel.position.copy(this.currentPosition)

			// Apply offset in chassis local space
			const worldOffset = offset.clone()
			worldOffset.applyQuaternion(this.chassis.object.quaternion)
			wheel.position.add(worldOffset)

			// Adjust wheel height relative to chassis
			wheel.position.z = this.currentPosition.z - 0.28 + wheelRadius

			// Copy chassis rotation
			wheel.quaternion.copy(this.chassis.object.quaternion)

			// Apply steering to front wheels (indices 0 and 1)
			if (i < 2) {
				const steerQuat = new THREE.Quaternion()
				steerQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -this.currentSteering)
				wheel.quaternion.multiply(steerQuat)
			}

			// Flip right-side wheels
			if (i === 1 || i === 3) {
				const flipQuat = new THREE.Quaternion()
				flipQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI)
				wheel.quaternion.multiply(flipQuat)
			}
		}
	}

	updateFromNetwork(state) {
		// Update target values for interpolation
		if (state.position) {
			this.targetPosition.set(state.position.x, state.position.y, state.position.z)
		}

		if (state.quaternion) {
			this.targetQuaternion.set(state.quaternion.x, state.quaternion.y, state.quaternion.z, state.quaternion.w)
		}

		if (state.steering !== undefined) {
			this.targetSteering = state.steering
		}

		// Update color if changed
		if (state.color && state.color !== this.color) {
			this.color = state.color
			this.applyColor(this.color)
		}

		// Update username if received and not already set
		if (state.username && !this.username) {
			this.username = state.username
			this.setUsernameLabel()
		}
	}

	applyColor(colorName) {
		if (!this.materials || !this.materials.items[colorName]) return

		const material = this.materials.items[colorName]

		// Apply to all mesh children of chassis
		this.chassis.object.traverse((child) => {
			if (child.isMesh && child.material) {
				child.material = material
			}
		})
	}

	setUsernameLabel() {
		if (!this.username) return
		if (!this.chassis || !this.chassis.object) return

		const canvas = document.createElement('canvas')
		canvas.width = 512
		// Increase height if now playing
		canvas.height = this.nowPlaying ? 200 : 128

		const context = canvas.getContext('2d')
		if (!context) return

		// Background
		const paddingX = 28
		const paddingY = 18
		const fontSize = 54
		const songFontSize = 32
		const font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`
		const songFont = `500 ${songFontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`
		
		context.font = font
		context.textBaseline = 'middle'
		context.textAlign = 'center'

		const text = String(this.username).slice(0, 24)
		const textMetrics = context.measureText(text)
		let textWidth = Math.ceil(textMetrics.width)

		// Calculate song text width if applicable
		let songText = ''
		let songTextWidth = 0
		if (this.nowPlaying) {
			context.font = songFont
			songText = `🎵 ${this.nowPlaying.title} - ${this.nowPlaying.artist}`
			const songMetrics = context.measureText(songText)
			songTextWidth = Math.ceil(songMetrics.width)
			
			// Use the wider of the two texts
			textWidth = Math.max(textWidth, songTextWidth)
		}

		const boxWidth = Math.min(canvas.width - paddingX * 2, textWidth + paddingX * 2)
		const boxHeight = this.nowPlaying ? fontSize + songFontSize + paddingY * 3 : fontSize + paddingY * 2
		const boxX = (canvas.width - boxWidth) * 0.5
		const boxY = (canvas.height - boxHeight) * 0.5
		const radius = 26

		context.clearRect(0, 0, canvas.width, canvas.height)

		// Rounded rect helper
		const roundRect = (_x, _y, _w, _h, _r) => {
			const r = Math.min(_r, _w * 0.5, _h * 0.5)
			context.beginPath()
			context.moveTo(_x + r, _y)
			context.lineTo(_x + _w - r, _y)
			context.quadraticCurveTo(_x + _w, _y, _x + _w, _y + r)
			context.lineTo(_x + _w, _y + _h - r)
			context.quadraticCurveTo(_x + _w, _y + _h, _x + _w - r, _y + _h)
			context.lineTo(_x + r, _y + _h)
			context.quadraticCurveTo(_x, _y + _h, _x, _y + _h - r)
			context.lineTo(_x, _y + r)
			context.quadraticCurveTo(_x, _y, _x + r, _y)
			context.closePath()
		}

		// Shadow
		context.fillStyle = 'rgba(0, 0, 0, 0.35)'
		roundRect(boxX + 3, boxY + 4, boxWidth, boxHeight, radius)
		context.fill()

		// Fill
		context.fillStyle = 'rgba(20, 20, 24, 0.85)'
		roundRect(boxX, boxY, boxWidth, boxHeight, radius)
		context.fill()

		// Stroke
		context.strokeStyle = 'rgba(255, 255, 255, 0.18)'
		context.lineWidth = 4
		roundRect(boxX, boxY, boxWidth, boxHeight, radius)
		context.stroke()

		// Username Text
		context.font = font
		context.fillStyle = 'rgba(255, 255, 255, 0.95)'
		const nameY = this.nowPlaying ? boxY + paddingY + fontSize * 0.5 : canvas.height * 0.5 + 2
		context.fillText(text, canvas.width * 0.5, nameY)

		// Song Text
		if (this.nowPlaying) {
			context.font = songFont
			context.fillStyle = 'rgba(30, 215, 96, 0.9)' // Spotify green-ish
			const songY = nameY + fontSize * 0.5 + paddingY * 0.5 + songFontSize * 0.5
			context.fillText(songText, canvas.width * 0.5, songY)
		}

		const texture = new THREE.CanvasTexture(canvas)
		texture.colorSpace = THREE.SRGBColorSpace
		texture.needsUpdate = true

		const material = new THREE.SpriteMaterial({
			map: texture,
			transparent: true,
			depthTest: true,
			depthWrite: false
		})
		material.toneMapped = false

		const sprite = new THREE.Sprite(material)
		sprite.center.set(0.5, 0.0) // anchor bottom-center
		sprite.position.set(0, 0, 1.9)

		// World size
		const worldWidth = 2.6
		const worldHeight = worldWidth * (canvas.height / canvas.width)
		sprite.scale.set(worldWidth, worldHeight, 1)

		sprite.renderOrder = 10

		this.usernameLabel = { canvas, context, texture, material, sprite }
		this.chassis.object.add(sprite)
	}

	destroy() {
		// Remove from physics world
		this.physics.world.removeBody(this.body)

		// Remove visual elements
		if (this.container.parent) {
			this.container.parent.remove(this.container)
		}
	}
}
