export default class GasTank {
	constructor() {
		this.$container = document.querySelector('.js-gas-tank')
		this.$level = document.querySelector('.js-gas-tank-level')

		if (!this.$container || !this.$level) {
			console.warn('GasTank: Elements not found')
			return
		}

		this.initBattery()
	}

	async initBattery() {
		if ('getBattery' in navigator) {
			try {
				const battery = await navigator.getBattery()
				this.updateLevel(battery.level)

				battery.addEventListener('levelchange', () => {
					this.updateLevel(battery.level)
				})

				battery.addEventListener('chargingchange', () => {
					this.updateCharging(battery.charging)
				})
                
                this.updateCharging(battery.charging)

			} catch (error) {
				console.warn('GasTank: Battery API error', error)
				this.showFullTank()
			}
		} else {
			console.warn('GasTank: Battery API not supported')
			this.showFullTank()
		}
	}

	updateLevel(level) {
		this.$level.style.transform = `scaleX(${level})`
        
        // Change color based on level
        if(level > 0.5) {
             this.$level.style.background = 'linear-gradient(90deg, #ff4d4d 0%, #ff8908 50%, #4caf50 100%)'
        } else if (level > 0.2) {
             this.$level.style.background = 'linear-gradient(90deg, #ff4d4d 0%, #ff8908 100%)'
        } else {
             this.$level.style.background = '#ff4d4d'
        }
	}

    updateCharging(charging) {
        if(charging) {
            this.$container.classList.add('is-charging')
            // Maybe add a lightning icon or animation?
        } else {
            this.$container.classList.remove('is-charging')
        }
    }

	showFullTank() {
		this.updateLevel(1)
	}
}
