import React from 'react';
import HelloWorld from '../components/hello-world';
import Redirect from '../components/redirect';
import AppContext from '../lib/app-context';

export default class Home extends React.Component {
  render() {
    if (!this.context.user) return <Redirect to="sign-in" />;

    return (
      <HelloWorld token={this.context.user} />
    );
  }
}

Home.contextType = AppContext;
