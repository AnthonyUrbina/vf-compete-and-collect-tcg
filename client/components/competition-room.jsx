import React from 'react';
import { io } from 'socket.io-client';
import parseRoute from '../lib/parse-route';

export default class CompetitionRoom extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      fetchingData: null,
      error: null
    };
    this.flipCard = this.flipCard.bind(this);
    this.battleModal = React.createRef();
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
        if (state) {
          state.gameId = gameId;
          state.fetchingData = false;
          this.setState(state);
        }
      })
      .catch(err => {
        console.error(err.message);
        if (opponent && opponent !== 'undefined') {
          this.socket.emit('invite-accepted-retry', opponent);

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
            })
            .catch(err => console.error(err));
        }
        window.location.reload();
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
    this.socket.on('deck-replaced', payload => {
      const copyOfState = { ...this.state };
      const { player, newDeck } = payload;
      copyOfState[player + 'Deck'] = newDeck;
      this.setState({ [player + 'Deck']: copyOfState[player + 'Deck'], [player + 'WinPile']: [] });
    });
    this.socket.on('game-over', state => {
      this.setState(state);
    });
    this.socket.on('battle-staged', state => {
      this.setState(state);
    });
    this.socket.on('update-state', updatedState => {
      this.setState(updatedState);
    });
    this.socket.on('flip', payload => {
      const { client, cardFlipped, type } = payload;
      const { battlePile, battleFaceUp } = type;
      const copyOfState = { ...this.state };
      if (battlePile) {
        copyOfState[client + 'BattlePile'].push(cardFlipped[0]);
      } else if (battleFaceUp) {
        copyOfState[client + 'FaceUp'].push(cardFlipped[0]);
        copyOfState.faceUpQueue.push(client);
      } else {
        copyOfState[client + 'FaceUp'] = cardFlipped;
        copyOfState.faceUpQueue.push(client);
      }

      copyOfState[client + 'Deck'].shift();
      this.setState(
        {
          faceUpQueue: copyOfState.faceUpQueue,
          [client + 'FaceUp']: copyOfState[client + 'FaceUp'],
          [client + 'BattlePile']: copyOfState[client + 'BattlePile'],
          [client + 'Deck']: copyOfState[client + 'Deck']
        });
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
        const { name } = card;
        const src = `images/cards/${name}.jpg`;
        const className = 'flipped-card';
        const indexes = [];
        const left = '0%';
        const position = 'absolute';
        const transform = counter % 2 !== 0 && 'rotate(2deg)';
        let zIndex;
        for (let i = 0; i < faceUpQueue.length; i++) {
          if (faceUpQueue[i] === client) {
            indexes.push(i);
          }
        }

        for (let i = 0; i < indexes.length; i++) {
          if (counter === i) {
            zIndex = indexes[i];
            break;
          }
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
        const { name } = card;
        const src = `images/cards/${name}.jpg`;
        const className = 'flipped-card';
        const indexes = [];
        const left = '0%';
        const position = 'absolute';
        const transform = counter % 2 !== 0 && 'rotate(2deg)';
        let zIndex;
        for (let i = 0; i < faceUpQueue.length; i++) {
          if (faceUpQueue[i] === opponent) {
            indexes.push(i);
          }
        }

        for (let i = 0; i < indexes.length; i++) {
          if (counter === i) {
            zIndex = indexes[i];
            break;
          }
        }

        counter++;
        return <img style={{ zIndex, position, left, transform }} key={src} src={src} alt={src} className={className} />;
      });
      return stack;
    }

  }

  // // flipCard() {
  // //   const client = this.props.user.username;
  // //   const clientFaceUp = this.state[client + 'FaceUp'];
  // //   const opponent = this.getOpponentUsername();
  // //   const opponentFaceUp = this.state[opponent + 'FaceUp'];
  // //   const { showBattleModal } = this.state;
  // //   const clientFlipsRemaining = this.state[client + 'FlipsRemaining'];
  //   if ((!clientFaceUp || clientFlipsRemaining) && !showBattleModal) {
  //     const { gameId, battle } = this.state;
  //     const { stage } = battle;
  //     const clientDeck = this.state[client + 'Deck'];
  //     const copyOfClientDeck = [...clientDeck];
  //     const cardFlipped = copyOfClientDeck.splice(0, 1);
  //     const copyOfState = { ...this.state };
  //     copyOfState[client + 'Deck'] = copyOfClientDeck;
  //     copyOfState.roomId = parseRoute(window.location.hash).path;

  // //     const headers = {
  // //       'Content-Type': 'application/json'
  // //     };

  // //     const req = {
  // //       method: 'PATCH',
  // //       headers,
  // //       body: JSON.stringify(copyOfState)
  // //     };
  // //     fetch(`/api/games/${gameId}`, req)
  // //       .then(res => res.json())
  // //       .then(data => console.log('wooo'));

  // //   }
  // // }

  flipCard() {
    const client = this.props.user.username;
    const opponent = this.getOpponentUsername();
    const { gameId } = this.state;
    const req = {
      method: 'PATCH'
    };

    fetch(`/api/games/${gameId}/${client}/${opponent}`, req)
      .catch(err => console.error(err));
  }

  showOpponentWinningCards() {
    const opponent = this.getOpponentUsername();
    const opponentWinPile = this.state[opponent + 'WinPile'];
    if (!opponentWinPile) return;
    if (opponentWinPile.length !== 0) {
      const lastCardScore = opponentWinPile[opponentWinPile.length - 1].name;
      const secondToLastCardScore = opponentWinPile[opponentWinPile.length - 2].name;
      const srcBottom = `images/cards/${secondToLastCardScore}.jpg`;
      const srcTop = `images/cards/${lastCardScore}.jpg`;
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
    if (!clientWinPile) return;
    if (clientWinPile.length !== 0) {
      const lastCardScore = clientWinPile[clientWinPile.length - 1].name;
      const secondToLastCardScore = clientWinPile[clientWinPile.length - 2].name;
      const srcBottom = `images/cards/${secondToLastCardScore}.jpg`;
      const srcTop = `images/cards/${lastCardScore}.jpg`;
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
      if (!opponentDeck.length) return;
    }
    return (
      <div className='player-deck match-deck'>
        <img src='images/cards/face-down.jpg' alt='cards/face-down' className='deck-cards deck-1' />
        <img src='images/cards/face-down.jpg' alt='cards/face-down' className='deck-cards deck-2' />
        <img src='images/cards/face-down.jpg' alt='cards/face-down' className='deck-cards deck-3' />
        <img src='images/cards/face-down.jpg' alt='cards/face-down' className='deck-cards deck-4' />
        <img src='images/cards/face-down.jpg' alt='cards/face-down' className='deck-cards deck-5' />
      </div>
    );
  }

  showClientDeck() {
    const client = this.props.user.username;
    const clientDeck = this.state[client + 'Deck'];
    if (clientDeck) {
      if (!clientDeck.length) return;
    }
    return (
      <button onClick={this.flipCard} className='player2-button'>
        <img src='images/cards/face-down.jpg' alt='cards/face-down' className='deck-cards deck-1' />
        <img src='images/cards/face-down.jpg' alt='cards/face-down' className='deck-cards deck-2' />
        <img src='images/cards/face-down.jpg' alt='cards/face-down' className='deck-cards deck-3' />
        <img src='images/cards/face-down.jpg' alt='cards/face-down' className='deck-cards deck-4' />
        <img src='images/cards/face-down.jpg' alt='cards/face-down' className='deck-cards deck-5' />
      </button>
    );
  }

  pickWinnerText() {
    const { loser } = this.state;
    if (!loser) return;
    const opponent = this.getOpponentUsername();
    const client = this.props.user.username;
    return client === loser ? opponent : client;
  }

  pickWinnerAvatar() {
    const { loser } = this.state;
    if (!loser) return;
    const client = this.props.user.username;
    return client === loser
      ? 'images/avatars/notorious-ninja.png'
      : 'images/avatars/competitive-clown.png';
  }

  showModal() {
    const { loser } = this.state;
    return loser && (
      <div className='winner-modal'>
        <h1 className='winner-modal-title'>WINNER!</h1>
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
    if (!clientBattlePile || clientBattlePile.length === 0) {
      return <img className='flipped-card hide-icon' src="images/cards/face-down.jpg" alt="" />;
    } else {
      let counter = 1;
      const pile = clientBattlePile.map(card => {
        const { name } = card;
        const src = `images/cards/${name}.jpg`;
        const zIndex = counter;
        const className = counter > 1 ? 'flipped-card client-battle-top' : 'flipped-card';
        const transform = (counter % 2) === 0 && (counter + 2) % 3 !== 0
          ? 'rotate(3deg)'
          : (counter + 2) % 3 === 0
              ? '0'
              : (counter % 3) === 0 && 'rotate(-2deg)';
        counter++;
        return <img className={className} key={src} src='images/cards/face-down.jpg' style={{ zIndex, transform }}/>;
      });

      return pile;
    }

  }

  showOpponentBattlePile() {
    const opponent = this.getOpponentUsername();
    const opponentBattlePile = this.state[opponent + 'BattlePile'];
    if (!opponentBattlePile || opponentBattlePile.length === 0) {
      return <img className='flipped-card hide-icon' src="images/cards/face-down.jpg" alt="" />;
    } else {
      let counter = 1;
      const pile = opponentBattlePile.map(card => {
        const { name } = card;
        const src = `images/cards/${name}.jpg`;
        const zIndex = counter;
        const className = counter > 1 ? 'flipped-card opponent-battle-top' : 'flipped-card';
        const transform = (counter % 2) === 0 && (counter + 2) % 3 !== 0
          ? 'rotate(3deg)'
          : (counter + 2) % 3 === 0
              ? '0'
              : (counter % 3) === 0 ? 'rotate(-2deg)' : '0';
        counter++;
        return <img className={className} key={src} src='images/cards/face-down.jpg' style={{ zIndex, transform }} />;
      });
      return pile;
    }
  }

  getClientRemainingCards() {
    const client = this.props.user.username;
    const clientDeck = this.state[client + 'Deck'];
    const clientWinPile = this.state[client + 'WinPile'];
    if (!clientDeck) return 'loading...';
    return clientDeck.length + clientWinPile.length;
  }

  getOpponentRemainingCards() {
    const opponent = this.getOpponentUsername();
    const opponentDeck = this.state[opponent + 'Deck'];
    const opponentWinPile = this.state[opponent + 'WinPile'];
    if (!opponentDeck) return 'loading...';
    return opponentDeck.length + opponentWinPile.length;
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
                <img className='player-avatar-img-size' src='images/avatars/notorious-ninja.png' alt='player1' />
              </div>
              <div className='column-half'>
                <p className='player-names-size'>{this.getOpponentUsername()}</p>
              </div>
            </div>
            <p className='score-text'>{`Cards Remaining: ${this.getOpponentRemainingCards()}`}</p>
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
            <p className='score-text'>{`Cards Remaining: ${this.getClientRemainingCards()}`}</p>
            <div className='center-horiz-vert'>
              <img className='player-avatar-img-size' src='images/avatars/competitive-clown.png' alt='player1' />
              <p className='player-names-size'>You</p>
            </div>
          </div>
        </div>
        <div className={this.showOverlay()}/>
        <div className={this.showSpinner()}>
          <div className='lds-spinner'><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /></div>;
        </div>
        {this.showModal()}
      </>
    );
  }
}
