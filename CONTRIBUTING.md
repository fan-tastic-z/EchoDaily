# Contributing to Echo Daily

Thank you for your interest in contributing to Echo Daily! We appreciate your help in making this project better.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to maintain a welcoming and inclusive community.

## How Can I Contribute?

### Report Bugs

Create an issue on GitHub with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Your environment (OS, app version)

### Suggest Features

We welcome feature requests! Please:
- Check existing issues first
- Describe the use case
- Explain why it would be useful
- Consider if it fits the project's vision

### Submit Code

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Development Setup

```bash
# Fork and clone
git clone https://github.com/your-username/echo-daily.git
cd echo-daily

# Install dependencies
pnpm install

# Start development
pnpm tauri dev

# Run tests
cargo test
pnpm test
```

## Pull Request Process

1. **Update README** if you've changed features
2. **Update CHANGELOG** if applicable
3. **Add tests** for new functionality
4. **Ensure all tests pass**
5. **Update documentation**

### PR Title Format

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example: `feat: add dark mode support`

## Coding Standards

### TypeScript/React

- Use functional components with hooks
- Follow TypeScript best practices
- Use meaningful variable names
- Add JSDoc comments for public functions
- Keep components small and focused

### Rust

- Follow Rust style guidelines
- Use `cargo fmt` before committing
- Run `cargo clippy` and fix warnings
- Write idiomatic Rust code
- Add documentation for public APIs

### Git Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Questions?

Feel free to open an issue or start a discussion. We're here to help!

---

Thank you for contributing to Echo Daily! 🎉
