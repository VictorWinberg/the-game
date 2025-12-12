import * as THREE from 'three'
import CANNON from 'cannon'

export default class IntroSection {
	constructor(_options) {
		// Options
		this.config = _options.config
		this.time = _options.time
		this.resources = _options.resources
		this.objects = _options.objects
		this.areas = _options.areas
		this.walls = _options.walls
		this.tiles = _options.tiles
		this.debug = _options.debug
		this.x = _options.x
		this.y = _options.y

		// Set up
		this.container = new THREE.Object3D()
		this.container.matrixAutoUpdate = false
		this.container.updateMatrix()

		// this.setStatic()
		this.setInstructions()
		this.setOtherInstructions()
		this.setPyramid()
		this.setTiles()
		this.setDikes()
	}

	setStatic() {
		this.objects.add({
			base: this.resources.items.introStaticBase.scene,
			collision: this.resources.items.introStaticCollision.scene,
			floorShadowTexture: this.resources.items.introStaticFloorShadowTexture,
			offset: new THREE.Vector3(0, 0, 0),
			mass: 0
		})
	}

	setInstructions() {
		this.instructions = {}

		/**
		 * Arrows
		 */
		this.instructions.arrows = {}

		// Label
		this.instructions.arrows.label = {}

		this.instructions.arrows.label.texture = this.config.touch ? this.resources.items.introInstructionsControlsTexture : this.resources.items.introInstructionsArrowsTexture
		this.instructions.arrows.label.texture.magFilter = THREE.NearestFilter
		this.instructions.arrows.label.texture.minFilter = THREE.LinearFilter

		this.instructions.arrows.label.material = new THREE.MeshBasicMaterial({ transparent: true, alphaMap: this.instructions.arrows.label.texture, color: 0xffffff, depthWrite: false, opacity: 0 })

		this.instructions.arrows.label.geometry = this.resources.items.introInstructionsLabels.scene.children.find((_mesh) => _mesh.name === 'arrows').geometry

		this.instructions.arrows.label.mesh = new THREE.Mesh(this.instructions.arrows.label.geometry, this.instructions.arrows.label.material)
		this.container.add(this.instructions.arrows.label.mesh)

		if (!this.config.touch) {
			// Keys
			this.instructions.arrows.up = this.objects.add({
				base: this.resources.items.introArrowKeyBase.scene,
				collision: this.resources.items.introArrowKeyCollision.scene,
				offset: new THREE.Vector3(0, 0, 0),
				rotation: new THREE.Euler(0, 0, 0),
				duplicated: true,
				shadow: { sizeX: 1, sizeY: 1, offsetZ: -0.2, alpha: 0.5 },
				mass: 1.5,
				soundName: 'brick'
			})
			this.instructions.arrows.down = this.objects.add({
				base: this.resources.items.introArrowKeyBase.scene,
				collision: this.resources.items.introArrowKeyCollision.scene,
				offset: new THREE.Vector3(0, -0.8, 0),
				rotation: new THREE.Euler(0, 0, Math.PI),
				duplicated: true,
				shadow: { sizeX: 1, sizeY: 1, offsetZ: -0.2, alpha: 0.5 },
				mass: 1.5,
				soundName: 'brick'
			})
			this.instructions.arrows.left = this.objects.add({
				base: this.resources.items.introArrowKeyBase.scene,
				collision: this.resources.items.introArrowKeyCollision.scene,
				offset: new THREE.Vector3(-0.8, -0.8, 0),
				rotation: new THREE.Euler(0, 0, Math.PI * 0.5),
				duplicated: true,
				shadow: { sizeX: 1, sizeY: 1, offsetZ: -0.2, alpha: 0.5 },
				mass: 1.5,
				soundName: 'brick'
			})
			this.instructions.arrows.right = this.objects.add({
				base: this.resources.items.introArrowKeyBase.scene,
				collision: this.resources.items.introArrowKeyCollision.scene,
				offset: new THREE.Vector3(0.8, -0.8, 0),
				rotation: new THREE.Euler(0, 0, -Math.PI * 0.5),
				duplicated: true,
				shadow: { sizeX: 1, sizeY: 1, offsetZ: -0.2, alpha: 0.5 },
				mass: 1.5,
				soundName: 'brick'
			})
		}
	}

