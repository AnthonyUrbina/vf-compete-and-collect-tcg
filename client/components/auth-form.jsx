import React from 'react';

export default class AuthForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: ''
    };
    this.handleUsernameChange = this.handleUsernameChange.bind(this);
    this.handlePasswordChange = this.handlePasswordChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit(event) {
    event.preventDefault();
    const { action } = this.props;
    const headers = {
      'Content-Type': 'application/json'
    };

    fetch(`/api/auth/${action}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(this.state)
    })

      .then(response => response.json())
      .then(result => {
        if (action === 'sign-up') {
          window.location.hash = 'sign-in';
        } else if (result.user && result.token) {
          this.props.handleSignIn(result);
        }
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

    const altButtonText = this.props.action === 'sign-in' ? 'Sign In' : 'Sign Up';
    return (
      <form onSubmit={this.handleSubmit}>
        <input type="text" placeholder='Username' value={this.state.username} onChange={this.handleUsernameChange} />
        <input type="password" placeholder='Password' value={this.state.password} onChange={this.handlePasswordChange} />
        <button id='form-button'>{altButtonText}</button>
      </form>
    );
  }
}
