export class Command {
	app = null
	cli = null

	name = null
	description = null
	arguments = [ ]
	options = { }

	compiledValues = {
		arguments: { },
		options: { }
	}

	constructor(app, cli) {
		this.app = app
		this.cli = cli
	}

	argument(name, fallback = null) {
		return this.compiledValues.arguments[name] || fallback
	}

	containsArgument(name) {
		const value = this.compiledValues.arguments[name]
		return !value.isNil
	}

	option(name, fallback = null) {
		return this.compiledValues.options[name] || fallback
	}

	containsOption(name) {
		const value = this.compiledValues.options[name]
		return !value.isNil
	}

	ready() {
		return Promise.resolve()
	}

	run() {
		return Promise.resolve()
	}

	build(cli) {
		const command = cli.command(this.name)
		command.description(this.description)

		var usage = [ ]
		const options = Object.entries(this.options)

		if(options.length > 0) {
			usage.push('[options]')

			for(const option of options) {
				command.option('--' + option[0], option[1])
			}
		}

		var hadOptional = false
		for(const argument of this.arguments) {
			const isOptional = argument.endsWith('?')

			if(!hadOptional && isOptional) {
				hadOptional = true
			} else if(hadOptional && !isOptional) {
				this.error(
					'Invalid arguments for %s: %s',
					this.name,
					'An optional argument can not be followed by a non-optional argument'
				)

				process.exit(1)
			}

			usage.push('<' + argument + '>')
		}

		command.usage(usage)
		command.action((...args) => this._execute(...args))

		return command
	}

	_execute(...args) {
		const cli = args.pop()

		var requiredArguments = [ ]

		for(const argument of this.arguments) {
			if(argument.endsWith('?')) {
				break
			}

			requiredArguments.push(argument)
		}

		if(args.length < requiredArguments.length) {
			this.error(
				'Not enough arguments, missing: %s',
				requiredArguments.slice(args.length).join(', ')
			)

			process.exit(1)
		}

		for(const i in args) {
			var name = this.arguments[i]

			if(name.endsWith('?')) {
				name = name.substring(0, name.length - 1)
			}

			this.compiledValues.arguments[name] = args[i]
		}

		for(const option of Object.keys(this.options)) {
			this.compiledValues.options[option] = cli[option]
		}

		process.title = 'node ' + this.name

		this.ready()
		.then(() => this.run())
		.then(() => process.exit(0))
		.catch(err => {
			this.error(err.message, err.stack)
			process.exit(1)
		})
	}

	info(...message) {
		return this.cli.output.info(...message)
	}

	comment(...message) {
		return this.cli.output.comment(...message)
	}

	warn(...message) {
		return this.cli.output.warn(...message)
	}

	error(...message) {
		return this.cli.output.error(...message)
	}

	success(...message) {
		return this.cli.output.success(...message)
	}

}
