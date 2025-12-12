export default class DuncanBot {
	constructor(_options) {
		this.chat = _options.chat
		this.username = 'Duncan'
		this.nextMessageDelay = null

		this.messages = [
			'we need to leverage agentspace for this',
			'local SEO is the future, trust me',
			'is this scalable though?',
			'let\'s circle back to the agentspace integration',
			'just pushed a new feature to agentspace',
			'optimizing for local search is key',
			'agentspace is going to revolutionize the industry',
			'we need more synergy with the agentspace team',
			'have you checked the agentspace metrics lately?',
			'local SEO + agentspace = 🚀',
			'thinking about the user journey in agentspace',
			'we need to iterate on the agentspace UI',
			'agentspace is the north star',
			'how does this impact our local SEO strategy?',
			'agentspace performance is looking good',
			'we need to deep dive into the agentspace analytics',
			'agentspace is live!',
			'remember to focus on local SEO',
			'agentspace is the way forward',
			'let\'s sync up on agentspace later'
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
