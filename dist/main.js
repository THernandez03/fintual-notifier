// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

function removeEmptyValues(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([, value])=>{
        if (value === null) return false;
        if (value === undefined) return false;
        if (value === "") return false;
        return true;
    }));
}
function difference(arrA, arrB) {
    return arrA.filter((a)=>arrB.indexOf(a) < 0
    );
}
const emptyParseResult = ()=>({
        env: {},
        exports: new Set()
    })
;
const EXPORT_REGEX = /^\s*export\s+/;
function parse(rawDotenv) {
    const env = {};
    const exports = new Set();
    for (const line of rawDotenv.split("\n")){
        if (!isAssignmentLine(line)) continue;
        const lhs = line.slice(0, line.indexOf("=")).trim();
        const { key , exported  } = parseKey(lhs);
        if (exported) {
            exports.add(key);
        }
        let value = line.slice(line.indexOf("=") + 1).trim();
        if (hasSingleQuotes(value)) {
            value = value.slice(1, -1);
        } else if (hasDoubleQuotes(value)) {
            value = value.slice(1, -1);
            value = expandNewlines(value);
        } else value = value.trim();
        env[key] = value;
    }
    return {
        env,
        exports
    };
}
const defaultConfigOptions = {
    path: `.env`,
    export: false,
    safe: false,
    example: `.env.example`,
    allowEmptyValues: false,
    defaults: `.env.defaults`
};
function config(options = {}) {
    const o = mergeDefaults(options);
    const conf = parseFile(o.path);
    const confDefaults = o.defaults ? parseFile(o.defaults) : emptyParseResult();
    const confExample = o.safe ? parseFile(o.example) : emptyParseResult();
    return processConfig(o, conf, confDefaults, confExample);
}
function parseKey(lhs) {
    if (EXPORT_REGEX.test(lhs)) {
        const key = lhs.replace(EXPORT_REGEX, "");
        return {
            key,
            exported: true
        };
    }
    return {
        key: lhs,
        exported: false
    };
}
const mergeDefaults = (options)=>({
        ...defaultConfigOptions,
        ...options
    })
;
function processConfig(options, conf, confDefaults, confExample) {
    if (options.defaults) {
        for(const key in confDefaults.env){
            if (!(key in conf.env)) {
                conf.env[key] = confDefaults.env[key];
            }
        }
        conf.exports = new Set([
            ...conf.exports,
            ...confDefaults.exports
        ]);
    }
    if (options.safe) {
        assertSafe(conf, confExample, options.allowEmptyValues);
    }
    if (options.export) {
        for(const key in conf.env){
            denoSetEnv(key, conf.env[key]);
        }
    } else {
        for (const key of conf.exports){
            denoSetEnv(key, conf.env[key]);
        }
    }
    return conf.env;
}
const denoSetEnv = (key, value)=>Deno.env.get(key) === undefined ? Deno.env.set(key, value) : undefined
;
function parseFile(filepath) {
    try {
        return parse(new TextDecoder("utf-8").decode(Deno.readFileSync(filepath)));
    } catch (e) {
        if (e instanceof Deno.errors.NotFound) return emptyParseResult();
        throw e;
    }
}
function isAssignmentLine(str) {
    return /^\s*(?:export\s+)?[a-zA-Z_][a-zA-Z_0-9 ]*\s*=/.test(str);
}
function hasSingleQuotes(str) {
    return /^'([\s\S]*)'$/.test(str);
}
function hasDoubleQuotes(str) {
    return /^"([\s\S]*)"$/.test(str);
}
function expandNewlines(str) {
    return str.replaceAll("\\n", "\n");
}
function assertSafe(conf, confExample, allowEmptyValues) {
    const currentEnv = Deno.env.toObject();
    const currentExportsList = Object.keys(currentEnv);
    const confWithEnv = Object.assign({}, currentEnv, conf.env);
    const missingVars = difference(Object.keys(confExample.env), Object.keys(allowEmptyValues ? confWithEnv : removeEmptyValues(confWithEnv)));
    if (missingVars.length > 0) {
        const errorMessages = [
            `The following variables were defined in the example file but are not present in the environment:\n  ${missingVars.join(", ")}`,
            `Make sure to add them to your env file.`,
            !allowEmptyValues && `If you expect any of these variables to be empty, you can set the allowEmptyValues option to true.`, 
        ];
        throw new MissingEnvVarsError(errorMessages.filter(Boolean).join("\n\n"));
    }
    const exportsWithEnv = new Set([
        ...currentExportsList,
        ...conf.exports
    ]);
    const missingExports = difference([
        ...confExample.exports, 
    ], [
        ...exportsWithEnv, 
    ]);
    if (missingExports.length > 0) {
        throw new MissingEnvVarExportsError(`The following variables were exported in the example file but are not exported in the environment:
${missingExports.join(", ")},
make sure to export them in your env file or in the environment of the parent process (e.g. shell).`);
    }
}
class MissingEnvVarsError extends Error {
    constructor(message){
        super(message);
        this.name = "MissingEnvVarsError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
class MissingEnvVarExportsError extends Error {
    constructor(message){
        super(message);
        Object.setPrototypeOf(this, MissingEnvVarExportsError.prototype);
    }
}
const envFile = `./envs/.env.${Deno.env.get("ENV")}`;
config({
    export: true,
    safe: true,
    defaults: "./envs/.env",
    path: envFile,
    example: envFile
});
console.log({
    foo: Deno.env.get("EXAMPLE"),
    caca: 'caca',
    ENV: Deno.env.get("ENV")
});

