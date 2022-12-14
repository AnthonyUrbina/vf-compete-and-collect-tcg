import React from 'react';
import AppContext from '../lib/app-context';

export default class Navbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      signOutModalShowing: false,
      returnHomeModalShowing: false
    };
    // this.handleSignOut = this.props.handleSignOut.bind(this);
    // this.handleReturnHome = this.props.handleReturnHome.bind(this);
    this.handleClick = this.handleClick.bind(this);
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

  showModal() {
    const { handleSignOut, handleReturnHome } = this.context;
    const { signOutModalShowing, returnHomeModalShowing } = this.state;
    if (signOutModalShowing || returnHomeModalShowing) {
      const modalTitle = signOutModalShowing ? 'Sign Out' : 'Return Home';
      const modalText = signOutModalShowing ? 'Signing Out' : 'Returning Home';
      const modalButton = signOutModalShowing ? 'Sign Out' : 'Confirm';
      const method = signOutModalShowing ? handleSignOut : handleReturnHome;

      return (
        <div className='sign-out-modal'>
          <h3 className='sign-out-modal-title'>{modalTitle}</h3>
          <p className='sign-out-modal-text'>
            {`Are you sure? ${modalText} now will end your current session.`}
          </p>
          <div className="row sign-out-buttons-spacing">
            <button id='cancel-button' className='challenger-modal-button sign-out-modal-button' onClick={this.handleClick}>Cancel</button>
            <button className='challenger-modal-button sign-out-modal-button' onClick={method}>{modalButton}</button>
          </div>
        </div>
      );
    }
  }

  render() {
    return (
      <>
        <div className='row center header-spacing'>
          <div className="column-one-fourth">
            <i id='home-button' className="fa-solid fa-house" onClick={this.handleClick} /></div>
          <div className="column-half header-">
            <h1 className='home-header-color'>WAR</h1>
          </div>
          <div className="column-one-fourth">
            <i className="fa-solid fa-right-from-bracket" onClick={this.handleClick} />
          </div>
        </div>
        {this.showModal()}
      </>
    );
  }
}

Navbar.contextType = AppContext;
