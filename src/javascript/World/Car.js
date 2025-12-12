import * as THREE from 'three'
import CANNON from 'cannon'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import Songs from '../Data/Songs.js'

export default class Car {
	constructor(_options) {
		// Options
		this.time = _options.time
		this.resources = _options.resources
		this.objects = _options.objects
		this.physics = _options.physics
		this.shadows = _options.shadows
		this.materials = _options.materials
		this.controls = _options.controls
		this.sounds = _options.sounds
		this.renderer = _options.renderer
		this.camera = _options.camera
		this.debug = _options.debug
		this.config = _options.config
		this.network = _options.network
		this.color = _options.color || 'orange'
		this.username = _options.username
		this.onLap = _options.onLap

		// Now Playing (50% chance)
		this.nowPlaying = null
		if (Math.random() < 0.5) {
			this.nowPlaying = Songs[Math.floor(Math.random() * Songs.length)]
		}

		// Lap tracking
		this.lapCount = 0

		// Set up
		this.container = new THREE.Object3D()
		this.position = new THREE.Vector3()

		// Debug
		if (this.debug) {
			this.debugFolder = this.debug.addFolder('car')
			// this.debugFolder.open()
		}

		this.setModels()
		this.setMovement()
		this.setChassis()
		this.setUsernameLabel()
		this.setAntena()
		this.setBackLights()
		this.setWheels()
		this.setTransformControls()
		this.setShootingBall()
		this.setKlaxon()
		this.setProjectileShoot()
		this.setBackwardBowlingBall()
		this.setExplosion()
	}

	setModels() {
		this.models = {}

		// Cyber truck
		if (this.config.cyberTruck) {
			this.models.chassis = this.resources.items.carCyberTruckChassis
			this.models.antena = this.resources.items.carCyberTruckAntena
			this.models.backLightsBrake = this.resources.items.carCyberTruckBackLightsBrake
			this.models.backLightsReverse = this.resources.items.carCyberTruckBackLightsReverse
			this.models.wheel = this.resources.items.carCyberTruckWheel
		}

		// Default
		else {
			this.models.chassis = this.resources.items.carDefaultChassis
			this.models.antena = this.resources.items.carDefaultAntena
			this.models.bunnyEarLeft = this.resources.items.carDefaultBunnyEarLeft
			this.models.bunnyEarRight = this.resources.items.carDefaultBunnyEarRight
			this.models.backLightsBrake = this.resources.items.carDefaultBackLightsBrake
			this.models.backLightsReverse = this.resources.items.carDefaultBackLightsReverse
			this.models.wheel = this.resources.items.carDefaultWheel
		}
	}

