import * as THREE from 'three'
import CANNON from 'cannon'

export default class AICar {
	constructor(_options) {
		this.time = _options.time
		this.resources = _options.resources
		this.objects = _options.objects
		this.physics = _options.physics
		this.shadows = _options.shadows
		this.materials = _options.materials
		this.config = _options.config
		this.spawnPosition = _options.spawnPosition
		this.radius = _options.radius
		this.username = _options.username

		this.container = new THREE.Object3D()
		this.position = new THREE.Vector3()

		this.actions = {
			up: false,
			right: false,
			down: false,
			left: false,
			brake: false,
			boost: false
		}

		this.setModels()
		this.setPhysics()
		this.setChassis()
		this.setUsernameLabel()
		this.setWheels()
		this.setAI()
	}

	setModels() {
		this.models = {}

		if (this.config.cyberTruck) {
			this.models.chassis = this.resources.items.carCyberTruckChassis
			this.models.wheel = this.resources.items.carCyberTruckWheel
		} else {
			this.models.chassis = this.resources.items.carDefaultChassis
			this.models.wheel = this.resources.items.carDefaultWheel
		}
	}

	setPhysics() {
		this.physicsBody = this.physics.createAICarPhysics({
			position: this.spawnPosition,
			options: this.physics.car.options
		})
	}

	setChassis() {
		this.chassis = {}
		this.chassis.offset = new THREE.Vector3(0, 0, -0.28)
		const sceneClone = this.models.chassis.scene.clone(true)
		this.chassis.object = this.objects.getConvertedMesh(sceneClone.children, { duplicated: true })
		this.chassis.object.position.copy(this.physicsBody.chassis.body.position)
		this.chassis.oldPosition = this.chassis.object.position.clone()
		this.container.add(this.chassis.object)

		this.shadows.add(this.chassis.object, { sizeX: 3, sizeY: 2, offsetZ: 0.2 })

		this.time.on('tick', () => {
			this.chassis.oldPosition = this.chassis.object.position.clone()
			this.chassis.object.position.copy(this.physicsBody.chassis.body.position).add(this.chassis.offset)
			this.chassis.object.quaternion.copy(this.physicsBody.chassis.body.quaternion)
			this.position.copy(this.chassis.object.position)
		})
	}

