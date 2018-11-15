import * as _ from "lodash";
import { Lexer, Grammar, Chart, State, Token, StateSet, ParseError } from "./types";
import { getStateKey, incomplete, isNonTerminal, nextSymbol } from "./utils";

export function parse<S>(
    input: string, 
    lexer: Lexer<S>, 
    grammar: Grammar): any {

    lexer.reset(input);

    const startState = {
        rule: { lhs: "start", rhs: ["expr"] },
        dot: 0, origin: 0, data: []
    };
    const chart: Chart = [
        { i: 0, states: { [getStateKey(startState, grammar)]: startState }, token: null }
    ];
    let i: number = 0;
    while (true) {
        const token = lexer.next();
        let stateKeyIdx = 0;
        while (true) {
            const stateKeys = Object.keys(chart[i].states);
            if (stateKeyIdx >= stateKeys.length) {
                break;
            }
            const stateKey = stateKeys[stateKeyIdx];
            const state = chart[i].states[stateKey];
            if (incomplete(state)) {
                if (isNonTerminal(nextSymbol(state), grammar)) {
                    predictor(state, i, token, grammar, chart);
                } else {
                    if (token !== undefined) {
                        scanner(state, i, token, chart, grammar);
                    }
                }
            } else {
                completer(state, i, token, chart, grammar);
            }
            stateKeyIdx++;
        }
        if (token === undefined) {
            break;
        }
        i++;
        if (!chart[i]) {
            const lastStateSet = chart[i - 1];
            throw new ParseError(lastStateSet, token, chart, input, grammar);
        }
    }

    const startFinalStateKey = getStateKey({
        ...startState, 
        dot: startState.rule.rhs.length
    }, grammar);
    const startFinalState = chart[i].states[startFinalStateKey];
    if (!startFinalState) {
        const lastStateSet = chart[i];
        const token = {
            type: "eof", 
            text: "end of input",
            line: 0,
            offset: 0,
            col: 0
        };
        throw new ParseError(lastStateSet, token, chart, input, grammar);
    } else {
        return startFinalState.data;
    }
}

function predictor(state: State, j: number, token: Token, grammar: Grammar, chart: Chart): void {
    const symbol = nextSymbol(state);
    for (const rule of grammar.rules) {
        if (symbol === rule.lhs) {
            addToSet({ rule, dot: 0, origin: j, data: [] }, chart, j, token, grammar);
        }
    }
}

function tokenName(token: Token): string {
    if (token.type === "keyword") {
        return token.text;
    } else {
        return token.type;
    }
}

function scanner(state: State, j: number, token: Token, chart: Chart, grammar: Grammar): void {
    if (tokenName(token) === nextSymbol(state)) {
        addToSet({
            ...state, 
            dot: state.dot + 1, 
            data: [...state.data, token]
        }, chart, j + 1, token, grammar);
    }
}

function completer(state: State, k: number, token: Token, chart: Chart, grammar: Grammar): void {
    const { rule: { lhs: B, resolve } , origin: j } = state;
    if (resolve) {
        state.data = resolve(state.data);
    } else {
        if (Array.isArray(state.data) && state.data.length === 1) {
            state.data = state.data[0];
        }
    }
    _.forEach(chart[j].states, (parentState, stateKey) => {
        const symbol = nextSymbol(parentState);
        if (symbol === B) {
            addToSet({
                ...parentState, 
                dot: parentState.dot + 1,
                data: [...parentState.data, state.data]
            }, chart, k, token, grammar);
        }
    });
}

function addToSet(state: State, chart: Chart, i: number, token: Token, grammar: Grammar): void {
    const ruleKey = getStateKey(state, grammar);
    if (!chart[i]) {
        chart[i] = { i, states: {}, token };
    }
    chart[i].states[ruleKey] = state;
}