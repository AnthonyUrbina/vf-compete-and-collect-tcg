import React from 'react';
import Lobby from '../components/lobby';
import Redirect from '../components/redirect';
import AppContext from '../lib/app-context';

export default class Home extends React.Component {
  render() {
    if (!this.context.user) return <Redirect to="sign-in" />;

    return (
      <Lobby token={this.context.user} />
    );
  }
}

Home.contextType = AppContext;
