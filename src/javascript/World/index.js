import * as THREE from 'three'
import CANNON from 'cannon'
import Materials from './Materials.js'
import Floor from './Floor.js'
import Shadows from './Shadows.js'
import Physics from './Physics.js'
import Zones from './Zones.js'
import Objects from './Objects.js'
import Car from './Car.js'
import Areas from './Areas.js'
import Tiles from './Tiles.js'
import Walls from './Walls.js'
// import IntroSection from './Sections/IntroSection.js'
// import ProjectsSection from './Sections/ProjectsSection.js'
// import CrossroadsSection from './Sections/CrossroadsSection.js'
// import InformationSection from './Sections/InformationSection.js'
// import PlaygroundSection from './Sections/PlaygroundSection.js'
import RacetrackSection from './Sections/RacetrackSection.js'
// import DistinctionASection from './Sections/DistinctionASection.js'
// import DistinctionBSection from './Sections/DistinctionBSection.js'
// import DistinctionCSection from './Sections/DistinctionCSection.js'
// import DistinctionDSection from './Sections/DistinctionDSection.js'
import Controls from './Controls.js'
import Sounds from './Sounds.js'
import gsap from 'gsap'
import EasterEggs from './EasterEggs.js'
import RemoteCar from './RemoteCar.js'
import SimulatedDrivers from './SimulatedDrivers.js'

export default class World {
	constructor(_options) {
		// Options
		this.config = _options.config
		this.config.onLap = _options.onLap
		this.debug = _options.debug
		this.resources = _options.resources
		this.time = _options.time
		this.sizes = _options.sizes
		this.camera = _options.camera
		this.scene = _options.scene
		this.renderer = _options.renderer
		this.passes = _options.passes
		this.network = _options.network
		this.chat = _options.chat || null

		// Remote players
		this.remoteCars = new Map()

		// Player data (set from game menu)
		this.playerData = {
			username: 'Player',
			color: 'orange'
		}

		// Debug
		if (this.debug) {
			this.debugFolder = this.debug.addFolder('world')
			this.debugFolder.open()
		}

		// Set up
		this.container = new THREE.Object3D()
		this.container.matrixAutoUpdate = false

		// this.setAxes()
		this.setSounds()
		this.setControls()
		this.setFloor()
		this.setAreas()
		this.setStartingScreen()
	}

	start() {
		if (this.started) return
		this.started = true

		window.setTimeout(() => {
			this.camera.pan.enable()
		}, 2000)

		this.setReveal()
		this.setMaterials()
		this.setShadows()
		this.setPhysics()
		this.setZones()
		this.setObjects()
		this.setCar()
		this.areas.car = this.car
		this.setTiles()
		this.setWalls()
		this.setSections()
		this.setEasterEggs()
		this.setSimulatedDrivers()
		this.setSnowflakes()
	}

	setReveal() {
		this.reveal = {}
		this.reveal.matcapsProgress = 0
		this.reveal.floorShadowsProgress = 0
		this.reveal.previousMatcapsProgress = null
		this.reveal.previousFloorShadowsProgress = null

		// Go method
		this.reveal.go = () => {
			gsap.fromTo(this.reveal, { matcapsProgress: 0 }, { matcapsProgress: 1, duration: 3 })
			gsap.fromTo(this.reveal, { floorShadowsProgress: 0 }, { floorShadowsProgress: 1, duration: 3, delay: 0.5 })
			gsap.fromTo(this.shadows, { alpha: 0 }, { alpha: 0.5, duration: 3, delay: 0.5 })

			if (this.sections.intro) {
				gsap.fromTo(this.sections.intro.instructions.arrows.label.material, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.5 })
				if (this.sections.intro.otherInstructions) {
					gsap.fromTo(this.sections.intro.otherInstructions.label.material, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.75 })
				}
			}

			// Car
			this.physics.car.chassis.body.sleep()
			this.physics.car.chassis.body.position.set(0, 0, 12)

			window.setTimeout(() => {
				this.physics.car.chassis.body.wakeUp()
			}, 300)

