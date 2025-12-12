import * as THREE from 'three'
import CANNON from 'cannon'
import AICar from './AICar.js'

export default class SimulatedDrivers {
	constructor(_options) {
		this.time = _options.time
		this.resources = _options.resources
		this.objects = _options.objects
		this.physics = _options.physics
		this.shadows = _options.shadows
		this.materials = _options.materials
		this.config = _options.config
		this.chat = _options.chat
		this.debug = _options.debug

		this.container = new THREE.Object3D()
		this.drivers = []

		this.count = 8
		this.spawnRadius = 18
		this.spawnBounds = { minX: -25, maxX: 25, minY: -25, maxY: 25 }

		if (this.debug) {
			this.debugFolder = this.debug.addFolder('simulatedDrivers')
			this.debugFolder
				.add(this, 'count')
				.step(1)
				.min(0)
				.max(20)
				.name('count')
				.onFinishChange(() => {
					this.updateDrivers()
				})
			this.debugFolder.add(this, 'spawnRadius').step(1).min(10).max(100).name('spawnRadius')
			this.debugFolder.add(this.spawnBounds, 'minX').step(1).min(-200).max(200).name('spawnMinX')
			this.debugFolder.add(this.spawnBounds, 'maxX').step(1).min(-200).max(200).name('spawnMaxX')
			this.debugFolder.add(this.spawnBounds, 'minY').step(1).min(-200).max(200).name('spawnMinY')
			this.debugFolder.add(this.spawnBounds, 'maxY').step(1).min(-200).max(200).name('spawnMaxY')
		}

		this.create()
	}

	create() {
		const usernames = this.chat ? this.chat.usernames : []
		const availableUsernames = [...usernames]

		for (let i = 0; i < this.count; i++) {
			const spawnX = this.spawnBounds.minX + Math.random() * (this.spawnBounds.maxX - this.spawnBounds.minX)
			const spawnY = this.spawnBounds.minY + Math.random() * (this.spawnBounds.maxY - this.spawnBounds.minY)
			const spawnPosition = new CANNON.Vec3(spawnX, spawnY, 12)

			const usernameIndex = Math.floor(Math.random() * availableUsernames.length)
			const username = availableUsernames[usernameIndex] || `Driver${i + 1}`
			if (availableUsernames.length > 0) {
				availableUsernames.splice(usernameIndex, 1)
			}

			const driver = new AICar({
				time: this.time,
				resources: this.resources,
				objects: this.objects,
				physics: this.physics,
				shadows: this.shadows,
				materials: this.materials,
				config: this.config,
				spawnPosition: spawnPosition,
				radius: this.spawnRadius,
				username: username
			})

			this.drivers.push(driver)
			this.container.add(driver.container)
		}
	}

	updateDrivers() {
		while (this.drivers.length > this.count) {
			const driver = this.drivers.pop()
			this.container.remove(driver.container)
		}

		while (this.drivers.length < this.count) {
			const usernames = this.chat ? this.chat.usernames : []
			const spawnX = this.spawnBounds.minX + Math.random() * (this.spawnBounds.maxX - this.spawnBounds.minX)
			const spawnY = this.spawnBounds.minY + Math.random() * (this.spawnBounds.maxY - this.spawnBounds.minY)
			const spawnPosition = new CANNON.Vec3(spawnX, spawnY, 12)

			const username = usernames[Math.floor(Math.random() * usernames.length)] || `Driver${this.drivers.length + 1}`

			const driver = new AICar({
				time: this.time,
				resources: this.resources,
				objects: this.objects,
				physics: this.physics,
				shadows: this.shadows,
				materials: this.materials,
				config: this.config,
				spawnPosition: spawnPosition,
				radius: this.spawnRadius,
				username: username
			})

			this.drivers.push(driver)
			this.container.add(driver.container)
		}
	}
}
