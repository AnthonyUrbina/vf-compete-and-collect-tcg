import React from 'react';
import { io } from 'socket.io-client';
import parseRoute from '../lib/parse-route';

export default class CompetitionRoom extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fetchingData: null };
    this.flipCard = this.flipCard.bind(this);
  }

  componentDidMount() {
    const { user } = this.props;
    const { userId } = user;
    this.setState({ fetchingData: true });
    fetch(`/api/games/retrieve/${userId}`,
      { method: 'GET' })
      .then(res => res.json())
      .then(result => {
        const { state, gameId } = result[0];
        state.gameId = gameId;
        state.fetchingData = false;
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
    this.socket.on('winner-decided', state => {
      this.setState(state);
    });

    this.socket.on('deck-replaced', state => {
      this.setState(state);
    });

    this.socket.on('game-over', state => {
      this.setState(state);
    });
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  getOpponentUsername() {
    let opponent;
    const { username } = this.props.user;
    const roomId = parseRoute(window.location.hash).path;
    const splitUsernames = roomId.split('-');
    for (let i = 0; i < splitUsernames.length; i++) {
      if (splitUsernames[i] !== username) {
        opponent = splitUsernames[i];
      }
    }
    return opponent;
  }

  showClientCard() {
    const client = this.props.user.username;
    const clientCardShowing = this.state[client + 'CardShowing'];
    if (clientCardShowing) {
      const suit = clientCardShowing[0].suit;
      const rank = clientCardShowing[0].rank;
      const src = `images/cards/${rank}_of_${suit}.png`;
      let className = 'flipped-card';
      if (this.state.lastToFlip === client) {
        className = 'flipped-card client-on-top';
      }
      return (
        <img src={src} alt={src} className={className} />
      );
    }
  }

  showOpponentCard() {
    const opponent = this.getOpponentUsername();
    const opponentCardShowing = this.state[opponent + 'CardShowing'];
    if (opponentCardShowing) {
      const suit = opponentCardShowing[0].suit;
      const rank = opponentCardShowing[0].rank;
      const src = `images/cards/${rank}_of_${suit}.png`;
      const className = 'flipped-card opponent-flipped';
      return (
        <img src={src} alt={src} className={className} />
      );
    }
  }

  flipCard() {
    const client = this.props.user.username;
    const clientCardShowing = this.state[client + 'CardShowing'];
    const opponent = this.getOpponentUsername();
    const opponentCardShowing = this.state[opponent + 'CardShowing'];
    if (clientCardShowing) {
      return;
    }
    const { gameId } = this.state;
    const clientDeck = this.state[client + 'Deck'];
    const copyOfClientDeck = [...clientDeck];
    const cardFlipped = copyOfClientDeck.splice(0, 1);
    const copyOfState = { ...this.state };
    copyOfState[client + 'Deck'] = copyOfClientDeck;
    copyOfState[client + 'CardShowing'] = cardFlipped;
    copyOfState.lastToFlip = client;
    copyOfState.battlefield = {};
    copyOfState.roomId = parseRoute(window.location.hash).path;

    if (opponentCardShowing) {
      copyOfState.battlefield[client] = cardFlipped[0];
      copyOfState.battlefield[opponent] = opponentCardShowing[0];
    }

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

  showOpponentWinningCards() {
    const opponent = this.getOpponentUsername();
    const opponentSideDeck = this.state[opponent + 'SideDeck'];
    if (!opponentSideDeck) {
      return;
    }
    if (opponentSideDeck.length !== 0) {
      const lastCardRank = opponentSideDeck[opponentSideDeck.length - 1].rank;
      const lastCardSuit = opponentSideDeck[opponentSideDeck.length - 1].suit;
      const secondToLastCardRank = opponentSideDeck[opponentSideDeck.length - 2].rank;
      const secondToLastCardSuit = opponentSideDeck[opponentSideDeck.length - 2].suit;
      const srcBottom = `images/cards/${secondToLastCardRank}_of_${secondToLastCardSuit}.png`;
      const srcTop = `images/cards/${lastCardRank}_of_${lastCardSuit}.png`;
      return (
        <>
          <img src={srcTop} alt={srcTop} className="flipped-card top" />
          <img src={srcBottom} alt={srcBottom} className="flipped-card bottom" />
        </>
      );
    }
  }

  showClientWinningCards() {
    const client = this.props.user.username;
    const clientSideDeck = this.state[client + 'SideDeck'];
    if (!clientSideDeck) {
      return;
    }
    if (clientSideDeck.length !== 0) {
      const lastCardRank = clientSideDeck[clientSideDeck.length - 1].rank;
      const lastCardSuit = clientSideDeck[clientSideDeck.length - 1].suit;
      const secondToLastCardRank = clientSideDeck[clientSideDeck.length - 2].rank;
      const secondToLastCardSuit = clientSideDeck[clientSideDeck.length - 2].suit;
      const srcBottom = `images/cards/${secondToLastCardRank}_of_${secondToLastCardSuit}.png`;
      const srcTop = `images/cards/${lastCardRank}_of_${lastCardSuit}.png`;
      return (
        <>
          <img src={srcTop} alt={srcTop} className="flipped-card top" />
          <img src={srcBottom} alt={srcBottom} className="flipped-card bottom" />
        </>
      );
    }
  }

  showOpponentDeck() {
    const opponent = this.getOpponentUsername();
    const opponentDeck = this.state[opponent + 'Deck'];
    if (opponentDeck) {
      if (!opponentDeck.length) {
        return;
      }
    }
    return (
      <div className="player-deck match-deck">
        <img src="images/backofcard.png" alt="backofcard" className="deck-cards deck-1" />
        <img src="images/backofcard.png" alt="backofcard" className="deck-cards deck-2" />
        <img src="images/backofcard.png" alt="backofcard" className="deck-cards deck-3" />
        <img src="images/backofcard.png" alt="backofcard" className="deck-cards deck-4" />
        <img src="images/backofcard.png" alt="backofcard" className="deck-cards deck-5" />
      </div>
    );
  }

  showClientDeck() {
    const client = this.props.user.username;
    const clientDeck = this.state[client + 'Deck'];
    if (clientDeck) {
      if (!clientDeck.length) {
        return;
      }
    }
    return (
      <button onClick={this.flipCard} className="player2-button">
        <img src="images/backofcard.png" alt="backofcard" className="deck-cards deck-1" />
        <img src="images/backofcard.png" alt="backofcard" className="deck-cards deck-2" />
        <img src="images/backofcard.png" alt="backofcard" className="deck-cards deck-3" />
        <img src="images/backofcard.png" alt="backofcard" className="deck-cards deck-4" />
        <img src="images/backofcard.png" alt="backofcard" className="deck-cards deck-5" />
      </button>
    );
  }

  pickWinnerText() {
    const { loser } = this.state;
    if (!loser) {
      return;
    }
    const opponent = this.getOpponentUsername();
    const client = this.props.user.username;
    if (client === loser) {
      return opponent;
    } else {
      return client;
    }
  }

  pickWinnerAvatar() {
    const { loser } = this.state;
    if (!loser) {
      return;
    }
    const client = this.props.user.username;
    if (client === loser) {
      return 'images/player1.png';
    } else {
      return 'images/player2.png';
    }
  }

  showWinnerModal() {
    const { loser } = this.state;
    if (!loser) {
      return 'winner-modal hidden';
    }
    return 'winner-modal';
  }

  showOverlay() {
    const { loser } = this.state;
    if (!loser) {
      return 'overlay hidden';
    }
    return 'overlay';
  }

  showSpinner() {
    const fetchingData = this.state;
    if (fetchingData) {
      return 'spinner-container = hidden';
    }
  }

  render() {
    return (
      <>
        <div className="row header">
          <h1 className="home-header-color">WAR</h1>
        </div>
        <div className="row">
          <div className="column-full">
            <div className="name-avatar-spacing">
              <div className="column-half">
                <img className="player-avatar-img-size" src="images/player1.png" alt="player1" />
              </div>
              <div className="column-half">
                <p className="player-names-size">{this.getOpponentUsername()}</p>
              </div>
            </div>
            <div className="row center align-decks">
              <div className="side-deck flipped-card">
                {this.showOpponentWinningCards()}
              </div>
              <div className="column-one-eighth bundle">
                {this.showOpponentDeck()}
              </div>
            </div>
            <div className="battlefield">
              <div className="center">
                <div className="opponent-flipped-container flipped-card">
                  {this.showOpponentCard()}
                </div>
                <div className="client-flipped-container flipped-card">
                  {this.showClientCard()}
                </div>
              </div>
            </div>
            <div className="row center align-decks">
              <div className="side-deck flipped-card">
                {this.showClientWinningCards()}
              </div>
              <div className="column-one-eighth bundle">
                <div className="player-deck match-deck player-2-deck">
                  {this.showClientDeck()}
                </div>
              </div>
            </div>
            <div className="name-avatar-spacing">
              <img className="player-avatar-img-size" src="images/player2.png" alt="player1" />
              <p className="player-names-size">You</p>
            </div>
          </div>
        </div>
        <div className={this.showWinnerModal()}>
          <h1 className="winner-modal-title">WINNER</h1>
          <div className="row center">
            <img className='trophy' src="images/trophy.png" alt="trophy" />
            <div>
              <img className="winner-avatar" src={this.pickWinnerAvatar()} alt="" />
              <p className='winner-modal-text'>{this.pickWinnerText()}</p>
              <a href="#" className='challenger-modal-button winner-modal-button'>Main Menu</a>
            </div>
            <img className='trophy' src="images/trophy.png" alt="trophy" />
          </div>
        </div>
        <div className={this.showOverlay()}/>
        <div className="spinner-container hidden">
          <div className="lds-spinner"><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /></div>;
        </div>
      </>
    );
  }
}
