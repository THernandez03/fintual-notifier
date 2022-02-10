build:
	mkdir -p dist
	deno bundle ./src/main.ts > ./dist/main.js

dev:
	ENV=development
	deno run --watch --allow-read=./envs --allow-env ./src/main.ts

run:
	ENV=production
	make build
	deno run --allow-read=./envs --allow-env ./dist/main.js
