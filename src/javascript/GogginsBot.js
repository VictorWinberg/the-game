export default class GogginsBot {
	constructor(_options) {
		this.chat = _options.chat
		this.username = 'David Goggins'
		this.nextMessageDelay = null

		this.messages = [
			'STAY HARD',
			'WHOS GONNA CARRY THE BOATS',
			'THEY DONT KNOW ME SON',
			'YOU DONT KNOW ME',
			'CALLOUS YOUR MIND',
			'I DONT STOP WHEN IM TIRED I STOP WHEN IM DONE',
			'TAKING SOULS',
			'ROGER THAT'
		]

		this.start()
	}

	start() {
		this.scheduleNextMessage()
	}

	scheduleNextMessage() {
		// Interval 60 seconds (60000 ms)
		const delay = 60000

		this.nextMessageDelay = setTimeout(() => {
			this.sendMessage()
			this.scheduleNextMessage()
		}, delay)
	}

	sendMessage() {
		const message = this.messages[Math.floor(Math.random() * this.messages.length)]
		this.chat.addMessage(this.username, message)
	}
}
