import React from 'react';
import AuthPage from './pages/auth';

export default class App extends React.Component {
  render() {
    return (
      <div className='container'>
        <AuthPage />
      </div>
    );
  }
}
