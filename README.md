# Gai - AI-Powered Git Commits

[![NPM Version](https://img.shields.io/npm/v/gai-cli.svg)](https://www.npmjs.com/package/gai-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Built with: TypeScript](https://img.shields.io/badge/Built%20with-TypeScript-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Say goodbye to tedious commit messages. `gai` is a command-line interface (CLI) that leverages Google's Gemini AI to automatically generate clear, concise, and conventional commit messages from your staged changes.

## Features

-   **Intelligent Commit Generation**: Uses Google Gemini to analyze your code changes (`git diff`) and write a high-quality commit message.
-   **Conventional Commits Compliant**: Generated messages follow the [Conventional Commits](https://www.conventionalcommits.org/) specification, improving your project's history clarity.
-   **Highly Customizable**: Force a specific commit type, add a scope, or generate messages in different languages.
-   **Seamless Git Workflow**: Integrates directly with your existing Git workflow. Use it to stage all files, amend previous commits, or just to get a message suggestion.
-   **Safe & Transparent**: Use `--dry-run` to preview the commit message and command before execution, and `--verbose` for detailed output.
-   **Runtime Agnostic**: Works in any standard Node.js environment.

## Prerequisites

Before you begin, ensure you have the following installed:
-   [Node.js](https://nodejs.org/) (v18 or later)
-   [Git](https://git-scm.com/)

## Installation

Install `gai` globally on your system using `npm`. This will make the `gai` command available in any terminal session.

```bash
npm install -g gai-cli
```
*(Remember to replace `gai-cli` with the actual package name on npm).*

Once installed, you can run `gai` from any Git repository on your system.

## Configuration: Setting up your Gemini API Key

`gai` requires a Google Gemini API key to function.

1.  **Get an API Key**: Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to create your free API key.

2.  **Set the Environment Variable**: You need to export the API key as an environment variable named `GEMINI_API_KEY`.

    ```bash
    export GEMINI_API_KEY="YOUR_API_KEY_HERE"
    ```

3.  **(Recommended) Make it Permanent**: To avoid running the `export` command in every new terminal session, add it to your shell's configuration file (e.g., `.zshrc`, `.bashrc`, or `.profile`):

    ```bash
    # For Zsh users
    echo 'export GEMINI_API_KEY="YOUR_API_KEY_HERE"' >> ~/.zshrc

    # For Bash users
    echo 'export GEMINI_API_KEY="YOUR_API_KEY_HERE"' >> ~/.bashrc

    # Then, reload your shell to apply the changes
    source ~/.zshrc
    # or
    source ~/.bashrc
    ```

## Usage

Using `gai` is simple. Navigate to your Git repository, stage some files, and run the command.

### Basic Usage

1.  Stage the files you want to commit:
    ```bash
    git add src/index.ts package.json
    ```

2.  Run `gai` to generate and create the commit:
    ```bash
    gai
    ```

This will analyze the staged changes, generate a commit message, display it for you, and then execute the `git commit` command.

### Options

| Option                  | Alias | Description                                                        | Default   |
| ----------------------- | ----- | ------------------------------------------------------------------ | --------- |
| `--help`                | `-h`  | Display the help menu.                                             |           |
| `--version`             | `-V`  | Display the version of the application.                            |           |
| `--all`                 | `-a`  | Stage all tracked and untracked changes before committing (`git add -A`). | `false`   |
| `--amend`               | `-A`  | Amend the previous commit instead of creating a new one.           | `false`   |
| `--dry-run`             | `-n`  | Show the generated commit message and command without executing it. | `false`   |
| `--message <message>`   | `-m`  | Provide a custom commit message and skip the AI generation.        |           |
| `--type <type>`         | `-t`  | Force a specific Conventional Commit type (e.g., `feat`, `fix`).   |           |
| `--scope <scope>`       | `-s`  | Specify a scope for the commit (e.g., `api`, `auth`).              |           |
| `--lang <lang>`         | `-l`  | Language for the generated message (e.g., `spanish`, `french`).    | `english` |
| `--verbose`             | `-v`  | Show detailed information about the process.                       | `false`   |

### Examples

**1. Stage all changes and generate a commit in Spanish**
```bash
gai -a -l spanish
```

**2. Force a `feat` type with a specific scope**
```bash
# First, stage your files
git add .

# Run with type and scope
gai -t feat -s payments
```
> **Generated commit:** `feat(payments): add new endpoint for processing transactions`

**3. Preview a commit message without executing it (Dry Run)**
```bash
gai -a -n
```
> **Output:**
> ```
> COMMIT READY
> refactor(auth): simplify token validation logic
>
> Dry Run: The following command will not be executed:
> $ git commit -m "refactor(auth): simplify token validation logic"
> ```

**4. Amend the last commit**
Stage the additional changes you want to include, then run:
```bash
git add src/fix.ts
gai -A
```
> This will use all currently staged changes to amend the previous commit, generating a new message that reflects the complete set of changes.

**5. Skip AI and use your own message**
```bash
gai -a -m "docs: update README with new installation instructions"
```

## Contributing

Contributions are welcome! If you'd like to contribute, please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes.
4.  Commit your changes (`git commit -am 'feat: add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature`).
6.  Create a new Pull Request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
