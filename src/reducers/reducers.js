import { SET_PROFILE } from '../actions/setEditedProfileInfo'
import { DIRECT_MESSAGES } from '../actions/messageGetters'
import { USER_LOGIN, LOGIN_FAILURE} from '../actions/authGetters'
import { FETCH_RENT, FETCH_MESSAGES, FETCH_DOCS, FETCH_SELECTED_MEDIA } 
	from '../actions/tenantDashboardGetters.js';
import { SUBMERCHANT_CREATION } from '../actions/paymentGetters'
import { SET_MULTI, REMOVE_MULTI } from '../actions/twoFactorSet.js';
import { REHYDRATE } from 'redux-persist/constants'

export function userData(state = {}, action) {
  switch(action.type) {
    case USER_LOGIN: 
      return action.payload.data.user
    case SET_PROFILE:
    	return action.payload.data.user
    case SET_MULTI:
      return action.payload.data
    case REMOVE_MULTI:
      return action.payload.data  
    case SUBMERCHANT_CREATION:
      return action.payload.data
    default:
      return state;
  }
}

export function isLoggedIn(state = false, action) {
  switch(action.type) {
    case USER_LOGIN:
      return true
    default:
      return state;
  }
}

export function tenantData(state = [], action) {
  switch(action.type) {
    case USER_LOGIN: 
      if (action.payload.data.tenant) {
        return action.payload.data.tenant
      } else {
        return state
      }

    default:
      return state;
  }
}

export function otherTenants(state = [], action) {
  switch(action.type) {
    case USER_LOGIN: 
      if (action.payload.data.otherTenants) {
        return action.payload.data.otherTenants
      } else {
        return state
      }
    default:
      return state;
  }
}

export function tenantsLandlord(state = {}, action) {
  switch(action.type) {
    case USER_LOGIN: 
      if (action.payload.data.landlord) {
        return action.payload.data.landlord
      } else {
        return state
      }

    default:
      return state;
  }
}

export function landlordData(state = [], action) {
  switch(action.type) {
    case USER_LOGIN: 
      if (action.payload.data.landlord) {
        return action.payload.data.landlord
      } else {
        return state
      }
    default:
      return state;
  }
}

export function messages(state = [], action) {
  switch(action.type) {
    case USER_LOGIN: 
      return action.payload.data.messages

    case FETCH_MESSAGES: 
      return action.payload.messages

    case DIRECT_MESSAGES: 
      var newArray = [...state, action.payload.data]
      return newArray
    default:
      return state;
  }
}

export function docs(state = [], action) {
  switch(action.type) {
    case USER_LOGIN: 
      if (action.payload.data.docs) {
        return action.payload.data.docs
      } else {
        return state
      }
    case FETCH_DOCS: 
      return action.payload.data.docs

    default:
      return state;
  }
}

export function loginFailure(state = false, action) {
  switch(action.type) {
    case LOGIN_FAILURE:
      return true
    case REHYDRATE:
      return false
    default:
      return state
  }
}
