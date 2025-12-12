import * as THREE from 'three'

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
		this.fenceSpacing = 3 // Distance between cones
		this.trackWidth = 8 // Width of the track (distance from center to fence)
		this.straightLength = 40 // Length of the straight section
		this.turnRadius = 20 // Radius of the turn (to center of track)
		this.turnAngle = Math.PI / 2 // 90 degree turn

		this.setFences()
		this.setTiles()
	}

	setFences() {
		this.fences = {}
		this.fences.left = []
		this.fences.right = []

		// Cone options
		const coneOptions = {
			base: this.resources.items.coneBase.scene,
			collision: this.resources.items.coneCollision.scene,
			offset: new THREE.Vector3(0, 0, 0),
			rotation: new THREE.Euler(0, 0, 0),
			duplicated: true,
			shadow: { sizeX: 1.2, sizeY: 1.2, offsetZ: -0.1, alpha: 0.35 },
			mass: 0.5
		}

		// === STRAIGHT SECTION ===
		const straightConeCount = Math.floor(this.straightLength / this.fenceSpacing)

		// Create left fence for straight section
		for (let i = 0; i < straightConeCount; i++) {
			const yOffset = -i * this.fenceSpacing

			const leftCone = this.objects.add({
				...coneOptions,
				offset: new THREE.Vector3(this.x - this.trackWidth, this.y + yOffset, 0)
			})
			this.fences.left.push(leftCone)
		}

		// Create right fence for straight section
		for (let i = 0; i < straightConeCount; i++) {
			const yOffset = -i * this.fenceSpacing

			const rightCone = this.objects.add({
				...coneOptions,
				offset: new THREE.Vector3(this.x + this.trackWidth, this.y + yOffset, 0)
			})
			this.fences.right.push(rightCone)
		}

		// === RIGHT TURN SECTION ===
		// Turn center is at the end of the straight, offset to the right
		const turnCenterX = this.x + this.turnRadius
		const turnCenterY = this.y - this.straightLength

		// Inner radius (right/inside of turn) and outer radius (left/outside of turn)
		const innerRadius = this.turnRadius - this.trackWidth
		const outerRadius = this.turnRadius + this.trackWidth

		// Calculate cone spacing along the arc
		const innerArcLength = innerRadius * this.turnAngle
		const outerArcLength = outerRadius * this.turnAngle
		const innerConeCount = Math.floor(innerArcLength / this.fenceSpacing)
		const outerConeCount = Math.floor(outerArcLength / this.fenceSpacing)

		// Create outer fence (left side, outside of turn)
		for (let i = 0; i <= outerConeCount; i++) {
			// Angle goes from -PI/2 (pointing down) to 0 (pointing right)
			const angle = -Math.PI / 2 + (i / outerConeCount) * this.turnAngle

			const coneX = turnCenterX + outerRadius * Math.cos(angle)
			const coneY = turnCenterY + outerRadius * Math.sin(angle)

			const cone = this.objects.add({
				...coneOptions,
				offset: new THREE.Vector3(coneX, coneY, 0)
			})
			this.fences.left.push(cone)
		}

		// Create inner fence (right side, inside of turn)
		for (let i = 0; i <= innerConeCount; i++) {
			// Angle goes from -PI/2 (pointing down) to 0 (pointing right)
			const angle = -Math.PI / 2 + (i / innerConeCount) * this.turnAngle

			const coneX = turnCenterX + innerRadius * Math.cos(angle)
			const coneY = turnCenterY + innerRadius * Math.sin(angle)

			const cone = this.objects.add({
				...coneOptions,
				offset: new THREE.Vector3(coneX, coneY, 0)
			})
			this.fences.right.push(cone)
		}
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
