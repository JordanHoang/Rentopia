import React from 'react'
import { statesList, months, days, years } from './formHelperData'
import { submerchantCreation } from '../../actions/paymentGetters'

import { Accordion, Panel } from 'react-bootstrap'
import { Link, Redirect } from 'react-router-dom'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux';

import PaymentSetupSuccess from './actionSuccess.jsx'
import venmo from '../../images/venmo_logo.png'
import bank from '../../images/bank-icon.png'
import checkMark from '../../images/checkMark.png'

class PaymentSetup extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      bankIsSelected: true,
      user: {},
      mobile: false
    }
  }

  componentDidMount() {
    var w = window,
    d = document,
    e = d.documentElement,
    g = d.getElementsByTagName('body')[0],
    x = w.innerWidth || e.clientWidth || g.clientWidth,
    y = w.innerHeight|| e.clientHeight|| g.clientHeight;
    var mobile = false
    if (x < 481) {
      mobile = true
    }
    this.setState({mobile: mobile})
  }

  handleSubmit(e) {
    e.preventDefault()
    let monthNum = months.indexOf(e.target.month.value) + 1

    let destination, accountNum, routingNum, phoneNum, venmoEmail

    if (this.state.bankIsSelected) {
      destination = 'bank'
      accountNum = e.target.accountNum.value
      routingNum = e.target.routingNum.value
      phoneNum = '',
      venmoEmail = ''
    }

    if (!this.state.bankIsSelected) {
      if (e.target.venmoEmail.value !== '') {
        destination = 'email'
      } else {  
        destination = 'mobile_phone'
      }
      accountNum = ''
      routingNum = ''
      phoneNum = e.target.phoneNum.value,
      venmoEmail = e.target.venmoEmail.value
    }

    let params = {
      individual: {
        firstName: e.target.name.value.split(' ')[0],
        lastName: e.target.name.value.split(' ')[1],
        email: e.target.email.value,
        dateOfBirth: `${e.target.year.value}-${monthNum}-${e.target.day.value}`,
        address: {
          streetAddress: e.target.street.value,
          locality: e.target.city.value,
          region: e.target.state.value,
          postalCode: e.target.zip.value
        }
      },
      funding: {
        destination: destination, // can be either bank, mobile_phone, or email
        email: venmoEmail, // for venmo
        mobilePhone: phoneNum, // for venmo
        accountNumber: accountNum, //for bank
        routingNumber: routingNum // for bank
      },
      tosAccepted: true, // need to do a terms of service thing
      masterMerchantAccountId: "" // inside of braintree.config.js
    }
    this.props.submerchantCreation(params, this.props.user.user_id)
  }

  handleOptionChange(e) {

    this.setState({
      bankIsSelected: (e.target.value === 'bank')
    })
  }

  renderStates() {
    return statesList.map((usState, i) => {
      return (
        <option key={i}> {usState} </option>
      )
    })
  }

  renderMonths() {
    return months.map((month, i) => {
      return (
        <option key={i}> {month} </option>
      )
    })
  }

  renderDays() {
    return days.map((day, i) => {
      return (
        <option key={i}> {day} </option>
      )
    })
  }

  renderYears() {
    return years.map((year, i) => {
      return (
        <option key={i}> {year} </option>
      )
    })
  }

  renderBankForm() {
    return (
      <div>
        <label>Account Number</label><br/><input type="text" className="paymentInput" name="accountNum"></input>
        <label>Routing Number</label><br/><input type="text" className="paymentInput" name="routingNum"></input>
      </div>
    )
  }

  renderVenmoForm() {
    return (
      <div>
        <label>Email</label><br/><input type="text" className="paymentInput" name="venmoEmail"></input>
        <label>Phone Number</label><br/><input type="text" className="paymentInput" name="phoneNum"></input>
        <h6>* Must have a valid Venmo account</h6>
        <h6>* Please use either the email or phone number associated with your Venmo account</h6>
      </div>
    )
  }

  renderErrors(errors) {
    // errors is an array of error messages
    return errors.map((error, i) => {
      return (
        <h5 className="setupErrors">*{error} </h5>
      )
    })
  }

  render() {
    return (
      this.state.mobile && this.props.user.payment_set_up ?
      <div>
        <div className="actionSuccessUpper">
          <img src={checkMark}/>
        </div>
        <div className="actionSuccessLower">
          <h4>Great!</h4>
          <h6>You successfully set up your payment information.</h6>
          <Link to='/'>Return to dashboard</Link>
        </div>
      </div>
      :
      <div className="paymentSetup">
        <h2 className="methodTitle">Set up my payment method</h2>
          {this.props.failure.failure && this.renderErrors(this.props.failure.errors)}
          <form className="paymentSetupForm" onSubmit={this.handleSubmit.bind(this)}>
           <div className="accordion-group">
             <div className="accordion-heading">
               <div className="accordion-toggle paymentSetupAccordionHeader" data-toggle="collapse" href="#1">
                 1. Personal Information
               </div>
                <div id="1" className="accordion-body collapse">
                  <div className="accordion-inner">
                    <label>Full Name</label><br/><input type="text" name="name" className="paymentInput" defaultValue={this.props.user.user_name}></input><br/>
                    <label>E-mail address</label><br/><input type="text" name="email" className="paymentInput" defaultValue={this.props.user.email}></input><br/>
                    <label>Birthday</label><br/>
                    <select name="month">
                      {this.renderMonths()}
                    </select>
                    <select name="day">
                      {this.renderDays()}
                    </select>
                    <select name="year">
                      {this.renderYears()}
                    </select>
                  </div>
                </div>
                <div className="accordion-toggle paymentSetupAccordionHeader" data-toggle="collapse" href="#2">
                  2. Address
                </div>
                <div id="2" className="accordion-body collapse">
                  <div className="accordion-inner">
                    <label>Street Address</label><br/><input type="text" name="street" className="paymentInput"></input><br/>
                    <label>City</label><br/><input type="text" name="city" className="paymentInput"></input><br/>
                    <label>State</label><br/>
                    <select name="state" className="statesSelect">
                      {this.renderStates()}
                    </select>
                    <br/>
                    <label>Zip Code</label><br/><input name="zip" type="text" className="paymentInput"></input><br/>
                  </div>
                </div>
                <div className="accordion-toggle paymentSetupAccordionHeader" data-toggle="collapse" href="#3">
                  3. Funding Information
                </div>
                <div id="3" className="accordion-body collapse fundingPanel">
                  <div className="accordion-inner">
                    <h5>Select your desired payment method</h5>
                    <div className="paymentOption">
                      <label>
                        <img src={bank} /><br/>
                        <input className="paymentOption"
                          type="radio" 
                          value="bank" 
                          checked={this.state.bankIsSelected} 
                          onChange={this.handleOptionChange.bind(this)}>
                        </input>
                      </label>
                    </div>
                    <div className="paymentOption">
                      <label>
                        <img className="venmo" src={venmo} /><br/>
                        <input className="paymentOption"
                          type="radio" 
                          value="venmo" 
                          checked={!this.state.bankIsSelected}
                          onChange={this.handleOptionChange.bind(this)}>
                        </input>
                      </label>
                    </div>
                    <div>{this.state.bankIsSelected && this.renderBankForm()}</div>
                    <div>{!this.state.bankIsSelected && this.renderVenmoForm()}</div>
                  </div>
                </div>
              </div>
            </div>
            <br/>
            <div className="paymentSetupSubmit">
              <span>By clicking submit, you agree to our <Link target="_blank" to='/termsofservice' className="link">Terms of Service </Link></span>
              <button type="submit"> Submit</button>
            </div>
          </form>
          {this.props.user.payment_set_up && <PaymentSetupSuccess message={'You successfully set up your payment information.'} redirectLink={'/'} />}
      </div>
      
    )
  }
}

function mapStateToProps(state) {
  return {
    user: state.user,
    failure: state.submerchantCreationFailure
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({submerchantCreation}, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(PaymentSetup)
