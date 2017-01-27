import MarkdownIt from 'markdown-it'

import fs from 'fs-promise'
import expandTabs from 'markdown-it-expand-tabs'
import githubTaskList from 'markdown-it-task-lists'
import anchor from 'markdown-it-anchor'

import 'App/Support/Highlighter'

const Markdown = new MarkdownIt({
	html: true,
	linkify: true,
	typographer: true,
	highlight: (code, lang) => Highlighter(code, lang)
})

Markdown.use(expandTabs)
Markdown.use(githubTaskList)
Markdown.use(anchor, {
	permalink: true
})

Markdown.render = function(content) {
	let result = MarkdownIt.prototype.render.call(this, content)
	result = result.replace(/<blockquote>\s*<p>\s*\{([a-z]+)\}\s*/g, '<blockquote class="blockquote-$1"><p>')

	result = result.replace(
		/<(h[1-6]) id="([^"]+)">(.+?)\s*<a class="header-anchor" href="(#.+?)" aria-hidden="true">¶<\/a><\/(h[1-6])>/g,
		'<$1 id="$2"><a href="$4" class="header-anchor" aria-hidden="true">$3</a></$1>'
	)

	return result
}

Markdown.renderFile = (app, path) => {
	const render = () => fs.readFile(path).then(content => Markdown.render(content.toString()))

	if(app.debug) {
		return render()
	}

	return fs.stat(path).then(stats => app.cache.wrap(`${path}-${stats.mtime.getTime()}`, render))
}

export { Markdown }
