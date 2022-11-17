/* eslint-disable no-console */
import React from 'react';
import { io } from 'socket.io-client';
import parseRoute from '../lib/parse-route';

// import Redirect from './redirect';

export default class CompetitionRoom extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      roomId: '',
      opponent: null,
      client: this.props.token.username
    };
  }

  componentDidMount() {
    fetch(`/api/games/retrieve/${this.props.token.userId}`,
      { method: 'GET' })
      .then(res => res.json())
      .then(result => {
        const players = result.map(player => {
          return player.username;
        });
        let opponent = null;
        for (let i = 0; i < players.length; i++) {
          if (players[i] !== this.props.token.username) {
            opponent = players[i];
          }
        }
        const roomId = parseRoute(window.location.hash).path;
        if (this.props.token) {
          const token = window.localStorage.getItem('react-context-jwt');
          console.log('roomId dogg', roomId);
          console.log('type of', typeof roomId);
          this.socket = io('/', {
            auth: { token },
            query: { roomId }
          });
        }
        this.setState({ roomId, opponent });
      });

  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  renderPlayer2() {
    const hashroute = parseRoute(window.location.hash);
    const splitUsernames = hashroute.path.split('-');
    let opponent = null;
    for (let i = 0; i < splitUsernames.length; i++) {
      if (splitUsernames[i] !== this.props.token.username) {
        opponent = splitUsernames[i];
      }
    }
    return opponent;
  }

  render() {

    return (
      <>
        <div className="row">
          <h1 className='home-header-color'>WAR</h1>
        </div>
        <div className="row">
          <div className="column-full name-avatar-spacing">
            <img className='player-avatar-img-size' src="images/player1.png" alt="player1" />
            <p className='player-names-size'>{this.renderPlayer2()}</p>
          </div>
        </div>
        <div className="row">
          <div className="column-full">
            <div className="player-deck match-deck">
              <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-1' />
              <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-2' />
              <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-3' />
              <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-4' />
              <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-5' />
            </div>
          </div>
        </div>
        <div className="row">
          <div className="player-deck match-deck player-2-deck">
            <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-1' />
            <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-2' />
            <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-3' />
            <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-4' />
            <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-5' />
          </div>
          <div className="column-full name-avatar-spacing player-2-stretch">
            <img className='player-avatar-img-size' src="images/player2.png" alt="player1" />
            <p className='player-names-size'>You</p>
          </div>
        </div>
      </>
    );
  }
}
