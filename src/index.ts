import { prompt } from "enquirer";
import * as path from "path";
import { AnswerValue, Condition, questions } from "./lib/questions";
import { enumFilesRecursiveSync } from "./lib/tools";

function testCondition(condition: Condition | undefined, answers: Record<string, any>): boolean {
	if (condition == undefined) return true;
	if ("value" in condition) {
		return answers[condition.name] === condition.value;
	} else if ("contains" in condition) {
		return (answers[condition.name] as AnswerValue[]).indexOf(condition.contains) > -1;
	}
	return false;
}

async function ask() {
	let answers: Record<string, any> = {};
	for (const q of questions) {
		// Headlines
		if (typeof q === "string") {
			console.log(q);
			continue;
		}
		// actual questions
		if (testCondition(q.condition, answers)) {
			// Make properties dependent on previous answers
			if (typeof q.initial === "function") {
				q.initial = q.initial(answers);
			}
			while (true) {
				// Ask the user for an answer
				const answer: Record<string, any> = await prompt(q);
				// Cancel the process if necessary
				const value = answer[q.name as string];
				if (value == undefined) {
					console.error("Adapter creation canceled");
					process.exit(1);
				}
				// Apply an optional transformation
				if (typeof q.resultTransform === "function") {
					answer[q.name as string] = q.resultTransform(answer[q.name as string]);
				}
				// Test the result
				if (q.action != undefined) {
					const testResult = await q.action(value);
					if (!testResult) process.exit(1);
					if (testResult === "retry") continue;
				}
				// And remember it
				answers = { ...answers, ...answer };
				break;
			}
		}
	}
	// console.dir(answers);
	return answers;
}

async function work(answers: Record<string, any>): Promise<void> {
	const templateDir = "./build/templates";
	const files = await Promise.all(
		enumFilesRecursiveSync(
			templateDir,
			name => /\.js$/.test(name),
		).map(f => require(path.join("..", f))(answers) as Promise<string>),
	);
	console.log(files[0]);
}

ask().then(work).catch(console.error);