	setUsernameLabel() {
		if (!this.username) return
		if (!this.chassis || !this.chassis.object) return

		const canvas = document.createElement('canvas')
		canvas.width = 512
		canvas.height = 128

		const context = canvas.getContext('2d')
		if (!context) return

		// Background
		const paddingX = 28
		const paddingY = 18
		const fontSize = 54
		const font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`
		context.font = font
		context.textBaseline = 'middle'
		context.textAlign = 'center'

		const text = String(this.username).slice(0, 24)
		const textMetrics = context.measureText(text)
		const textWidth = Math.ceil(textMetrics.width)

		const boxWidth = Math.min(canvas.width - paddingX * 2, textWidth + paddingX * 2)
		const boxHeight = fontSize + paddingY * 2
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

		// Text
		context.font = font
		context.fillStyle = 'rgba(255, 255, 255, 0.95)'
		context.fillText(text, canvas.width * 0.5, canvas.height * 0.5 + 2)

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

		// World size (tweakable): keep it readable but not huge.
		const worldWidth = 2.6
		const worldHeight = worldWidth * (canvas.height / canvas.width)
		sprite.scale.set(worldWidth, worldHeight, 1)

		// Render a bit later to reduce z-fighting with nearby transparent stuff
		sprite.renderOrder = 10

		this.usernameLabel = { canvas, context, texture, material, sprite }
		this.chassis.object.add(sprite)
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

		this.time.on('tick', () => {
			for (const _wheelKey in this.physicsBody.wheels.bodies) {
				const wheelBody = this.physicsBody.wheels.bodies[_wheelKey]
				const wheelObject = this.wheels.items[_wheelKey]
				wheelObject.position.copy(wheelBody.position)
				wheelObject.quaternion.copy(wheelBody.quaternion)
			}
		})
	}

	setAI() {
		this.ai = {}
		this.ai.steering = 0
		this.ai.targetSteering = 0
		this.ai.accelerating = 0
		this.ai.targetAngle = 0
		this.ai.circularPathAngle = Math.random() * Math.PI * 2
		this.ai.circularPathRadius = this.radius * 0.6
		this.ai.circularPathDirection = Math.random() > 0.5 ? 1 : -1
		this.ai.randomDirectionChangeTime = this.time.elapsed + Math.random() * 4000 + 3000
		this.ai.currentSpeed = 0
		this.ai.oldPosition = new CANNON.Vec3()
		this.ai.worldForward = new CANNON.Vec3()
		this.ai.steeringSmoothing = 0.15
		this.ai.state = 'driving'
		this.ai.reverseEndTime = 0
		this.ai.stopEndTime = 0
		this.ai.lastVelocity = new CANNON.Vec3()
		this.ai.collisionDetected = false
		this.ai.collisionCooldown = 0
		this.ai.collisionImpactThreshold = 2
		this.ai.stuckStartTime = 0

		this.physicsBody.chassis.body.addEventListener('collide', (event) => {
			// Ignore collisions with static bodies (floor/walls). Otherwise chassis-to-floor
			// contacts can continuously refresh the cooldown and "freeze" the AI in stopping.
			if (!event.body || event.body.mass === 0) {
				return
			}

			const contact = event.contact
			const impactVel = contact.getImpactVelocityAlongNormal()
			if (Math.abs(impactVel) > this.ai.collisionImpactThreshold) {
				this.ai.collisionDetected = true
				this.ai.collisionCooldown = this.time.elapsed + 500
			}
		})

		this.time.on('tick', () => {
			const currentPos = this.physicsBody.chassis.body.position
			const currentVelocity = this.physicsBody.chassis.body.velocity
			const positionDelta = currentPos.vsub(this.ai.oldPosition)
			const speed = positionDelta.length() / this.time.delta
			const distanceFromSpawn = Math.hypot(currentPos.x - this.spawnPosition.x, currentPos.y - this.spawnPosition.y)

			const localForward = new CANNON.Vec3(1, 0, 0)
			this.physicsBody.chassis.body.vectorToWorldFrame(localForward, this.ai.worldForward)
			const forwardSpeed = this.ai.worldForward.dot(positionDelta)
			const goingForward = forwardSpeed > 0
			const carAngle = Math.atan2(this.ai.worldForward.y, this.ai.worldForward.x)

			const steerStrength = this.time.delta * this.physics.car.options.controlsSteeringSpeed
			const accelerationSpeed = this.physics.car.options.controlsAcceleratingSpeed
			const accelerateStrength = 17 * accelerationSpeed
			const maxSpeed = this.physics.car.options.controlsAcceleratinMaxSpeed

			const returnThreshold = this.radius * 0.75
			const innerRadius = this.radius * 0.4
			const hardBoundary = this.radius * 0.95
			const emergencyBoundary = this.radius * 1.1

			if (distanceFromSpawn > emergencyBoundary) {
				const angleToSpawn = Math.atan2(this.spawnPosition.y - currentPos.y, this.spawnPosition.x - currentPos.x)
				const safeDistance = this.radius * 0.7
				const newX = this.spawnPosition.x + Math.cos(angleToSpawn) * safeDistance
				const newY = this.spawnPosition.y + Math.sin(angleToSpawn) * safeDistance
				this.physicsBody.chassis.body.position.set(newX, newY, currentPos.z)
				this.physicsBody.chassis.body.velocity.set(0, 0, 0)
				this.physicsBody.chassis.body.angularVelocity.set(0, 0, 0)
				this.physicsBody.chassis.body.wakeUp()
				this.ai.oldPosition.copy(this.physicsBody.chassis.body.position)
				this.ai.stuckStartTime = 0
				this.ai.state = 'driving'
				this.ai.collisionDetected = false
			}

			this.ai.lastVelocity.set(currentVelocity.x, currentVelocity.y, currentVelocity.z)

			if (this.ai.collisionDetected && this.time.elapsed < this.ai.collisionCooldown) {
				// Enter stopping once per collision; don't keep pushing the timers forward.
				if (this.ai.state === 'driving') {
					this.ai.state = 'stopping'
					this.ai.stopEndTime = this.time.elapsed + 200
				}
			}

			// If we're trying to drive but not moving for a bit, treat it as "stuck" and recover.
			// This replaces the old velocityChange heuristic (which was very sensitive to units).
			if (this.ai.state === 'driving') {
				const tryingToMove = this.actions.up && !this.actions.brake
				const stuck = tryingToMove && speed < 0.00015

				if (stuck) {
					if (this.ai.stuckStartTime === 0) {
						this.ai.stuckStartTime = this.time.elapsed
					} else if (this.time.elapsed - this.ai.stuckStartTime > 600) {
						this.ai.state = 'stopping'
						this.ai.stopEndTime = this.time.elapsed + 120
						this.ai.stuckStartTime = 0
					}
				} else {
					this.ai.stuckStartTime = 0
				}
			}

			if (distanceFromSpawn > hardBoundary) {
				if (this.ai.state !== 'stopping' && this.ai.state !== 'reversing') {
					this.ai.state = 'stopping'
					this.ai.stopEndTime = this.time.elapsed + 100
				} else if (this.ai.state === 'stopping' && distanceFromSpawn > hardBoundary * 1.05) {
					this.ai.state = 'reversing'
					this.ai.reverseEndTime = this.time.elapsed + 400
					this.ai.stopEndTime = 0
				}
			}

			if (this.ai.state === 'stopping') {
				this.actions.up = false
				this.actions.down = false
				this.actions.brake = true
				this.ai.targetSteering = 0

				if (this.time.elapsed > this.ai.stopEndTime) {
					this.ai.state = 'reversing'
					this.ai.reverseEndTime = this.time.elapsed + 600 + Math.random() * 300
					this.ai.collisionDetected = false
				}
			} else if (this.ai.state === 'reversing') {
				this.actions.up = false
				this.actions.down = true
				this.actions.brake = false

				const angleToSpawn = Math.atan2(this.spawnPosition.y - currentPos.y, this.spawnPosition.x - currentPos.x)
				let deltaAngle = angleToSpawn - carAngle
				while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2
				while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2

				this.ai.targetSteering = Math.max(-1, Math.min(1, -deltaAngle * 0.5))

				if (this.time.elapsed > this.ai.reverseEndTime || distanceFromSpawn < returnThreshold * 0.9) {
					this.ai.state = 'driving'
					this.ai.targetAngle = Math.random() * Math.PI * 2
					this.ai.circularPathAngle = Math.random() * Math.PI * 2
					this.ai.circularPathDirection = Math.random() > 0.5 ? 1 : -1
				}
			} else {
				this.actions.brake = false

				if (distanceFromSpawn > returnThreshold) {
					const angleToSpawn = Math.atan2(this.spawnPosition.y - currentPos.y, this.spawnPosition.x - currentPos.x)

					let deltaAngle = angleToSpawn - carAngle
					while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2
					while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2

					const distanceFactor = Math.min((distanceFromSpawn - returnThreshold) / (hardBoundary - returnThreshold), 1)
					const steeringStrength = 1.2 + distanceFactor * 0.8
					this.ai.targetSteering = Math.max(-1, Math.min(1, deltaAngle * steeringStrength))

					if (distanceFromSpawn > hardBoundary * 0.95) {
						this.actions.brake = true
						this.actions.up = false
					} else {
						this.actions.brake = false
						this.actions.up = true
					}
					this.actions.down = false
				} else if (distanceFromSpawn < innerRadius) {
					if (this.time.elapsed > this.ai.randomDirectionChangeTime) {
						this.ai.circularPathAngle = Math.random() * Math.PI * 2
						this.ai.circularPathDirection = Math.random() > 0.5 ? 1 : -1
						this.ai.circularPathRadius = this.radius * (0.4 + Math.random() * 0.3)
						this.ai.randomDirectionChangeTime = this.time.elapsed + Math.random() * 5000 + 2000
					}

					const pathSpeed = 0.2 + Math.random() * 0.2
					this.ai.circularPathAngle += this.time.delta * pathSpeed * this.ai.circularPathDirection

					const targetX = this.spawnPosition.x + Math.cos(this.ai.circularPathAngle) * this.ai.circularPathRadius
					const targetY = this.spawnPosition.y + Math.sin(this.ai.circularPathAngle) * this.ai.circularPathRadius

					const angleToTarget = Math.atan2(targetY - currentPos.y, targetX - currentPos.x)

					let deltaAngle = angleToTarget - carAngle
					while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2
					while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2

					this.ai.targetSteering = Math.max(-1, Math.min(1, deltaAngle * 0.9))

					this.actions.up = true
					this.actions.down = false
				} else {
					if (Math.random() < 0.01) {
						this.ai.targetAngle = Math.random() * Math.PI * 2
					}

					const angleFromSpawn = Math.atan2(currentPos.y - this.spawnPosition.y, currentPos.x - this.spawnPosition.x)

					const randomOffset = (Math.random() - 0.5) * Math.PI * 0.5
					const tangentAngle = angleFromSpawn + (Math.PI / 2) * (Math.random() > 0.5 ? 1 : -1) + randomOffset
					let deltaAngle = tangentAngle - carAngle
					while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2
					while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2

					this.ai.targetSteering = Math.max(-1, Math.min(1, deltaAngle * (0.5 + Math.random() * 0.3)))

					this.actions.up = true
					this.actions.down = false
				}
			}

			this.ai.steering += (this.ai.targetSteering - this.ai.steering) * this.ai.steeringSmoothing

			if (Math.abs(this.ai.steering) > this.physics.car.options.controlsSteeringMax) {
				this.ai.steering = Math.sign(this.ai.steering) * this.physics.car.options.controlsSteeringMax
			}

			const steeringAngle = Math.abs(this.ai.steering)
			const distanceFactor = Math.min(distanceFromSpawn / this.radius, 1)
			const baseSpeedMultiplier = 0.3
			const speedVariation = 0.1 + Math.random() * 0.1

			let speedMultiplier
			if (distanceFromSpawn > returnThreshold) {
				const returnDistanceFactor = Math.min((distanceFromSpawn - returnThreshold) / (hardBoundary - returnThreshold), 1)
				speedMultiplier = (baseSpeedMultiplier + speedVariation) * (1 - returnDistanceFactor * 0.6) * (1 - steeringAngle * 0.3)
			} else {
				speedMultiplier = (baseSpeedMultiplier + speedVariation) * (1 - steeringAngle * 0.2) * (0.8 + distanceFactor * 0.2)
			}

			this.physicsBody.vehicle.setSteeringValue(-this.ai.steering, this.physicsBody.wheels.indexes.frontLeft)
			this.physicsBody.vehicle.setSteeringValue(-this.ai.steering, this.physicsBody.wheels.indexes.frontRight)

			if (this.physics.car.options.controlsSteeringQuad) {
				this.physicsBody.vehicle.setSteeringValue(this.ai.steering, this.physicsBody.wheels.indexes.backLeft)
				this.physicsBody.vehicle.setSteeringValue(this.ai.steering, this.physicsBody.wheels.indexes.backRight)
			}

			if (this.actions.up) {
				if (speed < maxSpeed || !goingForward) {
					this.ai.accelerating = accelerateStrength * speedMultiplier
				} else {
					this.ai.accelerating = 0
				}
			} else if (this.actions.down) {
				this.ai.accelerating = -accelerateStrength * 0.3
			} else {
				this.ai.accelerating = 0
			}

			this.physicsBody.vehicle.applyEngineForce(-this.ai.accelerating, this.physicsBody.wheels.indexes.backLeft)
			this.physicsBody.vehicle.applyEngineForce(-this.ai.accelerating, this.physicsBody.wheels.indexes.backRight)

			if (this.physics.car.options.controlsSteeringQuad) {
				this.physicsBody.vehicle.applyEngineForce(-this.ai.accelerating, this.physicsBody.wheels.indexes.frontLeft)
				this.physicsBody.vehicle.applyEngineForce(-this.ai.accelerating, this.physicsBody.wheels.indexes.frontRight)
			}

			if (this.actions.brake) {
				this.physicsBody.vehicle.setBrake(this.physics.car.options.controlsBrakeStrength, 0)
				this.physicsBody.vehicle.setBrake(this.physics.car.options.controlsBrakeStrength, 1)
				this.physicsBody.vehicle.setBrake(this.physics.car.options.controlsBrakeStrength, 2)
				this.physicsBody.vehicle.setBrake(this.physics.car.options.controlsBrakeStrength, 3)
			} else {
				this.physicsBody.vehicle.setBrake(0, 0)
				this.physicsBody.vehicle.setBrake(0, 1)
				this.physicsBody.vehicle.setBrake(0, 2)
				this.physicsBody.vehicle.setBrake(0, 3)
			}

			this.ai.oldPosition.copy(currentPos)
		})
	}
}
