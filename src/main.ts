import { dotenv } from "../deps.ts";

const envFile = `./envs/.env.${Deno.env.get("ENV")}`;

dotenv({
  export: true,
  safe: true,
  defaults: "./envs/.env",
  path: envFile,
  example: envFile,
});

console.log({
  foo: Deno.env.get("EXAMPLE"),
  caca: "caca",
  ENV: Deno.env.get("ENV"),
});