	setOtherInstructions() {
		if (this.config.touch) {
			return
		}

		this.otherInstructions = {}
		this.otherInstructions.x = 16
		this.otherInstructions.y = -2

		// Container
		this.otherInstructions.container = new THREE.Object3D()
		this.otherInstructions.container.position.x = this.otherInstructions.x
		this.otherInstructions.container.position.y = this.otherInstructions.y
		this.otherInstructions.container.matrixAutoUpdate = false
		this.otherInstructions.container.updateMatrix()
		this.container.add(this.otherInstructions.container)

		// Label
		this.otherInstructions.label = {}

		this.otherInstructions.label.geometry = new THREE.PlaneGeometry(6, 6, 1, 1)

		this.otherInstructions.label.texture = this.resources.items.introInstructionsOtherTexture
		this.otherInstructions.label.texture.magFilter = THREE.NearestFilter
		this.otherInstructions.label.texture.minFilter = THREE.LinearFilter

		this.otherInstructions.label.material = new THREE.MeshBasicMaterial({ transparent: true, alphaMap: this.otherInstructions.label.texture, color: 0xffffff, depthWrite: false, opacity: 0 })

		this.otherInstructions.label.mesh = new THREE.Mesh(this.otherInstructions.label.geometry, this.otherInstructions.label.material)
		this.otherInstructions.label.mesh.matrixAutoUpdate = false
		this.otherInstructions.container.add(this.otherInstructions.label.mesh)

		// Horn
		this.otherInstructions.horn = this.objects.add({
			base: this.resources.items.hornBase.scene,
			collision: this.resources.items.hornCollision.scene,
			offset: new THREE.Vector3(this.otherInstructions.x + 1.25, this.otherInstructions.y - 2.75, 0.2),
			rotation: new THREE.Euler(0, 0, 0.5),
			duplicated: true,
			shadow: { sizeX: 1.65, sizeY: 0.75, offsetZ: -0.1, alpha: 0.4 },
			mass: 1.5,
			soundName: 'horn',
			sleep: false
		})
	}

	setTitles() {
		// Title
		this.objects.add({
			base: this.resources.items.introBBase.scene,
			collision: this.resources.items.introBCollision.scene,
			offset: new THREE.Vector3(0, 0, 0),
			rotation: new THREE.Euler(0, 0, 0),
			shadow: { sizeX: 1.5, sizeY: 1.5, offsetZ: -0.6, alpha: 0.4 },
			mass: 1.5,
			soundName: 'brick'
		})
		this.objects.add({
			base: this.resources.items.introRBase.scene,
			collision: this.resources.items.introRCollision.scene,
			offset: new THREE.Vector3(0, 0, 0),
			rotation: new THREE.Euler(0, 0, 0),
			shadow: { sizeX: 1.5, sizeY: 1.5, offsetZ: -0.6, alpha: 0.4 },
			mass: 1.5,
			soundName: 'brick'
		})
		this.objects.add({
			base: this.resources.items.introUBase.scene,
			collision: this.resources.items.introUCollision.scene,
			offset: new THREE.Vector3(0, 0, 0),
			rotation: new THREE.Euler(0, 0, 0),
			shadow: { sizeX: 1.5, sizeY: 1.5, offsetZ: -0.6, alpha: 0.4 },
			mass: 1.5,
			soundName: 'brick'
		})
		this.objects.add({
			base: this.resources.items.introNBase.scene,
			collision: this.resources.items.introNCollision.scene,
			offset: new THREE.Vector3(0, 0, 0),
			rotation: new THREE.Euler(0, 0, 0),
			duplicated: true,
			shadow: { sizeX: 1.5, sizeY: 1.5, offsetZ: -0.6, alpha: 0.4 },
			mass: 1.5,
			soundName: 'brick'
		})
		this.objects.add({
			base: this.resources.items.introOBase.scene,
			collision: this.resources.items.introOCollision.scene,
			offset: new THREE.Vector3(0, 0, 0),
			rotation: new THREE.Euler(0, 0, 0),
			duplicated: true,
			shadow: { sizeX: 1.5, sizeY: 1.5, offsetZ: -0.6, alpha: 0.4 },
			mass: 1.5,
			soundName: 'brick'
		})
		this.objects.add({
			base: this.resources.items.introSBase.scene,
			collision: this.resources.items.introSCollision.scene,
			offset: new THREE.Vector3(0, 0, 0),
			rotation: new THREE.Euler(0, 0, 0),
			shadow: { sizeX: 1.5, sizeY: 1.5, offsetZ: -0.6, alpha: 0.4 },
			mass: 1.5,
			soundName: 'brick'
		})
		this.objects.add({
			base: this.resources.items.introIBase.scene,
			collision: this.resources.items.introICollision.scene,
			offset: new THREE.Vector3(0, 0, 0),
			rotation: new THREE.Euler(0, 0, 0),
			shadow: { sizeX: 1.5, sizeY: 1.5, offsetZ: -0.6, alpha: 0.4 },
			mass: 1.5,
			soundName: 'brick'
		})
		this.objects.add({
			base: this.resources.items.introMBase.scene,
			collision: this.resources.items.introMCollision.scene,
			offset: new THREE.Vector3(0, 0, 0),
			rotation: new THREE.Euler(0, 0, 0),
			shadow: { sizeX: 1.5, sizeY: 1.5, offsetZ: -0.6, alpha: 0.4 },
			mass: 1.5,
			soundName: 'brick'
		})
		this.objects.add({
			base: this.resources.items.introOBase.scene,
			collision: this.resources.items.introOCollision.scene,
			offset: new THREE.Vector3(3.95, 0, 0),
			rotation: new THREE.Euler(0, 0, 0),
			duplicated: true,
			shadow: { sizeX: 1.5, sizeY: 1.5, offsetZ: -0.6, alpha: 0.4 },
			mass: 1.5,
			soundName: 'brick'
		})
		this.objects.add({
			base: this.resources.items.introNBase.scene,
			collision: this.resources.items.introNCollision.scene,
			offset: new THREE.Vector3(5.85, 0, 0),
			rotation: new THREE.Euler(0, 0, 0),
			duplicated: true,
			shadow: { sizeX: 1.5, sizeY: 1.5, offsetZ: -0.6, alpha: 0.4 },
			mass: 1.5,
			soundName: 'brick'
		})
		this.objects.add({
			base: this.resources.items.introCreativeBase.scene,
			collision: this.resources.items.introCreativeCollision.scene,
			offset: new THREE.Vector3(0, 0, 0),
			rotation: new THREE.Euler(0, 0, 0.25),
			shadow: { sizeX: 5, sizeY: 1.5, offsetZ: -0.6, alpha: 0.3 },
			mass: 1.5,
			sleep: false,
			soundName: 'brick'
		})
		this.objects.add({
			base: this.resources.items.introDevBase.scene,
			collision: this.resources.items.introDevCollision.scene,
			offset: new THREE.Vector3(0, 0, 0),
			rotation: new THREE.Euler(0, 0, 0),
			shadow: { sizeX: 2.5, sizeY: 1.5, offsetZ: -0.6, alpha: 0.3 },
			mass: 1.5,
			soundName: 'brick'
		})
	}

