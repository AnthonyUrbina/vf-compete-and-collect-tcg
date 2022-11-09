import React from 'react';
import AuthForm from '../components/auth-form';
import AppContext from '../lib/app-context';
import Redirect from '../components/redirect';

export default class AuthPage extends React.Component {
  render() {
    if (this.context.user) return <Redirect to="" />;

    const { path } = this.context.route;
    const altHref = path === 'sign-in' ? '#sign-up' : '#sign-in';
    const altAnchor = path === 'sign-in' ? 'Sign Up' : 'Sign in';
    const altQuestion = path === 'sign-in' ? "Don't have an account?" : 'Already have an account?';

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
            <AuthForm action={path} handleSignIn={this.context.handleSignIn} />
            <p>{altQuestion} <a href={altHref}>{altAnchor}</a></p>
          </div>
        </div>
      </>
    );
  }
}

AuthPage.contextType = AppContext;
