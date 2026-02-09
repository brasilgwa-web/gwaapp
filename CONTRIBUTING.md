# Contributing to WGA Brasil

First of all, thanks for taking the time to contribute!

The following is a set of guidelines for contributing to WGA Brasil. These are just guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Code of Conduct

This project and everyone participating in it is governed by a Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Start by searching the [Issues](https://github.com/brasilgwa-web/gwaapp/issues) to see if the problem has already been reported. If not, create a new issue and provide a detailed description of the problem, including steps to reproduce it.

### Suggesting Enhancements

If you have an idea for a new feature or improvement, please open an issue and tag it as an "enhancement". Explain why the feature would be useful and how it should work.

### Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### JavaScript Styleguide

- All JavaScript must adhere to [Standard JS](https://standardjs.com/).
- Prefer `const` over `let`. Avoid `var`.
- Use async/await for asynchronous code.

## Deployment

Only the `main` branch is deployed to production. Be careful when merging PRs.
Staging branch `staging` is automatically deployed to the preview environment.
