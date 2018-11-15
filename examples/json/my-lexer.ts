import { Token, Lexer } from "../../types";

export class MyLexer<S> {
    buffer: Token | null;
    lexer: Lexer<S>;
    constructor(lexer: Lexer<S>) {
        this.lexer = lexer;
        this.buffer = null;
    }

    reset(chunk: string, state: S) {
        this.lexer.reset(chunk, state);
    }

    _next() {
        const token = this.lexer.next();
        if (!token) return token;
        if (token.type === "WS") {
            return this.lexer.next();
        } else {
            return token;
        }
    }

    next() {
        if (this.buffer) {
            const value = this.buffer;
            this.buffer = null;
            return value;
        } else {
            return this._next();
        }
    }

    peek() {
        if (this.buffer) {
            return this.buffer;
        } else {
            this.buffer = this._next();
            return this.buffer;
        }
    }
}