import React from 'react';
import AuthPage from './pages/auth';
import parseRoute from './lib/parse-route';
import AppContext from './lib/app-context';
import Home from './pages/home';
import jwtDecode from 'jwt-decode';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      token: null,
      route: parseRoute(window.location.hash)
    };
    this.handleSignIn = this.handleSignIn.bind(this);
  }

  componentDidMount() {
    window.addEventListener('hashchange', () => {
      this.setState({
        route: parseRoute(window.location.hash)
      });
    });
    const token = window.localStorage.getItem('react-context-jwt');
    const user = token ? jwtDecode(token) : null;
    this.setState({ user });
  }

  handleSignIn(results) {
    const { user, token } = results;
    window.localStorage.setItem('react-context-jwt', token);
    this.setState({ user });
  }

  chooseRender() {
    if (this.state.route.path === '') {
      return <Home />;
    } else if (this.state.route.path === 'sign-in' || this.state.route.path === 'sign-up') {
      return <AuthPage />;
    }
  }

  render() {
    const { user, route } = this.state;
    const handleSignIn = this.handleSignIn;
    const context = { handleSignIn, user, route };
    return (
      <AppContext.Provider value={context}>
        <div className='container'>
          {this.chooseRender()}
        </div>
      </AppContext.Provider>
    );
  }
}
