import React from 'react';
import HelloWorld from '../components/hello-world';
import Redirect from '../components/redirect';
import AppContext from '../lib/app-context';

export default class Home extends React.Component {
  render() {
    if (!this.context.user) return <Redirect to="sign-in" />;

    return (
      <HelloWorld token={this.context.user} />
    );
  }
}

Home.contextType = AppContext;

/*
show a list of online players
- everyone who is signed in and has an account should be visible
- when you sign in, a socket connection is formed
- your socket id is shown in shown as socket.id
- but to get a list of currently connected socket.id's, i use fetchRooms
- so now, everytime the button is clicked, i need a current list of online users
- so if i send this list of socket id's to the client, how does the client know which user profile to display?
- well, what if I only send them back a user id or username, since, evertime a socket connection is being made,
im aleady sending a user's payload (containing userId and username) to the backend
- all I would have to do is
  - send payload from client to server upon token authenticated socket request
  - destructure username from payload and store in an object const clientList = {socket.id: clientUsername}
  - then wait until user clicks button
  - when user clicks button
    - get a list of currently connected socketIds io.fetchSockets(),
    - loop through the clientList object I created previously
    - which would result in a list of usernames of all currently connected users
    - next, send the list to the client
    - use the list to update state to display list of current active users
    - re-render
    - new usernames display on the modal
    - tadaaaaaH !
    - when a user disconnects, remove their info from the object
    - loop through it, send back the new list of usernames to the client

issue #1
- evertime i log in once, TWO sockets connections are being made... why?????
*/
