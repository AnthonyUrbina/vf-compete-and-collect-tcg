import React from 'react';
import { io } from 'socket.io-client';

export default class Lobby extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      onlinePlayers: null,
      onlinePlayersModalisActive: false,
      challengerModalisActive: false,
      opponentModalisActive: false,
      isSendingChallengeTo: null,
      isReceivingChallengeFrom: null,
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
      this.setState({
        isReceivingChallengeFrom: inviteInfo.challengerUsername,
        roomId: inviteInfo.roomId,
        onlinePlayersModalisActive: false,
        opponentModalisActive: true
      });
    });

    this.socket.on('opponent-declined', () => {
      this.setState({ isSendingChallengeTo: null, challengerModalisActive: false });
    });
    this.socket.on('opponent-joined', () => {
      this.setState({ challengerModalisActive: false });
      // hashchange here

    });
    this.socket.on('challenger-canceled', () => {
      this.setState({ opponentModalisActive: false, isReceivingChallengeFrom: null, roomId: null });
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
      this.setState({
        onlinePlayersModalisActive: false,
        isSendingChallengeTo: opponentUsername,
        challengerModalisActive: true
      });
    }

    if (event.target.matches('.challenger-modal-button')) {
      const opponentSocketId = this.getOpponentSocketId(this.state.isSendingChallengeTo);
      this.socket.emit('invite-canceled', opponentSocketId);
      this.setState({ isSendingChallengeTo: null, challengerModalisActive: false });
    }

    if (event.target.matches('.accept-button')) {
      this.socket.emit('invite-accepted', this.state.roomId);
      this.setState({ opponentModalisActive: false });
      // post request here
      // hashchange here
    } else if (event.target.matches('.decline-button')) {
      this.socket.emit('invite-declined', this.state.roomId);
      this.setState({ roomId: null, isReceivingChallengeFrom: null, opponentModalisActive: false });
      // console.log(this.socket.username);

    }
  }

  chooseModalClass() {
    const className = this.state.onlinePlayersModalisActive
      ? 'modal-box'
      : 'hidden';
    return className;
  }

  chooseOverlayClass() {
    const className = this.state.onlinePlayersModalisActive || this.state.challengerModalisActive || this.state.opponentModalisActive
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
    const className = this.state.challengerModalisActive
      ? 'challenger-modal-box'
      : this.state.opponentModalisActive
        ? 'opponent-modal-box'
        : 'hidden';
    return className;
  }

  chooseChallengeModalTitle() {
    const modalTitle = this.state.challengerModalisActive
      ? 'Challenge Sent'
      : this.state.opponentModalisActive
        ? "You've been Challenged"
        : 'hidden';
    return modalTitle;
  }

  chooseChallengeModalText() {
    const modalText = this.state.challengerModalisActive
      ? <p className='challenger-modal-text'>You have challenged {this.state.isSendingChallengeTo} to a game.<br />
        Waiting for their response...
      </p >
      : <p className='opponent-modal-text'>{this.state.isReceivingChallengeFrom} has challenged you to a game!</p >;
    return modalText;
  }

  chooseChallengeModalButtons() {
    const modalButtons = this.state.challengerModalisActive
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
