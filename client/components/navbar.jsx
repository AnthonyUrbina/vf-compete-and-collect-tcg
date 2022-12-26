import React from 'react';
import AppContext from '../lib/app-context';

export default class Navbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      signOutModalShowing: false,
      returnHomeModalShowing: false
    };
    this.handleClick = this.handleClick.bind(this);
    this.handleReturnHome = this.handleReturnHome.bind(this);
    this.homeButton = React.createRef();
  }

  handleClick(event) {
    if (event.target.id === 'cancel-button') {
      this.setState({ signOutModalShowing: false, returnHomeModalShowing: false });
    } else if (event.target.id === 'home-button') {
      this.setState({ returnHomeModalShowing: true });
    } else {
      this.setState({ signOutModalShowing: true });
    }
  }

  handleReturnHome() {
    this.setState({ returnHomeModalShowing: false });
    window.location.hash = '';
  }

  showModal() {
    const { handleSignOut } = this.context;
    const { handleReturnHome } = this;
    const { signOutModalShowing, returnHomeModalShowing } = this.state;
    if (signOutModalShowing || returnHomeModalShowing) {
      const modalTitle = signOutModalShowing ? 'Sign Out' : 'Return Home';
      const modalText = signOutModalShowing ? 'Signing Out' : 'Returning Home';
      const modalButton = signOutModalShowing ? 'Sign Out' : 'Confirm';
      const method = signOutModalShowing ? handleSignOut : handleReturnHome;

      return (
        <div className='nav-bar-modal'>
          <h3 className='nav-bar-modal-title'>{modalTitle}</h3>
          <p className='nav-bar-modal-text'>
            {`Are you sure? ${modalText} now will end your current session.`}
          </p>
          <div className="row nav-bar-buttons-spacing">
            <button id='cancel-button' className='challenger-modal-button nav-bar-modal-button' onClick={this.handleClick}>Cancel</button>
            <button className='challenger-modal-button nav-bar-modal-button' onClick={method}>{modalButton}</button>
          </div>
        </div>
      );
    }
  }

  chooseHomeButtonClass() {
    const { path } = this.context.route;
    return path ? 'fa-solid fa-house' : 'fa-solid fa-house hide-icon';
  }

  chooseTitle() {
    const { path } = this.context.route;
    return path.includes('-') ? 'WAR' : 'LOBBY';
  }

  render() {
    return (
      <>
        <div className='row center header-spacing'>
          <div className="column-one-fourth">
            <a><i ref={this.homeButton} id='home-button' className={this.chooseHomeButtonClass()} onClick={this.handleClick}/></a>
          </div>
          <div className="column-half header-">
            <h1 className='home-header-color'>{this.chooseTitle()}</h1>
          </div>
          <div className="column-one-fourth">
            <a><i className="fa-solid fa-right-from-bracket" onClick={this.handleClick}/></a>
          </div>
        </div>
        {this.showModal()}
      </>
    );
  }
}

Navbar.contextType = AppContext;
