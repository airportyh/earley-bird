import * as colors from "colors/safe";
import * as _ from "lodash";
import { isTerminal, nextSymbol, getStateKey, notStarted, getStateKeyMinusDot } from "./utils";
import { StateSet, Token, Chart, Grammar, State, ParseError } from "./types";
const rightPad = require("right-pad");
const indent = require("indent");

export function displayError(error: ParseError): void {
    const {
        lastStateSet, token, chart, input, grammar
    } = error;
    const intermediateStates = _.reverse(_.filter(lastStateSet.states, (state) => {
        return isTerminal(nextSymbol(state), grammar);
    }));
    const intermediateRuleKeys = intermediateStates.map((state) => getStateKey(state, grammar));
    const expectedSymbols = intermediateStates.map(nextSymbol);
    // console.log(`Unexpected ${formatToken(token)}. was expecting one of ${expectedSymbols.map(s => colors.bgGreen(s)).join(", ")}.`);
    console.log(`Unexpected ${formatToken(token)}:`)
    console.log(`I was expecting one of the following:`);
    for (const intermediateState of intermediateStates) {
        console.log();

        console.log(`a ${JSON.stringify(nextSymbol(intermediateState))} in place of a ${token.type} here:`);
        const lastStateKeys = Object.keys(lastStateSet.states);
        const lastState = lastStateSet.states[lastStateKeys[lastStateKeys.length - 1]];
        const stack = buildStateStack(intermediateState, chart, grammar);
        displayColoredSourceCode(token, input, stack, chart, grammar);
        // for (const state of stack) {
        //     console.log(getStateKey(state));
        // }

    }
}

function displayColoredSourceCode(token: Token, input: string, stack: State[], chart: Chart, grammar: Grammar): void {
    const colorChoices = [
        "bgYellow",
        "bgGreen",
        "bgCyan",
        "bgMagenta",
        "bgBlue"
    ];
    const coloredStateKeys: string[] = [];
    const inputChars = input.split("");
    const lastToken = chart[chart.length - 1].token;
    if (!lastToken) {
        throw new Error("Last token is not found.");
    }
    let lastColoredStateIndex: number = -1;
    let colorCounter = -1;
    for (let i = 0; i < stack.length; i++) {
        const state = stack[i];
        const stateIndex = state.origin + 1;
        const currentToken = chart[stateIndex].token;
        if (stateIndex !== lastColoredStateIndex && currentToken) {
            colorCounter = colorCounter + 1;
            const color = colorChoices[colorCounter % colorChoices.length];
            const colorFn = (colors as any)[color];
            coloredStateKeys.push(colorFn(getStateKey(state, grammar)));
            const indexToReplace = currentToken.offset;
            const charsToReplace = lastToken.offset + lastToken.text.length - currentToken.offset;
            const thing = inputChars.slice(indexToReplace, lastToken.offset + lastToken.text.length).join("");
            const replacement = colorFn(inputChars.slice(currentToken.offset, lastToken.offset + lastToken.text.length).join(""));
            // console.log("replacing", colors.red(thing), "with", colors.green(replacement), charsToReplace, "chars");
            inputChars[indexToReplace] = replacement;
            for (let i = 1; i < charsToReplace; i++) {
                inputChars[indexToReplace + i] = "";
            }
            lastColoredStateIndex = stateIndex;
        } else {
            const color = colorChoices[colorCounter % colorChoices.length];
            const colorFn = (colors as any)[color];
            coloredStateKeys.push(colorFn(getStateKey(state, grammar)));
        }
        
    }
    
    const lines = inputChars.join("").split("\n");
    const numberedLines = lines.slice(0, token.line).map((line, idx) => {
        const num = idx + 1;
        if (num === token.line) {
            line = line.slice(0, token.col - 1) + colors.red(token.text) + 
                line.slice(token.col + token.text.length - 1);
        }
        return colors.gray(rightPad(String(num), 5, " ")) + line;
    });
    console.log(numberedLines.join("\n"));
    console.log(rightPad(" ", 4 + token.col, " ") + "^");

    console.log("from:")
    for (let key of coloredStateKeys) {
        console.log(key);
    }
}

function formatToken(token: Token | null): string {
    if (token === null) {
        return "null";
    } else if (token.type === "keyword") {
        return colors.bgRed(token.text);
    } else if (["number", "string"].indexOf(token.type) !== -1) {
        return token.type + " " + colors.bgRed(token.text);
    } else {
        return colors.bgRed(token.text);
    }
}

function displayStateSet(stateSet: StateSet): void {
    console.log(`S${stateSet.i}: ${formatToken(stateSet.token)}`);
    const displayStrings = _.map(stateSet.states, (state, stateKey) => {
        if (state.dot === 0) {
            return colors.gray(stateKey);
        } else if (state.dot === state.rule.rhs.length) {
            return colors.green(stateKey);
        } else {
            return colors.yellow(stateKey);
        }
    });
    console.log(indent(displayStrings.join("\n")));
}

function displayChart(chart: Chart): void {
    chart.forEach((stateSet) => {
        displayStateSet(stateSet);
    });
}

function buildStateStack(state: State, chart: Chart, grammar: Grammar): State[] {
    // console.log("buildStateStack", getStateKey(state));
    if (notStarted(state)) {
        // traverse state keys backwards
        // console.log("traverse state keys backwords");
        let i = state.origin;
        let stateSet = chart[i];
        let stateKeys = Object.keys(stateSet.states);
        let j = stateKeys.indexOf(getStateKey(state, grammar));
        while (true) {
            // console.log("i", i, "j", j);
            j = j - 1;
            if (j < 0) {
                i = i - 1;
                if (i < 0) {
                    // console.log("reached the end");
                    return [state];
                }
                stateSet = chart[i];
                stateKeys = Object.keys(stateSet.states);
                j = stateKeys.length - 1;
            }

            const prevState = stateSet.states[stateKeys[j]];
            // console.log("prevState", getStateKey(prevState));
            if (state.rule.lhs === nextSymbol(prevState)) {
                // console.log("found previous matching state", getStateKey(prevState));
                return [
                    state,
                    ...buildStateStack(prevState, chart, grammar)
                ];
            }
        }
    } else {
        // find origin state
        // console.log("find origin state");
        const originStates = Object.values(chart[state.origin].states);
        const originState = originStates
            .filter((s) => 
                getStateKeyMinusDot(state, grammar) === getStateKeyMinusDot(s, grammar))
            [0];
        return [
            state, 
            ...buildStateStack(originState, chart, grammar).slice(1)
        ];
    }
}