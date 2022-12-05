import React from 'react';

export default class AuthForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      error: null
    };
    this.handleUsernameChange = this.handleUsernameChange.bind(this);
    this.handlePasswordChange = this.handlePasswordChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.errorMessage = React.createRef();
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
        const { error, user, token } = result;
        console.log(result);
        if (result.error) {
          this.setState({ error });
        }
        if (action === 'sign-up') {
          window.location.hash = 'sign-in';
          this.errorMessage.current.blur();
          this.setState({ username: '', password: '' });
        } else if (user && token) {
          this.props.handleSignIn(result);
          this.setState({ username: '', password: '' });
        }
      });
  }

  handleUsernameChange(event) {
    const { error } = this.state;
    if (error) {
      this.setState({ username: event.target.value, error: null });
    } else {
      this.setState({ username: event.target.value });
    }
  }

  handlePasswordChange(event) {
    const { error } = this.state;
    if (error) {
      this.setState({ password: event.target.value, error: null });
    } else {
      this.setState({ password: event.target.value });
    }
  }

  handleError() {
    const { error } = this.state;
    if (error) {
      return <p className='input-error-message'>{error}.</p>;
    } else {
      return <p className='input-error-message'>&nbsp;</p>;
    }
  }

  render() {
    const altButtonText = this.props.action === 'sign-in' ? 'Sign In' : 'Sign Up';
    return (
      <form onSubmit={this.handleSubmit}>
        <input autoFocus required type="text" placeholder='Username' value={this.state.username} onChange={this.handleUsernameChange} />
        <input ref={this.errorMessage} required type="password" placeholder='Password' value={this.state.password} onChange={this.handlePasswordChange} id='password-input' />
        {this.handleError()}
        <button id='form-button'>{altButtonText}</button>
      </form>
    );
  }
}
