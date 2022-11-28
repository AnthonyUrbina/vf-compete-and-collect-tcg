# War

A full stack JavaScript application for people who want to play cards.


## Why I Built This

As a competitive-gaming enthusiast , I wanted to build an application for people to compete against each-other in real time.

## Technologies Used

- React.js
- Webpack
- Socket.io
- Node.js
- PostgreSQL
- HTML5
- CSS3
- Dokku

## Live Demo

Try the application live at [https://warcardgame.xyz](https://warcardgame.xyz)

## Features

- User can sign in.
- User can sign up.
- User can view a list of online users.
- User can send a challenge.
- User can receive a challenge.
- User can enter a match.
- User flip a card.
- User can see their opponent's card flip in real time.
- User can face-off.
- User can win a match.

## Stretch Features

- User can battle.
- User can sign out.

## Preview

![SGT React](assets/sgt-react.gif)

## Development

### System Requirements

- Node.js 10 or higher
- NPM 6 or higher
- MongoDB 4 or higher

### Getting Started

1. Clone the repository.

    ```shell
    git clone https://github.com/Learning-Fuze/sgt-react
    cd sgt-react
    ```

1. Install all dependencies with NPM.

    ```shell
    npm install
    ```

1. Import the example database to MongoDB.

    ```shell
    mongoimport --db sgt-react database/dump.json
    ```

1. Start the project. Once started you can view the application by opening http://localhost:3000 in your browser.

    ```shell
    npm run dev
    ```
