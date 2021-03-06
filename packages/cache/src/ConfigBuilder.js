export function ConfigBuilder(store, app, returnStoreName = false) {
	if (typeof store === 'string') {
		store = app.config.get(`cache.stores.${store}`)
	}

	if (store.isNil) {
		return null
	} else {
		store = { ...store }
	}

	const driver = expandDriverAlias(store.driver || null)
	delete store.driver

	const result = {
		options: { ...expandStoreConfig(app, driver, store) },
	}

	if (result.options.flat === true) {
		Object.assign(result, result.options)
		delete result.options
		delete result.flat
	}

	if (returnStoreName) {
		result.store = driver
	} else if (driver === 'database') {
		result.store = require('./DatabaseStore')
	} else if (driver.isNil) {
		result.store = 'memory'
	} else {
		result.store = require(driver)
	}

	return result
}

export function expandDriverAlias(alias) {
	if (alias.isNil) {
		return null
	}

	switch (alias.toLowerCase()) {
		case 'db':
		case 'database':
			return 'database'
		case 'memcache':
		case 'memcached':
			return 'cache-manager-memcached-store'
		case 'redis':
			return 'cache-manager-redis'
		case 'mongo':
		case 'mongodb':
			return 'cache-manager-mongodb'
		case 'mongoose':
			return 'cache-manager-mongoose'
		case 'fs':
		case 'file':
		case 'files':
		case 'filesystem':
			return 'cache-manager-fs'
		case 'fs-binary':
			return 'cache-manager-fs-binary'
		case 'mem':
		case 'memory':
		case 'in-memory':
		case 'lru':
			return null
		default:
			return alias
	}
}

export function expandStoreConfig(app, driver, config) {
	switch (driver) {
		case 'cache-manager-redis':
			return expandRedisStoreConfig(app, driver, config)
		case 'database':
			return expandDatabaseStoreConfig(app, driver, config)
	}

	if (!config.path.isNil) {
		config.path = app.paths.base(config.path)
	}

	return config
}

function expandRedisStoreConfig(app, driver, config) {
	if (config.connection === void 0) {
		return config
	}

	let connection = config.connection
	delete config.connection

	if (connection === null) {
		connection = app.config.get('redis.default', null)
	}

	if (typeof connection === 'string') {
		connection = app.config.get(`redis.connections.${connection}`)
	}

	if (connection.isNil) {
		return config
	}

	config = { ...config, ...connection, flat: true }
	delete config.driver

	if (config.password !== void 0 && config.auth_pass === void 0) {
		config.auth_pass = config.password
		delete config.password
	}

	if (config.host === void 0) {
		config.host = 'localhost'
	}

	if (config.port === void 0) {
		config.port = 6379
	}

	return config
}

function expandDatabaseStoreConfig(app, driver, config) {
	if (config.connection === void 0) {
		return config
	}

	let connection = config.connection
	delete config.connection

	if (connection === null) {
		connection = app.db
	} else {
		if (typeof connection === 'string') {
			connection = app.config.get(`database.connections.${connection}`)
		}

		if (typeof connection === 'object') {
			const DatabaseBuilder = require('grind-db').DatabaseBuilder
			connection = DatabaseBuilder(connection, app)
		} else {
			connection = null
		}
	}

	if (connection.isNil) {
		return config
	}

	config = { ...config, connection }
	delete config.driver

	return config
}