			// Sound
			gsap.fromTo(this.sounds.engine.volume, { master: 0 }, { master: 0.7, duration: 0.5, delay: 0.3, ease: 'power2.in' })
			window.setTimeout(() => {
				this.sounds.play('reveal')
			}, 400)

			// Controls
			if (this.controls.touch) {
				window.setTimeout(() => {
					this.controls.touch.reveal()
				}, 400)
			}
		}

		// Time tick
		this.time.on('tick', () => {
			// Matcap progress changed
			if (this.reveal.matcapsProgress !== this.reveal.previousMatcapsProgress) {
				// Update each material
				for (const _materialKey in this.materials.shades.items) {
					const material = this.materials.shades.items[_materialKey]
					material.uniforms.uRevealProgress.value = this.reveal.matcapsProgress
				}

				// Save
				this.reveal.previousMatcapsProgress = this.reveal.matcapsProgress
			}

			// Matcap progress changed
			if (this.reveal.floorShadowsProgress !== this.reveal.previousFloorShadowsProgress) {
				// Update each floor shadow
				for (const _mesh of this.objects.floorShadows) {
					_mesh.material.uniforms.uAlpha.value = this.reveal.floorShadowsProgress
				}

				// Save
				this.reveal.previousFloorShadowsProgress = this.reveal.floorShadowsProgress
			}
		})

		// Debug
		if (this.debug) {
			this.debugFolder.add(this.reveal, 'matcapsProgress').step(0.0001).min(0).max(1).name('matcapsProgress')
			this.debugFolder.add(this.reveal, 'floorShadowsProgress').step(0.0001).min(0).max(1).name('floorShadowsProgress')
			this.debugFolder.add(this.reveal, 'go').name('reveal')
		}
	}

	setStartingScreen() {
		this.startingScreen = {}

		// Area
		this.startingScreen.area = this.areas.add({
			position: new THREE.Vector2(0, 0),
			halfExtents: new THREE.Vector2(2.35, 1.5),
			hasKey: false,
			testCar: false,
			active: false
		})

		// Loading label
		this.startingScreen.loadingLabel = {}
		this.startingScreen.loadingLabel.geometry = new THREE.PlaneGeometry(2.5, 2.5 / 4)
		this.startingScreen.loadingLabel.image = new Image()
		this.startingScreen.loadingLabel.image.src =
			'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAABABAMAAAAHc7SNAAAAMFBMVEUAAAD///9ra2ucnJzR0dH09PQmJiaNjY24uLjp6end3d1CQkLFxcVYWFiqqqp9fX3nQ5qrAAAEVUlEQVRo3u3YT08TQRQA8JEtW6CATGnDdvljaTwYE2IBI/HGRrwSetGTsZh4MPFQYiQe229gE++WePFY9Oqh1cRzieEDYIgXLxjPJu5M33vbZQszW+fgoS+B7ewO836znRl2lg1jGMP4P2Okw0yFvaKsklr3I99Tvl3iPPelGbQhKqxB4eN6N/7gVcsvbEAz1F4RLn67zzl/v6/oLvejGBQ9LsNphio4UFjmEAsVJuOK/zkDtc6w+gyTcZ3LyP6IAzjBDA+pj6LkEgAjW4kANsMAC6vmOvqAMU5RgVOTskQACicCmCcA9AXjkT5gj1MswqlxWcoTgKJ6HuAQAD5guNoAu8QpMnBul1ONMGD2PCBbRgDAKYq6AEtmXvtdj3S6GhRyW1t1DvkAgM0ggG7mu1t3xWFHFzAqv3wYCi0mY1UCGgiQPU+1oWIY8LoXcAA3qeYfr+kClvHW14PJ5OfCAgHYNAoDAORBQIrDvHjqH5c0ANTbORzBacbAQgUC2IAKAzI9gCSHlWEMLmgBPJxMvyARpIICALDm4nkAbwIA71EZx5UOgO48JnLoOhQIAN9sOgKoBoAE5r0aB8ARcNhtFzrg0VQmwCp8CAMeAADGc44S5GMBsF1aCEU2LcAcAPDCvwFytBDehCaUgJxRAKeF8BNUUQJ43iiAUlqwFKoBrTCAHjiagwEgU0YM5IYWYD4KoIgPwIXQwUbVgCXzgLpIBJNeDciWTQNskVsq1ADX/6kYBdCTjse5owbMiX+IpgGWOCPSuWpA2vN/TAMm5QTYg5IC4FdbMA0YF5Nb5s2rAaLyhzBgektGZWDArrgqi0U1QHxf38OABDwUDgTAjGfyPlTVgJT/67FBACbqyGYaaoBctQwD2vI4DecVAPkgZRhQlxPQks2rAePGAbZsRlaa1QBYEQBUHRCAmaXD0QDYxgFWdye05R9cDQCrmQYkeBA6gGXTgNEeQF4DMG4S4MLjOUZRA5A0CcjADgmjqgGwSwSg9wK1GIBS74KTgTxv/EHoiaVQsTOS5RoCJuiZyosB8EIrHpyowFiYofO0i4wCjhCQwL0hq2sCaFNM22S4JXloLk0AuLDTBzCBAAt3xykeA7CHe/mDbgdTvQ9GswSAwdbqA0giYASHjQUJnhQKhQ6z/d8rDA4hAG2Dsk042ejubHMM2nV6AMf93pCkaRjhh0WsWuz+6aasl2FwiAImReEts1/CSaFfwFouAJxC4RW+I4oCThBQE1X2WbKkBFDkqYDtJ0SHaYKq3pJJwCECjjiFPoC1w+2P0gumurgeBjT6AhIIGKOelGIAngWlFnRnMZjMIYBb7gtIIsAuYU+8GICpEhYyZVgIZ2g9rYYAX1lfAKvjnxzjnWrHALDn9K1h2k2aoI1ewGd2AWAVAVMHcKdW4wDYje739pNufJXhkJohgLu9zy4CHCKAJYUge4ddCojGyPrp9kaHmYjUi9N7+2wYwxjGZfEXMKxGE0GkkfIAAAAASUVORK5CYII='
		this.startingScreen.loadingLabel.texture = new THREE.Texture(this.startingScreen.loadingLabel.image)
		this.startingScreen.loadingLabel.texture.magFilter = THREE.NearestFilter
		this.startingScreen.loadingLabel.texture.minFilter = THREE.LinearFilter
		this.startingScreen.loadingLabel.texture.needsUpdate = true
		this.startingScreen.loadingLabel.material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, alphaMap: this.startingScreen.loadingLabel.texture })
		this.startingScreen.loadingLabel.mesh = new THREE.Mesh(this.startingScreen.loadingLabel.geometry, this.startingScreen.loadingLabel.material)
		this.startingScreen.loadingLabel.mesh.matrixAutoUpdate = false
		this.container.add(this.startingScreen.loadingLabel.mesh)

		// Start label
		this.startingScreen.startLabel = {}
		this.startingScreen.startLabel.geometry = new THREE.PlaneGeometry(2.5, 2.5 / 4)
		this.startingScreen.startLabel.image = new Image()
		this.startingScreen.startLabel.image.src =
			'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAABABAMAAAAHc7SNAAAAMFBMVEUAAAD///+cnJxra2vR0dHd3d0mJib09PRYWFjp6em4uLhCQkKqqqqNjY19fX3FxcV3XeRgAAADsklEQVRo3u3YsU9TQRwH8KNgLSDQg9ZCAak1IdE4PKPu1NTEsSzOMDl3I3GpcXAxBhLjXFxNjJgQJ2ON0Rnj4uAAEyv8B/L7tV++5/VN+CM69Ldwfa+534d7d793VzeIQQzi/49c4v5lPF/1vvhFm++rjIpcyErrmrSCuz+cxng1iL/If8drPJD2Lc/Iy4VhaZWlFd4tLPfuMc6e/5LvRilJA2SkVSQA8c0OsI0uNtIAU9rsB8y1rAAZjyimAUa1mQDAeGwF+MA+9lIA69qs9AMKVoDP8vhf35A+NiMAc7YJKFSrX7tcI8BW9+k/O/kz6zSunjSnncMHiQYBcmdXrh3xCVbc2WO8N/YZZI0AxxwMArKivmwAwFKSPmV0UwBbCpj5E+C+yzUbQAaJVwUSA9SFjwFgHQ0jAMrBWgzAPCtHgFFbQAlpEwKC2zWUQgJGbAH+naSdu/fTxQAthPL5/ADD6OCpQwCAsb6LsbEGcBluOAYBmG2fkMIawHVWXEsDIGUGpZCAIRsAS93DPgDbhUmUQgKe2NUB90hfhK0YwEJYHkYpJGDbqBKiB86CGLAlzd6/S8CEvh8sACiBvrSXCshKblWEgNy2vkAMAHwGfjECcJHOu5qUQgDm6vXulshZAXJNL9GJAeg+LxeKPQBj1gzgdlnuCWAhbOi7LwaU9u0A2VWPpUgAC+GR5k0iwBtnB3Bj3qMaRYB17X0IOQhYcjYA7guxxyIAGfd1HNqchPfly7aACQUshAA2W1r5G1yG415YpgB3qIIkAHBH2D075QnQ10fHDsCl+CoGSKpiN8kMAVqIN00BsitnVgKyPIBMB4ADKU92AA5BKQIgszjKBGBLagpwB5xZBGS6pbcuizQAXMA6NAK86OCQ3okAI55BQPe7VoDxXzU/iwPASgS4GAASAiYxWgYAzvAa1loA2AkAFQIU2zEELCJtDDgIAG0CFLvp7LblC2kAtF6eTEJJ2CBAr88bAXKY4WkASbzXmwt5AvTvohHA4WSUBmj2Jt+IThQChrAOLQC13vPFMAOAQwuyTAeAKVQto3OBDOdESh2YxNZPbpYBQNbEAoBfod7e1i1BiwB0voSZWgwAOWgtAGPhD18E8ASIiRIAXNPwXJBtcqMbAFAIr5weIJMAcIx1aAAIqk0lAuycompyFwBMHAsAZlj/lgw0rsy2AkhbsgK4Q+70CUBjxeFXsUb0G1HJDJC9rketZRcCWCJwHM8DgJm7b7ch+XizXm25QQxiEOcXvwGCWOhbCZC0qAAAAABJRU5ErkJggg=='
		this.startingScreen.startLabel.texture = new THREE.Texture(this.startingScreen.startLabel.image)
		this.startingScreen.startLabel.texture.magFilter = THREE.NearestFilter
		this.startingScreen.startLabel.texture.minFilter = THREE.LinearFilter
		this.startingScreen.startLabel.texture.needsUpdate = true
		this.startingScreen.startLabel.material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, alphaMap: this.startingScreen.startLabel.texture })
		this.startingScreen.startLabel.material.opacity = 0
		this.startingScreen.startLabel.mesh = new THREE.Mesh(this.startingScreen.startLabel.geometry, this.startingScreen.startLabel.material)
		this.startingScreen.startLabel.mesh.matrixAutoUpdate = false
		this.container.add(this.startingScreen.startLabel.mesh)

		// Progress
		this.resources.on('progress', (_progress) => {
			// Update area
			this.startingScreen.area.floorBorder.material.uniforms.uAlpha.value = 1
			this.startingScreen.area.floorBorder.material.uniforms.uLoadProgress.value = _progress
		})

		// Ready
		this.resources.on('ready', () => {
			window.requestAnimationFrame(() => {
				this.startingScreen.area.activate()

				gsap.to(this.startingScreen.area.floorBorder.material.uniforms.uAlpha, { value: 0.3, duration: 0.3 })
				gsap.to(this.startingScreen.loadingLabel.material, { opacity: 0, duration: 0.3 })
				gsap.to(this.startingScreen.startLabel.material, { opacity: 1, duration: 0.3, delay: 0.3 })
			})
		})

		// On interact, reveal
		this.startingScreen.area.on('interact', () => {
			this.startingScreen.area.deactivate()
			gsap.to(this.startingScreen.area.floorBorder.material.uniforms.uProgress, { value: 0, duration: 0.3, delay: 0.4 })

			gsap.to(this.startingScreen.startLabel.material, { opacity: 0, duration: 0.3, delay: 0.4 })

			this.start()

			window.setTimeout(() => {
				this.reveal.go()
			}, 600)
		})
	}

	setSounds() {
		this.sounds = new Sounds({
			debug: this.debugFolder,
			time: this.time
		})
	}

	setAxes() {
		this.axis = new THREE.AxesHelper()
		this.container.add(this.axis)
	}

	setControls() {
		this.controls = new Controls({
			config: this.config,
			sizes: this.sizes,
			time: this.time,
			camera: this.camera,
			sounds: this.sounds
		})
	}

	setMaterials() {
		this.materials = new Materials({
			resources: this.resources,
			debug: this.debugFolder
		})
	}

	setFloor() {
		this.floor = new Floor({
			debug: this.debugFolder
		})

		this.container.add(this.floor.container)
	}

	setShadows() {
		this.shadows = new Shadows({
			time: this.time,
			debug: this.debugFolder,
			renderer: this.renderer,
			camera: this.camera
		})
		this.container.add(this.shadows.container)
	}

	setPhysics() {
		this.physics = new Physics({
			config: this.config,
			debug: this.debug,
			scene: this.scene,
			time: this.time,
			sizes: this.sizes,
			controls: this.controls,
			sounds: this.sounds
		})

		this.container.add(this.physics.models.container)
	}

	setZones() {
		this.zones = new Zones({
			time: this.time,
			physics: this.physics,
			debug: this.debugFolder
		})
		this.container.add(this.zones.container)
	}

	setAreas() {
		this.areas = new Areas({
			config: this.config,
			resources: this.resources,
			debug: this.debug,
			renderer: this.renderer,
			camera: this.camera,
			car: this.car,
			sounds: this.sounds,
			time: this.time
		})

		this.container.add(this.areas.container)
	}

	setTiles() {
		this.tiles = new Tiles({
			resources: this.resources,
			objects: this.objects,
			debug: this.debug
		})
	}

	setWalls() {
		this.walls = new Walls({
			resources: this.resources,
			objects: this.objects
		})
	}

	setObjects() {
		this.objects = new Objects({
			time: this.time,
			resources: this.resources,
			materials: this.materials,
			physics: this.physics,
			shadows: this.shadows,
			sounds: this.sounds,
			debug: this.debugFolder
		})
		this.container.add(this.objects.container)

		// window.requestAnimationFrame(() =>
		// {
		//     this.objects.merge.update()
		// })
	}

	setCar() {
		this.car = new Car({
			time: this.time,
			resources: this.resources,
			objects: this.objects,
			physics: this.physics,
			shadows: this.shadows,
			materials: this.materials,
			controls: this.controls,
			sounds: this.sounds,
			renderer: this.renderer,
			camera: this.camera,
			debug: this.debugFolder,
			config: this.config,
			network: this.network,
			color: this.playerData.color,
			network: this.network,
			color: this.playerData.color,
			username: this.playerData.username,
			onLap: this.config.onLap
		})
		this.container.add(this.car.container)
	}

	setPlayerData(data) {
		this.playerData = data

		// Update car if it already exists
		if (this.car) {
			if (data.username) {
				this.car.setUsername(data.username)
			}
			if (data.color) {
				this.car.color = data.color
				this.car.applyColor(data.color)
			}
		}
	}

	setSections() {
		this.sections = {}

		// Generic options
		const options = {
			config: this.config,
			time: this.time,
			resources: this.resources,
			camera: this.camera,
			passes: this.passes,
			objects: this.objects,
			areas: this.areas,
			zones: this.zones,
			walls: this.walls,
			tiles: this.tiles,
			debug: this.debugFolder
		}

		// // Distinction A
		// this.sections.distinctionA = new DistinctionASection({
		// 	...options,
		// 	x: 0,
		// 	y: -15
		// })
		// this.container.add(this.sections.distinctionA.container)

		// // Distinction B
		// this.sections.distinctionB = new DistinctionBSection({
		//     ...options,
		//     x: 0,
		//     y: - 15
		// })
		// this.container.add(this.sections.distinctionB.container)

		// // Distinction C
		// this.sections.distinctionC = new DistinctionCSection({
		//     ...options,
		//     x: 0,
		//     y: 0
		// })
		// this.container.add(this.sections.distinctionC.container)

		// // Distinction D
		// this.sections.distinctionD = new DistinctionDSection({
		//     ...options,
		//     x: 0,
		//     y: 0
		// })
		// this.container.add(this.sections.distinctionD.container)

		// Intro
		// this.sections.intro = new IntroSection({
		// 	...options,
		// 	x: 0,
		// 	y: 0
		// })
		// this.container.add(this.sections.intro.container)

		// Playground
		// this.sections.playground = new PlaygroundSection({
		// 	...options,
		// 	x: -38,
		// 	y: -34
		// 	// x: - 15,
		// 	// y: - 4
		// })
		// this.container.add(this.sections.playground.container)

		// Racetrack
		this.sections.racetrack = new RacetrackSection({
			...options,
			x: 0,
			y: 10,
			car: this.car
		})
		this.container.add(this.sections.racetrack.container)
	}

	setEasterEggs() {
		this.easterEggs = new EasterEggs({
			resources: this.resources,
			car: this.car,
			walls: this.walls,
			objects: this.objects,
			materials: this.materials,
			areas: this.areas,
			config: this.config,
			physics: this.physics
		})
		this.container.add(this.easterEggs.container)
	}

	setSimulatedDrivers() {
		this.simulatedDrivers = new SimulatedDrivers({
			time: this.time,
			resources: this.resources,
			objects: this.objects,
			physics: this.physics,
			shadows: this.shadows,
			materials: this.materials,
			config: this.config,
			chat: this.chat,
			debug: this.debugFolder
		})
		this.container.add(this.simulatedDrivers.container)
	}

	setSnowflakes() {
		// Create snowflakes container
		const snowContainer = document.createElement('div')
		snowContainer.className = 'snowflakes-container'
		snowContainer.setAttribute('aria-hidden', 'true')
		document.body.appendChild(snowContainer)

		// Create snowflakes
		const snowflakeCount = 50
		for (let i = 0; i < snowflakeCount; i++) {
			const snowflake = document.createElement('div')
			snowflake.className = 'snowflake'
			snowflake.innerHTML = '*'

			// Random properties for each snowflake
			const size = 10 + Math.random() * 20
			const left = Math.random() * 100
			const animationDuration = 5 + Math.random() * 10
			const animationDelay = Math.random() * 10
			const opacity = 0.5 + Math.random() * 0.5

			snowflake.style.cssText = `
				left: ${left}%;
				font-size: ${size}px;
				animation-duration: ${animationDuration}s;
				animation-delay: ${animationDelay}s;
				opacity: ${opacity};
			`

			snowContainer.appendChild(snowflake)
		}
	}

	setupMultiplayer() {
		if (!this.network) return

		this.network.on('player-joined', (data) => {
			this.addRemoteCar(data.id)
		})

		this.network.on('player-left', (data) => {
			this.removeRemoteCar(data.id)
		})

		this.network.on('player-state', (state) => {
			this.updateRemoteCar(state)
		})

		this.network.on('player-action', (action) => {
			this.handleRemoteAction(action)
		})

		this.time.on('tick', () => {
			if (this.car && this.physics && this.network.connected && this.network.roomCode) {
				const chassis = this.physics.car.chassis.body
				this.network.sendState({
					position: {
						x: chassis.position.x,
						y: chassis.position.y,
						z: chassis.position.z
					},
					quaternion: {
						x: chassis.quaternion.x,
						y: chassis.quaternion.y,
						z: chassis.quaternion.z,
						w: chassis.quaternion.w
					},
					velocity: {
						x: chassis.velocity.x,
						y: chassis.velocity.y,
						z: chassis.velocity.z
					},
					steering: this.physics.car.steering,
					username: this.playerData.username,
					color: this.playerData.color,
					lapCount: this.car.lapCount
				})
			}
		})
	}

	addRemoteCar(playerId) {
		if (this.remoteCars.has(playerId)) return

		const remoteCar = new RemoteCar({
			id: playerId,
			time: this.time,
			resources: this.resources,
			objects: this.objects,
			physics: this.physics,
			shadows: this.shadows,
			materials: this.materials,
			config: this.config
		})

		this.remoteCars.set(playerId, remoteCar)
		this.container.add(remoteCar.container)
		console.log(`Added remote car for player ${playerId}`)
	}

	removeRemoteCar(playerId) {
		const remoteCar = this.remoteCars.get(playerId)
		if (!remoteCar) return

		remoteCar.destroy()
		this.remoteCars.delete(playerId)
		console.log(`Removed remote car for player ${playerId}`)
	}

	updateRemoteCar(state) {
		let remoteCar = this.remoteCars.get(state.id)

		if (!remoteCar) {
			this.addRemoteCar(state.id)
			remoteCar = this.remoteCars.get(state.id)
		}

		if (remoteCar) {
			remoteCar.updateFromNetwork(state)
		}
	}

	addExistingPlayers(playerIds) {
		for (const playerId of playerIds) {
			this.addRemoteCar(playerId)
		}
	}

	handleRemoteAction(action) {
		const remoteCar = this.remoteCars.get(action.id)

		switch (action.type) {
			case 'projectile-shoot':
				this.spawnRemoteProjectile(action)
				break
			case 'backward-bowling-ball':
				this.spawnRemoteBowlingBall(action)
				break
			case 'explosion':
				this.triggerRemoteExplosion(action)
				break
			case 'klaxon':
				// Play horn sound at remote car position
				if (remoteCar) {
					this.sounds.play('horn')
				}
				break
		}
	}

	spawnRemoteProjectile(action) {
		const projectile = this.objects.add({
			base: this.resources.items.lemonBase.scene,
			collision: this.resources.items.lemonCollision.scene,
			offset: new THREE.Vector3(action.position.x, action.position.y, action.position.z),
			rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
			duplicated: true,
			shadow: { sizeX: 0.2, sizeY: 0.2, offsetZ: -0.05, alpha: 0.25 },
			mass: 1,
			soundName: 'brick',
			sleep: false
		})

		const scale = 0.4
		projectile.container.scale.set(scale, scale, scale)

		const impulseStrength = 80
		const impulse = new CANNON.Vec3(action.direction.x * impulseStrength, action.direction.y * impulseStrength, 5)
		projectile.collision.body.applyImpulse(impulse, projectile.collision.body.position)
		projectile.collision.body.angularVelocity.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20)
	}

	spawnRemoteBowlingBall(action) {
		const bowlingBall = this.objects.add({
			base: this.resources.items.bowlingBallBase.scene,
			collision: this.resources.items.bowlingBallCollision.scene,
			offset: new THREE.Vector3(action.position.x, action.position.y, action.position.z),
			rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
			duplicated: true,
			shadow: { sizeX: 1.5, sizeY: 1.5, offsetZ: -0.15, alpha: 0.35 },
			mass: 5,
			soundName: 'bowlingBall',
			sleep: false
		})

		const impulseStrength = 100
		const impulse = new CANNON.Vec3(action.direction.x * impulseStrength, action.direction.y * impulseStrength, 10)
		bowlingBall.collision.body.applyImpulse(impulse, bowlingBall.collision.body.position)
		bowlingBall.collision.body.angularVelocity.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10)
	}

	triggerRemoteExplosion(action) {
		const explosionRadius = 8
		const explosionStrength = 20
		const carPos = new CANNON.Vec3(action.position.x, action.position.y, action.position.z)

		for (const body of this.physics.world.bodies) {
			if (body.mass === 0) continue

			const distance = carPos.distanceTo(body.position)

			if (distance < explosionRadius && distance > 0) {
				body.wakeUp()

				let direction = body.position.vsub(carPos)
				direction.normalize()

				const distanceFactor = 1 - distance / explosionRadius
				const impulseStrength = explosionStrength * distanceFactor * body.mass

				const impulse = direction.scale(impulseStrength)
				impulse.z += impulseStrength * 0.5

				body.applyImpulse(impulse, body.position)
			}
		}
	}
}
