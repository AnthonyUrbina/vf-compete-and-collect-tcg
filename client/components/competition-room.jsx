import React from 'react';
import { io } from 'socket.io-client';
import parseRoute from '../lib/parse-route';

export default class CompetitionRoom extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      roomId: '',
      opponent: null,
      client: this.props.token.username,
      [this.props.token.username + 'Deck']: null,
      gameId: null,
      players: null
    };
  }

  componentDidMount() {
    fetch(`/api/games/retrieve/${this.props.token.userId}`,
      { method: 'GET' })
      .then(res => res.json())
      .then(result => {
        const { state } = result[0];
        let opponent = null;
        let deck1 = null;
        let deck2 = null;
        const roomId = parseRoute(window.location.hash).path;
        // console.log('result', result);

        for (let i = 0; i < state.players.length; i++) {
          if (state.players[i].type === 'challenger') {
            deck1 = state.players[i].deck;
            opponent = state.players[i].username;
          } else {
            deck2 = state.players[i].deck;
          }
        }
        this.setState({
          roomId,
          [opponent + 'Deck']: deck1,
          [this.props.token.username + 'Deck']: deck2,
          players: state.players
        });
      });
    if (this.props.token) {
      const token = window.localStorage.getItem('react-context-jwt');
      this.socket = io('/', {
        auth: { token },
        query: { roomId: this.state.roomId }
      });
    }
    this.socket.on('decks-created', players => {
      // console.log(players);
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
    return opponent;
  }

  // createCard() {}

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
