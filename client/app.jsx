import React from 'react';
import AuthPage from './pages/auth';
import parseRoute from './lib/parse-route';
import AppContext from './lib/app-context';
import Home from './pages/home';
import jwtDecode from 'jwt-decode';
import Game from './pages/game';
import Navbar from './components/navbar';
import NotFound from './pages/not-found';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      route: parseRoute(window.location.hash)
    };
    this.handleSignIn = this.handleSignIn.bind(this);
    this.handleSignOut = this.handleSignOut.bind(this);
  }

  componentDidMount() {
    window.addEventListener('hashchange', () => {
      this.setState({
        route: parseRoute(window.location.hash)
      });
    });
    const token = window.localStorage.getItem('war-jwt');
    const user = token ? jwtDecode(token) : null;
    this.setState({ user });
  }

  handleSignIn(results) {
    const { user, token } = results;
    window.localStorage.setItem('war-jwt', token);
    this.setState({ user });
  }

  handleSignOut() {
    window.localStorage.removeItem('war-jwt');
    window.localStorage.removeItem('war-game-routes');
    window.location.hash = '';
    this.setState({ user: null });
  }

  choosePage() {
    const { path } = this.state.route;
    const { user } = this.state;
    if (path === '') {
      return (
        <>
          <Navbar />
          <Home />
        </>
      );
    } else if (path === 'sign-in' || path === 'sign-up') {
      return <AuthPage />;
    } else if (user && path.includes('-')) {
      return (
        <>
          <Navbar />
          <Game />
        </>
      );
    }
    return (
      <>
        <Navbar/>
        <NotFound />
      </>
    );
  }

  getOpponentUsername(roomId, user) {
    let opponent;
    const { username } = user;
    const splitUsernames = roomId.split('-');
    for (let i = 0; i < splitUsernames.length; i++) {
      if (splitUsernames[i] !== username) {
        opponent = splitUsernames[i];
      }
    }
    return opponent;
  }

  chooseContainerColor() {
    if (this.state.user) {
      return 'container lobby';
    } else {
      return 'container';
    }
  }

  chooseBackgroundColor() {
    if (this.state.user) {
      return 'lobby';
    } else {
      return '';
    }
  }

  render() {
    const { user, route } = this.state;
    const handleSignIn = this.handleSignIn;
    const handleSignOut = this.handleSignOut;
    const context = { handleSignIn, handleSignOut, user, route };
    return (
      <AppContext.Provider value={context}>
        <div className={this.chooseBackgroundColor()}>
          <div className={this.chooseContainerColor()}>
            {this.choosePage()}
          </div>
        </div>
      </AppContext.Provider>
    );
  }
}
