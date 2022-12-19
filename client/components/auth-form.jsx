import React from 'react';

export default class AuthForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      error: null,
      fetchingData: null
    };
    this.handleUsernameChange = this.handleUsernameChange.bind(this);
    this.handlePasswordChange = this.handlePasswordChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleDemoUsernameClick = this.handleDemoUsernameClick.bind(this);
    this.errorMessage = React.createRef();
  }

  componentDidMount() {
    window.addEventListener('hashchange', () => {
      this.setState({
        error: null
      });
    });
  }

  handleSubmit(event) {
    event.preventDefault();
    const { action, handleSignIn } = this.props;
    const headers = {
      'Content-Type': 'application/json'
    };
    this.setState({ fetchingData: true });
    fetch(`/api/auth/${action}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(this.state)
    })
      .then(response => response.json())
      .then(result => {
        this.setState({ fetchingData: false });
        const { error, user, token } = result;
        if (result.error) {
          this.setState({ error });
        }
        if (action === 'sign-up' && !error) {
          window.location.hash = 'sign-in';
          this.errorMessage.current.blur();
          this.setState({ username: '', password: '' });
        } else if (user && token) {
          handleSignIn(result);
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

  showErrorMessage() {
    const { error } = this.state;
    if (error) {
      return <p className='input-error-message'>{error}.</p>;
    } else {
      return <p className='input-error-message'>&nbsp;</p>;
    }
  }

  showButtonContent() {
    const { fetchingData } = this.state;
    const { action } = this.props;
    if (fetchingData) {
      return <div className="lds-spinner auth"><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /></div>;
    } else if (action === 'sign-in') {
      return 'Sign In';
    } else if (action === 'sign-up') {
      return 'Sign Up';
    }
  }

  chooseAlts() {
    const path = this.props.action;
    const altHref = path === 'sign-in' ? '#sign-up' : '#sign-in';
    const altAnchor = path === 'sign-in' ? 'Sign Up' : 'Sign in';
    const altQuestion = path === 'sign-in' ? "Don't have an account?" : 'Already have an account?';

    return <p>{altQuestion} <a href={altHref}>{altAnchor}</a></p>;
  }

  handleDemoUsernameClick() {
    this.setState({ username: 'Demo', password: 'password123' });
  }

  showDemoButton() {
    const path = this.props.action;
    if (path === 'sign-up') {
      return;
    }
    return path === 'sign-in' &&
    <button className='form-button' onClick={this.handleDemoUsernameClick}>Demo Account</button>;
  }

  render() {
    return (
      <>
        <form onSubmit={this.handleSubmit}>
          <input autoFocus required type="text" placeholder='Username' value={this.state.username} onChange={this.handleUsernameChange} />
          <input ref={this.errorMessage} required type="password" placeholder='Password' value={this.state.password} onChange={this.handlePasswordChange} id='password-input' />
          {this.showErrorMessage()}
          <button className='name-avatar-spacing form-button demo-button'>{this.showButtonContent()}</button>
        </form>
        {this.showDemoButton()}
        {this.chooseAlts()}
      </>
    );
  }
}
