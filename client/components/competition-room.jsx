import React from 'react';
import { io } from 'socket.io-client';
import parseRoute from '../lib/parse-route';

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
        const roomId = parseRoute(window.location.hash).path;
        if (this.props.token) {
          const token = window.localStorage.getItem('react-context-jwt');
          this.socket = io('/', {
            auth: { token },
            query: { roomId }
          });
        }
        this.setState({ roomId });
      });

  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  renderPlayer2() {
    const { username } = this.props.token;
    const hashroute = parseRoute(window.location.hash).path;
    const splitUsernames = hashroute.split('-');
    let opponent = null;
    for (let i = 0; i < splitUsernames.length; i++) {
      if (splitUsernames[i] !== username) {
        opponent = splitUsernames[i];
      }
    }
    this.setState({ opponent });
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
