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
		this.car = _options.car || null

		// Set up
		this.container = new THREE.Object3D()
		this.container.matrixAutoUpdate = false

		// Track configuration
		this.scale = 0.4 // Overall track scale (reduced to make track shorter)
		this.trackWidth = 6
		this.fenceHeight = 1.5
		this.fenceThickness = 0.3 * this.scale // Thickness of collision box
		this.fenceSegments = 16 // Number of segments for curved fence

		// Store collision bodies for cleanup
		this.collisionBodies = []

		// Track path segments
		this.trackSegments = []

		// Building positions (stored during track calculation)
		this.buildingPositions = []

		// Lap tracking
		this.lapCount = 0
		this.startFinishLineY = null // Will be set in setStartFinishLine
		this.carLastSide = null // 'north' or 'south' - tracks which side of the line the car is on

		// Initialize track
		this.calculateTrackPath()
		this.setFences()
		this.setStartFinishLine()
		this.setCones()
		this.setGrandstands()
		this.setLapTracking()
	}

	calculateTrackPath() {
		// Build track step by step using relative positioning
		// Each segment is defined relative to where the previous segment ended
		// The system automatically tracks position and heading

		const s = this.scale

		// Track current position and heading as we build segments
		let currentX = 0
		let currentY = 0
		let currentHeading = Math.PI / 2 // Start heading UP (north)

		// Helper function to add a straight segment
		const addStraight = (length) => {
			const startX = currentX
			const startY = currentY
			const endX = currentX + length * Math.cos(currentHeading)
			const endY = currentY + length * Math.sin(currentHeading)

			// Update position for next segment
			currentX = endX
			currentY = endY
			// Heading stays the same for straight segments

			return {
				type: 'straight',
				start: { x: startX, y: startY },
				end: { x: endX, y: endY }
			}
		}

		// Helper function to add a curve segment
		// turnDirection: 'left' or 'right'
		// radius: turn radius
		// angleChange: angle change in radians (positive = counterclockwise, negative = clockwise)
		const addCurve = (turnDirection, radius, angleChange) => {
			// Calculate turn center relative to current position
			// For left turn: center is to the left of current heading
			// For right turn: center is to the right of current heading
			const perpAngle = currentHeading + (turnDirection === 'left' ? Math.PI / 2 : -Math.PI / 2)
			const centerX = currentX + radius * Math.cos(perpAngle)
			const centerY = currentY + radius * Math.sin(perpAngle)

			// Calculate start and end angles relative to center
			// Start angle: direction from center to current position
			const startAngle = Math.atan2(currentY - centerY, currentX - centerX)
			// End angle: start angle + angle change
			const endAngle = startAngle + angleChange

			// Calculate end position
			const endX = centerX + radius * Math.cos(endAngle)
			const endY = centerY + radius * Math.sin(endAngle)

			// Update position and heading for next segment
			currentX = endX
			currentY = endY
			currentHeading += angleChange

			return {
				type: 'curve',
				center: { x: centerX, y: centerY },
				radius: radius,
				startAngle: startAngle,
				endAngle: endAngle
			}
		}

		// Helper function to add a building position marker
		// This stores a position along the track for later building placement
		// offset: distance along track from current position (positive = forward, negative = backward)
		// sideOffset: perpendicular offset from track (positive = left, negative = right)
		// side: 'left' or 'right' or 'center' - which side of track
		const addBuildingPosition = (name, offset = 0, sideOffset = 0, side = 'center') => {
			// Calculate position relative to current track position
			const alongTrackX = currentX + offset * Math.cos(currentHeading)
			const alongTrackY = currentY + offset * Math.sin(currentHeading)

			// Calculate perpendicular offset
			const perpAngle = currentHeading + Math.PI / 2
			const perpX = alongTrackX + sideOffset * Math.cos(perpAngle)
			const perpY = alongTrackY + sideOffset * Math.sin(perpAngle)

			// Store building position with metadata
			this.buildingPositions.push({
				name: name,
				x: perpX,
				y: perpY,
				heading: currentHeading,
				side: side,
				offset: offset,
				sideOffset: sideOffset
			})

			return { x: perpX, y: perpY, heading: currentHeading }
		}

		// Build track segments using relative definitions
		const segments = [
			// Segment 1: Start/Finish straight going UP
			addStraight(80 * s),
			// Grandstands K, A1, Z1 near start/finish (on right side)
			addBuildingPosition('K', 35 * s, this.trackWidth + 8 * s, 'right'),
			addBuildingPosition('A1', 50 * s, this.trackWidth + 10 * s, 'right'),
			addBuildingPosition('Z1', 48 * s, this.trackWidth + 6 * s, 'right'),

			// Segment 2: Right turn (90 degrees)
			addCurve('right', 15 * s, -Math.PI / 2), // Right turn = negative angle change

			// Segment 3: Straight going RIGHT (east)
			addStraight(120 * s),
			// Grandstand B on right side (moved much further from track to avoid overlap)
			addBuildingPosition('B', 60 * s, this.trackWidth + 150 * s, 'right'),

			// Segment 4: Left turn (135 degrees)
			addCurve('left', 80 * s, (Math.PI * 3) / 4), // Left turn = positive angle change

			// Segment 5: Right turn (90 degrees)
			addCurve('right', 40 * s, -Math.PI / 2),

			// Segment 6: Straight segment
			addStraight(100 * s),

			// Segment 7: Right turn (90 degrees)
			addCurve('right', 30 * s, -((Math.PI * 3) / 4)),

			// Segment 8: Straight segment
			addStraight(60 * s),
			// Grandstand T on left side
			addBuildingPosition('T', 30 * s, -(this.trackWidth + 10 * s), 'left'),

			// Segment 9: Left turn (180 degrees)
			addCurve('left', 20 * s, Math.PI),

			// Segment 10: Right turn (90 degrees)
			addCurve('right', 30 * s, -Math.PI / 2),

			// Segment 11: Straight segment
			addStraight(30 * s),

			// Segment 12: Right turn (60 degrees)
			addCurve('right', 30 * s, -(Math.PI / 3)),

			// Segment 13: Long right turn (120 degrees)
			addCurve('right', 160 * s, -((Math.PI * 2) / 3)),

			// Segment 14: Left turn (90 degrees)
			addCurve('left', 30 * s, Math.PI / 2),

			// Segment 15: Right turn (90 degrees)
			addCurve('right', 30 * s, -Math.PI / 2),

			// Segment 16: Right turn (90 degrees)
			addCurve('right', 30 * s, -Math.PI / 2),

			// Segment 17: Left turn (90 degrees)
			addCurve('left', 30 * s, Math.PI / 2),

			// Segment 18: Straight segment
			addStraight(63 * s),

			// Segment 19: Left turn (90 degrees)
			addCurve('left', 30 * s, Math.PI / 2),

			// Segment 20: Straight segment
			addStraight(60 * s),

			// Segment 21: Left turn (45 degrees)
			addCurve('left', 30 * s, Math.PI / 4),

			// Segment 22: Straight segment
			addStraight(30 * s),

			// Segment 23: Right turn (45 degrees)
			addCurve('right', 30 * s, -Math.PI / 4),

			// Segment 24: Straight segment
			addStraight(30 * s),

			// Segment 25: Right turn (90 degrees)
			addCurve('right', 20 * s, -Math.PI / 2),

			// Segment 26: Left turn (135 degrees)
			addCurve('left', 20 * s, (Math.PI * 3) / 4),

			// Segment 27: Left long turn (45 degrees)
			addCurve('left', 120 * s, Math.PI / 4),

			// Segment 28: Right turn (180 degrees)
			addCurve('right', 30 * s, -Math.PI),

			// Segment 29: Straight segment
			addStraight(80 * s),

			// Segment 30: Right turn (90 degrees)
			addCurve('right', 30 * s, -Math.PI / 2),

			// Segment 30: Left turn (45 degrees)
			addCurve('left', 30 * s, Math.PI / 4),

			// Segment 31: Long right turn (45 degrees)
			addCurve('right', 200 * s, -Math.PI / 4),

			// Segment 32: Straight segment
			addStraight(88 * s)
		]

		// Filter out building positions, keep only track segments
		this.trackSegments = segments.filter((seg) => seg.type === 'straight' || seg.type === 'curve')

		// Add special building positions (Paddock Club, General Admission)
		// These are placed at specific locations relative to the track
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

	createStraightFenceSegment(x1, y1, x2, y2, side) {
		const dx = x2 - x1
		const dy = y2 - y1
		const length = Math.sqrt(dx * dx + dy * dy)
		const angle = Math.atan2(dy, dx)

		// Perpendicular offset for inner/outer fence
		const perpAngle = angle + (side === 'outer' ? Math.PI / 2 : -Math.PI / 2)
		const offsetX = Math.cos(perpAngle) * this.trackWidth
		const offsetY = Math.sin(perpAngle) * this.trackWidth

		const centerX = this.x + (x1 + x2) / 2 + offsetX
		const centerY = this.y + (y1 + y2) / 2 + offsetY

		const geometry = new THREE.PlaneGeometry(length, this.fenceHeight)
		const material = this.createFenceMaterial()
		const mesh = new THREE.Mesh(geometry, material)

		mesh.position.set(centerX, centerY, this.fenceHeight / 2)
		mesh.rotation.x = Math.PI / 2
		mesh.rotation.y = angle

		mesh.matrixAutoUpdate = false
		mesh.updateMatrix()
		this.container.add(mesh)

		// Collision
		this.createFenceCollision(centerX, centerY, this.fenceHeight / 2, length, this.fenceThickness, this.fenceHeight * 2, angle)

		return mesh
	}

	createCurvedFenceSegment(centerX, centerY, radius, startAngle, endAngle, side) {
		// Adjust radius based on side
		const adjustedRadius = side === 'outer' ? radius + this.trackWidth : radius - this.trackWidth

		if (adjustedRadius <= 0) return // Skip if radius is too small

		const angleSpan = endAngle - startAngle
		const arcLength = Math.abs(adjustedRadius * angleSpan)
		const numSegments = Math.max(8, Math.ceil(Math.abs(angleSpan) / (Math.PI / 8)) * 4)
		const segmentLength = arcLength / numSegments

		for (let i = 0; i < numSegments; i++) {
			const angle1 = startAngle + (i / numSegments) * angleSpan
			const angle2 = startAngle + ((i + 1) / numSegments) * angleSpan
			const midAngle = (angle1 + angle2) / 2

			// Calculate segment positions
			const x1 = this.x + centerX + adjustedRadius * Math.cos(angle1)
			const y1 = this.y + centerY + adjustedRadius * Math.sin(angle1)
			const x2 = this.x + centerX + adjustedRadius * Math.cos(angle2)
			const y2 = this.y + centerY + adjustedRadius * Math.sin(angle2)

			// Calculate segment center and rotation
			const midX = (x1 + x2) / 2
			const midY = (y1 + y2) / 2
			const fenceAngle = midAngle + Math.PI / 2

			// Create fence segment
			const actualSegmentLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * 1.05
			const geometry = new THREE.PlaneGeometry(actualSegmentLength, this.fenceHeight)
			const material = this.createFenceMaterial()
			const mesh = new THREE.Mesh(geometry, material)

			mesh.position.set(midX, midY, this.fenceHeight / 2)
			mesh.rotation.x = Math.PI / 2
			mesh.rotation.y = fenceAngle

			mesh.matrixAutoUpdate = false
			mesh.updateMatrix()

			this.container.add(mesh)

			// Create collision body for curved segment
			this.createFenceCollision(midX, midY, this.fenceHeight / 2, actualSegmentLength, this.fenceThickness, this.fenceHeight * 2, fenceAngle)
		}
	}

	createFenceCollision(x, y, z, length, thickness, height, rotationZ) {
		// Create box shape for collision
		const halfExtents = new CANNON.Vec3(length / 2, thickness / 2, height / 2)
		const shape = new CANNON.Box(halfExtents)

		// Create static body (mass = 0)
		const body = new CANNON.Body({
			mass: 0,
			material: this.objects.physics.materials.items.dummy
		})
		body.addShape(shape)

		// Set position
		body.position.set(x, y, z)

		// Set rotation around Z axis
		if (rotationZ !== 0) {
			const quaternion = new CANNON.Quaternion()
			quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), rotationZ)
			body.quaternion = quaternion
		}

		// Add to physics world
		this.objects.physics.world.addBody(body)

		// Store reference for cleanup
		this.collisionBodies.push(body)

		return body
	}

	setFences() {
		// Iterate through all track segments and create fences on both sides
		for (const segment of this.trackSegments) {
			if (segment.type === 'straight') {
				// Create inner and outer fences for straight segments
				this.createStraightFenceSegment(segment.start.x, segment.start.y, segment.end.x, segment.end.y, 'outer')
				this.createStraightFenceSegment(segment.start.x, segment.start.y, segment.end.x, segment.end.y, 'inner')
			} else if (segment.type === 'curve') {
				// Create inner and outer fences for curved segments
				this.createCurvedFenceSegment(segment.center.x, segment.center.y, segment.radius, segment.startAngle, segment.endAngle, 'outer')
				this.createCurvedFenceSegment(segment.center.x, segment.center.y, segment.radius, segment.startAngle, segment.endAngle, 'inner')
			}
		}
	}

	setTiles() {
		// Add tiles along the track path
		for (const segment of this.trackSegments) {
			if (segment.type === 'straight') {
				this.tiles.add({
					start: new THREE.Vector2(this.x + segment.start.x, this.y + segment.start.y),
					delta: new THREE.Vector2(segment.end.x - segment.start.x, segment.end.y - segment.start.y)
				})
			} else if (segment.type === 'curve') {
				// Approximate curves with multiple straight segments for tiles
				const angleSpan = segment.endAngle - segment.startAngle
				const numTileSegments = Math.max(4, Math.ceil(Math.abs(angleSpan) / (Math.PI / 4)))

				for (let i = 0; i < numTileSegments; i++) {
					const angle1 = segment.startAngle + (i / numTileSegments) * angleSpan
					const angle2 = segment.startAngle + ((i + 1) / numTileSegments) * angleSpan

					const x1 = segment.center.x + segment.radius * Math.cos(angle1)
					const y1 = segment.center.y + segment.radius * Math.sin(angle1)
					const x2 = segment.center.x + segment.radius * Math.cos(angle2)
					const y2 = segment.center.y + segment.radius * Math.sin(angle2)

					this.tiles.add({
						start: new THREE.Vector2(this.x + x1, this.y + y1),
						delta: new THREE.Vector2(x2 - x1, y2 - y1)
					})
				}
			}
		}
	}

	setStartFinishLine() {
		// Create checkered flag pattern at start/finish line
		const s = this.scale
		const checkSize = 1 * s
		const numChecks = 16 // Increased from 8 to make marker wider
		const lineWidth = this.trackWidth * 2

		// Position at the start of segment 1
		const startX = this.x + 0
		const startY = this.y + 5 * s
		this.startFinishLineY = startY // Set for lap tracking

		// Create checkered pattern
		const checkerGroup = new THREE.Group()

		for (let i = 0; i < numChecks; i++) {
			for (let j = 0; j < 2; j++) {
				const isBlack = (i + j) % 2 === 0
				const geometry = new THREE.PlaneGeometry(checkSize, checkSize)
				const material = new THREE.MeshBasicMaterial({
					color: isBlack ? 0x000000 : 0xffffff,
					side: THREE.DoubleSide
				})
				const mesh = new THREE.Mesh(geometry, material)

				mesh.position.x = startX + (i - numChecks / 2 + 0.5) * checkSize
				mesh.position.y = startY
				mesh.position.z = 0.01 + j * 0.001 // Slightly above ground

				mesh.rotation.x = -Math.PI / 2

				mesh.matrixAutoUpdate = false
				mesh.updateMatrix()
				checkerGroup.add(mesh)
			}
		}

		// Add start line stripe across track
		const stripeGeometry = new THREE.PlaneGeometry(lineWidth, 0.5 * s)
		const stripeMaterial = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.8
		})
		const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial)
		stripe.position.set(startX, startY, 0.005)
		stripe.rotation.x = -Math.PI / 2
		stripe.matrixAutoUpdate = false
		stripe.updateMatrix()
		checkerGroup.add(stripe)

		// Add direction arrow pointing UP (direction of travel)
		const arrowShape = new THREE.Shape()
		arrowShape.moveTo(0, -2 * s)
		arrowShape.lineTo(1.5 * s, -2 * s)
		arrowShape.lineTo(1.5 * s, -3 * s)
		arrowShape.lineTo(3 * s, -1 * s)
		arrowShape.lineTo(1.5 * s, 1 * s)
		arrowShape.lineTo(1.5 * s, 0)
		arrowShape.lineTo(0, 0)
		arrowShape.lineTo(0, -2 * s)

		const arrowGeometry = new THREE.ShapeGeometry(arrowShape)
		const arrowMaterial = new THREE.MeshBasicMaterial({
			color: 0x333333,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.6
		})
		const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial)
		arrow.position.set(startX - 5 * s, startY + 8 * s, 0.01)
		arrow.rotation.x = -Math.PI / 2
		arrow.rotation.z = -Math.PI / 2 // Flipped to point UP
		arrow.matrixAutoUpdate = false
		arrow.updateMatrix()
		checkerGroup.add(arrow)

		this.container.add(checkerGroup)
	}

	setLapTracking() {
		// Track lap count by detecting when car crosses start/finish line
		// The start/finish line is horizontal at y = this.startFinishLineY
		// Track starts going UP (north), so we detect crossing from south to north

		if (!this.objects || !this.objects.physics || !this.objects.physics.car) {
			return
		}

		// Small threshold to avoid false positives from jitter
		const lineThreshold = 0.5

		this.time.on('tick', () => {
			const carBody = this.objects.physics.car.chassis.body
			if (!carBody) return

			const carY = carBody.position.y
			const lineY = this.startFinishLineY

			// Determine which side of the line the car is on
			// Use a small threshold to avoid jitter around the line
			const currentSide = carY > lineY + lineThreshold ? 'north' : carY < lineY - lineThreshold ? 'south' : null

			// Skip if car is exactly on the line (within threshold)
			if (currentSide === null) {
				return
			}

			// If we haven't initialized, set the initial side
			if (this.carLastSide === null) {
				this.carLastSide = currentSide
				return
			}

			// Detect crossing: car was south and is now north (completed a lap)
			if (this.carLastSide === 'south' && currentSide === 'north') {
				// Check if car is reasonably close to the start line (within track width)
				const carX = carBody.position.x
				const startX = this.x + 0
				const distanceFromLine = Math.abs(carX - startX)

				// Only count lap if car is within reasonable distance of the start line
				if (distanceFromLine < this.trackWidth * 2) {
					this.lapCount++

					// Notify the car about the lap completion
					if (this.car && this.car.onLapComplete) {
						this.car.onLapComplete(this.lapCount)
					}
				}
			}

			// Update last side
			this.carLastSide = currentSide
		})
	}

	setGrandstands() {
		// Grandstand definitions with sizes
		const s = this.scale
		const grandstandDefs = {
			K: { width: 8 * s, depth: 4 * s },
			A1: { width: 12 * s, depth: 5 * s },
			Z1: { width: 6 * s, depth: 3 * s },
			T: { width: 10 * s, depth: 5 * s },
			B: { width: 10 * s, depth: 5 * s }
		}

		// Create grandstand material
		const grandstandMaterial = new THREE.MeshBasicMaterial({
			color: 0x666666,
			transparent: true,
			opacity: 0.8
		})

		// Find all grandstand positions from buildingPositions
		for (const pos of this.buildingPositions) {
			if (grandstandDefs[pos.name]) {
				const def = grandstandDefs[pos.name]

				// Create grandstand structure
				const geometry = new THREE.BoxGeometry(def.width, def.depth, 2 * s)
				const mesh = new THREE.Mesh(geometry, grandstandMaterial.clone())

				// Position relative to track, facing the track
				const rotation = pos.heading + Math.PI / 2 // Face towards track
				mesh.position.set(this.x + pos.x, this.y + pos.y, 1 * s)
				mesh.rotation.z = rotation

				mesh.matrixAutoUpdate = false
				mesh.updateMatrix()
				this.container.add(mesh)

				// Add label
				this.addLabel(pos.name, this.x + pos.x, this.y + pos.y, 2.5 * s)
			}
		}
	}

	addLabel(text, x, y, z) {
		// Create a simple text label using a canvas texture
		const s = this.scale
		const canvas = document.createElement('canvas')
		canvas.width = 128
		canvas.height = 64
		const ctx = canvas.getContext('2d')

		ctx.fillStyle = 'rgba(0, 0, 0, 0)'
		ctx.fillRect(0, 0, canvas.width, canvas.height)

		ctx.font = 'bold 32px Arial'
		ctx.fillStyle = '#333333'
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText(text, canvas.width / 2, canvas.height / 2)

		const texture = new THREE.CanvasTexture(canvas)
		texture.needsUpdate = true

		const geometry = new THREE.PlaneGeometry(4 * s, 2 * s)
		const material = new THREE.MeshBasicMaterial({
			map: texture,
			transparent: true,
			side: THREE.DoubleSide,
			depthWrite: false
		})

		const mesh = new THREE.Mesh(geometry, material)
		mesh.position.set(x, y, z)
		mesh.rotation.x = Math.PI / 4

		mesh.matrixAutoUpdate = false
		mesh.updateMatrix()
		this.container.add(mesh)
	}

	addTextLabel(text, x, y, z) {
		// Create a text label using a canvas texture
		const s = this.scale
		const canvas = document.createElement('canvas')
		canvas.width = 512
		canvas.height = 128
		const ctx = canvas.getContext('2d')

		ctx.fillStyle = 'rgba(0, 0, 0, 0)'
		ctx.fillRect(0, 0, canvas.width, canvas.height)

		ctx.font = 'bold 24px Arial'
		ctx.fillStyle = '#333333'
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText(text, canvas.width / 2, canvas.height / 2)

		const texture = new THREE.CanvasTexture(canvas)
		texture.needsUpdate = true

		const geometry = new THREE.PlaneGeometry(12 * s, 3 * s)
		const material = new THREE.MeshBasicMaterial({
			map: texture,
			transparent: true,
			side: THREE.DoubleSide,
			depthWrite: false
		})

		const mesh = new THREE.Mesh(geometry, material)
		mesh.position.set(x, y, z)
		mesh.rotation.x = -Math.PI / 2

		mesh.matrixAutoUpdate = false
		mesh.updateMatrix()
		this.container.add(mesh)
	}

	setCones() {
		// Add cones randomly along the track
		const s = this.scale
		const coneProbability = 0.4 // 40% chance per segment (increased from 15%)
		const minDistanceBetweenCones = 10 * s // Minimum distance between cones (reduced from 20)

		// Store last cone position to maintain minimum distance
		let lastConeX = null
		let lastConeY = null

		// Iterate through track segments
		for (const segment of this.trackSegments) {
			// Random chance to place a cone on this segment
			if (Math.random() > coneProbability) {
				continue
			}

			let coneX, coneY, coneRotation

			if (segment.type === 'straight') {
				// Calculate random position along straight segment
				const t = Math.random() // 0 to 1 along the segment
				coneX = this.x + segment.start.x + (segment.end.x - segment.start.x) * t
				coneY = this.y + segment.start.y + (segment.end.y - segment.start.y) * t

				// Calculate rotation to align with track direction
				const dx = segment.end.x - segment.start.x
				const dy = segment.end.y - segment.start.y
				coneRotation = Math.atan2(dy, dx)
			} else if (segment.type === 'curve') {
				// Calculate random position along curve
				const t = Math.random() // 0 to 1 along the curve
				const angle = segment.startAngle + (segment.endAngle - segment.startAngle) * t
				coneX = this.x + segment.center.x + segment.radius * Math.cos(angle)
				coneY = this.y + segment.center.y + segment.radius * Math.sin(angle)

				// Rotation tangent to the curve
				coneRotation = angle + Math.PI / 2
			} else {
				continue
			}

			// Check minimum distance from last cone
			if (lastConeX !== null && lastConeY !== null) {
				const distance = Math.sqrt((coneX - lastConeX) ** 2 + (coneY - lastConeY) ** 2)
				if (distance < minDistanceBetweenCones) {
					continue // Skip this cone, too close to previous one
				}
			}

			// Add small random offset perpendicular to track to vary placement
			const perpAngle = coneRotation + Math.PI / 2
			const offsetAmount = (Math.random() - 0.5) * (this.trackWidth * 0.3) // Small offset within track
			coneX += Math.cos(perpAngle) * offsetAmount
			coneY += Math.sin(perpAngle) * offsetAmount

			// Add random rotation variation
			const rotationVariation = (Math.random() - 0.5) * 0.3 // ±0.15 radians
			coneRotation += rotationVariation

			// Create cone using cone model (or create cone geometry)
			// Check if cone resources are available
			if (this.resources.items.coneBase && this.resources.items.coneCollision) {
				this.objects.add({
					base: this.resources.items.coneBase.scene,
					collision: this.resources.items.coneCollision.scene,
					offset: new THREE.Vector3(coneX, coneY, 0),
					rotation: new THREE.Euler(0, 0, coneRotation),
					duplicated: true,
					shadow: { sizeX: 1.5 * s, sizeY: 1.5 * s, offsetZ: -0.3 * s, alpha: 0.4 },
					mass: 0.5, // Make them movable/knockable
					soundName: 'woodHit',
					isCone: true
				})
			} else {
				// Fallback: create cone geometry if cone model not available
				this.createConeGeometry(coneX, coneY, coneRotation)
			}

			// Update last cone position
			lastConeX = coneX
			lastConeY = coneY
		}
	}

	createConeGeometry(x, y, rotation) {
		// Create a simple cone using THREE.js geometry
		const s = this.scale
		const coneSize = 1.5 * s
		const coneHeight = 2 * s

		// Create cone shape (4-sided cone)
		const geometry = new THREE.ConeGeometry(coneSize, coneHeight, 4)
		const material = new THREE.MeshStandardMaterial({
			color: 0xffaa00, // Orange color
			roughness: 0.7,
			metalness: 0.3
		})

		const cone = new THREE.Mesh(geometry, material)
		cone.position.set(x, y, coneHeight / 2)
		cone.rotation.z = rotation

		cone.matrixAutoUpdate = false
		cone.updateMatrix()
		this.container.add(cone)

		// Add simple collision (box approximation)
		const halfExtents = new CANNON.Vec3(coneSize * 0.7, coneSize * 0.7, coneHeight / 2)
		const shape = new CANNON.Box(halfExtents)
		const body = new CANNON.Body({
			mass: 0.5,
			material: this.objects.physics.materials.items.dummy
		})
		body.addShape(shape)
		body.position.set(x, y, coneHeight / 2)

		// Set rotation
		const quaternion = new CANNON.Quaternion()
		quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), rotation)
		body.quaternion = quaternion

		this.objects.physics.world.addBody(body)
		this.collisionBodies.push(body)
	}
}