	setPyramid() {
		// 3D Pyramid of square blocks
		this.pyramidBlocks = []
		const blockSize = 0.8
		const blockSpacing = blockSize + 0.05
		const pyramidLayers = 4
		// Position in front of the car
		const pyramidX = this.x + 0
		const pyramidY = this.y - 10

		// Store pyramid center for explosion
		this.pyramidCenter = new THREE.Vector3(pyramidX, pyramidY, (pyramidLayers * blockSize) / 2)

		// Get white material from the materials system
		const whiteMaterial = this.objects.materials.shades.items.white

		// Create 3D pyramid - each layer is a square that gets smaller
		for (let layer = 0; layer < pyramidLayers; layer++) {
			const blocksPerSide = pyramidLayers - layer
			const layerSize = blocksPerSide * blockSpacing
			const startX = pyramidX - layerSize / 2 + blockSpacing / 2
			const startY = pyramidY - layerSize / 2 + blockSpacing / 2

			// Create a square grid of blocks for this layer
			for (let row = 0; row < blocksPerSide; row++) {
				for (let col = 0; col < blocksPerSide; col++) {
					const block = {}

					// Create mesh (square block)
					block.geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize)
					block.mesh = new THREE.Mesh(block.geometry, whiteMaterial)
					block.mesh.position.set(startX + col * blockSpacing, startY + row * blockSpacing, blockSize / 2 + layer * blockSize)
					this.container.add(block.mesh)

					// Create physics body
					const halfSize = blockSize / 2
					block.shape = new CANNON.Box(new CANNON.Vec3(halfSize, halfSize, halfSize))
					block.body = new CANNON.Body({
						mass: 1,
						material: this.objects.physics.materials.items.dummy
					})
					block.body.addShape(block.shape)
					block.body.position.copy(block.mesh.position)
					block.body.allowSleep = true
					block.body.sleepSpeedLimit = 0.01
					block.body.sleep()

					// Add to physics world
					this.objects.physics.world.addBody(block.body)

					// Add collision sound
					block.body.addEventListener('collide', (_event) => {
						const relativeVelocity = _event.contact.getImpactVelocityAlongNormal()
						if (Math.abs(relativeVelocity) > 0.5) {
							this.objects.sounds.play('woodHit', relativeVelocity)
						}
					})

					this.pyramidBlocks.push(block)
				}
			}
		}

