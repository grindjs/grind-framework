export class ErrorHandler {

	app = null
	processors = [ ]
	shouldntReport = [ ]

	constructor(app) {
		this.app = app

		this.shouldntReport.push(HttpError)
		this.register(HttpError, err => ({
			code: err.status || 500,
			error: err.message
		}))
	}

	register(errorClass, processor) {
		for(const entry of this.processors) {
			if(entry.errorClass !== errorClass) {
				continue
			}

			entry.processor = processor
			return
		}

		this.processors.push({ errorClass, processor })
	}

	handle(err, req, res, next) {
		if(res.headersSent) {
			return next(err)
		}

		const info = { }
		let processor = null

		for(const entry of this.processors) {
			if(!(err instanceof entry.errorClass)) {
				continue
			}

			processor = entry.processor
			break
		}

		if(!processor.isNil) {
			Object.assign(info, processor(err))
		} else {
			info.code = err.status

			if(this.app.debug) {
				info.error = err.message || info.error
			}
		}

		if(info.code.isNil) {
			info.code = 500
		}

		if(info.error.isNil) {
			info.error = 'Internal server error'
		}

		if(this.app.debug) {
			info.stack = err.stack.split(/\n+/)
		}

		const report = this.shouldReport(err) ? this.report(req, res, err, info) : Promise.resolve()
		return report.then(() => this.render(req, res, err, info))
	}

	shouldReport(err) {
		return this.shouldntReport.findIndex(errorClass => err instanceof errorClass) === -1
	}

	report(req, res, err, info) {
		Log.error('Error in request %s', req.path, err.stack, info)
		return Promise.resolve()
	}

	render(req, res, err, info) {
		this.renderJson(req, res, err, info)
	}

	renderView(req, res, err, info, view) {
		if(this.app.view.isNil) {
			Log.error('Unable to render view, `grind-view` is not loaded.')
			return this.renderJson(req, res, err, info)
		}

		res.status(info.code)
		res.render(view, { err, info })
	}

	renderJson(req, res, err, info) {
		res.status(info.code)
		res.send(info)
	}

}
