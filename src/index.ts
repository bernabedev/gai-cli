#!/usr/bin/env node
import { GoogleGenAI } from "@google/genai";
import { program } from "commander";
import { execa } from "execa";
import pc from "picocolors";

// Initialize Google Gemini client (picks up GEMINI_API_KEY from .env)
const ai = new GoogleGenAI({});

/**
 * Retrieves the diff of staged changes in git.
 */
async function getStagedDiff() {
  const { stdout } = await execa("git", ["diff", "--staged"]);
  return stdout.trim();
}

/**
 * Generates a Conventional Commit message using Google Gemini.
 */
async function generateCommitMessage(
  diff: string,
  lang: string = "english",
  type?: string,
  scope?: string,
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("The environment variable GEMINI_API_KEY is not defined.");
  }

  const languageInstruction = `The commit message must be in ${lang}.`;
  const typeInstruction = type ? `The commit type must be "${type}".` : "";
  const scopeInstruction = scope ? `The commit scope must be "${scope}".` : "";

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

Here is the git diff:

${diff}
`;

  // Call Gemini
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const message = response.text?.trim();
  if (!message) {
    throw new Error("Gemini returned an empty message.");
  }
  return message;
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
    "english",
  )
  .action(async (options) => {
    if (options.verbose) console.log(pc.cyan("Starting commit process..."));

    if (options.all) {
      if (options.verbose) console.log(pc.yellow("Staging all changes..."));
      await execa("git", ["add", "-A"], { stdio: "inherit" });
    }

    const stagedDiff = await getStagedDiff();
    if (!stagedDiff && !options.amend) {
      console.log(pc.yellow("No staged changes. Use '-a' to add all changes."));
      process.exit(0);
    }

    let commitMessage = options.message;

    if (!commitMessage) {
      if (options.verbose)
        console.log(pc.cyan("Generating commit message with AI..."));
      try {
        commitMessage = await generateCommitMessage(
          stagedDiff,
          options.lang,
          options.type,
          options.scope,
        );
        if (options.verbose)
          console.log(pc.green("Message generated successfully."));
      } catch (error) {
        console.error(pc.red("Failed to generate commit message."), error);
        process.exit(1);
      }
    }

    // Build git command
    const gitCommand = ["git", "commit"];
    if (options.amend) {
      gitCommand.push("--amend");
    }
    gitCommand.push("-m", commitMessage);

    console.log(`\n${pc.bgGreen(pc.black(" COMMIT READY "))}`);
    console.log(pc.green(commitMessage));

    if (options.dryRun) {
      console.log(
        `\n${pc.yellow("Dry Run: The following command will not be executed:")}`,
      );
      console.log(pc.gray(`$ ${gitCommand.join(" ")}`));
    } else {
      console.log(pc.cyan("\nExecuting commit..."));
      await execa("git", gitCommand.slice(1), {
        stdio: "inherit",
      });
      console.log(pc.green("\n✔ Commit completed successfully!"));
    }
  });

program.parse(process.argv);
