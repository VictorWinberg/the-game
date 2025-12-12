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
			"WOMAN MARRIES GOOGLE MY BUSINESS LISTING",
			"LOCAL SEO AUDIT REVEALS TOWN IS ACTUALLY A SIMULATION",
			"COMPETITOR SABOTAGE: MAN BUYS 1000 FAKE REVIEWS FOR ENEMY",
			"VOICE SEARCH MISTAKES 'PIZZA' FOR 'PISA', SENDS TOURISTS TO ITALY"
		]

		if (this.$container) {
			this.availableHeadlines = [...this.headlines]
			this.start()
		}
	}

	start() {
		this.addHeadline()
		setInterval(() => {
			this.addHeadline()
		}, this.headlineDuration)
	}

	getUniqueHeadline() {
		if (this.availableHeadlines.length === 0) {
			this.availableHeadlines = [...this.headlines]
		}
		
		const randomIndex = Math.floor(Math.random() * this.availableHeadlines.length)
		const headline = this.availableHeadlines[randomIndex]
		
		// Remove the selected headline from available list
		this.availableHeadlines.splice(randomIndex, 1)
		
		return headline
	}

	addHeadline() {
		const headline = this.getUniqueHeadline()
		const $item = document.createElement('div')
		$item.classList.add('news-feed-item')
		$item.textContent = headline
		
		this.$content.insertBefore($item, this.$content.firstChild)

		if (this.$content.children.length > this.maxHeadlines) {
			this.$content.removeChild(this.$content.lastChild)
		}
	}
}
