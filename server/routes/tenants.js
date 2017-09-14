let router = require('koa-router')()
let props = require('./props.js')
let Messages = require('./messages.js')
let docs = require('./docs.js')
let payments = require('./payments.js')
let Users = require('./users.js')
let Landlords = require('./landlords.js')
let Promise = require('bluebird')


const updateTenant = async (ctx, user, tenant_id, property_id, rent, date) => {
	let tenantRows
	if(user) {
		const values = [user.user_id, user.email]
		tenantRows = await ctx.db.query(`UPDATE tenants SET user_id = $1 WHERE tenant_email = $2 AND is_active = true RETURNING *;`, values)
	} else {
		const values = [property_id, rent, due_date, tenant_id]
		tenantRows = await ctx.db.query(`UPDATE tenants SET (property_id, rent, due_date) = ($1, $2, TO_DATE($3, 'DD/MM/YYYY')) WHERE tenant_id = $4 RETURNING *;`, values)
	}
	return tenantRows.rows[0]
}	
exports.updateTenant = updateTenant

const checkForActiveTenant = async (ctx, user, email) => {
	let tenantRows
	if(user) {
		const values = [user.email]
		tenantRows = await ctx.db.query(`SELECT * FROM tenants WHERE tenant_email = $1 AND is_active = true;`, values)
	} else {
		const values = [email]
		tenantRows = await ctx.db.query(`SELECT * FROM tenants WHERE tenant_email = $1 AND is_active = true;`, values)
	}
	return tenantRows.rows[0]
}
exports.checkForActiveTenant = checkForActiveTenant

const createNewTenant = async (ctx, user, property_id) => {
	let tenant
	let obj = ctx.request.body	
	if(ctx.request.body.email) ctx.request.body.tenant_email = ctx.request.body.email
	if(ctx.request.body.tenant_email) {
		if(user && property_id) {
			// created by landlord
			// ctx.request.body = {property_id, tenant_email, rent, due_date}
			// first check to see if user has active record
				//if he does and it has no prop_id, update that
				//if he does and it has prop_id, return error
				//if he doesn't, create
			const values = [user.user_id, obj.tenant_email, obj.rent, obj.due_date, obj.property_id]	
			tenant = await ctx.db.query(`INSERT INTO tenants (user_id, tenant_email, is_active, rent, due_date, property_id) VALUES ($1, $2, true, $3, TO_DATE($4, 'DD/MM/YYYY'), $5) RETURNING *;`, values)
		} else if (!user && property_id) {
			// Tenant has no user, so we create a tenant record for them to claim
			const values = [obj.tenant_email, obj.rent, obj.due_date, obj.property_id]	
			tenant = await ctx.db.query(`INSERT INTO tenants (tenant_email, is_active, rent, due_date, property_id) VALUES ($1, true, $2, TO_DATE($3, 'DD/MM/YYYY'), $4) RETURNING *;`, values)
		} else if (user && !property_id){
			// created by user signing up with no active tenants for email address
			const values = [user.user_id, obj.tenant_email]
			tenant = await ctx.db.query(`INSERT INTO tenants (user_id, tenant_email, is_active) VALUES ($1, $2, true) RETURNING *;`, values)
		} else {
			console.log('error, no tenant created')
		}
	}
	if(tenant) {
		return tenant.rows[0]
	} else {
		return null
	}

}
exports.createNewTenant = createNewTenant

const getLandlordTenants = async (ctx, landlord_id, condition) => {
	//condition will be: all, act, in
	let resultsRows, results
	if(condition === 'all') {
		const values = [landlord_id]
		resultsRows = await ctx.db.query(`SELECT tenants.*, users.user_name FROM tenants FULL OUTER JOIN users ON tenants.user_id = users.user_id FULL OUTER JOIN properties ON tenants.property_id = properties.property_id WHERE properties.landlord_id = $1`, values)
		results = resultsRows.rows
	} else if (condition === 'in') {
		const values = [landlord_id]
		resultsRows = await ctx.db.query(`SELECT tenants.*, users.user_name FROM tenants FULL OUTER JOIN users ON tenants.user_id = users.user_id FULL OUTER JOIN properties ON tenants.property_id = properties.property_id WHERE properties.landlord_id = $1 AND tenants.is_active = false`, values)
		results = resultsRows.rows
	} else if (condition === 'act') {
		const values = [landlord_id]
		resultsRows = await ctx.db.query(`SELECT tenants.*, users.user_name FROM tenants FULL OUTER JOIN users ON tenants.user_id = users.user_id FULL OUTER JOIN properties ON tenants.property_id = properties.property_id WHERE properties.landlord_id = $1 AND tenants.is_active = true;`, values)
		results = resultsRows.rows
	} else {
		return null
	}
	return results
}
exports.getLandlordTenants = getLandlordTenants

