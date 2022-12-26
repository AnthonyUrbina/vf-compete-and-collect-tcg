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
      roomId: null,
      inviteInfo: null
    };
    this.handleClick = this.handleClick.bind(this);
  }

  componentDidMount() {
    const { onlinePlayers } = this.state;
    if (this.props.token) {
      const token = window.localStorage.getItem('war-jwt');
      this.socket = io('/', {
        auth: { token }
      });
    }

    this.socket.on('online-players', onlinePlayers => {
      delete onlinePlayers[this.socket.id];
      this.setState({ onlinePlayers });
    });

    this.socket.on('user disconnected', socketId => {
      const onlinePlayersCopy = { ...onlinePlayers };
      delete onlinePlayersCopy[socketId];
      this.setState({ onlinePlayers: onlinePlayersCopy });
    });

    this.socket.on('invite-received', inviteInfo => {
      const { roomId, challengerUsername } = inviteInfo;
      this.setState({
        isReceivingChallengeFrom: challengerUsername,
        roomId,
        onlinePlayersModalisActive: false,
        opponentModalisActive: true,
        inviteInfo
      });
    });

    this.socket.on('opponent-declined', () => {
      this.setState({ isSendingChallengeTo: null, challengerModalisActive: false });
    });
    this.socket.on('opponent-joined', inviteInfo => {
      const { roomId } = inviteInfo;
      this.setState({ challengerModalisActive: false });
      window.location.hash = roomId;
    });
    this.socket.on('challenger-canceled', () => {
      this.setState({ opponentModalisActive: false, isReceivingChallengeFrom: null, roomId: null });
    });
  }

  componentWillUnmount() {
    this.socket && this.socket.disconnect();
  }

  showOnlinePlayers() {
    const { onlinePlayers } = this.state;
    const usernames = [];
    for (const key in onlinePlayers) {
      usernames.push(onlinePlayers[key]);
    }

    const playerAppearance = usernames.map(username =>
      <li key={username} className='flex-column-center'>
        <button onClick={this.handleClick} className='war-multiplayer-modal-li-button'>
          <img data-username={username} className='player-avatar-img-size modal-img-spacing' src="images/player1.png" alt="" />
          <p data-username={username} className='modal-player-text'>{username}</p>
        </button>
      </li>);

    return playerAppearance;
  }

  handleClick(event) {
    const { inviteInfo, isSendingChallengeTo, onlinePlayersModalisActive, roomId } = this.state;
    if (event.target.matches('#online-players-button') || event.target.matches('.fa-x')) {
      if (onlinePlayersModalisActive === false) {
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
      const opponentSocketId = this.getOpponentSocketId(isSendingChallengeTo);
      this.socket.emit('invite-canceled', opponentSocketId);
      this.setState({ isSendingChallengeTo: null, challengerModalisActive: false });
    }

    if (event.target.matches('.accept-button')) {
      this.socket.emit('invite-accepted', inviteInfo);
      this.setState({ opponentModalisActive: false });
      window.location.hash = roomId;
    } else if (event.target.matches('.decline-button')) {
      this.socket.emit('invite-declined', roomId);
      this.setState({ roomId: null, isReceivingChallengeFrom: null, opponentModalisActive: false });
    }
  }

  chooseModalClass() {
    const { onlinePlayersModalisActive } = this.state;
    const className = onlinePlayersModalisActive
      ? 'modal-box'
      : 'hidden';
    return className;
  }

  chooseOverlayClass() {
    const { onlinePlayersModalisActive, challengerModalisActive, opponentModalisActive } = this.state;

    const className = onlinePlayersModalisActive || challengerModalisActive || opponentModalisActive
      ? 'overlay'
      : 'hidden';
    return className;
  }

  getOpponentSocketId(opponentUsername) {
    let socketId = null;
    const { onlinePlayers } = this.state;
    for (const key in onlinePlayers) {
      socketId = onlinePlayers[key] === opponentUsername && key;
    }
    return socketId;
  }

  chooseChallengerModalClass() {
    const { challengerModalisActive, opponentModalisActive } = this.state;
    const className = challengerModalisActive
      ? 'challenger-modal-box'
      : opponentModalisActive
        ? 'opponent-modal-box'
        : 'hidden';
    return className;
  }

  chooseChallengeModalTitle() {
    const { challengerModalisActive, opponentModalisActive } = this.state;
    const modalTitle = challengerModalisActive
      ? 'Challenge Sent'
      : opponentModalisActive
        ? "You've Been Challenged"
        : 'hidden';
    return modalTitle;
  }

  chooseChallengeModalText() {
    const { challengerModalisActive, isSendingChallengeTo, isReceivingChallengeFrom } = this.state;

    const modalText = challengerModalisActive
      ? <p className='challenger-modal-text'>You have challenged {isSendingChallengeTo} to a game.<br />
        Waiting for their response...
      </p >
      : <p className='opponent-modal-text'>{isReceivingChallengeFrom} has challenged you to a game!</p >;
    return modalText;
  }

  chooseChallengeModalButtons() {
    const { challengerModalisActive } = this.state;
    const modalButtons = challengerModalisActive
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
        <div className='row center'>
          <div className='center-horiz-vert'>
            <img className='player-avatar-img-size' src='images/player1.png' alt='player1' />
            <p className='player-names-size'>Bill</p>
          </div>
        </div>
        <div className='row center'>
          <div>
            <div className='player-deck'>
              <img src='images/cards/face-down.jpg' alt='backofcard' className='deck-cards deck-1' />
              <img src='images/cards/face-down.jpg' alt='backofcard' className='deck-cards deck-2' />
              <img src='images/cards/face-down.jpg' alt='backofcard' className='deck-cards deck-3' />
              <img src='images/cards/face-down.jpg' alt='backofcard' className='deck-cards deck-4' />
              <img src='images/cards/face-down.jpg' alt='backofcard' className='deck-cards deck-5' />
            </div>
          </div>
        </div>
        <div className='row center'>
          <button onClick={this.handleClick} id='online-players-button'>View Online Players</button>
        </div>
        <div className='row center'>
          <div className='center-horiz-vert player-2-stretch'>
            <img className='player-avatar-img-size' src='images/player2.png' alt='player1' />
            <p className='player-names-size'>You</p>
          </div>
        </div>
        <div className={this.chooseModalClass()}>
          <button onClick={this.handleClick} className='fa-solid fa-x' />
          <h3>Online Players</h3>
          <p className='modal-text'>
            These are the players currently online. Click<br />
            on them to challenge them to a game of war!
          </p>
          <ul className='center'>
            {this.showOnlinePlayers()}
          </ul>
        </div>
        <div className={this.chooseChallengerModalClass()}>
          <h3 className='challenger-modal-title'>{this.chooseChallengeModalTitle()}</h3>
          {this.chooseChallengeModalText()}
          <div className='center-column modal'>
            <img className='player-avatar-img-size challenger-modal-img' src='images/player1.png'/>
            {this.chooseChallengeModalButtons()}
          </div>
        </div>
        <div className={this.chooseOverlayClass()} />
      </>
    );
  }
}
