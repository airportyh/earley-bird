import * as fs from "fs";
const moo = require('moo');
import { parse } from "../../parser";
import { MyLexer } from "./my-lexer";
import { Grammar } from "../../types";
import { displayError } from "../../display-error";

function unquote(string: string): string {
    return string.substring(1, string.length - 1);
}

const grammar: Grammar = {
    terminals: new Set([
        "number", "string", "true", "false", "null", 
        "{", "}", "[", "]", ":", ","
    ]),
    rules: [
        { lhs: "start", rhs: ["expr"] },
        { lhs: "expr", rhs: ["array"] },
        { lhs: "expr", rhs: ["object"] },
        { lhs: "expr", rhs: ["boolean"] },
        { lhs: "expr", rhs: ["number"], resolve: data => Number(data[0]) },
        { lhs: "expr", rhs: ["string"], resolve: data => unquote(data[0].text) },
        { lhs: "expr", rhs: ["null"], resolve: () => null },
        { lhs: "boolean", rhs: ["true"], resolve: () => true },
        { lhs: "boolean", rhs: ["false"], resolve: () => true },
        { lhs: "object", rhs: ["{", "object_entry_list", "}"],
            resolve: data => {
                const obj: any = {};
                for (const entry of data[1]) {
                    obj[entry[0]] = entry[1];
                }
                return obj;
            } },
        { lhs: "object", rhs: ["{", "}"],
            resolve: () => ({}) },
        { lhs: "object_entry_list", rhs: ["object_entry", ",", "object_entry_list"],
            resolve: data => [data[0], ...data[2]] },
        { lhs: "object_entry_list", rhs: ["object_entry"],
            resolve: data => [data[0]] },
        { lhs: "object_entry", rhs: ["object_entry_key", ":", "object_entry_value"],
            resolve: data => [unquote(data[0].text), data[2]] },
        { lhs: "object_entry_key", rhs: ["string"] },
        { lhs: "object_entry_value", rhs: ["expr"] },
        { lhs: "array", rhs: ["[", "array_items", "]"],
            resolve: data => data[1] },
        { lhs: "array", rhs: ["[", "]"],
            resolve: () => [] },
        { lhs: "array_items", rhs: ["expr", ",", "array_items"],
            resolve: data => [data[0], ...data[2]] },
        { lhs: "array_items", rhs: ["expr"],
            resolve: data => [data[0]] }
    ]
};

const lexer = new MyLexer(moo.compile({
    WS:      { match: /[ \t\n]+/, lineBreaks: true },
    number:  /0|[1-9][0-9]*/,
    string:  /"(?:\\["\\]|[^\n"\\])*"/,
    "{":  '{',
    "}":  '}',
    "[": '[',
    "]": ']',
    ":": ':',
    ",": ',',
    keyword: ['true', 'false', 'null']
}));

const filename = process.argv[2];
if (!filename) {
    console.log("Please provide a filename.");
    process.exit(1);
}

const text = fs.readFileSync(filename) + "";

try {
    const result = parse(text, lexer, grammar);
    console.log("result", result);
} catch (e) {
    displayError(e);
}