var Parsect;
(function (Parsect) {
    var Parser = (function () {
        function Parser(name, parse) {
            this.name = name;
            this.parse = parse;
        }
        return Parser;
    })();
    Parsect.Parser = Parser;    
    var State = (function () {
        function State(value, source, success) {
            if (typeof success === "undefined") { success = true; }
            this.value = value;
            this.source = source;
            this.success = success;
        }
        State.prototype.fail = function () {
            return new State(this.value, this.source, false);
        };
        State.prototype.isSuccessed = function () {
            return this.success;
        };
        return State;
    })();
    Parsect.State = State;    
    var Source = (function () {
        function Source(source, position) {
            this.source = source;
            this.position = position;
        }
        Source.prototype.progress = function (delta) {
            return new Source(this.source, this.position + delta);
        };
        return Source;
    })();
    Parsect.Source = Source;    
    function choice(f) {
        return new Parser("choice", function (source) {
            var choicedState = undefined;
            var c = function (p) {
                if(choicedState === undefined) {
                    var result = p.parse(source);
                    if(result.isSuccessed()) {
                        choicedState = result;
                        (c).result = result.value.toString().slice(0, 16);
                        (c).success = true;
                        return result.value;
                    }
                }
                return undefined;
            };
            (c).source = source.source.slice(source.position, 10);
            (c).success = false;
            f(c);
            return choicedState !== undefined ? choicedState : new State(undefined, source, false);
        });
    }
    Parsect.choice = choice;
    function seq(f) {
        return new Parser("seq", function (source) {
            var currentState = new State(undefined, source, true);
            var active = true;
            var s = function (p) {
                if(active) {
                    currentState = p.parse(currentState.source);
                    if(currentState.isSuccessed()) {
                        (s).result = currentState.value.toString().slice(0, 16);
                        return currentState.value;
                    } else {
                        active = false;
                    }
                }
                s.success = false;
                return undefined;
            };
            (s).source = source.source.slice(source.position, 16);
            (s).success = true;
            var returnValue = f(s);
            return active ? (returnValue !== undefined ? new State(returnValue, currentState.source, true) : currentState) : new State(undefined, source, false);
        });
    }
    Parsect.seq = seq;
    function series() {
        var ps = arguments;
        return new Parser("series", function (source) {
            var currentState = new State(undefined, source, true);
            var currentState = new State(undefined, source, true);
            for(var i = 0; i < ps.length; i++) {
                currentState = ps[i].parse(currentState.source);
                if(currentState.isSuccessed()) {
                    return currentState.value;
                } else {
                    break;
                }
            }
            return currentState.isSuccessed() ? currentState : new State(undefined, source, false);
        });
    }
    Parsect.series = series;
    function string(text) {
        return new Parser("string \"" + text + "\"", function (s) {
            if(s.source.indexOf(text, s.position) === s.position) {
                return new State(text, s.progress(text.length));
            } else {
                return new State(undefined, s, false);
            }
        });
    }
    Parsect.string = string;
    function regexp(pattern) {
        return new Parser("regexp \"" + pattern + "\"", function (s) {
            var matches = pattern.exec(s.source.slice(s.position));
            if(matches && matches.length > 0) {
                var matched = matches[0];
                return new State(matched, s.progress(matched.length));
            } else {
                return new State(undefined, s, false);
            }
        });
    }
    Parsect.regexp = regexp;
    function ret(f) {
        return new Parser("ret", function (s) {
            return new State(f(), s);
        });
    }
    Parsect.ret = ret;
    function count(n, p) {
        return new Parser("count " + n, function (s) {
            var st = new State(undefined, s, true);
            var results = [];
            for(var i = 0; i < n; i++) {
                st = p.parse(st.source);
                if(st.isSuccessed()) {
                    results.push(st.value);
                } else {
                    return new State(undefined, s, false);
                }
            }
            return new State(results, st.source, true);
        });
    }
    Parsect.count = count;
    function many(p) {
        return new Parser("many", function (s) {
            var st = new State(undefined, s, true);
            var results = [];
            for(var i = 0; true; i++) {
                st = p.parse(st.source);
                if(st.isSuccessed()) {
                    results.push(st.value);
                } else {
                    break;
                }
            }
            return new State(results, st.source, true);
        });
    }
    Parsect.many = many;
    function many1(p) {
        return new Parser("many1", function (s) {
            var st = new State(undefined, s, true);
            var results = [];
            var i = 0;
            for(; true; i++) {
                st = p.parse(st.source);
                if(st.isSuccessed()) {
                    results.push(st.value);
                } else {
                    break;
                }
            }
            if(i == 0) {
                return new State(undefined, s, false);
            } else {
                return new State(results, st.source, true);
            }
        });
    }
    Parsect.many1 = many1;
    function or(a, b, c, d, e, f, g, h) {
        var ps = arguments;
        return new Parser("or", function (source) {
            for(var i = 0; i < ps.length; i++) {
                var _st = ps[i].parse(source);
                if(_st.isSuccessed()) {
                    return _st;
                }
            }
            return new State(undefined, source, false);
        });
    }
    Parsect.or = or;
    function satisfy(cond) {
        return new Parser("cond", function (source) {
            var c = source.source[source.position];
            if(cond(c)) {
                return new State(c, source.progress(1), true);
            } else {
                return new State(undefined, source, false);
            }
        });
    }
    Parsect.satisfy = satisfy;
    function option(defaultValue, p) {
        return new Parser("option", function (source) {
            var _st = p.parse(source);
            if(_st.isSuccessed()) {
                return _st;
            } else {
                return new State(defaultValue, source, true);
            }
        });
    }
    Parsect.option = option;
    function map(f, p) {
        return new Parser("map(" + p.name + ")", function (source) {
            var _st = p.parse(source);
            if(_st.isSuccessed()) {
                return new State(f(_st.value), _st.source, true);
            } else {
                return _st;
            }
        });
    }
    Parsect.map = map;
    Parsect.number = map(parseFloat, regexp(/^[-+]?\d+(\.\d+)?/));
    Parsect.spaces = regexp(/^\w*/);
})(Parsect || (Parsect = {}));
