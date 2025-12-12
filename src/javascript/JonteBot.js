export default class JonteBot {
	constructor(_options) {
		this.chat = _options.chat
		this.username = 'Jonte'
		this.nextMessageDelay = null

		this.messages = [
			'just pushed 47 commits',
			'refactoring the entire codebase brb',
			'deleted 2000 lines of legacy code, feels good',
			'who needs sleep when you have coffee and git',
			'just rewrote the physics engine in 3 hours',
			'my PR is 89,000 files changed, no big deal',
			'force pushed to main, oops',
			'the code is the documentation',
			'refactored the refactored code',
			'npm install everything',
			'just discovered a bug from 2019, fixed it',
			'shipping features faster than QA can test them',
			'can someone review my PR? Its only 300,000 changes',
			'who wrote this code? oh wait, it was me',
			'optimized the render loop, saved 0.3ms',
			'just merged 12 branches into one',
			'the build is green, ship it',
			'added 500 new features this morning',
			'webpack config is my passion',
			'rebasing like a pro',
			'just fixed a bug by adding more bugs',
			'code review? I am the code review',
			'pushed directly to production, living dangerously',
			'rewrote the entire UI in a weekend',
			'git blame says it was me, but I disagree',
			'I just claude refactored everything, 6 7 :D'
		]

		this.start()
	}

	start() {
		this.scheduleNextMessage()
	}

	scheduleNextMessage() {
		// Interval between 12 and 20 seconds
		const delay = 12000 + Math.random() * 8000

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