const retrieveActiveTenantData = async (ctx, tenant) => {
	let property, docArray, messagesArray, transactions, broadcasts, otherTenants, landlord, expenses, output
	property = await props.getProperty(ctx, tenant.property_id)
	if(property) {
		[broadcasts, otherTenants, landlord] = await Promise.all([
			Messages.getPropertyBroadcasts(ctx, property.property_id),
			props.getPropertyTenants(ctx, property.property_id, tenant.tenant_id),
			Landlords.getLandlordById(ctx, property.landlord_id)
		])
	}
	// docs will return as {tenant docs, propertyDocs}
	[docArray, messagesArray, transactions, expenses] = await Promise.all([
		docs.getUserDocs(ctx, tenant),
		Messages.getUserMessages(ctx, tenant.user_id),
		payments.getUserTransactions(ctx, tenant),
		payments.getUserExpenses(ctx, tenant.user_id)
	])
	output = { tenant: tenant, property: property, messages: messagesArray, docs: docArray, otherTenants: otherTenants, landlord: landlord, transactions: transactions, expenses: expenses }
	return output
}
exports.retrieveActiveTenantData = retrieveActiveTenantData

router
	.get('/:id', async (ctx, next) => {
		let userRows
		const values = [ctx.params.id]
		userRows = await ctx.db.query(`SELECT * FROM tenants WHERE tenant_id = $1;`, values)
		ctx.body = userRows.rows[0]
	})
	.get('/property/:property_id', async (ctx, next) => {
		// gets all tenants at a specific property
		let results = await props.getPropertyTenants(ctx, ctx.params.property_id)
		if(results) {
			ctx.response.status = 302
			ctx.body = results
		} else {
			ctx.response.status = 404
			ctx.body = `No tenants found for that property`
		}
	})
	.post('/bylandlord/create', async (ctx, next) => {
		// ctx.request.body = {property_id, tenant_email, rent, due_date}
		let obj, user, tenant
		obj = ctx.request.body
		// needs to check if tenant has a user
		console.log(obj.tenant_email)
		console.log(obj)
		user = await Users.getUserByEmail(ctx, obj.tenant_email)
		if(user) {
			// if it does, check if user has active tenant
			tenant = await checkForActiveTenant(ctx, user)
		} else {
			//has no user, but still need to check if it has an active tenant to prevent conflicts
			tenant = await checkForActiveTenant(ctx, null, obj.tenant_email)
		}
		if(tenant && tenant.property_id) {
			console.log('bylandlord - active tenant with property found')
				// if tenant is active and is on a property
				ctx.response.status = 403
				ctx.body = `This tenant is currently active in another property`				
			} else if(tenant && !tenant.property_id) {
				// if tenant is active but has no property, update
				tenant = await updateTenant(ctx, null, tenant.tenant_id, obj.property_id, obj.rent, obj.due_date)
				ctx.response.status = 202
				ctx.body = tenant
			} else {
				// if no active tenant, create tenant and return it
				tenant = await createNewTenant(ctx, user, obj.property_id)
				if(tenant){
					ctx.response.status = 201
					ctx.body = tenant
				} else {
					ctx.response.status = 400
					ctx.body = 'Error creating tenant'
				}
			}
	})
	.get('/activedata/:tenant_id', async (ctx, next) => {
		let tenant
		const values = [ctx.params.tenant_id]
		tenant = await ctx.db.query(`SELECT * FROM tenants WHERE tenant_id = $1;`, values)
		tenant = tenant.rows[0]
		ctx.body = await retrieveActiveTenantData(ctx, tenant)
	})
	.get('/landlord/all/:landlord_id/:condition', async (ctx, next) => {
		// /:condition needs to be all, in, act
		let results = await getLandlordTenants(ctx, ctx.params.landlord_id, ctx.params.condition)
		if(results) {
			ctx.response.body = 200
			ctx.body = results
		} else {
			ctx.response.body = 400
			ctx.body = 'Error retrieving landlord\'s tenants'
		}

	})

exports.routes = router

