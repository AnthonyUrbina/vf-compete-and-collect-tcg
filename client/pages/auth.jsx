import React from 'react';

export default class AuthPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: null,
      password: null
    };

    this.handleUsernameChange = this.handleUsernameChange.bind(this);
    this.handlePasswordChange = this.handlePasswordChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit(event) {
    event.preventDefault();

    const headers = {
      'Content-Type': 'application/json'
    };

    fetch('/api/auth/sign-up', {
      method: 'POST',
      headers,
      body: JSON.stringify(this.state)
    })

      .then(response => response.json())
      .then(result => {
        window.location.hash = 'sign-in';
      });

    this.setState({ username: '', password: '' });
  }

  handleUsernameChange(event) {
    this.setState({ username: event.target.value });

  }

  handlePasswordChange(event) {
    this.setState({ password: event.target.value });
  }

  render() {
    return (
      <>
        <div className='row'>
          <div className='column-full header-spacing'>
            <h1>WAR</h1>
          </div>
        </div>
        <div className="row center-horizontal">
          <div className="column-full">
            <img src="images/ace.png" alt="ace" />
          </div>
          <div className="column-full form-spacing">
            <form onSubmit={this.handleSubmit}>
              <input type="text"placeholder='Username' value={this.state.username} onChange={this.handleUsernameChange}/>
              <input type="password" placeholder='Password' value={this.state.password} onChange={this.handlePasswordChange}/>
              <button id='form-button'>Sign Up</button>
            </form>
            <p>Already have an account? <a href="sign-in">Sign in</a></p>
          </div>
        </div>
      </>
    );
  }
}
