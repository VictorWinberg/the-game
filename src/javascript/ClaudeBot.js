export default class ClaudeBot {
	constructor(_options) {
		this.chat = _options.chat
		this.username = 'Claude'
		this.nextMessageDelay = null

		this.messages = [
			"You're absolutely right!",
			"I completely agree.",
			"That's a great point!",
			"I couldn't have said it better myself.",
			"Spot on!",
			"I'm with you on that.",
			"That makes perfect sense.",
			"I fully support that idea.",
			"You've hit the nail on the head.",
			"I share your view entirely.",
			"That's exactly how I see it too.",
			"Well said!",
			"I'm in complete agreement.",
			"That's a very valid point.",
			"I couldn't agree more."
		]

		this.start()
	}

	start() {
		this.scheduleNextMessage()
	}

	scheduleNextMessage() {
		// Interval between 10 and 15 seconds
		const delay = 10000 + Math.random() * 5000

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
