export default class DuncanBot {
	constructor(_options) {
		this.chat = _options.chat
		this.username = 'Duncan'
		this.nextMessageDelay = null

		this.messages = [
			'let\'s take this offline',
			'we need to drill down into the agentspace KPIs',
			'what\'s the lift on this?',
			'i don\'t have the bandwidth right now',
			'let\'s put a pin in that',
			'we need to get stakeholder buy-in',
			'is agentspace aligned with our Q4 OKRs?',
			'let\'s circle back EOD',
			'we need to pivot',
			'agentspace is a paradigm shift',
			'let\'s touch base later',
			'what\'s the value prop?',
			'we need to be agile here',
			'let\'s leverage our core competencies',
			'agentspace is low hanging fruit',
			'we need to move the needle',
			'let\'s ideate on this',
			'what\'s the ROI?',
			'let\'s sync up on agentspace',
			'we need to unpack this',
			'is this scalable?',
			'synergy',
			'let\'s double click on agentspace',
			'at the end of the day',
			'blue sky thinking'
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
