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
            if (position < 0 || position > source.length + 1)
                throw "_position: out of range: " + position;
            Object.defineProperty(this, "path", { get: function () {
                    return _this._path.join(' > ');
                } });
        }
        State.prototype.seek = function (count) {
            return new State(this.source, this.position + count, this._userState, this._path);
        };
        State.prototype.push = function (tag) {
            var _path_ = this._path.slice(0);
            _path_.push(tag);
            return new State(this.source, this.position, this._userState, _path_);
        };
        State.prototype.pop = function () {
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
        if (parser instanceof Function)
            parser = (parser)();
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
            return pattern;
else
            throw new Error();
    }

    //////////////////////////////////////////////////////////////////////////////////////
    // Parser Combinators //////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////
    // Choice parser combinators //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    function choice(ps) {
        ps = ps.map(asParser);
        function choiceParser(source) {
            // For debugging　and efficiency, expand list as loop intentionally.
            var sts = [];
            for (var i = 0; i < ps.length; i++) {
                var st = parse(ps[i], source);
                if (st.success || st.state.position != source.position) {
                    return st;
                }
                sts.push(st);
            }
            return failure(source, "one of " + sts.map(function (st) {
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
                    st = _st;
                    xs.push(st.value);
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
        function arrayParser(source) {
            var values = [];
            var st = success(source, undefined);
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
        function headParser(source) {
            var st = parse(p, source);
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
        function tailParser(source) {
            var st = success(source, undefined);
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
        function seqParser(source) {
            var st = success(source, undefined);
            var context = (function (a) {
                if (st.success) {
                    if (a instanceof Function)
                        a = pure(a);
                    st = parse(a, st.state);
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
            Object.defineProperty(context, "value", { get: function () {
                    return st.value;
                } });
            context.out = {};
            var returnValue = f(context, context.out);
            var value = typeof returnValue === "undefined" ? context.out : returnValue;
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
        return or(p, pure(function () {
            return defaultValue;
        }));
    }
    Parsect.option = option;

    // optional:(p:Parser<T>):Parser<T>
    function optional(p) {
        return option(undefined, p);
    }
    Parsect.optional = optional;

    // Special parser constructors /////////////////////////////////////////////////////////////////////////////////////////////
    // pure:(f:()=>T):Parser<T>
    // pure function injects a arbitrary value.
    // pure consumes no input.
    function pure(f) {
        return map(function () {
            return f();
        }, Parsect.empty);
    }
    Parsect.pure = pure;

    function triable(p) {
        p = asParser(p);
        function triableParser(source) {
            var st = parse(p, source);
            return st.success ? st : failure(source, st.expected);
        }
        return new Parser(triableParser);
    }
    Parsect.triable = triable;

    function lookAhead(p) {
        p = asParser(p);
        function lookAheadParser(source) {
            var st = parse(p, source);
            return st.success ? success(source, st.value) : st;
        }
        return new Parser(lookAheadParser);
    }
    Parsect.lookAhead = lookAhead;

    function notFollowedBy(value, p) {
        p = asParser(p);
        function notFollowedByParser(source) {
            var st = parse(p, source);
            return st.success ? failure(st.state, 'unexpected ' + st.value) : success(source, value);
        }
        return new Parser(notFollowedByParser);
    }
    Parsect.notFollowedBy = notFollowedBy;

    function map(f, p) {
        p = asParser(p);
        function mapParser(source) {
            var st = parse(p, source);
            return st.success ? success(st.state, f(st.value)) : st;
        }
        return new Parser(mapParser);
    }
    Parsect.map = map;

    function lazy(f) {
        assert(f instanceof Function);
        function lazyParser(source) {
            return parse(f(), source);
        }
        return new Parser(lazyParser);
    }
    Parsect.lazy = lazy;

    function apply(func) {
        var ps = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            ps[_i] = arguments[_i + 1];
        }
        assert(func instanceof Function);
        return map(function (xs) {
            return func.apply(undefined, xs);
        }, array(ps));
    }
    Parsect.apply = apply;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Build-in Parsees /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    Parsect.eof = new Parser(function (source) {
        return source.position === source.source.length ? success(source.seek(1), undefined) : failure(source, undefined);
    });
    Parsect.empty = new Parser(function (source) {
        return success(source, undefined);
    });
    Parsect.number = map(parseFloat, regexp(/^[-+]?\d+(\.\d+)?/));
    Parsect.fail = new Parser(function (source) {
        return failure(source, undefined);
    });

    function tag(name, parser) {
        parser = asParser(parser);
        return new Parser(function (source) {
            var result = parse(parser, source.push(name));
            return result.success ? success(result.state.pop(), result.value) : result;
        });
    }
    Parsect.tag = tag;

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Charactor parser constructor /////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
    Parsect.char = satisfy(function (_) {
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
            var c = s.source[s.position];
            var i = s.source.charCodeAt(s.position);
            if (condition(c, i)) {
                return success(s.seek(1), c);
            } else {
                var cs = expectedChars();
                return failure(s, (cs.length === 1 ? "" : "one of ") + "\"" + cs.join('') + "\"");
            }
        }
        return new Parser(satisfyParser);
    }
    Parsect.satisfy = satisfy;

    /// string parser
    function string(text) {
        assert(typeof text === "string" || text instanceof String);
        function stringParser(s) {
            return s.source.indexOf(text, s.position) === s.position ? success(s.seek(text.length), text) : failure(s, "\"" + text + "\"");
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

    ////////////////////////////////////////////////////////////////////
    // Util ////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////
    function breakPoint(parser) {
        parser = asParser(parser);
        function breakPointParser(source) {
            debugger;
            return parse(parser, source);
        }
        return new Parser(breakPointParser);
    }
    Parsect.breakPoint = breakPoint;

    function log(f) {
        assert(f instanceof Function);
        var count = 0;
        function logParser(source) {
            var pos = Math.floor(source.position / source.source.length);
            if (pos > count) {
                count = pos;
                f(count);
            }
            return success(source, undefined);
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
            return Parsect.map(function (x) {
                return x.join('');
            }, Parsect.many(p));
        }
        Join.many = many;
        function many1(p) {
            return Parsect.map(function (x) {
                return x.join('');
            }, Parsect.many1(p));
        }
        Join.many1 = many1;
        function sepBy1(p, q) {
            return Parsect.map(function (x) {
                return x.join('');
            }, Parsect.sepBy1(p, q));
        }
        Join.sepBy1 = sepBy1;
        function sepByN(m, n, p, q) {
            return Parsect.map(function (x) {
                return x.join('');
            }, Parsect.sepByN(m, n, p, q));
        }
        Join.sepByN = sepByN;
        function repeat(m, n, p) {
            return Parsect.map(function (x) {
                return x.join('');
            }, Parsect.repeat(m, n, p));
        }
        Join.repeat = repeat;
        function array(ps) {
            return Parsect.map(function (x) {
                return x.join('');
            }, Parsect.array(ps));
        }
        Join.array = array;
        function series() {
            var ps = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                ps[_i] = arguments[_i + 0];
            }
            return Parsect.map(function (x) {
                return x.join('');
            }, Parsect.array(ps));
        }
        Join.series = series;
    })(Parsect.Join || (Parsect.Join = {}));
    var Join = Parsect.Join;
})(Parsect || (Parsect = {}));
