export type State = {
    rule: GrammarRule,
    dot: number,
    origin: number,
    data: any[],
};

export type StateSet = {
    i: number,
    token: Token | null,
    states: {
        [key: string]: State
    }
};

export type Chart = StateSet[];

export type GrammarRule = {
    lhs: string,
    rhs: string[],
    resolve?: (data: any[]) => any
};

export type Grammar = {
    terminals: Set<string>,
    rules: GrammarRule[];
}

export type Token = {
    type: string,
    text: string,
    line: number,
    col: number,
    offset: number
};

export type Lexer<S> = {
    reset(chunk: string, state?: S): void;
    next(): Token;
}

export class ParseError extends Error {
    constructor(
        public lastStateSet: StateSet,
        public token: Token,
        public chart: Chart,
        public input: string,
        public grammar: Grammar
    ) {
        super("Parse error");
    }
}