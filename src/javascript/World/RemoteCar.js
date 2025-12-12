import * as THREE from 'three'
import CANNON from 'cannon'

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
