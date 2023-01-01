import React from 'react';

export default class NotFound extends React.Component {
  render() {
    return (
      <div className='not-found-text'>
        <img src="images/avatars/persistent-penguin.png" alt="persistent-penguin" />
        <h1>Sorry, this page was not found.</h1>
        <h3>Please return Home <br /> and try again.</h3>
      </div>
    );
  }
}
