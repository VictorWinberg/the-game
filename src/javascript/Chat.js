export default class Chat {
	constructor(_options) {
		this.time = _options.time
		this.world = _options.world

		this.$container = document.querySelector('.js-chat')
		this.$messages = document.querySelector('.js-chat-messages')
		this.$input = document.querySelector('.js-chat-input')
		this.$send = document.querySelector('.js-chat-send')
		this.maxMessages = 20
		this.messageCount = 0
		this.nextMessageDelay = null
		this.userUsername = 'You'

		this.network = _options.network

		this.setInput()

		if (this.network) {
			this.network.on('chat-message', (data) => {
				this.addMessage(data.username, data.message)
			})
		}

		this.usernames = [
			'xX_SkaterBoi_Xx',
			'noCap_420',
			'toxic_gamer99',
			'pogchamp_king',
			'sus_amogus',
			'rizz_master',
			'based_alpha',
			'cringe_lord',
			'sigma_grindset',
			'cap_detector',
			'fr_fr_on_god',
			'mid_driver',
			'L_bozo',
			'ratio_plus',
			'yikes_moment',
			'bruh_moment',
			'no_touch_grass',
			'cope_seethe',
			'drip_or_drown',
			'vibe_check_fail'
		]

		this.messages = [
			'bro who taught u how to drive 💀',
			'this driving is giving me secondhand embarrassment',
			'my grandma drives better than this',
			'are u even trying???',
			'this is so cringe fr',
			'L driving skills',
			'who let bro cook',
			'this is actually painful to watch',
			'can u like... not crash into everything?',
			'ur making me lose brain cells',
			'this game is so mid',
			'why is everyone so bad at this',
			'ur driving like u have 2 left hands',
			'this is giving me anxiety',
			'can we get some actual good players pls',
			'ur literally going backwards',
			'who gave u a license',
			'this is so embarrassing',
			'ur making me want to log off',
			'can u stop crashing into me',
			'ur driving is giving me depression',
			'this is why i hate multiplayer',
			'ur literally the worst driver here',
			'can u like learn how to drive first',
			'this is so bad its funny',
			'ur making everyone look bad',
			'who let u play this game',
			'this is actual torture',
			'ur driving skills are negative',
			'can u please just stop',
			'ur making me lose faith in humanity',
			'this is so mid its unreal',
			'ur literally going in circles',
			'who taught u to drive like this',
			'this is giving me secondhand cringe',
			'ur driving is a war crime',
			'can u like get good',
			'this is so bad i want to cry',
			'ur making me want to uninstall',
			'who let u behind the wheel',
			'this is actual pain',
			'ur driving skills are non-existent',
			'can u stop being so bad',
			'this is so cringe its unreal',
			'ur literally the worst',
			'who gave u permission to drive',
			'this is giving me ptsd',
			'ur making me lose my mind'
		]

		this.start()
	}

	setInput() {
		if (!this.$input || !this.$send) return

		const sendMessage = () => {
			const text = this.$input.value.trim()
			if (text) {
				this.addUserMessage(text)
				
				if (this.network && this.network.connected && this.network.roomCode) {
					this.network.sendChat({
						username: this.userUsername,
						message: text
					})
				}

				this.$input.value = ''
			}
		}

		this.$send.addEventListener('click', sendMessage)
		this.$input.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				sendMessage()
			}
		})
	}

	start() {
		this.scheduleNextMessage()
	}

	scheduleNextMessage() {
		const delay = 8000 + Math.random() * 7000

		this.nextMessageDelay = setTimeout(() => {
			this.addMessage()
			this.scheduleNextMessage()
		}, delay)
	}

	getRandomUsername() {
		return this.usernames[Math.floor(Math.random() * this.usernames.length)]
	}

	getRandomMessage() {
		return this.messages[Math.floor(Math.random() * this.messages.length)]
	}

	getTimestamp() {
		const now = new Date()
		const hours = now.getHours().toString().padStart(2, '0')
		const minutes = now.getMinutes().toString().padStart(2, '0')
		return `${hours}:${minutes}`
	}

	addMessage(_username = null, _message = null) {
		const username = _username || this.getRandomUsername()
		const message = _message || this.getRandomMessage()
		const timestamp = this.getTimestamp()

		const $message = document.createElement('div')
		$message.className = 'chat-message'

		$message.innerHTML = `
			<div class="chat-message-header">
				<span class="chat-message-username">${username}</span>
				<span class="chat-message-timestamp">${timestamp}</span>
			</div>
			<div class="chat-message-text">${message}</div>
		`

		this.$messages.appendChild($message)
		this.messageCount++

		if (this.messageCount > this.maxMessages) {
			const $oldestMessage = this.$messages.firstElementChild
			if ($oldestMessage) {
				this.$messages.removeChild($oldestMessage)
				this.messageCount--
			}
		}

		this.scrollToBottom()
	}

	addUserMessage(_text) {
		this.addMessage(this.userUsername, _text)
	}

	setUsername(_username) {
		this.userUsername = _username
	}

	scrollToBottom() {
		this.$messages.scrollTop = this.$messages.scrollHeight
	}
}

