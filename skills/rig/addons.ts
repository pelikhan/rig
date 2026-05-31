import { analyzeResponse, defaultRepairPrompt } from "./rig.ts";
import type { AgentMiddleware } from "./rig.ts";

const DEFAULT_STEERING_WARNING = "You are running out of turns. This is your final attempt before reaching the turn limit. Please correct your output now.";

export type SteeringOptions = {
  message?: string;
};

export function steering(options: SteeringOptions = {}): AgentMiddleware {
  const message = options.message ?? DEFAULT_STEERING_WARNING;
  return async (context, next) => {
    await next();
    if (context.nextPrompt && context.turn + 1 === context.maxTurns) {
      context.nextPrompt = `${context.nextPrompt}\n${message}`;
    }
  };
}

export const repair: AgentMiddleware = async (context, next) => {
  await next();
  if (context.completed || context.error !== undefined || context.nextPrompt !== undefined) {
    return;
  }
  if (context.response === undefined) {
    return;
  }
  const analysis = analyzeResponse(context.response, context.outputSchema, context.spec.name, context.turn);
  if (analysis.ok) {
    context.completed = true;
    context.output = analysis.output;
    return;
  }
  if (context.turn >= context.maxTurns) {
    context.error = analysis.error;
    return;
  }
  context.nextPrompt = defaultRepairPrompt(context.spec, analysis.error);
};

export const addons = {
  repair,
  steering,
};
