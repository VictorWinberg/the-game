export default class Christmas {
	constructor() {
		this.createSnowflakes()
		this.createLights()
		this.createSleigh()
		this.createFrost()
	}

	createSnowflakes() {
		const container = document.createElement('div')
		container.classList.add('snowflakes-container')
		document.body.appendChild(container)

		const snowflakeCount = 50
		const chars = ['❄', '❅', '❆']

		for (let i = 0; i < snowflakeCount; i++) {
			const snowflake = document.createElement('div')
			snowflake.classList.add('snowflake')
			snowflake.textContent = chars[Math.floor(Math.random() * chars.length)]

			// Random positioning and animation properties
			snowflake.style.left = `${Math.random() * 100}%`
			snowflake.style.animationDuration = `${5 + Math.random() * 10}s`
			snowflake.style.animationDelay = `${Math.random() * 5}s`
			snowflake.style.opacity = `${0.3 + Math.random() * 0.7}`
			snowflake.style.fontSize = `${10 + Math.random() * 20}px`

			container.appendChild(snowflake)
		}
	}

	createLights() {
		const container = document.createElement('div')
		container.classList.add('christmas-lights')
		document.body.appendChild(container)

		// Calculate how many lights fit
		const lightCount = Math.floor(window.innerWidth / 30)

		for (let i = 0; i < lightCount; i++) {
			const bulb = document.createElement('div')
			bulb.classList.add('light-bulb')
			container.appendChild(bulb)
		}
	}

	createSleigh() {
		const sleigh = document.createElement('div')
		sleigh.classList.add('santa-sleigh')
		sleigh.textContent = '🦌🦌🦌🛷🎅'
		document.body.appendChild(sleigh)
	}

	createFrost() {
		const frost = document.createElement('div')
		frost.classList.add('frost-vignette')
		document.body.appendChild(frost)
	}
}
