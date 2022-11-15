import React from 'react';
import { io } from 'socket.io-client';

export default class Lobby extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      onlinePlayers: null,
      onlinePlayersModalisActive: false,
      isSendingChallengeTo: null,
      isReceivingChallengeFrom: false,
      roomId: null
    };
    this.handleClick = this.handleClick.bind(this);
  }

  componentDidMount() {
    if (this.props.token) {
      this.socket = io('/', {
        auth: { token: this.props.token }
      });
    }

    this.socket.on('onlinePlayers', onlinePlayers => {
      delete onlinePlayers[this.socket.id];
      this.setState({ onlinePlayers });
    });

    this.socket.on('user disconnected', socketId => {
      const onlinePlayersCopy = { ...this.state.onlinePlayers };
      delete onlinePlayersCopy[socketId];
      this.setState({ onlinePlayers: onlinePlayersCopy });
    });

    this.socket.on('invite-received', inviteInfo => {
      let challengerUsername = null;
      for (const key in this.state.onlinePlayers) {
        if (key === inviteInfo.challengerSocketId) {
          challengerUsername = this.state.onlinePlayers[key];
        }
      }
      this.setState({ isReceivingChallengeFrom: challengerUsername, roomId: inviteInfo.roomId });
    });
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  showOnlinePlayers() {
    const usernames = [];
    for (const key in this.state.onlinePlayers) {
      usernames.push(this.state.onlinePlayers[key]);
    }

    const playerAppearance = usernames.map(username =>
      <li key={username}>
        <button onClick={this.handleClick} className='war-multiplayer-modal-li-button'>
          <img data-username={username} className='player-avatar-img-size modal-img-spacing' src="images/player1.png" alt="" />
          <p data-username={username} className='modal-player-text'>{username}</p>
        </button>
      </li>);

    return playerAppearance;
  }

  handleClick(event) {
    if (event.target.matches('#online-players-button') || event.target.matches('.fa-x')) {
      if (this.state.onlinePlayersModalisActive === false) {
        this.setState({ onlinePlayersModalisActive: true });
      } else {
        this.setState({ onlinePlayersModalisActive: false });
      }
    }
    if (event.currentTarget.matches('.war-multiplayer-modal-li-button')) {
      const opponentUsername = event.target.dataset.username;
      const opponentSocketId = this.getOpponentSocketId(opponentUsername);
      this.socket.emit('invite-sent', opponentSocketId);
      this.setState({ onlinePlayersModalisActive: false, isSendingChallengeTo: opponentUsername });
    }

    if (event.target.matches('.challenger-modal-button')) {
      const opponentSocketId = this.getOpponentSocketId(this.state.isSendingChallengeTo);
      this.socket.emit('invite-canceled', opponentSocketId);
      this.setState({ isSendingChallengeTo: null });
    }

    if (event.target.matches('.accept-button')) {
      this.socket.emit('invite-accepted', this.state.roomId);
    } else if (event.target.matches('.decline-button')) {
      this.socket.emit('invite-declined', this.state.roomId);
    }
  }

  chooseModalClass() {
    const className = this.state.onlinePlayersModalisActive
      ? 'modal-box'
      : 'hidden';
    return className;
  }

  chooseOverlayClass() {
    const className = this.state.onlinePlayersModalisActive
      ? 'overlay'
      : 'hidden';
    return className;
  }

  getOpponentSocketId(opponentUsername) {
    let socketId = null;
    for (const key in this.state.onlinePlayers) {
      if (this.state.onlinePlayers[key] === opponentUsername) {
        socketId = key;
      }
    }
    return socketId;
  }

  chooseChallengerModalClass() {
    const className = this.state.isSendingChallengeTo
      ? 'challenger-modal-box'
      : this.state.isReceivingChallengeFrom
        ? 'opponent-modal-box'
        : 'hidden';
    return className;
  }

  chooseChallengeModalTitle() {
    const modalTitle = this.state.isSendingChallengeTo
      ? 'Challenge Sent'
      : this.state.isReceivingChallengeFrom
        ? "You've been Challenged"
        : 'hidden';
    return modalTitle;
  }

  chooseChallengeModalText() {
    const modalText = this.state.isSendingChallengeTo
      ? <p className='challenger-modal-text'>You have challenged {this.state.isSendingChallengeTo} to a game.<br />
        Waiting for their response...
      </p >
      : <p className='opponent-modal-text'>{this.state.isReceivingChallengeFrom} has challenged you to a game!</p >;
    return modalText;
  }

  chooseChallengeModalButtons() {
    const modalButtons = this.state.isSendingChallengeTo
      ? <button onClick={this.handleClick} className='challenger-modal-button'>Cancel</button>
      : <div className='opponent-modal-button-box'>
        <button onClick={this.handleClick} className='challenger-modal-button accept-button'>Accept</button>
        <button onClick={this.handleClick} className='challenger-modal-button decline-button'>Decline</button>
      </div>;
    return modalButtons;
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
            <p className='player-names-size'>Bill</p>
          </div>
        </div>
        <div className="row">
          <div className="column-full">
            <div className="player-deck">
              <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-1' />
              <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-2' />
              <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-3' />
              <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-4' />
              <img src="images/backofcard.png" alt="backofcard" className='deck-cards deck-5' />
            </div>
          </div>
        </div>
        <div className='row'>
          <button onClick={this.handleClick} id='online-players-button'>Online Players</button>
        </div>
        <div className="row ">
          <div className="column-full name-avatar-spacing player-2-stretch">
            <img className='player-avatar-img-size' src="images/player2.png" alt="player1" />
            <p className='player-names-size'>You</p>
          </div>
        </div>
        <div className={this.chooseModalClass()}>
          <button onClick={this.handleClick} className="fa-solid fa-x" />
          <h3>War Multiplayer</h3>
          <p className='modal-text'>
            These are the players currently online. Click<br />
            on them to challenge them to a game of war!
          </p>
          <ul>
            {this.showOnlinePlayers()}
          </ul>
        </div>
        <div className={this.chooseChallengerModalClass()}>
          <h3 className='challenger-modal-title'>{this.chooseChallengeModalTitle()}</h3>
          {this.chooseChallengeModalText()}
          <div className='vertical-alignment'>
            <img className='player-avatar-img-size challenger-modal-img' src="images/player1.png" alt="" />
            {this.chooseChallengeModalButtons()}
          </div>
        </div>
        <div className={this.chooseOverlayClass()} />
      </>
    );
  }
}
