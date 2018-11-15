import { State, Grammar } from "./types";

export function incomplete(state: State): boolean {
    return state.dot < state.rule.rhs.length;
}

export function notStarted(state: State): boolean {
    return state.dot === 0;
}

export function nextSymbol(state: State): string {
    return state.rule.rhs[state.dot];
}

export function previousSymbol(state: State): string {
    return state.rule.rhs[state.dot - 1];
}

export function isNonTerminal(symbol: string, grammar: Grammar): boolean {
    return !grammar.terminals.has(symbol);
}

export function isTerminal(symbol: string, grammar: Grammar): boolean {
    return grammar.terminals.has(symbol);
}

export function getStateKey(state: State, grammar: Grammar): string {
    return "[" + state.origin + "] " + state.rule.lhs + " -> " + 
        [...state.rule.rhs.map((sym) => quoteIfTerminal(sym, grammar)).slice(0, state.dot), 
            "•",
        ...state.rule.rhs.map((sym) => quoteIfTerminal(sym, grammar)).slice(state.dot)].join(" ");
}

export function getStateKeyMinusDot(state: State, grammar: Grammar): string {
    return state.rule.lhs + "->" + 
        state.rule.rhs.map((sym) => quoteIfTerminal(sym, grammar)).join(" ") + ", " + state.origin;
}

function quoteIfTerminal(symbol: string, grammar: Grammar): string {
    if (isTerminal(symbol, grammar)) {
        return `"${symbol}"`;
    } else {
        return symbol;
    }
}
