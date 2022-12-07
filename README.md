# War

A full stack JavaScript application for people who want to play cards.


## Why I Built This

As a competitive-gaming enthusiast , I wanted to build an application for people to compete against each-other in real-time.

## Technologies Used

- React.js
- Webpack
- Socket.io
- Node.js
- Express
- PostgreSQL
- HTML5
- CSS3
- Dokku
- AWS
- Lodash

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

![faceoff-mobile](server/assets/faceoff-mobile.gif)
![enter-match-mobile](server/assets/enter-match-mobile.gif)

## Development

### System Requirements

- Node.js 18 or higher
- Socket.io 4.5.4 or higher
- NPM 18 or higher
- PostgreSQL 14.3 or higher

### Getting Started

1. Clone the repository.

    ```shell
    git clone https://github.com/AnthonyUrbina/War
    cd War
    ```

1. Install all dependencies with NPM.

    ```shell
    npm install
    ```

1. Import the example database to PostgreSQL.

    ```shell
    npm run db:import
    ```

1. Make a copy of the .env.example file. Name your copy `.env`.

    ```shell
    cp .env.example .env
    ```

1. Set up your environmental variables in `.env`. Replace `changeMe` with your own credentials.

    ```shell
    TOKEN_SECRET=changeMe
    DATABASE_URL=postgres://dev:dev@localhost/changeMe?sslmode=disable
    ```

1. Start the project. Once started you can view the application by opening http://localhost:3000 in your browser.

    ```shell
    npm run dev
    ```
