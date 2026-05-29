import { validate, agent } from "rig";

const Shape = {
  summary: "summary",
  risk: agent.enum(["low", "medium", "high"]),
  count_: 1,
};

const result = validate({ summary: "ok", risk: "low" }, Shape);

if (!result.ok) {
  console.error(result.error);
}
