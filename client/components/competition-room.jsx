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
    const { user } = this.props;
    const { userId } = user;
    fetch(`/api/games/retrieve/${userId}`,
      { method: 'GET' })
      .then(res => res.json())
      .then(result => {
        const { state, gameId } = result[0];
        state.gameId = gameId;
        this.setState(state);
      });
    if (user) {
      const roomId = parseRoute(window.location.hash).path;
      const token = window.localStorage.getItem('war-jwt');
      this.socket = io('/', {
        auth: { token },
        query: { roomId }
      });
    }
    this.socket.on('flip-card', state => {
      this.setState(state);
    });
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  renderPlayer2() {
    const { username } = this.props.user;
    const roomId = parseRoute(window.location.hash).path;
    const splitUsernames = roomId.split('-');
    let opponent;
    for (let i = 0; i < splitUsernames.length; i++) {
      if (splitUsernames[i] !== username) {
        opponent = splitUsernames[i];
      }
    }
    return opponent;
  }

  createCard() {
    const cardShowing = this.state[this.props.user.username + 'CardShowing'];
    if (cardShowing) {
      const suit = cardShowing[0].suit;
      const rank = cardShowing[0].rank;
      const src = `images/cards/${rank}_of_${suit}.png`;
      return (
        <img src={src} alt={src} className="flipped-card client-card" />
      );
    }
  }

  showOpponentCard() {
    let opponent;
    const { username } = this.props.user;
    const roomId = parseRoute(window.location.hash).path;
    const splitUsernames = roomId.split('-');
    for (let i = 0; i < splitUsernames.length; i++) {
      if (splitUsernames[i] !== username) {
        opponent = splitUsernames[i];
      }
    }
    const clientCardShowing = this.state[this.props.user.username + 'CardShowing'];
    const opponentCardShowing = this.state[opponent + 'CardShowing'];

    if (opponentCardShowing) {
      const suit = opponentCardShowing[0].suit;
      const rank = opponentCardShowing[0].rank;
      const src = `images/cards/${rank}_of_${suit}.png`;
      let className = 'flipped-card opponent-card';
      if (clientCardShowing) {
        className = 'flipped-card opponent-first on-top';
      }
      return (
        <img src={src} alt={src} className={className} />
      );
    }
  }

  flipCard() {
    const { gameId } = this.state;
    const client = this.props.user.username;
    const clientDeck = this.state[client + 'Deck'];
    const copyOfClientDeck = [...clientDeck];
    const cardFlipped = copyOfClientDeck.splice(0, 1);
    const copyOfState = { ...this.state };
    copyOfState[client + 'Deck'] = copyOfClientDeck;
    copyOfState[client + 'CardShowing'] = cardFlipped;
    copyOfState.roomId = parseRoute(window.location.hash).path;
    copyOfState.lastToFlip = client;

    const headers = {
      'Content-Type': 'application/json'
    };

    const req = {
      method: 'PATCH',
      headers,
      body: JSON.stringify(copyOfState)
    };
    fetch(`/api/games/${gameId}`, req)
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
        <div className="row battlefield-row">
          <div className="column-full client-card-column">
            <div className="battlefield">
              {this.showOpponentCard()}
              {this.createCard()}
            </div>
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
