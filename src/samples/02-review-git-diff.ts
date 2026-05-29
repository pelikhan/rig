import { agent } from "rig";

const summarize = agent("summarize", {
  instructions: `
    Summarize input.text in three concise bullets.
  `,
});

const { text } = await summarize({
  text: "Long text to summarize...",
});

console.log(text);
