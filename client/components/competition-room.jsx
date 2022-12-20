/* eslint-disable no-console */
import React from 'react';
import { io } from 'socket.io-client';
import parseRoute from '../lib/parse-route';

export default class CompetitionRoom extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fetchingData: null };
    this.flipCard = this.flipCard.bind(this);
    this.battleModal = React.createRef();
    this.clientLastFlipped = React.createRef();
    this.opponentLastFlipped = React.createRef();
  }

  componentDidMount() {
    const roomId = parseRoute(window.location.hash).path;
    const token = window.localStorage.getItem('war-jwt');
    const { user } = this.props;
    const opponent = this.getOpponentUsername();
    this.setState({ fetchingData: true });
    const headers = {
      'X-Access-Token': token
    };
    fetch(`/api/games/retrieve/${opponent}`,
      {
        method: 'GET',
        headers
      })
      .then(res => res.json())
      .then(result => {
        const { state, gameId } = result[0];
        state.gameId = gameId;
        state.fetchingData = false;
        this.setState(state);
      });
    if (user) {
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
    this.socket.on('battle-staged', state => {
      this.setState(state);
      // { this.announceBattle(); }
    });
  }

  componentWillUnmount() {
    this.socket && this.socket.disconnect();
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
    const clientFaceUp = this.state[client + 'FaceUp'];
    const { faceUpQueue } = this.state;
    if (clientFaceUp) {

      let counter = 0;
      const stack = clientFaceUp.map(card => {

        const { rank, suit } = card;
        const src = `images/cards/${rank}_of_${suit}.png`;
        const className = 'flipped-card opponent-flipped';
        const indexes = [];
        for (let i = 0; i < faceUpQueue.length; i++) {
          if (faceUpQueue[i] === client) {
            indexes.push(i);
          }
        }
        let zIndex;
        console.log(card);
        console.log(counter);
        for (let i = 0; i < indexes.length; i++) {
          if (counter === i) {
            zIndex = indexes[i];
            break;
          }
        }

        const left = '0%';
        const position = 'absolute';
        let transform;

        if (counter % 2 !== 0) {
          transform = 'rotate(2deg)';
        }

        counter++;
        return <img style={{ zIndex, position, left, transform }} key={src} src={src} alt={src} className={className} />;

      });
      return stack;
    }
  }

  showOpponentCard() {
    const opponent = this.getOpponentUsername();
    const opponentFaceUp = this.state[opponent + 'FaceUp'];
    const { faceUpQueue } = this.state;
    if (opponentFaceUp) {

      let counter = 0;
      const stack = opponentFaceUp.map(card => {

        const { rank, suit } = card;
        const src = `images/cards/${rank}_of_${suit}.png`;
        const className = 'flipped-card opponent-flipped';
        const indexes = [];
        for (let i = 0; i < faceUpQueue.length; i++) {
          if (faceUpQueue[i] === opponent) {
            indexes.push(i);
          }
        }
        let zIndex;
        for (let i = 0; i < indexes.length; i++) {
          if (counter === i) {
            zIndex = indexes[i];
            break;
          }
        }

        const left = '0%';
        const position = 'absolute';
        let transform;

        if (counter % 2 !== 0) {
          transform = 'rotate(2deg)';
        }
        // window.getComputedStyle(this.clientLastFlipped.current).getPropertyValue('z-index') + 1;
        counter++;
        return <img style={{ zIndex, position, left, transform }} key={src} src={src} alt={src} className={className} />;

      })
      ;
      return stack;
    }

  }

  flipCard() {
    const client = this.props.user.username;
    const clientFaceUp = this.state[client + 'FaceUp'];
    const opponent = this.getOpponentUsername();
    const opponentFaceUp = this.state[opponent + 'FaceUp'];
    const { battle, showBattleModal } = this.state;
    const clientFlipsRemaining = this.state[client + 'FlipsRemaining'];
    if ((!clientFaceUp || clientFlipsRemaining) && !showBattleModal) {
      const { gameId, battle } = this.state;
      const { stage } = battle;
      const clientDeck = this.state[client + 'Deck'];
      const copyOfClientDeck = [...clientDeck];
      const cardFlipped = copyOfClientDeck.splice(0, 1);
      const copyOfState = { ...this.state };
      copyOfState[client + 'Deck'] = copyOfClientDeck;
      // const clientFaceUp = copyOfState[client + 'FaceUp'];
      // this should be serverside after winner is chosen
      copyOfState.roomId = parseRoute(window.location.hash).path;

      if (clientFlipsRemaining > 1) {
        copyOfState[client + 'BattlePile'].push(cardFlipped[0]);
        copyOfState[client + 'FlipsRemaining']--;
      }

      if (clientFlipsRemaining === 1) {
        console.log('cardFlipped', cardFlipped);
        copyOfState[client + 'FaceUp'].push(cardFlipped[0]);
        console.log('copyOfState[clientFaceUp]', copyOfState[client + 'FaceUp']);
        copyOfState.lastToFlip = client;
        copyOfState.faceUpQueue.push(client);
        copyOfState[client + 'FlipsRemaining']--;
        if (opponentFaceUp.length > stage) {
          console.log('stage', stage);
          copyOfState.battlefield[client] = cardFlipped[0];
          copyOfState.battlefield[opponent] = opponentFaceUp[opponentFaceUp.length - 1];
        }
      }

      if (!clientFlipsRemaining) {
        copyOfState[client + 'FaceUp'] = cardFlipped;
        copyOfState.lastToFlip = client;
        copyOfState.faceUpQueue.push(client);
      }

      if (opponentFaceUp && !stage) {
        copyOfState.battlefield[client] = cardFlipped[0];
        copyOfState.battlefield[opponent] = opponentFaceUp[0];
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

    } else if (battle) {
      // const { stage } = battle;
    }
  }

  showOpponentWinningCards() {
    const opponent = this.getOpponentUsername();
    const opponentWinPile = this.state[opponent + 'WinPile'];
    if (!opponentWinPile) {
      return;
    }
    if (opponentWinPile.length !== 0) {
      const lastCardRank = opponentWinPile[opponentWinPile.length - 1].rank;
      const lastCardSuit = opponentWinPile[opponentWinPile.length - 1].suit;
      const secondToLastCardRank = opponentWinPile[opponentWinPile.length - 2].rank;
      const secondToLastCardSuit = opponentWinPile[opponentWinPile.length - 2].suit;
      const srcBottom = `images/cards/${secondToLastCardRank}_of_${secondToLastCardSuit}.png`;
      const srcTop = `images/cards/${lastCardRank}_of_${lastCardSuit}.png`;
      return (
        <>
          <img src={srcTop} alt={srcTop} className='flipped-card top' />
          <img src={srcBottom} alt={srcBottom} className='flipped-card bottom' />
        </>
      );
    }
  }

  showClientWinningCards() {
    const client = this.props.user.username;
    const clientWinPile = this.state[client + 'WinPile'];
    if (!clientWinPile) {
      return;
    }
    if (clientWinPile.length !== 0) {
      const lastCardRank = clientWinPile[clientWinPile.length - 1].rank;
      const lastCardSuit = clientWinPile[clientWinPile.length - 1].suit;
      const secondToLastCardRank = clientWinPile[clientWinPile.length - 2].rank;
      const secondToLastCardSuit = clientWinPile[clientWinPile.length - 2].suit;
      const srcBottom = `images/cards/${secondToLastCardRank}_of_${secondToLastCardSuit}.png`;
      const srcTop = `images/cards/${lastCardRank}_of_${lastCardSuit}.png`;
      return (
        <>
          <img src={srcTop} alt={srcTop} className='flipped-card top' />
          <img src={srcBottom} alt={srcBottom} className='flipped-card bottom' />
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
      <div className='player-deck match-deck'>
        <img src='images/backofcard.png' alt='backofcard' className='deck-cards deck-1' />
        <img src='images/backofcard.png' alt='backofcard' className='deck-cards deck-2' />
        <img src='images/backofcard.png' alt='backofcard' className='deck-cards deck-3' />
        <img src='images/backofcard.png' alt='backofcard' className='deck-cards deck-4' />
        <img src='images/backofcard.png' alt='backofcard' className='deck-cards deck-5' />
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
      <button onClick={this.flipCard} className='player2-button'>
        <img src='images/backofcard.png' alt='backofcard' className='deck-cards deck-1' />
        <img src='images/backofcard.png' alt='backofcard' className='deck-cards deck-2' />
        <img src='images/backofcard.png' alt='backofcard' className='deck-cards deck-3' />
        <img src='images/backofcard.png' alt='backofcard' className='deck-cards deck-4' />
        <img src='images/backofcard.png' alt='backofcard' className='deck-cards deck-5' />
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
    return client === loser ? opponent : client;
  }

  pickWinnerAvatar() {
    const { loser } = this.state;
    if (!loser) {
      return;
    }
    const client = this.props.user.username;
    return client === loser ? 'images/player1.png' : 'images/player2.png';
  }

  showModal() {
    const { loser } = this.state;
    return loser && (
      <div className='winner-modal'>
        <h1 className='winner-modal-title'>WINNER</h1>
        <div className='row center'>
          <img className='trophy' src='images/trophy.png' alt='trophy' />
          <div>
            <img className='winner-avatar' src={this.pickWinnerAvatar()} alt='winner-avatar' />
            <p className='winner-modal-text'>{this.pickWinnerText()}</p>
            <a href='#' className='challenger-modal-button winner-modal-button'>Main Menu</a>
          </div>
          <img className='trophy' src='images/trophy.png' alt='trophy' />
        </div>
      </div>
    );
  }

  showOverlay() {
    const { loser } = this.state;
    return loser ? 'overlay' : 'overlay hidden';
  }

  showSpinner() {
    const { fetchingData } = this.state;
    return fetchingData ? 'spinner-container center-horiz-vert' : 'spinner-container hidden';
  }

  announceBattle() {
    const { battle, showBattleModal } = this.state;
    if (!battle || !showBattleModal) return 'hidden';
    const { stage } = this.state.battle;
    setTimeout(() => {
      console.log(this.battleModal.current);
      this.battleModal.current.className = 'hidden';
      this.setState({ showBattleModal: false });
    }, 1450);
    if (stage) {
      return 'battle-modal';
    } else {
      return 'hidden';
    }
  }

  showClientBattlePile() {
    const client = this.props.user.username;
    const clientBattlePile = this.state[client + 'BattlePile'];
    if (!clientBattlePile) {
      return;
    }

    let counter = 0;
    const pile = clientBattlePile.map(card => {
      const { rank, suit } = card;
      const src = `images/cards/${rank}_of_${suit}.png`;
      const zIndex = counter;
      const className = counter > 0 ? 'flipped-card client-battle-top' : 'flipped-card';
      const transform = counter > 0 ? 'rotate(2deg)' : '0';
      counter++;
      return <img className={className} key={src} src={src} style={{ zIndex, transform }}/>;
    });

    return pile;
  }

  showOpponentBattlePile() {
    const opponent = this.getOpponentUsername();
    const opponentBattlePile = this.state[opponent + 'BattlePile'];
    if (!opponentBattlePile) {
      return;
    }

    let counter = 0;
    const pile = opponentBattlePile.map(card => {
      const { rank, suit } = card;
      const src = `images/cards/${rank}_of_${suit}.png`;
      const zIndex = counter;
      const className = counter > 0 ? 'flipped-card opponent-battle-top' : 'flipped-card';
      const transform = counter > 0 ? 'rotate(2deg)' : '0';

      counter++;
      return <img className={className} key={src} src={src} style={{ zIndex, transform }} />;
    });

    return pile;
  }

  render() {
    return (
      <>
        <div ref={this.battleModal} className={this.announceBattle()}>
          <h1>WAR</h1>
        </div>
        <div className='row'>
          <div className='column-full'>
            <div className='center-horiz-vert'>
              <div className='column-half'>
                <img className='player-avatar-img-size' src='images/player1.png' alt='player1' />
              </div>
              <div className='column-half'>
                <p className='player-names-size'>{this.getOpponentUsername()}</p>
              </div>
            </div>
            <div className='row center align-decks'>
              <div className='side-deck flipped-card'>
                {this.showOpponentWinningCards()}
              </div>
              <div className='column-one-eighth bundle'>
                {this.showOpponentDeck()}
              </div>
            </div>
            <div className='battlefield center'>
              <div className="opponent-battle-pile">
                {this.showOpponentBattlePile()}
              </div>
              <div className='opponent-flipped-container flipped-card'>
                {this.showOpponentCard()}
              </div>
              <div className='client-flipped-container flipped-card'>
                {this.showClientCard()}
              </div>
              <div className="client-battle-pile">
                {this.showClientBattlePile()}
              </div>
            </div>
            <div className='row center align-decks'>
              <div className='side-deck flipped-card'>
                {this.showClientWinningCards()}
              </div>
              <div className='column-one-eighth bundle'>
                <div className='player-deck match-deck player-2-deck'>
                  {this.showClientDeck()}
                </div>
              </div>
            </div>
            <div className='center-horiz-vert'>
              <img className='player-avatar-img-size' src='images/player2.png' alt='player1' />
              <p className='player-names-size'>You</p>
            </div>
          </div>
        </div>
        <div className={this.showOverlay()}/>
        <div className={this.showSpinner()}>
          <div className='lds-spinner'><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /></div>;
        </div>
        {this.showModal()}
        {/* {this.announceBattle()} */}
      </>
    );
  }
}
