//
//                            Parsect
//
//              Parser Combinator for JavaScript/TypeScript
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
'use strict';
var Parsect;
(function (Parsect) {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Data Type Definitions ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    var State = (function () {
        function State(source, position, _userState, _path) {
            if (typeof position === "undefined") { position = 0; }
            if (typeof _path === "undefined") { _path = []; }
            var _this = this;
            this.source = source;
            this.position = position;
            this._userState = _userState;
            this._path = _path;
            assert(typeof source !== "undefined");
            assert(source !== null);

            if (position < 0 || position > source.length + 1)
                throw "_position: out of range: " + position;
            Object.defineProperty(this, "path", { get: function () {
                    return _this._path.join(' > ');
                } });
            Object.defineProperty(this, "rawColumn", {
                get: function () {
                    var lines = source.split("\n");
                    var position = 0;
                    var raw = 0;
                    while (position < _this.position) {
                        if (_this.position <= position + lines[raw].length)
                            break;
                        position += lines[raw].length + 1;
                        raw++;
                    }
                    var column = _this.position - position;
                    return { raw: raw, column: column };
                }
            });
        }
        State.prototype.seek = function (count) {
            return new State(this.source, this.position + count, this._userState, this._path);
        };
        State.prototype.pushTag = function (tag) {
            var _path_ = this._path.slice(0);
            _path_.push(tag);
            return new State(this.source, this.position, this._userState, _path_);
        };
        State.prototype.popTag = function () {
            var _path_ = this._path.slice(0);
            _path_.shift();
            return new State(this.source, this.position, this._userState, _path_);
        };
        State.prototype.equals = function (src) {
            return src && this.source === src.source && this.position === src.position && jsonEq(this._userState, src._userState);
        };
        return State;
    })();
    Parsect.State = State;

    function getState(state) {
        return state._userState;
    }
    Parsect.getState = getState;

    function setState(state, value) {
        return new State(state.source, state.position, value, state._path);
    }
    Parsect.setState = setState;

    var Reply = (function () {
        /// private constructor
        /// You should use success or fail functions instead of the constructor.
        function Reply(state, success, value, expected, failurePath) {
            this.state = state;
            this.success = success;
            this.value = value;
            this.expected = expected;
            this.failurePath = failurePath;
        }
        Reply.prototype.equals = function (st) {
            return st && this.state.equals(st.state) && this.success === st.success && (this.success ? jsonEq(this.value, st.value) : this.expected === st.expected);
        };
        return Reply;
    })();
    Parsect.Reply = Reply;

    // create new successful state.
    function success(state, value) {
        return new Reply(state, true, value, undefined);
    }
    Parsect.success = success;

    // create new failure state
    function failure(state, expected) {
        return new Reply(state, false, undefined, expected, state.path);
    }
    Parsect.failure = failure;

    /// parser object
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

    function parse(parser, source) {
        if (source instanceof State)
            ;
else if (typeof source === "string")
            source = new State(source);
else if (source instanceof String)
            source = new State(source);
else
            throw new Error();
        var parser = asParser(parser);
        return parser.runParser(source);
    }
    Parsect.parse = parse;

    function asParser(pattern) {
        if (pattern instanceof Parser)
            return pattern;
else if (pattern instanceof String)
            return string(pattern);
else if (pattern instanceof RegExp)
            return regexp(pattern);
else if (typeof pattern === "string")
            return string(pattern);
else if (pattern instanceof Array)
            return array(pattern);
else if (pattern instanceof Function)
            return lazy(pattern);
else
            throw new Error();
    }
    Parsect.asParser = asParser;

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Parser Combinators (Text.Parsec.Combinator) ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Choice parser combinators //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    function choice(ps) {
        ps = ps.map(asParser);
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
            return failure(state, "one of " + sts.map(function (st) {
                return st.expected;
            }).join(','));
        }
        return new Parser(choiceParser);
    }
    Parsect.choice = choice;

    function or() {
        var ps = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            ps[_i] = arguments[_i + 0];
        }
        return choice(ps);
    }
    Parsect.or = or;

    // Repetitious parser constructors ////////////////////////////////////////////////////////////////////////////////////////
    // repeat:(n:number, m: number, p:Parser<T>):Parser<T[]>
    function repeat(min, max, p) {
        p = asParser(p);
        function repeatParser(s) {
            // For debugging　and efficiency, expand list as loop intentionally.
            var xs = [];
            var st = success(s, undefined);
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
            return success(st.state, xs);
        }
        return new Parser(repeatParser);
    }
    Parsect.repeat = repeat;

    // count:(n:number, p:Parser<T>):Parser<T[]>
    function count(n, p) {
        return repeat(n, n, p);
    }
    Parsect.count = count;

    function many(p) {
        return repeat(0, Number.MAX_VALUE, p);
    }
    Parsect.many = many;

    // many1:(p:Parser<T>):Parser<T[]>
    function many1(p) {
        return repeat(1, Number.MAX_VALUE, p);
    }
    Parsect.many1 = many1;

    // Sequential parser constructors ///////////////////////////////////////////////////////////////////////////////////////
    /// array parser receives an array of Parser and consumes those parser input sequentially.
    function array(ps) {
        ps = ps.map(asParser);
        function arrayParser(state) {
            var values = [];
            var st = success(state, undefined);
            for (var i = 0; i < ps.length; i++) {
                st = parse(ps[i], st.state);
                if (!st.success)
                    return failure(st.state, st.expected);
                values.push(st.value);
            }
            return success(st.state, values);
        }
        return new Parser(arrayParser);
    }
    Parsect.array = array;

    function series() {
        var ps = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            ps[_i] = arguments[_i + 0];
        }
        return array(ps);
    }
    Parsect.series = series;

    /// head(a, b, c, ...) parses a, b, c and etc, and returns value of a.
    function head(p) {
        var ps = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            ps[_i] = arguments[_i + 1];
        }
        p = asParser(p);
        ps = ps.map(asParser);
        function headParser(state) {
            var st = parse(p, state);
            var value = st.value;
            for (var i = 0; i < ps.length && st.success; i++) {
                st = parse(ps[i], st.state);
            }
            return st.success ? success(st.state, value) : st;
        }
        return new Parser(headParser);
    }
    Parsect.head = head;

    function tail() {
        var ps = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            ps[_i] = arguments[_i + 0];
        }
        ps = ps.map(asParser);
        function tailParser(state) {
            var st = success(state, undefined);
            for (var i = 0; i < ps.length && st.success; i++) {
                st = parse(ps[i], st.state);
            }
            return st;
        }
        return new Parser(tailParser);
    }
    Parsect.tail = tail;

    function between(open, p, close) {
        return tail(open, head(p, close));
    }
    Parsect.between = between;

    ///
    /// seq コンテキストオブジェクトを介して、パーサを順に適用します。
    /// パラメータ f の引数 s は
    ///
    /// @param f コンテキストを実行するコールバック。
    ///
    function seq(f) {
        assert(f instanceof Function);
        function seqParser(state) {
            var st = success(state, undefined);
            var lastValue = undefined;
            var context = (function (a) {
                if (st.success) {
                    var _a = asParser(a);
                    st = parse(_a, st.state);
                    lastValue = st.value;
                    return st.value;
                }
            });
            Object.defineProperty(context, "userState", {
                get: function () {
                    return st.state._userState;
                },
                set: function (u) {
                    st.state._userState = u;
                }
            });
            Object.defineProperty(context, "success", { get: function () {
                    return st.success;
                } });
            Object.defineProperty(context, "peek", { get: function () {
                    return st.state.source.slice(st.state.position, st.state.position + 128);
                } });
            Object.defineProperty(context, "tags", { get: function () {
                    return st.state._path.join(' > ');
                } });
            Object.defineProperty(context, "value", { get: function () {
                    return st.value;
                } });
            context.out = {};
            var returnValue = f(context, context.out);
            var value = typeof returnValue !== "undefined" ? returnValue : context.out;
            return context.success ? (value !== undefined ? success(st.state, value) : st) : st;
        }
        return new Parser(seqParser);
    }
    Parsect.seq = seq;

    // Alternative parser constructors /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    function sepByN(min, max, p, sep) {
        p = asParser(p);
        sep = asParser(sep);
        assert(min <= max);
        function sepByNParser(source) {
            // For debugging　and efficiency, expand list as loop intentionally.
            var xs = [];
            var st = success(source, undefined);

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

            if (st.success) {
                return success(st.state, xs);
            } else {
                return st;
            }
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

    // optional:(p:Parser<T>):Parser<T>
    function optional(p) {
        return option(undefined, p);
    }
    Parsect.optional = optional;

    // Build-in Parsees /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    Parsect.eof = new Parser(function (state) {
        return state.position === state.source.length ? success(state.seek(1), undefined) : failure(state, "end of file");
    });
    Parsect.empty = new Parser(function (state) {
        return success(state, undefined);
    });
    Parsect.number = fmap(parseFloat, regexp(/^[-+]?\d+(\.\d+)?/));

    function fail(message) {
        return new Parser(function (state) {
            return failure(state, message);
        });
    }
    Parsect.fail = fail;

    function unexpected(message) {
        function unexpectedParser(state) {
            return failure(state, message);
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
        return tail(p, skipMany(p));
    }
    Parsect.skipMany1 = skipMany1;

    function apply(func) {
        var ps = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            ps[_i] = arguments[_i + 1];
        }
        assert(func instanceof Function);
        return fmap(function (xs) {
            return func.apply(undefined, xs);
        }, array(ps));
    }
    Parsect.apply = apply;

    function tag(name, parser) {
        parser = asParser(parser);
        return new Parser(function (state) {
            var result = parse(parser, state.pushTag(name));
            return result.success ? success(result.state.popTag(), result.value) : result;
        });
    }
    Parsect.tag = tag;

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Primitive parsers (Text.Parsec.Prim) ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    function label(message, p) {
        p = asParser(p);
        function labelParser(state) {
            var reply = parse(p, state);
            return ((!reply.success) && reply.state.position === state.position) ? failure(state, message) : reply;
        }
        return new Parser(labelParser);
    }
    Parsect.label = label;

    function lookAhead(p) {
        p = asParser(p);
        function lookAheadParser(state) {
            var st = parse(p, state);
            return st.success ? success(state, st.value) : st;
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
        p = asParser(p);
        function triableParser(state) {
            var st = parse(p, state);
            return st.success ? st : failure(state, st.expected);
        }
        return new Parser(triableParser);
    }
    Parsect.triable = triable;

    function notFollowedBy(p) {
        p = asParser(p);
        function notFollowedByParser(state) {
            var rep = parse(p, state);
            return rep.success ? failure(state, 'not ' + rep.value) : success(state, undefined);
        }
        return new Parser(notFollowedByParser);
    }
    Parsect.notFollowedBy = notFollowedBy;

    function fmap(f, p) {
        p = asParser(p);
        function mapParser(state) {
            var st = parse(p, state);
            return st.success ? success(st.state, f(st.value)) : st;
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

    Parsect.spaces = regexp(/^\s*/);
    Parsect.space = regexp(/^\s/);
    Parsect.newline = string("\n");
    Parsect.tab = string("\t");
    Parsect.upper = regexp(/^[A-Z]/);
    Parsect.lower = regexp(/^[a-z]/);
    Parsect.alphaNum = regexp(/^[0-9a-zA-Z]/);
    Parsect.letter = regexp(/^[a-zA-Z]/);
    Parsect.digit = regexp(/^[0-9]/);
    Parsect.hexDigit = regexp(/^[0-9a-fA-F]/);
    Parsect.octDigit = regexp(/^[0-7]/);

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
                    return success(s.seek(1), c);
                }
            }
            var cs = expectedChars();
            return failure(s, (cs.length === 1 ? "" : "one of ") + "\"" + cs.join('') + "\"");
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
            return text === (caseSensitive ? slice : slice.toLowerCase()) ? success(s.seek(text.length), text) : failure(s, "\"" + text + "\"");
            //return s.source.indexOf(text, s.position) === s.position ? success(s.seek(text.length), text) : failure(s, "\"" + text + "\"");
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
                return input.indexOf(ms[0]) == 0 ? success(s.seek(m.length), m) : failure(s, "/" + pattern + "/");
            } else {
                return failure(s, "" + pattern);
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
        var noLine = def.commentLine.length == 0;
        var noMulti = def.commentStart.length == 0;

        var oneLineComment = seq(function (s) {
            s(triable(string(def.commentLine)));
            s(skipMany(satisfy(function (x) {
                return x != '\n';
            })));
            return undefined;
        });
        var multiLineComment = seq(function (s) {
            s(triable(string(def.commentStart)));
            return s(inComment);
        });
        var startEnd = (def.commentEnd + def.commentStart).split('').filter(function (x, i, xs) {
            return xs.indexOf(x) === i;
        }).join("");
        var inCommentMulti = label("end of comment", or(seq(function (s) {
            s(triable(string(def.commentEnd)));
        }), seq(function (s) {
            s(multiLineComment);
            s(inCommentMulti);
        }), seq(function (s) {
            s(skipMany1(noneOf(startEnd)));
            s(inCommentMulti);
        }), seq(function (s) {
            s(oneOf(startEnd));
            s(inCommentMulti);
        })));
        var inCommentSingle = label("end of comment", or(seq(function (s) {
            s(triable(string(def.commentEnd)));
        }), seq(function (s) {
            s(skipMany1(noneOf(startEnd)));
            s(inCommentSingle);
        }), seq(function (s) {
            s(oneOf(startEnd));
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

        var oper = seq(function (s) {
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
        var charEscape = tail(string('\\'), escapeCode);
        var characterChar = label("literal character", or(charLetter, charEscape));
        var charLiteral = label("character", lexeme(between(string('\''), characterChar, label("end of character", string('\'')))));

        var escapeEmpty = string('&');
        var escapeGap = tail(many1(Parsect.space), label("end of string gap", string('\\')));
        var stringEscape = tail(string('\\'), or(tail(escapeGap, pure(null)), tail(escapeEmpty, pure(null)), escapeCode));
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
        var hexadecimal = tail(oneOf("xX"), number(16, Parsect.hexDigit));
        var octal = tail(oneOf("oO"), number(8, Parsect.octDigit));
        var zeroNumber = label("", tail(string('0'), or(hexadecimal, octal, decimal, pure(0))));
        var nat = or(zeroNumber, decimal);
        var sign = or(tail(string('-'), pure(function (x) {
            return -x;
        })), tail(string('+'), pure(function (x) {
            return x;
        })), function (x) {
            return x;
        });
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
        var natFloat = or(tail(string('0'), zeroNumFloat), decimalFloat);
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
                return triable(tail(op, fail("ambiguous use of a " + assoc + " associative operator")));
            }

            var ambigiousRight = ambigious("right", rassocOp);
            var ambigiousLeft = ambigious("left", lassocOp);
            var ambigiousNon = ambigious("non", nassocOp);

            var termP = seq(function (s) {
                var pre = s(prefixP);
                var x = s(term);
                var post = s(postfixP);
                return s.success ? post(pre(x)) : undefined;
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
                    return s.success ? f(x, y) : undefined;
                }), ambigiousLeft, ambigiousNon);
            }

            function rassocP1(x) {
                return or(rassocP(x), pure(x));
            }

            function lassocP(x) {
                return or(seq(function (s) {
                    var f = s(lassocOp);
                    var y = s(termP);
                    return s.success ? s(lassocP1(f(x, y))) : undefined;
                }), ambigiousRight, ambigiousNon);
            }

            function lassocP1(x) {
                return or(lassocP(x), pure(x));
            }

            function nassocP(x) {
                return seq(function (s) {
                    var f = s(nassocOp);
                    var y = s(termP);
                    return s.success ? s(or(ambigiousRight, ambigiousLeft, ambigiousNon, pure(f(x, y)))) : undefined;
                });
            }

            return seq(function (s) {
                var x = s(termP);
                return s.success ? s(label("operator", or(rassocP(x), lassocP(x), nassocP(x), pure(x)))) : undefined;
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
        parser = asParser(parser);
        function breakPointParser(state) {
            debugger;
            return parse(parser, state);
        }
        return new Parser(breakPointParser);
    }
    Parsect.breakPoint = breakPoint;

    function log(f) {
        assert(f instanceof Function);
        var count = 0;
        function logParser(state) {
            var pos = Math.floor(state.position / state.source.length);
            if (pos > count) {
                count = pos;
                f(count);
            }
            return success(state, undefined);
        }
        ;
        return new Parser(logParser);
    }
    Parsect.log = log;

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
