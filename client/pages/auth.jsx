import React from 'react';
import AuthForm from '../components/auth-form';
import AppContext from '../lib/app-context';
import Redirect from '../components/redirect';

export default class AuthPage extends React.Component {
  render() {
    if (this.context.user) return <Redirect to="" />;

    const { path } = this.context.route;
    return (
      <>
        <div className="row center">
          <div className='header-spacing auth'>
            <h1>
              Compete &amp; Collect</h1>
          </div>
        </div>
        <div className="row center-column">
          <div>
            <img src="images/vf-logo.png" alt="ace" />
          </div>
          <div className="form-spacing">
            <AuthForm action={path} handleSignIn={this.context.handleSignIn} />
          </div>
        </div>
      </>
    );
  }
}

AuthPage.contextType = AppContext;
