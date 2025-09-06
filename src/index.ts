#!/usr/bin/env node --no-deprecation
import { GoogleGenAI } from "@google/genai";
import chalk from "chalk";
import { program } from "commander";
import { execa } from "execa";

// Initialize Google Gemini client (picks up GEMINI_API_KEY from .env)
const ai = new GoogleGenAI({});
const config = {
  baseApiUrl: "https://gen.bernabe.dev",
} as const;

/**
 * A centralized error handler to provide consistent, user-friendly error messages.
 * @param message A user-friendly message describing the error.
 * @param error The underlying error object (optional).
 */
function handleError(message: string, error?: any): never {
  console.error(chalk.red.bold(`\n❌ Error: ${message}`));
  if (error) {
    // execa errors often have more specific details in stderr
    const details = error.stderr || error.message;
    if (details) {
      console.error(chalk.gray(`  > ${details.trim()}`));
    }
  }
  console.error(chalk.yellow("\nAborting commit process."));
  process.exit(1);
}

/**
 * Retrieves the diff of staged changes in git.
 * Exits the process if the command fails.
 */
async function getStagedDiff(): Promise<string> {
  try {
    const { stdout } = await execa("git", ["diff", "--staged"]);
    return stdout.trim();
  } catch (error) {
    return handleError(
      "Could not retrieve staged diff. Are you in a git repository?",
      error
    );
  }
}

/**
 * Retrieves the last commit message.
 * Exits the process if the command fails.
 */
async function getLastCommitMessage(): Promise<string> {
  try {
    const { stdout } = await execa("git", ["log", "-1", "--pretty=%B"]);
    return stdout.trim();
  } catch (error) {
    return handleError(
      "Could not retrieve the last commit message. Are there any commits in this repository yet?",
      error
    );
  }
}

/**
 * Generates a Conventional Commit message using Google Gemini or a fallback API.
 *
 * @param diff The staged git diff
 * @param lang Language for the commit message
 * @param type Optional commit type (feat, fix, etc.)
 * @param scope Optional commit scope
 * @param previousMsg Optional previous commit message when amending
 */
async function generateCommitMessage(
  diff: string,
  lang: string = "english",
  type?: string,
  scope?: string,
  previousMsg?: string
): Promise<string> {
  // --- Fallback API Path ---
  if (!process.env.GEMINI_API_KEY) {
    try {
      const body = JSON.stringify({ diff, lang, type, scope, previousMsg });
      const res = await fetch(`${config.baseApiUrl}/gai/gene`, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `API request failed with status ${res.status}: ${errorText}`
        );
      }
      const data = (await res.json()) as { message: string };
      if (!data.message) {
        throw new Error("Fallback API returned an empty message.");
      }
      return data.message;
    } catch (error) {
      // Re-throw a more specific error to be caught by the main handler
      throw new Error(
        `Fallback API failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // --- Google Gemini SDK Path ---
  const languageInstruction = `The commit message must be in ${lang}.`;
  const typeInstruction = type ? `The commit type must be "${type}".` : "";
  const scopeInstruction = scope ? `The commit scope must be "${scope}".` : "";
  const previousInstruction = previousMsg
    ? `- The previous commit message was:\n"""${previousMsg}"""\n- Incorporate and update it as needed.`
    : "";

  const prompt = `
Analyze the following git diff and generate a Conventional Commit message that accurately describes the changes made.
- The message must be concise and informative, following the Conventional Commits format.
- ${languageInstruction}
- ${typeInstruction}
- ${scopeInstruction}
- The commit message subject line must not exceed 100 characters.
- Use imperative mood (e.g., "add feature" instead of "added feature").
- If the commit fixes a bug, use "fix".
- If the commit introduces a new feature, use "feat".
- If the commit includes refactoring, use "refactor".
- If the commit adds tests, use "test".
- If the commit updates documentation, use "docs".
- Do not include unnecessary details; keep it clear and to the point.
${previousInstruction}
- **Return ONLY the raw commit message text without any formatting, quotes, backticks, or delimiters.**

Here is the git diff:

${diff}
`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const message = response.text?.trim();
    if (!message) {
      throw new Error("Gemini returned an empty or invalid response.");
    }
    return message;
  } catch (error) {
    throw new Error(
      `Google Gemini API call failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// --- CLI Definition ---
program
  .version("1.0.0")
  .description("A CLI for generating and creating smart commits with AI.")
  .option("-m, --message <message>", "Custom commit message (skip AI).")
  .option("-a, --all", "Include all changes (runs 'git add -A').")
  .option("-A, --amend", "Amend the last commit.")
  .option("-n, --dry-run", "Show the commit command without executing it.")
  .option("-v, --verbose", "Show detailed process information.")
  .option("-t, --type <type>", "Force the commit type (e.g., feat, fix, docs).")
  .option("-s, --scope <scope>", "Specify a scope for the commit.")
  .option(
    "-l, --lang <lang>",
    "Language for the commit message (e.g., 'spanish', 'english').",
    "english"
  )
  .action(async (options) => {
    try {
      if (options.verbose) {
        console.log(chalk.cyan("Starting commit process..."));
      }

      if (options.all) {
        if (options.verbose) {
          console.log(chalk.yellow("Staging all changes..."));
        }
        try {
          await execa("git", ["add", "-A"], { stdio: "inherit" });
        } catch (error) {
          handleError("Failed to stage all changes.", error);
        }
      }

      const stagedDiff = await getStagedDiff();
      if (!stagedDiff && !options.amend) {
        console.log(
          chalk.yellow(
            "No staged changes to commit. Use '-a' to add all changes or stage files manually."
          )
        );
        process.exit(0);
      }

      let previousMsg: string | undefined;
      if (options.amend) {
        if (options.verbose) {
          console.log(
            chalk.blue("Fetching last commit message for context...")
          );
        }
        previousMsg = await getLastCommitMessage();
      }

      let commitMessage = options.message;
      if (!commitMessage) {
        console.log(chalk.cyan("Generating commit message with AI..."));
        commitMessage = await generateCommitMessage(
          stagedDiff,
          options.lang,
          options.type,
          options.scope,
          previousMsg
        );
        if (options.verbose) {
          console.log(chalk.green("Message generated successfully."));
        }
      }

      // Build git command
      const gitArgs = ["commit"];
      if (options.amend) gitArgs.push("--amend");
      gitArgs.push("-m", commitMessage);

      console.log(
        `\n${chalk.bgGreen.black(" COMMIT READY ")}\n${chalk.green(
          commitMessage
        )}`
      );

      if (options.dryRun) {
        console.log(
          `\n${chalk.yellow(
            "Dry Run: The following command will not be executed:"
          )}`
        );
        console.log(chalk.gray(`$ git ${gitArgs.join(" ")}`));
      } else {
        console.log(chalk.cyan("\nExecuting commit..."));
        try {
          await execa("git", gitArgs, { stdio: "inherit" });
          console.log(chalk.green("\n✔ Commit completed successfully!"));
        } catch (error) {
          // The commit itself can fail (e.g., pre-commit hooks)
          handleError("The git commit command failed.", error);
        }
      }
    } catch (error) {
      // This is a top-level catch-all for any unexpected errors,
      // especially from the generateCommitMessage function.
      handleError("An unexpected error occurred", error);
    }
  });

program.parse(process.argv);
