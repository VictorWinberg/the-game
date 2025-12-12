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
		this.ai.accelerating = 0
		this.ai.targetAngle = 0
		this.ai.randomDirectionChangeTime = this.time.elapsed + Math.random() * 3000 + 2000
		this.ai.currentSpeed = 0
		this.ai.oldPosition = new CANNON.Vec3()
		this.ai.worldForward = new CANNON.Vec3()

		this.time.on('tick', () => {
			const currentPos = this.physicsBody.chassis.body.position
			const distanceFromSpawn = Math.hypot(
				currentPos.x - this.spawnPosition.x,
				currentPos.y - this.spawnPosition.y
			)

			const localForward = new CANNON.Vec3(1, 0, 0)
			this.physicsBody.chassis.body.vectorToWorldFrame(localForward, this.ai.worldForward)
			const carAngle = Math.atan2(this.ai.worldForward.y, this.ai.worldForward.x)

			const steerStrength = this.time.delta * this.physics.car.options.controlsSteeringSpeed
			const accelerationSpeed = this.physics.car.options.controlsAcceleratingSpeed
			const accelerateStrength = 17 * accelerationSpeed
			const maxSpeed = this.physics.car.options.controlsAcceleratinMaxSpeed

			if (distanceFromSpawn > this.radius) {
				const angleToSpawn = Math.atan2(
					this.spawnPosition.y - currentPos.y,
					this.spawnPosition.x - currentPos.x
				)

				let deltaAngle = angleToSpawn - carAngle
				while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2
				while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2

				if (Math.abs(deltaAngle) > 0.1) {
					if (deltaAngle > 0) {
						this.ai.steering += steerStrength
					} else {
						this.ai.steering -= steerStrength
					}
				}

				this.actions.up = true
				this.actions.down = false
			} else if (distanceFromSpawn < this.radius * 0.8) {
				if (this.time.elapsed > this.ai.randomDirectionChangeTime) {
					this.ai.targetAngle = Math.random() * Math.PI * 2
					this.ai.randomDirectionChangeTime = this.time.elapsed + Math.random() * 3000 + 2000
				}

				let deltaAngle = this.ai.targetAngle - carAngle
				while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2
				while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2

				if (Math.abs(deltaAngle) > 0.1) {
					if (deltaAngle > 0) {
						this.ai.steering += steerStrength
					} else {
						this.ai.steering -= steerStrength
					}
				}

				if (Math.random() > 0.3) {
					this.actions.up = true
					this.actions.down = false
				} else {
					this.actions.up = false
					this.actions.down = false
				}
			} else {
				if (Math.random() > 0.5) {
					this.actions.up = true
					this.actions.down = false
				} else {
					this.actions.up = false
					this.actions.down = false
				}
			}

			if (Math.abs(this.ai.steering) > steerStrength) {
				this.ai.steering -= steerStrength * Math.sign(this.ai.steering)
			} else {
				this.ai.steering = 0
			}

			if (Math.abs(this.ai.steering) > this.physics.car.options.controlsSteeringMax) {
				this.ai.steering = Math.sign(this.ai.steering) * this.physics.car.options.controlsSteeringMax
			}

			this.physicsBody.vehicle.setSteeringValue(-this.ai.steering, this.physicsBody.wheels.indexes.frontLeft)
			this.physicsBody.vehicle.setSteeringValue(-this.ai.steering, this.physicsBody.wheels.indexes.frontRight)

			if (this.physics.car.options.controlsSteeringQuad) {
				this.physicsBody.vehicle.setSteeringValue(this.ai.steering, this.physicsBody.wheels.indexes.backLeft)
				this.physicsBody.vehicle.setSteeringValue(this.ai.steering, this.physicsBody.wheels.indexes.backRight)
			}

			if (this.actions.up) {
				this.ai.accelerating = accelerateStrength
			} else if (this.actions.down) {
				this.ai.accelerating = -accelerateStrength
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

