export default class NewsFeed {
	constructor() {
		this.$container = document.querySelector('.js-news-feed')
		this.$content = document.querySelector('.js-news-feed-content')
		this.maxHeadlines = 5
		this.headlineDuration = 15000

		this.headlines = [
			"LOCAL MAN SHOUTS KEYWORDS AT PASSERSBY TO IMPROVE RANKING",
			"ALGORITHM UPDATE WIPES OUT ENTIRE TOWN'S DIGITAL EXISTENCE",
			"NAP CONSISTENCY SAVES MARRIAGE",
			"GOOGLE MAPS CAR CHASED BY ANGRY BUSINESS OWNERS",
			"MAYOR DECLARES 'CONTENT IS KING', ABDICATES THRONE",
			"LOCAL GHOST COMPLAINS ABOUT INVISIBLE CITATIONS",
			"WOMAN MARRIES GOOGLE MY BUSINESS LISTING",
			"LOCAL SEO AUDIT REVEALS TOWN IS ACTUALLY A SIMULATION",
			"COMPETITOR SABOTAGE: MAN BUYS 1000 FAKE REVIEWS FOR ENEMY",
			"VOICE SEARCH MISTAKES 'PIZZA' FOR 'PISA', SENDS TOURISTS TO ITALY"
		]

		if (this.$container) {
			this.start()
		}
	}

	start() {
		this.addHeadline()
		setInterval(() => {
			this.addHeadline()
		}, this.headlineDuration)
	}

	getRandomHeadline() {
		return this.headlines[Math.floor(Math.random() * this.headlines.length)]
	}

	addHeadline() {
		const headline = this.getRandomHeadline()
		const $item = document.createElement('div')
		$item.classList.add('news-feed-item')
		$item.textContent = headline
		
		this.$content.insertBefore($item, this.$content.firstChild)

		if (this.$content.children.length > this.maxHeadlines) {
			this.$content.removeChild(this.$content.lastChild)
		}
	}
}
