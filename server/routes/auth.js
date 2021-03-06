let auth = require('koa-router')()
let landlords = require('./landlords.js')
let props = require('./props.js')
let payments = require('./payments.js')
let tenants = require('./tenants.js')
let Users = require('./users.js')
let Multi = require('../multifactor.js')
// Signup
auth
	.post('/signup', async (ctx, next) => {
		// data stored in ctx.request.body
		let output, user, tenant;
		user = await Users.getUserByEmail(ctx)
		if(user) {
			// send error, user already exists
			ctx.response.status = 418
			ctx.body = `User already exists`
		} else {
			// create new user record here
			user = await Users.createUser(ctx)
			const isLandlord = ctx.request.body.isLandlord
			// we created a user. Now we want to make a matching landlord record OR tenant record for them.
			if(isLandlord){
				// if it's a landlord, create it
				const landlordOut = await landlords.createLandlord(ctx, user)
				// return the user that was created and the landlord that was created
				delete user.user_password
				output = {user: user, landlord: landlordOut}
			} else {
				// see if there is an active tenant, via email
				tenant = await tenants.checkForActiveTenant(ctx, user)
				if(tenant) {
					// if yes, link tenant to user and return user, tenant, and property
					tenant = await tenants.updateTenant(ctx, user, tenant)
					// retrieve the tenant data for this tenant
					output = await tenants.retrieveActiveTenantData(ctx, tenant)
					delete user.user_password
					output.user = user
				} else {
					// if not, create new tenant user not associated to a property
					tenant = await tenants.createNewTenant(ctx, user)
					delete user.user_password
					output = {user: user, tenant: tenant}
				}
			}
			ctx.body = output
		} // end User Does Not Exist
	}) //end signup

// Sign in
	.post('/signin', async (ctx, next) => {
		// insert actual user auth here
		// {email, password, multi}
		let user, tenant, landlord, properties, output, passwordCheck
		user = await Users.getUserByEmail(ctx)
		if(!user) {
			ctx.response.status = 403
			ctx.body = 'No user exists'
		} else {
			//we have user now, check multifactor
			let multiPass
			//cases:
			if(!user.use_twofactor && !user.twofactor_auth){
				//user has no secret and false use_twofactor
				//carry on
				multiPass = true
			} else if (!user.use_twofactor && user.twofactor_auth) {
				//user has secret but false use_twofactor
				//check to see if the secret they input matches
				multiPass = true
				if(await Multi.validateToken(ctx, ctx.request.body.multi, user.twofactor_auth)) {
					//if it does, modify use_twofactor on the user record
					user = await Multi.updateUserMulti(ctx, user)
				} else {
					//if it does not, add attribute to user to notify client but continue
					user.multiFail = true
				}
			} else if (user.use_twofactor && user.twofactor_auth) {
				//user has secret, true use_twofactor
				//check to make sure input twofactor matches. 
				multiPass = await Multi.validateToken(ctx, ctx.request.body.multi, user.twofactor_auth)
				//if it passes, will check password. If it does not, will fail sign-in
			}

			//now check password
			if (multiPass) passwordCheck = await Users.checkUserPass(ctx)
			if(user && user.is_landlord && passwordCheck) {
				output = await landlords.getLandlordData(ctx, user)
				delete user.user_password
				output.user = user

				ctx.session.isLoggedIn = true
				ctx.response.status = 200
				ctx.body = output
			} else if(user && passwordCheck) {
				tenant = await tenants.checkForActiveTenant(ctx, user)
				if(tenant) {
					//all gucci
					output = await tenants.retrieveActiveTenantData(ctx, tenant)
					delete user.user_password
					output.user = user
					
					ctx.session.isLoggedIn = true
					ctx.response.status = 200
					ctx.body = output
				} else { //if tenant has no active record
					//go back and look at this
					ctx.response.status = 403
					ctx.body = `No active tenant found`
				}
			} else {
				ctx.response.status = 403
				ctx.body = `WOOP WOOP WOOP -- Forbidden`
			}
		}
	}) // end sign in

	.get('/logout', async (ctx, next) => {
		ctx.session = null
		ctx.response.status = 202
		ctx.body = 'Successful signout'
	})

module.exports = {
	routes: auth,
}