		// Track explosion state
		this.pyramidExploded = false
		this.carStartPosition = null

		// Sync meshes with physics on each tick and check for car movement
		this.time.on('tick', () => {
			// Sync block meshes with physics
			for (const block of this.pyramidBlocks) {
				block.mesh.position.copy(block.body.position)
				block.mesh.quaternion.copy(block.body.quaternion)
			}

			// Check for car movement to trigger explosion
			if (!this.pyramidExploded) {
				const carPosition = this.objects.physics.car.chassis.body.position

				// Store initial position on first tick
				if (this.carStartPosition === null) {
					this.carStartPosition = new THREE.Vector3(carPosition.x, carPosition.y, carPosition.z)
				} else {
					// Calculate how far the car has moved
					const distance = Math.sqrt(Math.pow(carPosition.x - this.carStartPosition.x, 2) + Math.pow(carPosition.y - this.carStartPosition.y, 2))

					// Trigger explosion when car moves more than 1 unit
					if (distance > 1) {
						this.explodePyramid()
						this.pyramidExploded = true
					}
				}
			}
		})
	}

	explodePyramid() {
		const explosionStrength = 2
		const upwardBoost = 6

		for (const block of this.pyramidBlocks) {
			// Wake up the body
			block.body.wakeUp()

			// Calculate direction from pyramid center to this block
			const direction = new CANNON.Vec3(block.body.position.x - this.pyramidCenter.x, block.body.position.y - this.pyramidCenter.y, block.body.position.z - this.pyramidCenter.z)

			// Normalize and scale by explosion strength
			const length = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2)
			if (length > 0) {
				direction.x = (direction.x / length) * explosionStrength
				direction.y = (direction.y / length) * explosionStrength
				direction.z = (direction.z / length) * explosionStrength
			}

			// Add upward boost and some randomness
			direction.z += upwardBoost + Math.random() * 30
			direction.x += (Math.random() - 0.5) * 50
			direction.y += (Math.random() - 0.5) * 50

			// Apply impulse at center of mass
			block.body.applyImpulse(direction, new CANNON.Vec3(0, 0, 0))

			// Add random spin
			block.body.angularVelocity.set((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100)
		}
	}

	setTiles() {
		this.tiles.add({
			start: new THREE.Vector2(0, -4.5),
			delta: new THREE.Vector2(0, -4.5)
		})
	}

	setDikes() {
		this.dikes = {}
		this.dikes.brickOptions = {
			base: this.resources.items.brickBase.scene,
			collision: this.resources.items.brickCollision.scene,
			offset: new THREE.Vector3(0, 0, 0.1),
			rotation: new THREE.Euler(0, 0, 0),
			duplicated: true,
			shadow: { sizeX: 1.2, sizeY: 1.8, offsetZ: -0.15, alpha: 0.35 },
			mass: 0.5,
			soundName: 'brick'
		}

		// this.walls.add({
		// 	object: {
		// 		...this.dikes.brickOptions,
		// 		rotation: new THREE.Euler(0, 0, Math.PI * 0.5)
		// 	},
		// 	shape: {
		// 		type: 'brick',
		// 		equilibrateLastLine: true,
		// 		widthCount: 3,
		// 		heightCount: 2,
		// 		position: new THREE.Vector3(this.x + 0, this.y - 4, 0),
		// 		offsetWidth: new THREE.Vector3(1.05, 0, 0),
		// 		offsetHeight: new THREE.Vector3(0, 0, 0.45),
		// 		randomOffset: new THREE.Vector3(0, 0, 0),
		// 		randomRotation: new THREE.Vector3(0, 0, 0.2)
		// 	}
		// })

		this.walls.add({
			object: this.dikes.brickOptions,
			shape: {
				type: 'brick',
				equilibrateLastLine: true,
				widthCount: 5,
				heightCount: 2,
				position: new THREE.Vector3(this.x - 12, this.y - 13, 0),
				offsetWidth: new THREE.Vector3(0, 1.05, 0),
				offsetHeight: new THREE.Vector3(0, 0, 0.45),
				randomOffset: new THREE.Vector3(0, 0, 0),
				randomRotation: new THREE.Vector3(0, 0, 0.2)
			}
		})

		this.walls.add({
			object: {
				...this.dikes.brickOptions,
				rotation: new THREE.Euler(0, 0, Math.PI * 0.5)
			},
			shape: {
				type: 'brick',
				equilibrateLastLine: true,
				widthCount: 3,
				heightCount: 2,
				position: new THREE.Vector3(this.x + 8, this.y + 6, 0),
				offsetWidth: new THREE.Vector3(1.05, 0, 0),
				offsetHeight: new THREE.Vector3(0, 0, 0.45),
				randomOffset: new THREE.Vector3(0, 0, 0),
				randomRotation: new THREE.Vector3(0, 0, 0.2)
			}
		})

		this.walls.add({
			object: this.dikes.brickOptions,
			shape: {
				type: 'brick',
				equilibrateLastLine: false,
				widthCount: 3,
				heightCount: 2,
				position: new THREE.Vector3(this.x + 9.9, this.y + 4.7, 0),
				offsetWidth: new THREE.Vector3(0, -1.05, 0),
				offsetHeight: new THREE.Vector3(0, 0, 0.45),
				randomOffset: new THREE.Vector3(0, 0, 0),
				randomRotation: new THREE.Vector3(0, 0, 0.2)
			}
		})

		this.walls.add({
			object: {
				...this.dikes.brickOptions,
				rotation: new THREE.Euler(0, 0, Math.PI * 0.5)
			},
			shape: {
				type: 'brick',
				equilibrateLastLine: true,
				widthCount: 3,
				heightCount: 2,
				position: new THREE.Vector3(this.x - 14, this.y + 2, 0),
				offsetWidth: new THREE.Vector3(1.05, 0, 0),
				offsetHeight: new THREE.Vector3(0, 0, 0.45),
				randomOffset: new THREE.Vector3(0, 0, 0),
				randomRotation: new THREE.Vector3(0, 0, 0.2)
			}
		})

		this.walls.add({
			object: this.dikes.brickOptions,
			shape: {
				type: 'brick',
				equilibrateLastLine: false,
				widthCount: 3,
				heightCount: 2,
				position: new THREE.Vector3(this.x - 14.8, this.y + 0.7, 0),
				offsetWidth: new THREE.Vector3(0, -1.05, 0),
				offsetHeight: new THREE.Vector3(0, 0, 0.45),
				randomOffset: new THREE.Vector3(0, 0, 0),
				randomRotation: new THREE.Vector3(0, 0, 0.2)
			}
		})

		this.walls.add({
			object: this.dikes.brickOptions,
			shape: {
				type: 'brick',
				equilibrateLastLine: true,
				widthCount: 3,
				heightCount: 2,
				position: new THREE.Vector3(this.x - 14.8, this.y - 3.5, 0),
				offsetWidth: new THREE.Vector3(0, -1.05, 0),
				offsetHeight: new THREE.Vector3(0, 0, 0.45),
				randomOffset: new THREE.Vector3(0, 0, 0),
				randomRotation: new THREE.Vector3(0, 0, 0.2)
			}
		})

		if (!this.config.touch) {
			this.walls.add({
				object: {
					...this.dikes.brickOptions,
					rotation: new THREE.Euler(0, 0, Math.PI * 0.5)
				},
				shape: {
					type: 'brick',
					equilibrateLastLine: true,
					widthCount: 2,
					heightCount: 2,
					position: new THREE.Vector3(this.x + 18.5, this.y + 3, 0),
					offsetWidth: new THREE.Vector3(1.05, 0, 0),
					offsetHeight: new THREE.Vector3(0, 0, 0.45),
					randomOffset: new THREE.Vector3(0, 0, 0),
					randomRotation: new THREE.Vector3(0, 0, 0.2)
				}
			})

			this.walls.add({
				object: this.dikes.brickOptions,
				shape: {
					type: 'brick',
					equilibrateLastLine: false,
					widthCount: 2,
					heightCount: 2,
					position: new THREE.Vector3(this.x + 19.9, this.y + 2.2, 0),
					offsetWidth: new THREE.Vector3(0, -1.05, 0),
					offsetHeight: new THREE.Vector3(0, 0, 0.45),
					randomOffset: new THREE.Vector3(0, 0, 0),
					randomRotation: new THREE.Vector3(0, 0, 0.2)
				}
			})
		}
	}
}
