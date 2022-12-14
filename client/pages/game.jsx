import React from 'react';
import CompetitionRoom from '../components/competition-room';
import AppContext from '../lib/app-context';

export default class Game extends React.Component {
  render() {
    return (
      <CompetitionRoom user={this.context.user} path={this.context.route}/>
    );
  }
}

Game.contextType = AppContext;
