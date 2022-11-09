import React from 'react';
import AuthForm from '../components/auth-form';

export default class AuthPage extends React.Component {
  render() {
    return (
      <>
        <div className='row'>
          <div className='column-full header-spacing'>
            <h1>WAR</h1>
          </div>
        </div>
        <div className="row center-horizontal">
          <div className="column-full">
            <img src="images/ace.png" alt="ace" />
          </div>
          <div className="column-full form-spacing">
            <AuthForm />
            <p>Already have an account? <a href="#sign-in">Sign in</a></p>
          </div>
        </div>
      </>
    );
  }
}
