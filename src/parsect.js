//
//                            Parsect
//
//          Parser Combinator Library for JavaScript/TypeScript
//
//                           Revision 2
//
//
//
//             site: https://github.com/kontan/Parsect
//                author: Kon (http://phyzkit.net/)
//
//
//
//                         The MIT License
//
//                      Copyright (c) 2013 Kon
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//
// Note: All properties of objects of Persect are readonly unless any indication is given.
// All function don't accept `null` as a parameter.
'use strict';
var Parsect;
(function (Parsect) {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Data Type Definitions ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Current parsing state.
    // <U> Type of user state.
    var State = (function () {
        function State(source, position, _userState) {
            if (typeof position === "undefined") { position = 0; }
            this.source = source;
            this.position = position;
            this._userState = _userState;
            assert(typeof source !== "undefined");
            assert(source !== null);
            if (position < 0 || position > source.length + 1)
                throw "_position: out of range: " + position;
        }
        State.prototype.getRowColumn = function () {
            var lines = this.source.split("\n");
            var position = 0;
            var raw = 0;
            while (position < this.position) {
                if (this.position <= position + lines[raw].length)
                    break;
                position += lines[raw].length + 1;
                raw++;
            }
            var column = this.position - position;
            return { raw: raw, column: column };
        };

        State.prototype.seek = function (count) {
            return new State(this.source, this.position + count, this._userState);
        };

        State.prototype.equals = function (src) {
            return src && this.source === src.source && this.position === src.position && jsonEq(this._userState, src._userState);
        };
        return State;
    })();
    Parsect.State = State;

    /// Result of parsing.
    /// (equiv. Text.Parsec.Prim.Reply)
    /// <A>　Type of semantic value.
    /// <U> Type of User state.
    var Reply = (function () {
        /// private constructor.
        /// You should use success or fail functions instead of this constructor.
        function Reply(state, success, value, expected) {
            this.state = state;
            this.success = success;
            this.value = value;
            this.expected = expected;
        }
        Reply.prototype.equals = function (st) {
            return st && this.state.equals(st.state) && this.success === st.success && (this.success ? jsonEq(this.value, st.value) : ((this.expected === undefined && st.expected === undefined) || (this.expected() === st.expected())));
        };
        return Reply;
    })();
    Parsect.Reply = Reply;

    /// create new successful state.
    /// (equiv. Text.Parsec.Prim.OK)
    /// @param state    a state after parsing.
    /// @param value    semantic value.
    function ok(state, value) {
        return new Reply(state, true, value, undefined);
    }
    Parsect.ok = ok;

    /// create new failure state.
    /// (equiv. Text.Parsec.Prim.Error)
    /// @param state    a state after parsing.
    /// @param expected
    function error(state, expected) {
        return new Reply(state, false, undefined, expected);
    }
    Parsect.error = error;

    /// parser object.
    /// <A> Type of Semantic value.
    var Parser = (function () {
        /// create new parser.
        /// @param parse parsing function
        /// @param expecting human-readable string description that this parser expecting.
        function Parser(runParser) {
            this.runParser = runParser;
        }
        return Parser;
    })();
    Parsect.Parser = Parser;

    /// Parse an input.
    /// This function acceps string primitive value as string parser or RegExp object as regexp parser.
    /// @param parser parser.
    /// @param state state.
    /// @return the result of parssing.
    function parse(parser, state) {
        //assert( !! parser);
        return parser.runParser(state);
    }
    Parsect.parse = parse;

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Parser Combinators (Text.Parsec.Combinator) ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Choice parser combinators //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /// (equiv. Text.Parsec.Combinator.choice)
    function choice(ps) {
        function choiceParser(state) {
            // For debugging　and efficiency, expand list as loop intentionally.
            var sts = [];
            for (var i = 0; i < ps.length; i++) {
                var st = parse(ps[i], state);
                if (st.success || st.state.position != state.position) {
                    return st;
                }
                sts.push(st);
            }
            return error(state, function () {
                return "one of " + sts.map(function (st) {
                    return st.expected();
                }).join(',');
            });
        }
        return new Parser(choiceParser);
    }
    Parsect.choice = choice;

    /// Variable parameter version of `choice`.
    function or() {
        var ps = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            ps[_i] = arguments[_i + 0];
        }
        return choice(ps);
    }
    Parsect.or = or;

    // Repetitious parser constructors ////////////////////////////////////////////////////////////////////////////////////////
    /// `repeat n m p` parses `n` occurrences of `p` at minimum, parses `m` occurrences of `p` at maximum.
    function repeat(min, max, p) {
        function repeatParser(s) {
            // For debugging　and efficiency, expand list as loop intentionally.
            var xs = [];
            var st = ok(s, undefined);
            for (var i = 0; i < max; i++) {
                var _st = parse(p, st.state);
                if (_st.success) {
                    if (_st.state.position === st.state.position && max === Number.MAX_VALUE) {
                        throw new Error("many combinator is applied to a parser that accepts an empty string.");
                    } else {
                        st = _st;
                        xs.push(st.value);
                    }
                } else if (st.state.position < _st.state.position) {
                    return _st;
                } else if (i < min) {
                    return _st;
                } else {
                    break;
                }
            }
            return ok(st.state, xs);
        }
        return new Parser(repeatParser);
    }
    Parsect.repeat = repeat;

    /// (equiv. Text.Parsec.Combinator.count)
    function count(n, p) {
        return repeat(n, n, p);
    }
    Parsect.count = count;

    /// (equiv. Text.Parsec.Combinator.many)
    function many(p) {
        return repeat(0, Number.MAX_VALUE, p);
    }
    Parsect.many = many;

    /// (equiv. Text.Parsec.Combinator.many1)
    function many1(p) {
        return repeat(1, Number.MAX_VALUE, p);
    }
    Parsect.many1 = many1;

    // Sequential parser constructors ///////////////////////////////////////////////////////////////////////////////////////
    /// `array ps` parses the parser of `ps` sequentially and return the reply of those parsers.
    function array(ps) {
        function arrayParser(state) {
            var values = [];
            var st = ok(state, undefined);
            for (var i = 0; i < ps.length; i++) {
                st = parse(ps[i], st.state);
                if (!st.success)
                    return error(st.state, st.expected);
                values.push(st.value);
            }
            return ok(st.state, values);
        }
        return new Parser(arrayParser);
    }
    Parsect.array = array;

    /// variable parameters version of `array`.
    function series() {
        var ps = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            ps[_i] = arguments[_i + 0];
        }
        return array(ps);
    }
    Parsect.series = series;

    /// `head(a, b, c, ...)` parses `a`, `b`, `c` and etc, and returns reply of `a`.
    function head(p) {
        var ps = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            ps[_i] = arguments[_i + 1];
        }
        function headParser(state) {
            var st = parse(p, state);
            var value = st.value;
            for (var i = 0; i < ps.length && st.success; i++) {
                st = parse(ps[i], st.state);
            }
            return st.success ? ok(st.state, value) : st;
        }
        return new Parser(headParser);
    }
    Parsect.head = head;

    /// (equiv. Text.Parsec.Combinator.between)
    function between(open, p, close) {
        return seq(function (s) {
            s(open);
            var v = s(p);
            s(close);
            return v;
        });
    }
    Parsect.between = between;

    /// Do-notation like parsing control flow.
    /// @param f    callback function
    function seq(f) {
        assert(f instanceof Function);
        function seqParser(state) {
            var st = ok(state, undefined);
            function contextFunction(p) {
                if (st.success) {
                    st = parse(p, st.state);
                    context.success = st.success;
                    return st.value;
                }
            }
            var context = contextFunction;
            context.success = true;
            context.userState = st.state._userState;
            var value = f(context);
            st.state._userState = context.userState;
            return context.success ? ok(st.state, value) : st;
        }
        return new Parser(seqParser);
    }
    Parsect.seq = seq;

    // Alternative parser constructors /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///
    function sepByN(min, max, p, sep) {
        assert(p instanceof Parser);
        assert(sep instanceof Parser);
        assert(min <= max);
        function sepByNParser(source) {
            var xs = [];
            var st = ok(source, undefined);
            var _st = parse(p, st.state);
            if (_st.success) {
                st = _st;
                xs.push(_st.value);
                for (var i = 1; i < max; i++) {
                    var _st = parse(sep, st.state);
                    if (_st.success) {
                        st = parse(p, _st.state);
                        if (st.success) {
                            xs.push(st.value);
                            continue;
                        }
                    } else if (xs.length < min) {
                        return _st;
                    }
                    break;
                }
            } else if (xs.length < min) {
                return _st;
            }
            return st.success ? ok(st.state, xs) : st;
        }
        return new Parser(sepByNParser);
    }
    Parsect.sepByN = sepByN;

    function sepBy1(p, sep) {
        return sepByN(1, Number.MAX_VALUE, p, sep);
    }
    Parsect.sepBy1 = sepBy1;

    function sepBy(p, sep) {
        return sepByN(0, Number.MAX_VALUE, p, sep);
    }
    Parsect.sepBy = sepBy;

    function endByN(min, max, p, sep) {
        return repeat(min, max, head(p, sep));
    }
    Parsect.endByN = endByN;

    function endBy1(p, sep) {
        return endByN(1, Number.MAX_VALUE, p, sep);
    }
    Parsect.endBy1 = endBy1;

    function endBy(p, sep) {
        return endByN(0, Number.MAX_VALUE, p, sep);
    }
    Parsect.endBy = endBy;

    // Optional parser constructors ///////////////////////////////////////////////////////////////////////////////////////////
    function option(defaultValue, p) {
        return or(p, pure(defaultValue));
    }
    Parsect.option = option;

    function optional(p) {
        return option(undefined, p);
    }
    Parsect.optional = optional;

    // Build-in Parsees /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    Parsect.eof = new Parser(function (state) {
        return state.position === state.source.length ? ok(state.seek(1), undefined) : error(state, function () {
            return "end of file";
        });
    });
    Parsect.empty = new Parser(function (state) {
        return ok(state, undefined);
    });
    Parsect.number = fmap(parseFloat, regexp(/^[-+]?\d+(\.\d+)?/));

    function fail(message) {
        return new Parser(function (state) {
            return error(state, function () {
                return message;
            });
        });
    }
    Parsect.fail = fail;

    function unexpected(message) {
        function unexpectedParser(state) {
            return error(state, function () {
                return message;
            });
        }
        return new Parser(unexpectedParser);
    }
    Parsect.unexpected = unexpected;

    function skipMany(p) {
        return fmap(function (_) {
            return undefined;
        }, many(p));
    }
    Parsect.skipMany = skipMany;

    function skipMany1(p) {
        return seq(function (s) {
            s(p);
            s(skipMany(p));
        });
    }
    Parsect.skipMany1 = skipMany1;

    // Special parser constructors /////////////////////////////////////////////////////////////////////////////////////////////
    /*
    export function apply<A,B,            R>(m: (a: A, b: B                                   )=>R, pa: Parser<A>, pb: Parser<B>                                                                                          ): Parser<R>;
    export function apply<A,B,C,          R>(m: (a: A, b: B, c: C                             )=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>                                                                           ): Parser<R>;
    export function apply<A,B,C,D,        R>(m: (a: A, b: B, c: C, d: D                       )=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>                                                            ): Parser<R>;
    export function apply<A,B,C,D,E,      R>(m: (a: A, b: B, c: C, d: D, e: E                 )=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>, pe: Parser<E>                                             ): Parser<R>;
    export function apply<A,B,C,D,E,F,    R>(m: (a: A, b: B, c: C, d: D, e: E, f: F           )=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>, pe: Parser<E>, pf: Parser<F>                              ): Parser<R>;
    export function apply<A,B,C,D,E,F,G,  R>(m: (a: A, b: B, c: C, d: D, e: E, f: F, g: G     )=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>, pe: Parser<E>, pf: Parser<F>, pg: Parser<G>               ): Parser<R>;
    export function apply<A,B,C,D,E,F,G,H,R>(m: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h:H)=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>, pe: Parser<E>, pf: Parser<F>, pg: Parser<G>, ph: Parser<H>): Parser<R>;
    export function apply(func: Function, ...ps: Parser<any>[]): Parser<any> {
    assert(func instanceof Function);
    return fmap((xs: any[])=>func.apply(undefined, xs), array(ps))
    }
    */
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Primitive parsers (Text.Parsec.Prim) ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    function label(message, p) {
        function labelParser(state) {
            var reply = parse(p, state);
            return ((!reply.success) && reply.state.position === state.position) ? error(state, function () {
                return message;
            }) : reply;
        }
        return new Parser(labelParser);
    }
    Parsect.label = label;

    function lookAhead(p) {
        function lookAheadParser(state) {
            var st = parse(p, state);
            return st.success ? ok(state, st.value) : st;
        }
        return new Parser(lookAheadParser);
    }
    Parsect.lookAhead = lookAhead;

    function pure(t) {
        return fmap(function () {
            return t;
        }, Parsect.empty);
    }
    Parsect.pure = pure;

    function triable(p) {
        function triableParser(state) {
            var st = parse(p, state);
            return st.success ? st : error(state, st.expected);
        }
        return new Parser(triableParser);
    }
    Parsect.triable = triable;

    function notFollowedBy(p) {
        function notFollowedByParser(state) {
            var rep = parse(p, state);
            return rep.success ? error(state, function () {
                return 'not ' + rep.value;
            }) : ok(state, undefined);
        }
        return new Parser(notFollowedByParser);
    }
    Parsect.notFollowedBy = notFollowedBy;

    function fmap(f, p) {
        function mapParser(state) {
            var st = parse(p, state);
            return st.success ? ok(st.state, f(st.value)) : st;
        }
        return new Parser(mapParser);
    }
    Parsect.fmap = fmap;

    function lazy(f) {
        assert(f instanceof Function);
        function lazyParser(state) {
            return parse(f(), state);
        }
        return new Parser(lazyParser);
    }
    Parsect.lazy = lazy;

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Charactor parser constructor (Text.Parsec.Char) /////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    function oneOf(chars) {
        return satisfy(function (c) {
            return chars.indexOf(c) >= 0;
        });
    }
    Parsect.oneOf = oneOf;

    function noneOf(chars) {
        return satisfy(function (c) {
            return chars.indexOf(c) == -1;
        });
    }
    Parsect.noneOf = noneOf;

    Parsect.space = oneOf(" \t\r\n");
    Parsect.spaces = fmap(function (xs) {
        return xs.join();
    }, many(Parsect.space));
    Parsect.newline = oneOf("\r\n");
    Parsect.tab = char("\t");
    Parsect.upper = oneOf("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    Parsect.lower = oneOf("abcdefghijklmnopqrstuvwxyz");
    Parsect.alphaNum = oneOf("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
    Parsect.letter = oneOf("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz");
    Parsect.digit = oneOf("0123456789");
    Parsect.hexDigit = oneOf("0123456789abcdefghABCDEFGH");
    Parsect.octDigit = oneOf("01234567");

    function char(c) {
        assert(c && c.length === 1);
        return satisfy(function (_c) {
            return c === _c;
        });
    }
    Parsect.char = char;

    Parsect.anyChar = satisfy(function (_) {
        return true;
    });

    /// `satisfy cond` returns a parser consume a charactor that satisfy the condition `cond`
    function satisfy(condition) {
        assert(condition instanceof Function);
        function expectedChars() {
            var cs = [];
            for (var i = 32; i <= 126; i++) {
                var c = String.fromCharCode(i);
                if (condition(c, i)) {
                    cs.push(c);
                }
            }
            return cs;
        }
        function satisfyParser(s) {
            if (s.position < s.source.length) {
                var c = s.source[s.position];
                var i = s.source.charCodeAt(s.position);
                if (condition(c, i)) {
                    return ok(s.seek(1), c);
                }
            }
            return error(s, function () {
                var cs = expectedChars();
                return (cs.length === 1 ? "" : "one of ") + "\"" + cs.join('') + "\"";
            });
        }
        return new Parser(satisfyParser);
    }
    Parsect.satisfy = satisfy;

    /// string parser
    function string(text, caseSensitive) {
        if (typeof caseSensitive === "undefined") { caseSensitive = true; }
        assert(typeof text === "string" || text instanceof String);
        text = caseSensitive ? text : text.toLowerCase();
        function stringParser(s) {
            var slice = s.source.slice(s.position, s.position + text.length);
            return text === (caseSensitive ? slice : slice.toLowerCase()) ? ok(s.seek(text.length), text) : error(s, function () {
                return "\"" + text + "\"";
            });
        }
        return new Parser(stringParser);
    }
    Parsect.string = string;

    // regular expression parser
    function regexp(pattern) {
        assert(pattern instanceof RegExp);
        function regexpParser(s) {
            var input = s.source.slice(s.position);
            pattern.lastIndex = 0;
            var ms = pattern.exec(input);

            if (ms && ms.index == 0 && ms.length > 0) {
                var m = ms[0];
                return input.indexOf(ms[0]) == 0 ? ok(s.seek(m.length), m) : error(s, function () {
                    return "/" + pattern + "/";
                });
            } else {
                return error(s, function () {
                    return "" + pattern;
                });
            }
        }
        return new Parser(regexpParser);
    }
    Parsect.regexp = regexp;

    function range(min, max) {
        assert(((typeof min === "number" || min instanceof Number) && (typeof min === "number" || min instanceof Number)) || ((typeof min === "string" || min instanceof String) && (min.length === 1) && (typeof min === "string" || min instanceof String) && (max.length === 1)));
        min = (typeof min === "string" || min instanceof String) ? min.charCodeAt(0) : min;
        max = (typeof min === "string" || min instanceof String) ? max.charCodeAt(0) : max;
        return satisfy(function (_, i) {
            return min <= i && i <= max;
        });
    }
    Parsect.range = range;

    function charCode(charCode) {
        assert(typeof charCode === "number" || charCode instanceof Number);
        return satisfy(function (_, i) {
            return i === charCode;
        });
    }
    Parsect.charCode = charCode;

    function makeTokenParser(def) {
        /////////////////////////////////////////////////////////////////////////////////////////
        // White space & symbols
        ////////////////////////////////////////////////////////////////////////////////////////////
        function symbol(name) {
            return lexeme(string(name));
        }
        function lexeme(p) {
            return seq(function (s) {
                var x = s(p);
                s(whiteSpace);
                return x;
            });
        }

        // whiteSpace
        //var noLine  = def.commentLine.length == 0;
        //var noMulti = def.commentStart.length == 0;
        var noLine = def.commentLine === null;
        var noMulti = def.commentStart === null;

        //var commentStart = triable(string(def.commentStart));
        //var commentEnd = triable(string(def.commentEnd));
        //var startEnd = (def.commentEnd + def.commentStart).split('').filter((x, i, xs)=>xs.indexOf(x) === i).join("");
        var commentStart = triable(def.commentStart);
        var commentEnd = triable(def.commentEnd);

        var oneLineComment = seq(function (s) {
            //s(triable(string(def.commentLine)));
            s(triable(def.commentLine));

            s(skipMany(satisfy(function (x) {
                return x != '\n';
            })));
            return undefined;
        });
        var multiLineComment = seq(function (s) {
            s(commentStart);
            return s(inComment);
        });

        var inCommentMulti = label("end of comment", or(seq(function (s) {
            s(commentEnd);
        }), seq(function (s) {
            s(multiLineComment);
            s(inCommentMulti);
        }), seq(function (s) {
            s(notFollowedBy(commentEnd));
            s(Parsect.anyChar);
            s(inCommentMulti);
        })));
        var inCommentSingle = label("end of comment", or(seq(function (s) {
            s(commentEnd);
        }), seq(function (s) {
            s(notFollowedBy(commentEnd));
            s(Parsect.anyChar);
            s(inCommentSingle);
        })));
        var inComment = def.nestedComments ? inCommentMulti : inCommentSingle;
        var simpleSpace = skipMany1(oneOf(" \t\r\n"));
        var whiteSpace = noLine && noMulti ? skipMany(simpleSpace) : noLine ? skipMany(or(simpleSpace, multiLineComment)) : noMulti ? skipMany(or(simpleSpace, oneLineComment)) : skipMany(or(simpleSpace, oneLineComment, multiLineComment));

        ////////////////////////////////////////////////////////////////////////////////////
        // Operators & reserved ops
        ////////////////////////////////////////////////////////////////////////////////////////
        function reservedOp(name) {
            return lexeme(triable(seq(function (s) {
                var n = s(string(name));
                s(notFollowedBy(def.opLetter));
                return n;
            })));
        }

        var operator = lexeme(triable(seq(function (s) {
            var name = s(oper);
            return isReservedOp(name) ? s(unexpected("reserved operator " + name)) : name;
        })));

        if ((def.operator && (def.opStart || def.opLetter)) || (!def.operator && !def.opStart && !def.opLetter)) {
            throw new Error();
        }

        var oper = def.operator || seq(function (s) {
            var c = s(def.opStart);
            var cs = s(Join.many(def.opLetter));
            return c + cs;
        });

        function isReservedOp(name) {
            return def.reservedOpNames.indexOf(name) >= 0;
        }

        /////////////////////////////////////////////////////////////////////////
        // Identifiers & Reserved words
        /////////////////////////////////////////////////////////////////////////////////////////
        function reserved(name) {
            return lexeme(triable(label("end of " + name, seq(function (s) {
                var n = s(string(name, def.caseSensitive));
                s(notFollowedBy(def.identLetter));
                return n;
            }))));
        }

        var identifier = lexeme(triable(seq(function (s) {
            var name = s(ident);
            if (isReservedName(name)) {
                return s(unexpected("reserved word " + name));
            } else {
                return name;
            }
        })));

        var ident = label("identifier", seq(function (s) {
            var c = s(def.identStart);
            var cs = s(Join.many(def.identLetter));
            return s.success && (c + cs);
        }));

        var theReservedNames = def.caseSensitive ? def.reservedNames : def.reservedNames.map(function (n) {
            return n.toLowerCase();
        });

        function isReservedName(name) {
            var caseName = def.caseSensitive ? name : name.toLowerCase();
            return theReservedNames.indexOf(caseName) >= 0;
        }

        ////////////////////////////////////////////////////////////////////////////////
        // Bracketing
        //////////////////////////////////////////////////////////////////////////////////////
        function parens(p) {
            return between(symbol("("), p, symbol(")"));
        }
        function braces(p) {
            return between(symbol("{"), p, symbol("}"));
        }
        function angles(p) {
            return between(symbol("<"), p, symbol(">"));
        }
        function brackets(p) {
            return between(symbol("["), p, symbol("]"));
        }

        var semi = symbol(";");
        var comma = symbol(",");
        var dot = symbol(".");
        var colon = symbol(":");

        function commaSep(p) {
            return sepBy(p, comma);
        }
        function semiSep(p) {
            return sepBy(p, semi);
        }
        function commaSep1(p) {
            return sepBy1(p, comma);
        }
        function semiSep1(p) {
            return sepBy1(p, semi);
        }

        /////////////////////////////////////////////////////////////////////////////////////////
        // Chars & Strings
        //////////////////////////////////////////////////////////////////////////////
        var escapeCode = seq(function (s) {
            var c = s(satisfy(function (_) {
                return true;
            }));
            switch (c) {
                case "r":
                    return "\r";
                case "n":
                    return "\n";
                default:
                    return s(unexpected(c));
            }
        });

        var charLetter = satisfy(function (c, i) {
            return (c != "'") && (c != "\\") && (i > 26);
        });
        var charEscape = seq(function (s) {
            s(string('\\'));
            return s(escapeCode);
        });
        var characterChar = label("literal character", or(charLetter, charEscape));
        var charLiteral = label("character", lexeme(between(string('\''), characterChar, label("end of character", string('\'')))));

        var escapeEmpty = string('&');
        var escapeGap = seq(function (s) {
            s(many1(Parsect.space));
            return s(label("end of string gap", string('\\')));
        });
        var stringEscape = seq(function (s) {
            s(string('\\'));
            return s(or(seq(function (s) {
                s(escapeGap);
                return s(pure(null));
            }), seq(function (s) {
                s(escapeEmpty);
                return s(pure(null));
            }), escapeCode));
        });
        var stringLetter = satisfy(function (c, i) {
            return (c != '"') && (c != '\\') && (i > 26);
        });
        var stringChar = label("string character", or(stringLetter, stringEscape));
        var stringLiteral = label("literal string", lexeme(fmap(function (xs) {
            return xs.join('');
        }, between(string('"'), many(stringChar), label("end of string", string('"'))))));

        // integers and naturals
        function number(base, baseDigit) {
            assert(!!baseDigit);
            return fmap(function (xs) {
                return xs.reduce(function (x, d) {
                    return base * x + parseInt(d);
                }, 0);
            }, many1(baseDigit));
        }

        var decimal = number(10, Parsect.digit);
        var hexadecimal = seq(function (s) {
            s(oneOf("xX"));
            return s(number(16, Parsect.hexDigit));
        });
        var octal = seq(function (s) {
            s(oneOf("oO"));
            return s(number(8, Parsect.octDigit));
        });
        var zeroNumber = label("", seq(function (s) {
            s(string('0'));
            return s(or(hexadecimal, octal, decimal, pure(0)));
        }));
        var nat = or(zeroNumber, decimal);
        var sign = or(seq(function (s) {
            s(string('-'));
            return s(pure(function (x) {
                return -x;
            }));
        }), seq(function (s) {
            s(string('+'));
            return s(pure(function (x) {
                return x;
            }));
        }), pure(function (x) {
            return x;
        }));
        var int = seq(function (s) {
            var f = s(lexeme(sign));
            var n = s(nat);
            return s.success ? f(n) : undefined;
        });

        //  -- floats
        var exponent$ = label("exponent", seq(function (s) {
            function power(e) {
                return e < 0 ? 1.0 / power(-e) : (10 ^ e);
            }
            s(oneOf("eE"));
            var f = s(sign);
            var e = s(label("exponent", decimal));
            return s.success ? power(f(e)) : undefined;
        }));

        var fraction = seq(function (s) {
            s(string('.'));
            var digits = s(label("fraction", many1(Parsect.digit)));
            function op(d, f) {
                return (f + d) / 10.0;
            }
            return s.success ? digits.reduce(op, 0.0) : undefined;
        });

        function fractExponent(n) {
            return or(seq(function (s) {
                var fract = s(fraction);
                var expo = s(option(1.0, exponent$));
                return s.success ? (n + fract) * expo : undefined;
            }), seq(function (s) {
                var expo = s(exponent$);
                return s.success ? (n * expo) : undefined;
            }));
        }

        var floating = seq(function (s) {
            var n = s(decimal);
            return s(fractExponent(n));
        });

        function fractFloat(n) {
            return fractExponent(n);
        }
        var decimalFloat = seq(function (s) {
            var n = s(decimal);
            return s(option(n, fractFloat(n)));
        });
        var zeroNumFloat = or(or(hexadecimal, octal), decimalFloat, fractFloat(0), pure(0));
        var natFloat = or(seq(function (s) {
            s(string('0'));
            return s(zeroNumFloat);
        }), decimalFloat);
        var naturalOrFloat = label("number", lexeme(natFloat));
        var float = label("float", lexeme(floating));
        var integer = label("integer", lexeme(int));
        var natural = label("natural", lexeme(nat));

        // misc
        function opBinary(name, fun, assoc) {
            return infix(fmap(function (_) {
                return fun;
            }, reservedOp(name)), assoc);
        }
        function opPrefix(name, fun) {
            return prefix(fmap(function (_) {
                return fun;
            }, reservedOp(name)));
        }
        function opPostfix(name, fun) {
            return postfix(fmap(function (_) {
                return fun;
            }, reservedOp(name)));
        }

        return {
            identifier: identifier,
            reserved: reserved,
            operator: operator,
            reservedOp: reservedOp,
            charLiteral: charLiteral,
            stringLiteral: stringLiteral,
            natural: natural,
            integer: integer,
            float: float,
            naturalOrFloat: naturalOrFloat,
            decimal: decimal,
            hexadecimal: hexadecimal,
            octal: octal,
            symbol: symbol,
            lexeme: lexeme,
            whiteSpace: whiteSpace,
            parens: parens,
            braces: braces,
            angles: angles,
            brackets: brackets,
            squares: brackets,
            semi: semi,
            comma: comma,
            colon: colon,
            dot: dot,
            semiSep: semiSep,
            semiSep1: semiSep1,
            commaSep: commaSep,
            commaSep1: commaSep1,
            binary: opBinary,
            prefix: opPrefix,
            postfix: opPostfix
        };
    }
    Parsect.makeTokenParser = makeTokenParser;

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Expression Parser (Text.Parsec.Expr) /////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    (function (Assoc) {
        Assoc[Assoc["None"] = 0] = "None";
        Assoc[Assoc["Left"] = 1] = "Left";
        Assoc[Assoc["Right"] = 2] = "Right";
    })(Parsect.Assoc || (Parsect.Assoc = {}));
    var Assoc = Parsect.Assoc;

    var LAssoc = (function () {
        function LAssoc(p) {
            this.p = p;
        }
        return LAssoc;
    })();
    var RAssoc = (function () {
        function RAssoc(p) {
            this.p = p;
        }
        return RAssoc;
    })();
    var NAssoc = (function () {
        function NAssoc(p) {
            this.p = p;
        }
        return NAssoc;
    })();
    var Prefix = (function () {
        function Prefix(p) {
            this.p = p;
        }
        return Prefix;
    })();
    var Postfix = (function () {
        function Postfix(p) {
            this.p = p;
        }
        return Postfix;
    })();

    function infix(p, assoc) {
        switch (assoc) {
            case Assoc.None:
                return new NAssoc(p);
            case Assoc.Left:
                return new LAssoc(seq(function (s) {
                    return s(p);
                }));
            case Assoc.Right:
                return new RAssoc(p);
        }
    }
    Parsect.infix = infix;
    function prefix(p) {
        return new Prefix(p);
    }
    Parsect.prefix = prefix;
    function postfix(p) {
        return new Postfix(p);
    }
    Parsect.postfix = postfix;

    function buildExpressionParser(operatorTable, simpleExpr) {
        return operatorTable.reduce(function (term, ops) {
            var rassoc = ops.filter(function (op) {
                return op instanceof RAssoc;
            });
            var lassoc = ops.filter(function (op) {
                return op instanceof LAssoc;
            });
            var nassoc = ops.filter(function (op) {
                return op instanceof NAssoc;
            });
            var prefix = ops.filter(function (op) {
                return op instanceof Prefix;
            });
            var postfix = ops.filter(function (op) {
                return op instanceof Postfix;
            });

            var rassocOp = choice(rassoc.map(function (r) {
                return r.p;
            }));
            var lassocOp = choice(lassoc.map(function (r) {
                return r.p;
            }));
            var nassocOp = choice(nassoc.map(function (r) {
                return r.p;
            }));
            var prefixOp = choice(prefix.map(function (r) {
                return r.p;
            }));
            var postfixOp = choice(postfix.map(function (r) {
                return r.p;
            }));

            function ambigious(assoc, op) {
                return triable(seq(function (s) {
                    s(op);
                    return s(fail("ambiguous use of a " + assoc + " associative operator"));
                }));
            }

            var ambigiousRight = ambigious("right", rassocOp);
            var ambigiousLeft = ambigious("left", lassocOp);
            var ambigiousNon = ambigious("non", nassocOp);

            var termP = seq(function (s) {
                var pre = s(prefixP);
                var x = s(term);
                var post = s(postfixP);
                return s.success && post(pre(x));
            });

            var postfixP = or(postfixOp, pure(function (x) {
                return x;
            }));
            var prefixP = or(prefixOp, pure(function (x) {
                return x;
            }));
            function rassocP(x) {
                return or(seq(function (s) {
                    var f = s(rassocOp);
                    var y = s(seq(function (s) {
                        var z = s(termP);
                        return s(rassocP1(z));
                    }));
                    return s.success && f(x, y);
                }), ambigiousLeft, ambigiousNon);
            }

            function rassocP1(x) {
                return or(rassocP(x), pure(x));
            }

            function lassocP(x) {
                return or(seq(function (s) {
                    var f = s(lassocOp);
                    var y = s(termP);
                    return s.success && s(lassocP1(f(x, y)));
                }), ambigiousRight, ambigiousNon);
            }

            function lassocP1(x) {
                return or(lassocP(x), pure(x));
            }

            function nassocP(x) {
                return seq(function (s) {
                    var f = s(nassocOp);
                    var y = s(termP);
                    return s.success && s(or(ambigiousRight, ambigiousLeft, ambigiousNon, pure(f(x, y))));
                });
            }

            return seq(function (s) {
                var x = s(termP);
                return s.success && s(label("operator", or(rassocP(x), lassocP(x), nassocP(x), pure(x))));
            });
        }, simpleExpr);
    }
    Parsect.buildExpressionParser = buildExpressionParser;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Util //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    function breakPoint(parser) {
        function breakPointParser(state) {
            debugger;
            return parse(parser, state);
        }
        return new Parser(breakPointParser);
    }
    Parsect.breakPoint = breakPoint;

    function progress(f) {
        assert(f instanceof Function);
        var count = 0;
        function logParser(state) {
            var pos = Math.floor(state.position / state.source.length);
            if (pos > count) {
                count = pos;
                f(count);
            }
            return ok(state, undefined);
        }
        ;
        return new Parser(logParser);
    }
    Parsect.progress = progress;

    // assert argument conditions.
    function assert(condition) {
        if (!condition)
            throw new Error("Argument Assertion Error");
    }

    /// Compare two jsons
    function jsonEq(a, b) {
        if ((typeof a === "boolean") || (typeof b === "boolean") || (typeof a === "string") || (typeof b === "string") || (typeof a === "number") || (typeof b === "number") || (typeof a === "undefined") || (typeof b === "undefined") || (a === null) || (b === null)) {
            return a === b;
        } else if (a instanceof Function || b instanceof Function) {
            throw new Error();
        } else if (a instanceof RegExp || b instanceof RegExp) {
            return a === b;
        } else if (a instanceof Array || b instanceof Array) {
            var xs = a, ys = b;
            return xs instanceof Array && ys instanceof Array && xs.every(function (x, i) {
                return jsonEq(ys[i], x);
            });
        } else {
            var f = true;
            for (var x in a) {
                f = f && (x in b && jsonEq(a[x], b[x]) || true);
            }
            for (var x in b) {
                f = f && (x in a && jsonEq(b[x], a[x]) || true);
            }
        }
        return f;
    }
    Parsect.jsonEq = jsonEq;

    (function (Join) {
        function many(p) {
            return Parsect.fmap(function (x) {
                return x.join('');
            }, Parsect.many(p));
        }
        Join.many = many;
        function many1(p) {
            return Parsect.fmap(function (x) {
                return x.join('');
            }, Parsect.many1(p));
        }
        Join.many1 = many1;
        function sepBy1(p, q) {
            return Parsect.fmap(function (x) {
                return x.join('');
            }, Parsect.sepBy1(p, q));
        }
        Join.sepBy1 = sepBy1;
        function sepByN(m, n, p, q) {
            return Parsect.fmap(function (x) {
                return x.join('');
            }, Parsect.sepByN(m, n, p, q));
        }
        Join.sepByN = sepByN;
        function repeat(m, n, p) {
            return Parsect.fmap(function (x) {
                return x.join('');
            }, Parsect.repeat(m, n, p));
        }
        Join.repeat = repeat;
        function array(ps) {
            return Parsect.fmap(function (x) {
                return x.join('');
            }, Parsect.array(ps));
        }
        Join.array = array;
        function series() {
            var ps = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                ps[_i] = arguments[_i + 0];
            }
            return Parsect.fmap(function (x) {
                return x.join('');
            }, Parsect.array(ps));
        }
        Join.series = series;
    })(Parsect.Join || (Parsect.Join = {}));
    var Join = Parsect.Join;
})(Parsect || (Parsect = {}));
