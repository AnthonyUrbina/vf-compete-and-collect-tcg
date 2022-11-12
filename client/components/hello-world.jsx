/* eslint-disable no-console */
import React from 'react';
import { io } from 'socket.io-client';

export default class HelloWorld extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      onlinePlayers: null,
      modalIsActive: false
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
      console.log(this.socket.id);
      console.log(onlinePlayers);

      delete onlinePlayers[this.socket.id];

      this.setState({ onlinePlayers });
    });

    this.socket.on('user disconnected', socketId => {
      const onlinePlayersCopy = { ...this.state.onlinePlayers };
      delete onlinePlayersCopy[socketId];
      this.setState({ onlinePlayers: onlinePlayersCopy });
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
        <img className='player-avatar-img-size modal-img-spacing' src="images/player2.png" alt="" />{username}
      </li>);
    return playerAppearance;
  }

  handleClick(event) {
    if (this.state.modalIsActive === false) {
      this.setState({ modalIsActive: true });
    } else {
      this.setState({ modalIsActive: false });
    }
  }

  chooseModalClass() {
    const className = this.state.modalIsActive
      ? 'modal-box'
      : 'hidden';
    return className;
  }

  chooseOverlayClass() {
    const className = this.state.modalIsActive
      ? 'overlay'
      : 'hidden';
    return className;
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
        <div className={this.chooseOverlayClass()} />
      </>
    );
  }
}