	setMovement() {
		this.movement = {}
		this.movement.speed = new THREE.Vector3()
		this.movement.localSpeed = new THREE.Vector3()
		this.movement.acceleration = new THREE.Vector3()
		this.movement.localAcceleration = new THREE.Vector3()
		this.movement.lastScreech = 0

		// Time tick
		this.time.on('tick', () => {
			// Movement
			const movementSpeed = new THREE.Vector3()
			movementSpeed.copy(this.chassis.object.position).sub(this.chassis.oldPosition)
			movementSpeed.multiplyScalar((1 / this.time.delta) * 17)
			this.movement.acceleration = movementSpeed.clone().sub(this.movement.speed)
			this.movement.speed.copy(movementSpeed)

			this.movement.localSpeed = this.movement.speed.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), -this.chassis.object.rotation.z)
			this.movement.localAcceleration = this.movement.acceleration.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), -this.chassis.object.rotation.z)

			// Sound
			this.sounds.engine.speed = this.movement.localSpeed.x
			this.sounds.engine.acceleration = this.controls.actions.up ? (this.controls.actions.boost ? 1 : 0.5) : 0

			if (this.movement.localAcceleration.x > 0.03 && this.time.elapsed - this.movement.lastScreech > 5000) {
				this.movement.lastScreech = this.time.elapsed
				this.sounds.play('screech')
			}
		})
	}

	setChassis() {
		this.chassis = {}
		this.chassis.offset = new THREE.Vector3(0, 0, -0.28)
		const sceneClone = this.models.chassis.scene.clone(true)
		this.chassis.object = this.objects.getConvertedMesh(sceneClone.children, { duplicated: true })
		this.chassis.object.position.copy(this.physics.car.chassis.body.position)
		this.chassis.oldPosition = this.chassis.object.position.clone()
		this.container.add(this.chassis.object)

		// Apply car color
		this.applyColor(this.color)

		this.shadows.add(this.chassis.object, { sizeX: 3, sizeY: 2, offsetZ: 0.2 })

		// Time tick
		this.time.on('tick', () => {
			// Save old position for movement calculation
			this.chassis.oldPosition = this.chassis.object.position.clone()

			// Update if mode physics
			if (!this.transformControls.enabled) {
				this.chassis.object.position.copy(this.physics.car.chassis.body.position).add(this.chassis.offset)
				this.chassis.object.quaternion.copy(this.physics.car.chassis.body.quaternion)
			}

			// Update position
			this.position.copy(this.chassis.object.position)
		})
	}

	setUsernameLabel() {
		if (!this.username) return
		if (!this.chassis || !this.chassis.object) return

		const canvas = document.createElement('canvas')
		canvas.width = 512
		// Increase height if now playing or showing lap count
		const hasExtraInfo = this.nowPlaying || this.lapCount > 0
		canvas.height = hasExtraInfo ? 200 : 128

		const context = canvas.getContext('2d')
		if (!context) return

		// Background
		const paddingX = 28
		const paddingY = 18
		const fontSize = 54
		const songFontSize = 32
		const lapFontSize = 32
		const font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`
		const songFont = `500 ${songFontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`
		const lapFont = `700 ${lapFontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`

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

		// Calculate lap text width if applicable
		let lapText = ''
		let lapTextWidth = 0
		if (this.lapCount > 0) {
			context.font = lapFont
			lapText = `🏁 Lap ${this.lapCount}`
			const lapMetrics = context.measureText(lapText)
			lapTextWidth = Math.ceil(lapMetrics.width)

			// Use the wider of all texts
			textWidth = Math.max(textWidth, lapTextWidth)
		}

		const boxWidth = Math.min(canvas.width - paddingX * 2, textWidth + paddingX * 2)
		let boxHeight = fontSize + paddingY * 2
		if (this.nowPlaying) boxHeight += songFontSize + paddingY
		if (this.lapCount > 0) boxHeight += lapFontSize + paddingY
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
		let currentY = boxY + paddingY + fontSize * 0.5
		if (!this.nowPlaying && !this.lapCount) {
			currentY = canvas.height * 0.5 + 2
		}
		context.fillText(text, canvas.width * 0.5, currentY)

		// Song Text
		if (this.nowPlaying) {
			context.font = songFont
			context.fillStyle = 'rgba(30, 215, 96, 0.9)' // Spotify green-ish
			currentY = currentY + fontSize * 0.5 + paddingY * 0.5 + songFontSize * 0.5
			context.fillText(songText, canvas.width * 0.5, currentY)
		}

		// Lap Text
		if (this.lapCount > 0) {
			context.font = lapFont
			context.fillStyle = 'rgba(255, 200, 0, 0.95)' // Gold/yellow color
			currentY = currentY + (this.nowPlaying ? songFontSize * 0.5 : fontSize * 0.5) + paddingY * 0.5 + lapFontSize * 0.5
			context.fillText(lapText, canvas.width * 0.5, currentY)
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

	setUsername(username) {
		this.username = username

		// Remove existing label if present
		if (this.usernameLabel && this.usernameLabel.sprite) {
			this.chassis.object.remove(this.usernameLabel.sprite)
			this.usernameLabel.material.dispose()
			this.usernameLabel.texture.dispose()
			this.usernameLabel = null
		}

		// Create new label
		this.setUsernameLabel()
	}

	onLapComplete(lapCount) {
		this.lapCount = lapCount
		this.updateUsernameLabel()
		this.updateLapCounterUI()
		
		if (this.onLap) {
			this.onLap(lapCount)
		}
	}

	setLapCounterUI() {
		// Initialize lap counter UI - hide it initially until first lap
		const lapCounterElement = document.querySelector('.js-lap-counter')
		if (lapCounterElement) {
			lapCounterElement.classList.add('hidden')
		}
	}

	updateLapCounterUI() {
		const lapCounterElement = document.querySelector('.js-lap-counter')
		const lapCounterValue = document.querySelector('.js-lap-counter .lap-counter-value')

		if (lapCounterElement && lapCounterValue) {
			// Show the lap counter if it's hidden
			lapCounterElement.classList.remove('hidden')

			// Update the lap count value
			lapCounterValue.textContent = this.lapCount.toString()

			// Add a brief animation effect when lap count changes
			lapCounterValue.style.transform = 'scale(1.2)'
			setTimeout(() => {
				lapCounterValue.style.transform = 'scale(1)'
			}, 200)
		}
	}

	updateUsernameLabel() {
		if (!this.usernameLabel || !this.usernameLabel.canvas || !this.usernameLabel.context) return

		const canvas = this.usernameLabel.canvas
		const context = this.usernameLabel.context

		// Recalculate dimensions
		const hasExtraInfo = this.nowPlaying || this.lapCount > 0
		canvas.height = hasExtraInfo ? 200 : 128

		const paddingX = 28
		const paddingY = 18
		const fontSize = 54
		const songFontSize = 32
		const lapFontSize = 32
		const font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`
		const songFont = `500 ${songFontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`
		const lapFont = `700 ${lapFontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`

		context.font = font
		context.textBaseline = 'middle'
		context.textAlign = 'center'

		const text = String(this.username).slice(0, 24)
		const textMetrics = context.measureText(text)
		let textWidth = Math.ceil(textMetrics.width)

		let songText = ''
		let songTextWidth = 0
		if (this.nowPlaying) {
			context.font = songFont
			songText = `🎵 ${this.nowPlaying.title} - ${this.nowPlaying.artist}`
			const songMetrics = context.measureText(songText)
			songTextWidth = Math.ceil(songMetrics.width)
			textWidth = Math.max(textWidth, songTextWidth)
		}

		let lapText = ''
		let lapTextWidth = 0
		if (this.lapCount > 0) {
			context.font = lapFont
			lapText = `🏁 Lap ${this.lapCount}`
			const lapMetrics = context.measureText(lapText)
			lapTextWidth = Math.ceil(lapMetrics.width)
			textWidth = Math.max(textWidth, lapTextWidth)
		}

		const boxWidth = Math.min(canvas.width - paddingX * 2, textWidth + paddingX * 2)
		let boxHeight = fontSize + paddingY * 2
		if (this.nowPlaying) boxHeight += songFontSize + paddingY
		if (this.lapCount > 0) boxHeight += lapFontSize + paddingY
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
		let currentY = boxY + paddingY + fontSize * 0.5
		if (!this.nowPlaying && !this.lapCount) {
			currentY = canvas.height * 0.5 + 2
		}
		context.fillText(text, canvas.width * 0.5, currentY)

		// Song Text
		if (this.nowPlaying) {
			context.font = songFont
			context.fillStyle = 'rgba(30, 215, 96, 0.9)'
			currentY = currentY + fontSize * 0.5 + paddingY * 0.5 + songFontSize * 0.5
			context.fillText(songText, canvas.width * 0.5, currentY)
		}

		// Lap Text
		if (this.lapCount > 0) {
			context.font = lapFont
			context.fillStyle = 'rgba(255, 200, 0, 0.95)'
			currentY = currentY + (this.nowPlaying ? songFontSize * 0.5 : fontSize * 0.5) + paddingY * 0.5 + lapFontSize * 0.5
			context.fillText(lapText, canvas.width * 0.5, currentY)
		}

		// Update texture
		this.usernameLabel.texture.needsUpdate = true

		// Update sprite scale
		const worldWidth = 2.6
		const worldHeight = worldWidth * (canvas.height / canvas.width)
		this.usernameLabel.sprite.scale.set(worldWidth, worldHeight, 1)
	}

	setAntena() {
		this.antena = {}

		this.antena.speedStrength = 10
		this.antena.damping = 0.035
		this.antena.pullBackStrength = 0.02

		this.antena.object = this.objects.getConvertedMesh(this.models.antena.scene.children)
		this.chassis.object.add(this.antena.object)

		this.antena.bunnyEarLeft = this.objects.getConvertedMesh(this.models.bunnyEarLeft.scene.children)
		this.chassis.object.add(this.antena.bunnyEarLeft)

		this.antena.bunnyEarRight = this.objects.getConvertedMesh(this.models.bunnyEarRight.scene.children)
		this.chassis.object.add(this.antena.bunnyEarRight)

		this.antena.speed = new THREE.Vector2()
		this.antena.absolutePosition = new THREE.Vector2()
		this.antena.localPosition = new THREE.Vector2()

		// Time tick
		this.time.on('tick', () => {
			const max = 1
			const accelerationX = Math.min(Math.max(this.movement.acceleration.x, -max), max)
			const accelerationY = Math.min(Math.max(this.movement.acceleration.y, -max), max)

			this.antena.speed.x -= accelerationX * this.antena.speedStrength
			this.antena.speed.y -= accelerationY * this.antena.speedStrength

			const position = this.antena.absolutePosition.clone()
			const pullBack = position.negate().multiplyScalar(position.length() * this.antena.pullBackStrength)
			this.antena.speed.add(pullBack)

			this.antena.speed.x *= 1 - this.antena.damping
			this.antena.speed.y *= 1 - this.antena.damping

			this.antena.absolutePosition.add(this.antena.speed)

			this.antena.localPosition.copy(this.antena.absolutePosition)
			this.antena.localPosition.rotateAround(new THREE.Vector2(), -this.chassis.object.rotation.z)

			this.antena.object.rotation.y = this.antena.localPosition.x * 0.1
			this.antena.object.rotation.x = this.antena.localPosition.y * 0.1

			this.antena.bunnyEarLeft.rotation.y = this.antena.localPosition.x * 0.1
			this.antena.bunnyEarLeft.rotation.x = this.antena.localPosition.y * 0.1

			this.antena.bunnyEarRight.rotation.y = this.antena.localPosition.x * 0.1
			this.antena.bunnyEarRight.rotation.x = this.antena.localPosition.y * 0.1
		})

		// Debug
		if (this.debug) {
			const folder = this.debugFolder.addFolder('antena')
			folder.open()

			folder.add(this.antena, 'speedStrength').step(0.001).min(0).max(50)
			folder.add(this.antena, 'damping').step(0.0001).min(0).max(0.1)
			folder.add(this.antena, 'pullBackStrength').step(0.0001).min(0).max(0.1)
		}
	}

	setBackLights() {
		this.backLightsBrake = {}

		this.backLightsBrake.material = this.materials.pures.items.red.clone()
		this.backLightsBrake.material.transparent = true
		this.backLightsBrake.material.opacity = 0.5

		this.backLightsBrake.object = this.objects.getConvertedMesh(this.models.backLightsBrake.scene.children)
		for (const _child of this.backLightsBrake.object.children) {
			_child.material = this.backLightsBrake.material
		}

		this.chassis.object.add(this.backLightsBrake.object)

		// Back lights brake
		this.backLightsReverse = {}

		this.backLightsReverse.material = this.materials.pures.items.yellow.clone()
		this.backLightsReverse.material.transparent = true
		this.backLightsReverse.material.opacity = 0.5

		this.backLightsReverse.object = this.objects.getConvertedMesh(this.models.backLightsReverse.scene.children)
		for (const _child of this.backLightsReverse.object.children) {
			_child.material = this.backLightsReverse.material
		}

		this.chassis.object.add(this.backLightsReverse.object)

		// Time tick
		this.time.on('tick', () => {
			this.backLightsBrake.material.opacity = this.physics.controls.actions.brake ? 1 : 0.5
			this.backLightsReverse.material.opacity = this.physics.controls.actions.down ? 1 : 0.5
		})
	}

	setWheels() {
		this.wheels = {}
		const wheelSceneClone = this.models.wheel.scene.clone(true)
		this.wheels.object = this.objects.getConvertedMesh(wheelSceneClone.children, { duplicated: true })
		this.wheels.items = []

		for (let i = 0; i < 4; i++) {
			const object = this.wheels.object.clone()

			this.wheels.items.push(object)
			this.container.add(object)
		}

		// Time tick
		this.time.on('tick', () => {
			if (!this.transformControls.enabled) {
				for (const _wheelKey in this.physics.car.wheels.bodies) {
					const wheelBody = this.physics.car.wheels.bodies[_wheelKey]
					const wheelObject = this.wheels.items[_wheelKey]

					wheelObject.position.copy(wheelBody.position)
					wheelObject.quaternion.copy(wheelBody.quaternion)
				}
			}
		})
	}

	setTransformControls() {
		this.transformControls = new TransformControls(this.camera.instance, this.renderer.domElement)
		this.transformControls.size = 0.5
		this.transformControls.attach(this.chassis.object)
		this.transformControls.enabled = false
		this.transformControls.visible = this.transformControls.enabled

		document.addEventListener('keydown', (_event) => {
			if (this.mode === 'transformControls') {
				if (_event.key === 'r') {
					this.transformControls.setMode('rotate')
				} else if (_event.key === 'g') {
					this.transformControls.setMode('translate')
				}
			}
		})

		this.transformControls.addEventListener('dragging-changed', (_event) => {
			this.camera.orbitControls.enabled = !_event.value
		})

		this.container.add(this.transformControls)

		if (this.debug) {
			const folder = this.debugFolder.addFolder('controls')
			folder.open()

			folder.add(this.transformControls, 'enabled').onChange(() => {
				this.transformControls.visible = this.transformControls.enabled
			})
		}
	}

	setShootingBall() {
		if (!this.config.cyberTruck) {
			return
		}

		window.addEventListener('keydown', (_event) => {
			if (_event.key === 'b') {
				const angle = Math.random() * Math.PI * 2
				const distance = 10
				const x = this.position.x + Math.cos(angle) * distance
				const y = this.position.y + Math.sin(angle) * distance
				const z = 2 + 2 * Math.random()
				const bowlingBall = this.objects.add({
					base: this.resources.items.bowlingBallBase.scene,
					collision: this.resources.items.bowlingBallCollision.scene,
					offset: new THREE.Vector3(x, y, z),
					rotation: new THREE.Euler(Math.PI * 0.5, 0, 0),
					duplicated: true,
					shadow: { sizeX: 1.5, sizeY: 1.5, offsetZ: -0.15, alpha: 0.35 },
					mass: 5,
					soundName: 'bowlingBall',
					sleep: false
				})

				const carPosition = new CANNON.Vec3(this.position.x, this.position.y, this.position.z + 1)
				let direction = carPosition.vsub(bowlingBall.collision.body.position)
				direction.normalize()
				direction = direction.scale(100)
				bowlingBall.collision.body.applyImpulse(direction, bowlingBall.collision.body.position)
			}
		})
	}

	setKlaxon() {
		this.klaxon = {}
		this.klaxon.lastTime = this.time.elapsed

		window.addEventListener('keydown', (_event) => {
			// Play horn sound
			if (_event.code === 'KeyH') {
				if (this.time.elapsed - this.klaxon.lastTime > 400) {
					this.physics.car.jump(false, 150)
					this.klaxon.lastTime = this.time.elapsed
				}

				this.sounds.play(Math.random() < 0.002 ? 'carHorn2' : 'carHorn1')

				// Send action to network
				if (this.network) {
					this.network.sendAction({ type: 'klaxon' })
				}
			}

			// Rain horns
			if (_event.key === 'k') {
				const x = this.position.x + (Math.random() - 0.5) * 3
				const y = this.position.y + (Math.random() - 0.5) * 3
				const z = 6 + 2 * Math.random()

				this.objects.add({
					base: this.resources.items.hornBase.scene,
					collision: this.resources.items.hornCollision.scene,
					offset: new THREE.Vector3(x, y, z),
					rotation: new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2),
					duplicated: true,
					shadow: { sizeX: 1.5, sizeY: 1.5, offsetZ: -0.15, alpha: 0.35 },
					mass: 5,
					soundName: 'horn',
					sleep: false
				})
			}
		})
	}

	setProjectileShoot() {
		this.projectile = {}
		this.projectile.lastTime = 0
		this.projectile.cooldown = 300 // milliseconds between shots

		window.addEventListener('keydown', (_event) => {
			if (_event.code === 'KeyQ') {
				// Check cooldown
				if (this.time.elapsed - this.projectile.lastTime < this.projectile.cooldown) {
					return
				}
				this.projectile.lastTime = this.time.elapsed

				// Get the car's forward direction from its rotation
				const carAngle = this.chassis.object.rotation.z

				// Calculate forward direction (car faces along the X axis in local space)
				const forwardX = Math.cos(carAngle)
				const forwardY = Math.sin(carAngle)

				// Spawn projectile slightly in front of the car
				const spawnDistance = 2.0
				const x = this.position.x + forwardX * spawnDistance
				const y = this.position.y + forwardY * spawnDistance
				const z = this.position.z + 0.5

				// Create the projectile using lemon (scaled down for a bullet-like size)
				const projectile = this.objects.add({
					base: this.resources.items.lemonBase.scene,
					collision: this.resources.items.lemonCollision.scene,
					offset: new THREE.Vector3(x, y, z),
					rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
					duplicated: true,
					shadow: { sizeX: 0.2, sizeY: 0.2, offsetZ: -0.05, alpha: 0.25 },
					mass: 1,
					soundName: 'brick',
					sleep: false
				})

				// Scale down the projectile for a smaller, bullet-like appearance
				const scale = 0.4
				projectile.container.scale.set(scale, scale, scale)

				// Apply impulse in the forward direction
				const impulseStrength = 80
				const impulse = new CANNON.Vec3(
					forwardX * impulseStrength,
					forwardY * impulseStrength,
					5 // Slight upward arc
				)
				projectile.collision.body.applyImpulse(impulse, projectile.collision.body.position)

				// Add some spin for visual effect
				projectile.collision.body.angularVelocity.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20)

				// Send action to network
				if (this.network) {
					this.network.sendAction({
						type: 'projectile-shoot',
						position: { x, y, z },
						direction: { x: forwardX, y: forwardY }
					})
				}
			}
		})
	}

	setBackwardBowlingBall() {
		this.backwardBall = {}
		this.backwardBall.lastTime = 0
		this.backwardBall.cooldown = 500 // milliseconds between shots

		window.addEventListener('keydown', (_event) => {
			if (_event.code === 'KeyG') {
				// Check cooldown
				if (this.time.elapsed - this.backwardBall.lastTime < this.backwardBall.cooldown) {
					return
				}
				this.backwardBall.lastTime = this.time.elapsed

				// Get the car's backward direction from its rotation
				const carAngle = this.chassis.object.rotation.z

				// Calculate backward direction (opposite of forward)
				const backwardX = -Math.cos(carAngle)
				const backwardY = -Math.sin(carAngle)

				// Spawn bowling ball behind the car
				const spawnDistance = 2.5
				const x = this.position.x + backwardX * spawnDistance
				const y = this.position.y + backwardY * spawnDistance
				const z = this.position.z + 0.5

				// Create the bowling ball
				const bowlingBall = this.objects.add({
					base: this.resources.items.bowlingBallBase.scene,
					collision: this.resources.items.bowlingBallCollision.scene,
					offset: new THREE.Vector3(x, y, z),
					rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
					duplicated: true,
					shadow: { sizeX: 1.5, sizeY: 1.5, offsetZ: -0.15, alpha: 0.35 },
					mass: 5,
					soundName: 'bowlingBall',
					sleep: false
				})

				// Apply impulse in the backward direction
				const impulseStrength = 100
				const impulse = new CANNON.Vec3(
					backwardX * impulseStrength,
					backwardY * impulseStrength,
					10 // Slight upward arc
				)
				bowlingBall.collision.body.applyImpulse(impulse, bowlingBall.collision.body.position)

				// Add some spin
				bowlingBall.collision.body.angularVelocity.set(
					(Math.random() - 0.5) * 10,
					(Math.random() - 0.5) * 10,
					(Math.random() - 0.5) * 10
				)

				// Send action to network
				if (this.network) {
					this.network.sendAction({
						type: 'backward-bowling-ball',
						position: { x, y, z },
						direction: { x: backwardX, y: backwardY }
					})
				}
			}
		})
	}

	setExplosion() {
		this.explosion = {}
		this.explosion.lastTime = 0
		this.explosion.cooldown = 500 // milliseconds between explosions
		this.explosion.radius = 8 // radius of effect
		this.explosion.strength = 20 // impulse strength

		window.addEventListener('keydown', (_event) => {
			if (_event.code === 'KeyE') {
				// Check cooldown
				if (this.time.elapsed - this.explosion.lastTime < this.explosion.cooldown) {
					return
				}
				this.explosion.lastTime = this.time.elapsed

				// Get car position
				const carPos = new CANNON.Vec3(this.position.x, this.position.y, this.position.z)

				// Iterate through all physics bodies in the world
				for (const body of this.physics.world.bodies) {
					// Skip the car chassis and static objects (mass = 0)
					if (body === this.physics.car.chassis.body || body.mass === 0) {
						continue
					}

					// Calculate distance to the body
					const bodyPos = body.position
					const distance = carPos.distanceTo(bodyPos)

					// Check if within explosion radius
					if (distance < this.explosion.radius && distance > 0) {
						// Wake up the body if sleeping
						body.wakeUp()

						// Calculate direction away from car
						let direction = bodyPos.vsub(carPos)
						direction.normalize()

						// Calculate impulse strength based on distance (closer = stronger)
						const distanceFactor = 1 - distance / this.explosion.radius
						const impulseStrength = this.explosion.strength * distanceFactor * body.mass

						// Apply impulse with some upward force for a more dramatic effect
						const impulse = new CANNON.Vec3(
							direction.x * impulseStrength,
							direction.y * impulseStrength,
							(direction.z + 0.5) * impulseStrength // Add upward boost
						)

						body.applyImpulse(impulse, body.position)

						// Add some random angular velocity for tumbling effect
						body.angularVelocity.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10)
					}
				}

				// Play a sound effect (using existing sound)
				this.sounds.play('brick')

				// Send action to network
				if (this.network) {
					this.network.sendAction({
						type: 'explosion',
						position: { x: this.position.x, y: this.position.y, z: this.position.z }
					})
				}
			}
		})
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
}
