import * as THREE from 'three'
import CANNON from 'cannon'
import AreaFenceMaterial from '../../Materials/AreaFence.js'

export default class RacetrackSection {
	constructor(_options) {
		// Options
		this.time = _options.time
		this.resources = _options.resources
		this.objects = _options.objects
		this.areas = _options.areas
		this.tiles = _options.tiles
		this.walls = _options.walls
		this.debug = _options.debug
		this.x = _options.x
		this.y = _options.y

		// Set up
		this.container = new THREE.Object3D()
		this.container.matrixAutoUpdate = false

		// Fence configuration
		this.trackWidth = 8 // Width of the track (distance from center to fence)
		this.straightLength = 60 // Length of the straight sections
		this.turnRadius = 25 // Radius of the turn (to center of track)
		this.fenceHeight = 1.5 // Height of the fence
		this.fenceThickness = 0.3 // Thickness of collision box
		this.fenceSegments = 32 // Number of segments for curved fence (more for smoother curves)

		// Store collision bodies for cleanup
		this.collisionBodies = []

		this.setFences()
		this.setTiles()
	}

	createFenceMaterial() {
		const material = new AreaFenceMaterial()
		material.uniforms.uBorderAlpha.value = 0.8
		material.uniforms.uStrikeAlpha.value = 0.4

		// Update time uniform
		this.time.on('tick', () => {
			material.uniforms.uTime.value = this.time.elapsed
		})

		return material
	}

	createStraightFence(startX, startY, length, rotation = 0) {
		const geometry = new THREE.PlaneGeometry(length, this.fenceHeight)
		const material = this.createFenceMaterial()
		const mesh = new THREE.Mesh(geometry, material)

		// Default orientation is aligned with Y (same as your original code)
		mesh.position.set(startX, startY - length / 2, this.fenceHeight / 2)

		// Apply rotation around Z
		mesh.rotation.z = rotation + Math.PI / 2
		mesh.rotation.y = Math.PI / 2

		mesh.matrixAutoUpdate = false
		mesh.updateMatrix()
		this.container.add(mesh)

		// Collision
		this.createFenceCollision(startX, startY - length / 2, this.fenceHeight / 2, length, this.fenceThickness, this.fenceHeight, rotation)

		return mesh
	}

	createCurvedFence(centerX, centerY, radius, startAngle, endAngle) {
		const angleSpan = endAngle - startAngle
		const arcLength = Math.abs(radius * angleSpan)
		const segmentLength = arcLength / this.fenceSegments

		for (let i = 0; i < this.fenceSegments; i++) {
			const angle1 = startAngle + (i / this.fenceSegments) * angleSpan
			const angle2 = startAngle + ((i + 1) / this.fenceSegments) * angleSpan
			const midAngle = (angle1 + angle2) / 2

			// Calculate segment positions
			const x1 = centerX + radius * Math.cos(angle1)
			const y1 = centerY + radius * Math.sin(angle1)
			const x2 = centerX + radius * Math.cos(angle2)
			const y2 = centerY + radius * Math.sin(angle2)

			// Calculate segment center and rotation
			const midX = (x1 + x2) / 2
			const midY = (y1 + y2) / 2
			const segmentRotation = midAngle + Math.PI / 2

			// Create fence segment
			const geometry = new THREE.PlaneGeometry(segmentLength * 1.05, this.fenceHeight)
			const material = this.createFenceMaterial()
			const mesh = new THREE.Mesh(geometry, material)

			mesh.position.set(midX, midY, this.fenceHeight / 2)
			mesh.rotation.x = Math.PI / 2
			mesh.rotation.y = midAngle + Math.PI / 2

			mesh.matrixAutoUpdate = false
			mesh.updateMatrix()

			this.container.add(mesh)

			// Create collision body for curved segment
			this.createFenceCollision(midX, midY, this.fenceHeight / 2, segmentLength * 1.05, this.fenceThickness, this.fenceHeight, segmentRotation)
		}
	}

	createFenceCollision(x, y, z, length, thickness, height, rotationY) {
		// Create box shape for collision (thickness along local X, length along local Y, height along local Z)
		const halfExtents = new CANNON.Vec3(thickness / 2, length / 2, height / 2)
		const shape = new CANNON.Box(halfExtents)

		// Create static body (mass = 0)
		const body = new CANNON.Body({
			mass: 0,
			material: this.objects.physics.materials.items.dummy
		})
		body.addShape(shape)

		// Set position
		body.position.set(x, y, z)

		// Set rotation around Y axis
		if (rotationY !== 0) {
			const quaternion = new CANNON.Quaternion()
			quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotationY)
			body.quaternion = quaternion
		}

		// Add to physics world
		this.objects.physics.world.addBody(body)

		// Store reference for cleanup
		this.collisionBodies.push(body)

		return body
	}

	setFences() {
		// === STRAIGHT SECTION - LEFT FENCE ===
		this.createStraightFence(this.x - this.trackWidth, this.y, this.straightLength)

		// === STRAIGHT SECTION - RIGHT FENCE ===
		this.createStraightFence(this.x + this.trackWidth, this.y, this.straightLength)

		// === RIGHT TURN SECTION ===
		const turnCenterX = this.x + this.turnRadius
		const turnCenterY = this.y - this.straightLength

		// Inner radius (right/inside of turn) and outer radius (left/outside of turn)
		const innerRadius = this.turnRadius - this.trackWidth
		const outerRadius = this.turnRadius + this.trackWidth

		// Outer fence (left side, outside of turn)
		// Angle goes from -PI/2 (pointing down) to 0 (pointing right)
		this.createCurvedFence(turnCenterX, turnCenterY, outerRadius, -Math.PI / 2, 0)

		// Inner fence (right side, inside of turn)
		this.createCurvedFence(turnCenterX, turnCenterY, innerRadius, -Math.PI / 2, 0)
	}

	setTiles() {
		// Add tiles along the straight section
		this.tiles.add({
			start: new THREE.Vector2(this.x, this.y),
			delta: new THREE.Vector2(0, -this.straightLength)
		})

		// Add tiles for the turn (approximate with a diagonal)
		const turnEndX = this.x + this.turnRadius
		const turnEndY = this.y - this.straightLength - this.turnRadius
		this.tiles.add({
			start: new THREE.Vector2(this.x, this.y - this.straightLength),
			delta: new THREE.Vector2(turnEndX - this.x, turnEndY - (this.y - this.straightLength))
		})
	}
}
