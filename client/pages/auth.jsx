import React from 'react';
import AuthForm from '../components/auth-form';
import AppContext from '../lib/app-context';
import Redirect from '../components/redirect';

export default class AuthPage extends React.Component {
  render() {
    // console.log('contexxxx', this.context);
    if (this.context.user) return <Redirect to="" />;

    const { route } = this.context;
    const altHref = route.path === 'sign-in' ? '#sign-up' : '#sign-in';
    const altAnchor = route.path === 'sign-in' ? 'Sign Up' : 'Sign in';
    const altQuestion = route.path === 'sign-in' ? "Don't have an account?" : 'Already have an account?';
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
            <AuthForm action={route.path} handleSignIn={this.context.handleSignIn} />
            <p>{altQuestion} <a href={altHref}>{altAnchor}</a></p>
          </div>
        </div>
      </>
    );
  }
}

AuthPage.contextType = AppContext;
