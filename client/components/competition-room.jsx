import React from 'react';
import { io } from 'socket.io-client';
import parseRoute from '../lib/parse-route';

export default class CompetitionRoom extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.flipCard = this.flipCard.bind(this);
  }

  componentDidMount() {
    fetch(`/api/games/retrieve/${this.props.token.userId}`,
      { method: 'GET' })
      .then(res => res.json())
      .then(result => {
        const { state, gameId } = result[0];
        state.gameId = gameId;
        this.setState(state);
      });
    if (this.props.token) {
      const token = window.localStorage.getItem('react-context-jwt');
      this.socket = io('/', {
        auth: { token },
        query: { roomId: this.state.roomId }
      });
    }
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

  createCard() {
    const cardShowing = this.state[this.props.token.username + 'cardShowing'];
    const suit = cardShowing[0].suit;
    const rank = cardShowing[0].rank;
    const src = `images/cards/${rank}_of_${suit}.png`;

    if (!cardShowing) {
      return;
    }
    return (
      <img src={src} alt={src} className="flipped-card client-card" />
    );
  }

  flipCard() {
    const client = this.props.token.username;
    const clientDeck = this.state[client + 'Deck'];
    const copyOfClientDeck = [...clientDeck];
    const cardFlipped = copyOfClientDeck.splice(0, 1);
    const copyOfState = { ...this.state };
    copyOfState[client + 'Deck'] = copyOfClientDeck;
    copyOfState[client + 'cardShowing'] = cardFlipped;

    const headers = {
      'Content-Type': 'application/json'
    };

    const req = {
      method: 'PATCH',
      headers,
      body: JSON.stringify(copyOfState)
    };

    fetch(`/api/games/${this.state.gameId}`, req)
      .then(res => res.json())
      .then(data => this.setState(data));
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
              <div>
                <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-1' />
                <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-2' />
                <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-3' />
                <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-4' />
                <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-5' />
              </div>
            </div>
          </div>
        </div>
        <div className="row client-card-row">
          <div className="column-full client-card-column">
            {this.createCard()}
          </div>
        </div>
        <div className="row">
          <div className="player-deck match-deck player-2-deck">
            <button onClick={this.flipCard} className='player2-button'>
              <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-1' />
              <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-2' />
              <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-3' />
              <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-4' />
              <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-5' />
            </button>
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
