# reputation-ranking-system

The "Reputation Ranking System" is project that aims to build a semi-automatic way of assigning a retribuition score for a given open source project.

Find more about the ideas behind and the roadmap here: [https://club.dacoder.it/rrs](https://club.dacoder.it/rrs).

Inspired by [https://sourcecred.io/](https://sourcecred.io/).

## RRS: RRA + Spotlight

Composed of two subsystems: Reputation Ranking Algorithm (RRA) and Reputation Spotlight.

### RRA

Automatic algorithm that assigns a score for an open source project using Github API to gather the needed data.

### Spotlight

Manual updates of the reputation score in order to adjust for not traceable contributions (e.g. youtube comments or advice given via private emails/messages).

## Setup

If you want to try it with your system you will need only:

- Node.js
- Github account

### Github Token

After cloning locally the repository you will need a github token for fetching public data of a repository.
Learn how to obtain one.

When creating the token you will only need to select the scopes _repo > public_repo_.

![github token scopes](docs/github-token-scopes.png)

When you have obtained the token, create an .env file with the following content:

```bash
# .env
GITHUB_TOKEN=your-token-here
```

### Run locally

- `yarn` to install dependencies (original setup with yarn, so there will be a yarn.lock, it is fine to have a package-lock.json if you use npm)
- add two lines to the `.env` files by specifying:

  ```bash
  # .env
  # ... other variables before
  GITHUB_OWNER=github-account
  GITHUB_REPO=github-repo-name
  ```

- `yarn dev`: will run the algorithm against the specificed repo using the entrypoint `test.js`

## Contributing

- Fork the repository
- Create a feature branch
- Commit your changes
- Push to the branch
- Create a Pull Request against `develop` branch

Important: Please keep your pull requests small and focused. This will make it easier to review and merge.

## Feature Requests

If you have a feature request, please open an [issue](https://github.com/davide97g/reputation-ranking-system/issues) and make sure it is tagged with enhancement.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
