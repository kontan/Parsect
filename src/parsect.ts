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

module Parsect {

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Data Type Definitions ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    export class State<U> { 
        constructor(public source: string, public position: number = 0, public _userState?: U, public _path: string[] = []){    
            // _position == _source.length + 1 at the maximum because of eof.
            if(position < 0 || position > source.length + 1) throw "_position: out of range: " + position;
            Object.defineProperty(this, "path", { get: ()=> this._path.join(' > ') });
        }
        path: string;
        seek(count: number): State {
            return new State(this.source, this.position + count, this._userState, this._path);
        }
        push(tag: string): State {
            var _path_ = this._path.slice(0);
            _path_.push(tag);
            return new State(this.source, this.position, this._userState, _path_);
        }
        pop(): State {
            var _path_ = this._path.slice(0);
            _path_.shift();
            return new State(this.source, this.position, this._userState, _path_);
        }
        equals(src: State<U>): boolean {
            return src && this.source === src.source && this.position === src.position && jsonEq(this._userState, src._userState);
        }
    }

    export function getState<U>(state: State<U>): U {
        return state._userState;
    }

    export function setState<U>(state: State<U>, value: U): State<U> {
        return new State<U>(state.source, state.position, value, state._path);
    }

    export class Reply<A,U> { 
        /// private constructor
        /// You should use success or fail functions instead of the constructor.
        constructor(public state: State<U>, public success: boolean, public value?: A, public expected?: string, public failurePath?: string){
        }

        equals(st: Reply<A,U>): boolean {
            return st &&
                   this.state.equals(st.state)     && 
                   this.success       === st.success &&
                   (this.success ? jsonEq(this.value, st.value) : this.expected === st.expected);
        }
    }

    // create new successful state.
    export function success<A,U>(state: State<U>, value: A): Reply<A,U> {
        return new Reply(state, true, value, undefined);
    }

    // create new failure state
    export function failure<A,U>(state: State<U>, expected?: string): Reply<A,U> {
        return new Reply<A>(state, false, undefined, expected, state.path);
    }

    /// parser object
    export class Parser<A> {
        /// create new parser.
        /// @param parse parsing function
        /// @param expecting human-readable string description that this parser expecting. 
        constructor(public runParser: <U>(state: State<U>) => Reply<A,U>){
        }
    }

    /// Parse an input.
    /// This function acceps string primitive value as string parser or RegExp object as regexp parser.
    /// @param parser parser.
    /// @param source source.
    /// @return the result of parssing.
    export function parse<A,U>(parser: Parser<A>, source: string  ): Reply<A,U>;
    export function parse<A,U>(parser: Parser<A>, source: State<U>): Reply<A,U>;
    export function parse<A,U>(parser: Parser<A>, source: any     ): Reply<A,U> {
             if(source instanceof State  ) ;
        else if(typeof source === "string") source = new State(source);
        else if(source instanceof String  ) source = new State(source);
        else throw new Error();
        var parser = <any>asParser(parser);
        if(<any>parser instanceof Function) parser = (<any>parser)();   // *HACK*
        return parser.runParser(source);
    }

    // convert a argument into a string parser.
    // *HACK* ... It returns Parser<T> or Function! 
    function asParser(pattern: Parser<string>    ): Parser<string> ;
    function asParser(pattern: string            ): Parser<string> ;
    function asParser(pattern: RegExp            ): Parser<string> ;
    function asParser<T>(pattern: ()=>Parser<T>  ): Parser<T> ;
    function asParser<T>(pattern: Parser<T>[]    ): Parser<T[]   > ;
    function asParser(pattern: any               ): Parser<any   > {
             if(pattern instanceof Parser  ) return pattern;
        else if(pattern instanceof String  ) return string(pattern);
        else if(pattern instanceof RegExp  ) return regexp(pattern);
        else if(typeof pattern === "string") return string(pattern);
        else if(pattern instanceof Array   ) return array(pattern);
        else if(pattern instanceof Function) return pattern;            // *HACK* 
        else throw new Error();
    }

    /// seq function context object.
    export interface Context<S,U>{        
        /// パーサをこのコンテキストで実行し、そのパーサの意味値を返します。
        /// パースが失敗した場合は undefined を返します。
        /// コンテキストが失敗している場合は、パースは実行されず undefined が返ります。
        <T>(p: Parser<T>): T;
           (s: string   ): string;
           (p: RegExp   ): string;
        <T>(f: ()=>T    ): T;

        userState: U;        /// 現在のコンテキストのユーザ状態。自由に書き込み、読み込みが可能です。
        peek: string;           // (readlony) Current input string
        success: boolean;       // (readonly) 
        value: any;             // (readonly)

        /// このコンテキストの意味値。デフォルトでは空のオブジェクト。
        ///ただし、seq コールバックが undefined 以外の値を返す場合は、out メンバ変数は無視され、その返り値が意味値となる。 
        out: S;
    }

    //////////////////////////////////////////////////////////////////////////////////////
    // Parser Combinators //////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////

    // Choice parser combinators //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    export function choice<T>(ps: Parser<T>[]): Parser<T> {
        ps = ps.map(asParser);
        function choiceParser<U>(source: State<U>){
            // For debugging　and efficiency, expand list as loop intentionally.
            var sts = [];
            for(var i = 0; i < ps.length; i++){
                var st = parse(ps[i], source);
                if(st.success || st.state.position != source.position){
                    return st;
                }
                sts.push(st);
            }
            return failure(source, "one of " + sts.map(st=>st.expected).join(','));
        }
        return new Parser(choiceParser);
    }

    export function or<T>(...ps: Parser<T>[]): Parser<T> {
        return choice(ps);
    }

    // Repetitious parser constructors ////////////////////////////////////////////////////////////////////////////////////////

    // repeat:(n:number, m: number, p:Parser<T>):Parser<T[]>
    export function repeat<T>(min: number, max: number, p: Parser<T>): Parser<T[]> {
        p = asParser(p);
        function repeatParser<U>(s: State<U>){
            // For debugging　and efficiency, expand list as loop intentionally.
            var xs:any[] = [];
            var st = success(s, undefined);
            for(var i = 0; i < max; i++){
                var _st = parse(p, st.state);
                if(_st.success){
                    st = _st;
                    xs.push(st.value);
                }else if(i < min){
                    return _st;
                }else{
                    break;
                }
            }
            return success(st.state, xs);
        }
        return new Parser(repeatParser);
    }

    // count:(n:number, p:Parser<T>):Parser<T[]>
    export function count<T>(n: number, p: Parser<T>): Parser<T[]> {
        return repeat(n, n, p);
    }

    export function many<T>(p:Parser<T>): Parser<T[]> {
        return repeat(0, Number.MAX_VALUE, p);
    }

    // many1:(p:Parser<T>):Parser<T[]>
    export function many1<T>(p: Parser<T>): Parser<T[]> {
        return repeat(1, Number.MAX_VALUE, p);
    }

    // Sequential parser constructors ///////////////////////////////////////////////////////////////////////////////////////

    /// array parser receives an array of Parser and consumes those parser input sequentially.
    export function array<T>(ps: Parser<T>[]): Parser<T[]> {
        ps = ps.map(asParser);
        function arrayParser<U>(source: State<U>): Reply<T[],U> {
            var values: T[] = [];
            var st:Reply<T,U> = success(source, undefined);
            for(var i = 0; i < ps.length; i++){
                st = parse(ps[i], st.state);
                if( ! st.success) return failure(st.state, st.expected);
                values.push(st.value);
            }
            return success(st.state, values);
        }
        return new Parser<T[]>(arrayParser);
    }

    export function series<T>(...ps: Parser<T>[]): Parser<T[]> {
        return array(ps);
    }

    /// head(a, b, c, ...) parses a, b, c and etc, and returns value of a.
    export function head<T>(p:Parser<T>, ...ps:Parser<any>[]): Parser<T> {
        p = asParser(p); ps = ps.map(asParser);
        function headParser<U>(source: State<U>): Reply<T,U>{
            var st:Reply<any,U> = parse(p, source);
            var value: T = st.value;
            for(var i = 0; i < ps.length && st.success; i++){
                st = parse(ps[i], st.state);
            }
            return st.success ? success(st.state, value) : st;
        }
        return new Parser(headParser);
    }

    // tail function takes parsers and apply its sequentially.
    // This function returns the Reply object that last parser returned.
    export function tail<T>(                                                                                                         p:Parser<T>):Parser<T>;
    export function tail<T>(a:Parser<any>,                                                                                           p:Parser<T>):Parser<T>;
    export function tail<T>(a:Parser<any>, b:Parser<any>,                                                                            p:Parser<T>):Parser<T>;
    export function tail<T>(a:Parser<any>, b:Parser<any>, c:Parser<any>,                                                             p:Parser<T>):Parser<T>;
    export function tail<T>(a:Parser<any>, b:Parser<any>, c:Parser<any>, d:Parser<any>,                                              p:Parser<T>):Parser<T>;    
    export function tail<T>(a:Parser<any>, b:Parser<any>, c:Parser<any>, d:Parser<any>, e:Parser<any>,                               p:Parser<T>):Parser<T>;
    export function tail<T>(a:Parser<any>, b:Parser<any>, c:Parser<any>, d:Parser<any>, e:Parser<any>, f:Parser<any>,                p:Parser<T>):Parser<T>;
    export function tail<T>(a:Parser<any>, b:Parser<any>, c:Parser<any>, d:Parser<any>, e:Parser<any>, f:Parser<any>, g:Parser<any>, p:Parser<T>):Parser<T>;
    export function tail(...ps:Parser<any>[]): any {
        ps = ps.map(asParser);
        function tailParser<U>(source:State<U>): Reply<any,U>{
            var st:Reply<any,U> = success(source, undefined);
            for(var i = 0; i < ps.length && st.success; i++){
                st = parse(ps[i], st.state);
            }
            return st;
        }
        return new Parser(tailParser);
    }

    export function between<T>(open:Parser<any>, p:Parser<T>, close:Parser<any>): Parser<T> {
        return tail(open, head(p, close));
    }

    ///
    /// seq コンテキストオブジェクトを介して、パーサを順に適用します。
    /// パラメータ f の引数 s は 
    /// 
    /// @param f コンテキストを実行するコールバック。
    /// 
    export function seq<T,U>(f: (s: Context<T,U>, o: T)=>void): Parser<T>{
        assert(f instanceof Function);
        function seqParser<U>(source: State<U>): Reply<T,U> {
            var st:Reply<T,U> = success(source, undefined);
            var context:Context<T,U> = <Context<T,U>> ((a: any)=>{
                if(st.success){
                    if(a instanceof Function) a = pure(a);
                    st = parse(a, st.state);
                    return st.value; 
                }
            });
            Object.defineProperty(context, "userState", { 
                get: ()=> st.state._userState,
                set: (u: U)=>{ st.state._userState = u; }
            });
            Object.defineProperty(context, "success",   { get: ()=> st.success });
            Object.defineProperty(context, "peek",      { get: ()=> st.state.source.slice(st.state.position, st.state.position + 128) });
            Object.defineProperty(context, "value",     { get: ()=> st.value });
            context.out = <T> {};
            var returnValue: any = f(context, context.out);
            var value = typeof returnValue === "undefined" ? context.out : returnValue;
            return context.success ? (value !== undefined ? success(st.state, value) : st) : st;
        }
        return new Parser<T>(seqParser);
    }

    // Alternative parser constructors /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    export function sepByN<T>(min: number, max: number, p: Parser<T>, sep: Parser<any>): Parser<T[]> {
        p = asParser(p); sep = asParser(sep);
        assert(min <= max);
        function sepByNParser<U>(source: State<U>): Reply<T[],U>{
            // For debugging　and efficiency, expand list as loop intentionally.
            var xs: T[] = [];
            var st = success(source, undefined);

            var _st = parse(p, st.state);
            if(_st.success){
                st = _st;
                xs.push(_st.value);

                for(var i = 1; i < max; i++){
                    var _st = parse(sep, st.state);
                    if(_st.success){
                        st = parse(p, _st.state);
                        if(st.success){
                            xs.push(st.value);
                            continue;
                        }
                    }else if(xs.length < min){
                        return _st;
                    }
                    break;
                }
            }else if(xs.length < min){
                return _st;
            }

            if(st.success){
                return success(st.state, xs);
            }else{
                return st;
            }
                
        }
        return new Parser(sepByNParser);
    }

    export function sepBy1<T>(p: Parser<T>, sep: Parser<any>): Parser<T[]> {
        return sepByN(1, Number.MAX_VALUE, p, sep);
    }

    export function sepBy<T>(p:Parser<T>, sep:Parser<any>): Parser<T[]> {
        return sepByN(0, Number.MAX_VALUE, p, sep);
    }

    export function endByN<T>(min: number, max: number, p: Parser<T>, sep: Parser<any>): Parser<T[]> {
        return repeat(min, max, head(p, sep));
    }

    export function endBy1<T>(p: Parser<T>, sep: Parser<any>): Parser<T[]> {
        return endByN(1, Number.MAX_VALUE, p, sep);
    }

    export function endBy<T>(p: Parser<T>, sep: Parser<any>): Parser<T[]> {
        return endByN(0, Number.MAX_VALUE, p, sep);
    }



    // Optional parser constructors ///////////////////////////////////////////////////////////////////////////////////////////

    export function option<T>(defaultValue: T, p: Parser<T>): Parser<T> {
        return or(p, pure(()=>defaultValue));
    }

    // optional:(p:Parser<T>):Parser<T>
    export function optional<T>(p: Parser<T>): Parser<T> {
        return option(undefined, p);
    }

    // Special parser constructors /////////////////////////////////////////////////////////////////////////////////////////////

    // pure:(f:()=>T):Parser<T>
    // pure function injects a arbitrary value. 
    // pure consumes no input. 
    export function pure<T>(f: ()=>T): Parser<T>{
        return map(()=>f(), empty);
    }

    export function triable<T>(p: Parser<T>): Parser<T> {
        p = asParser(p);
        function triableParser<U>(source: State<U>): Reply<T,U> {
            var st = parse(p, source);
            return st.success ? st : failure(source, st.expected);
        }
        return new Parser<T>(triableParser);
    }

    export function lookAhead<T>(p: Parser<T>): Parser<T> {
        p = asParser(p);
        function lookAheadParser<U>(source: State<U>): Reply<T,U>{
            var st = parse(p, source);
            return st.success ? success(source, st.value) : st;            
        }
        return new Parser(lookAheadParser);
    }    

    export function notFollowedBy<T>(value: T, p: Parser<T>): Parser<T> {
        p = asParser(p);
        function notFollowedByParser<U>(source: State<U>): Reply<T,U> {
            var st = parse(p, source);
            return st.success ? failure(st.state, 'unexpected ' + st.value) : success(source, value);
        }
        return new Parser(notFollowedByParser);
    }
    
    export function map<T, S>(f: (v: T     )=>S,   p: Parser<T>): Parser<S>;
    export function map<   S>(f: (v: string)=>S,   p: string   ): Parser<S>;
    export function map<   S>(f: (v: string)=>S,   p: RegExp   ): Parser<S>;
    export function map<T   >(f: (v: any   )=>any, p: any      ): Parser<any> {
        p = asParser(p);
        function mapParser<U>(source: State<U>): Reply<T,U> {
            var st = parse(p, source);
            return st.success ? success(st.state, f(st.value)) : st;
        }
        return new Parser(mapParser);
    }

    export function lazy<T>(f: ()=>Parser<T>): Parser<T> {
        assert(f instanceof Function);
        function lazyParser<U>(source: State<U>): Reply<T,U> {
            return parse(f(), source);
        }
        return new Parser(lazyParser);
    }

    export function apply<A,B,            R>(m: (a: A, b: B                                   )=>R, pa: Parser<A>, pb: Parser<B>                                                                                          ): Parser<R>;
    export function apply<A,B,C,          R>(m: (a: A, b: B, c: C                             )=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>                                                                           ): Parser<R>;
    export function apply<A,B,C,D,        R>(m: (a: A, b: B, c: C, d: D                       )=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>                                                            ): Parser<R>;
    export function apply<A,B,C,D,E,      R>(m: (a: A, b: B, c: C, d: D, e: E                 )=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>, pe: Parser<E>                                             ): Parser<R>;
    export function apply<A,B,C,D,E,F,    R>(m: (a: A, b: B, c: C, d: D, e: E, f: F           )=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>, pe: Parser<E>, pf: Parser<F>                              ): Parser<R>;    
    export function apply<A,B,C,D,E,F,G,  R>(m: (a: A, b: B, c: C, d: D, e: E, f: F, g: G     )=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>, pe: Parser<E>, pf: Parser<F>, pg: Parser<G>               ): Parser<R>;    
    export function apply<A,B,C,D,E,F,G,H,R>(m: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h:H)=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>, pe: Parser<E>, pf: Parser<F>, pg: Parser<G>, ph: Parser<H>): Parser<R>;    
    export function apply(func: Function, ...ps: Parser<any>[]): Parser<any> {
        assert(func instanceof Function);
        return map(xs=>func.apply(undefined, xs), array(ps))
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Build-in Parsees /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    export var eof:      Parser<void> = new Parser((source:State<any>)=>source.position === source.source.length ? success(source.seek(1), undefined) : failure(source, undefined));
    export var empty:    Parser<void> = new Parser((source:State<any>)=>success(source, undefined));
    export var number:   Parser<number> = map(parseFloat, regexp(/^[-+]?\d+(\.\d+)?/));
    export var fail: Parser<any> = new Parser<any>((source: State<any>)=>failure(source, undefined));

    export function tag<T>(name: string, parser: Parser<T>): Parser<T> {
        parser = asParser(parser);
        return new Parser((source: State)=>{
            var result = parse(parser, source.push(name));
            return result.success ? success(result.state.pop(), result.value) : result;
        });
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Charactor parser constructor /////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    export function oneOf(chars: string): Parser<string> {
        return satisfy(c=>chars.indexOf(c) >= 0);
    }

    export function noneOf(chars: string): Parser<string> {
        return satisfy(c=>chars.indexOf(c) == -1);
    }

    export var spaces:   Parser<string> = regexp(/^\s*/);
    export var space:    Parser<string> = regexp(/^\s/);
    export var newline:  Parser<string> = string("\n");
    export var tab:      Parser<string> = string("\t");
    export var upper:    Parser<string> = regexp(/^[A-Z]/);
    export var lower:    Parser<string> = regexp(/^[a-z]/);
    export var alphaNum: Parser<string> = regexp(/^[0-9a-zA-Z]/);
    export var letter:   Parser<string> = regexp(/^[a-zA-Z]/);
    export var digit:    Parser<string> = regexp(/^[0-9]/);
    export var hexDigit: Parser<string> = regexp(/^[0-9a-fA-F]/);
    export var octDigit: Parser<string> = regexp(/^[0-7]/);
    export var char:     Parser<string> = satisfy(_=>true);
    
    /// `satisfy cond` returns a parser consume a charactor that satisfy the condition `cond` 
    export function satisfy(condition: (charactor: string, code: number)=>boolean): Parser<string> {
        assert(condition instanceof Function);
        function expectedChars(){
            var cs: string[] = [];
            for(var i = 32; i <= 126; i++){
                var c = String.fromCharCode(i);
                if(condition(c, i)){
                    cs.push(c);
                }
            }
            return cs;
        }
        function satisfyParser<U>(s: State<U>): Reply<string,U> {
            var c = s.source[s.position];
            var i = s.source.charCodeAt(s.position);
            if(condition(c, i)){
                return success(s.seek(1), c);
            }else{
                var cs = expectedChars();
                return failure(s, (cs.length === 1 ? "" : "one of ") + "\"" + cs.join('') + "\"");
            }
        }
        return new Parser<string>(satisfyParser);
    }

    /// string parser
    export function string(text: string): Parser<string> {
        assert(typeof text === "string" || <String>text instanceof String)
        function stringParser<U>(s: State<U>): Reply<string,U> {
            return s.source.indexOf(text, s.position) === s.position ? success(s.seek(text.length), text) : failure(s, "\"" + text + "\"");
        }
        return new Parser<string>(stringParser);
    }

    // regular expression parser
    export function regexp(pattern: RegExp): Parser<string> {
        assert(pattern instanceof RegExp);
        function regexpParser<U>(s:State<U>): Reply<string,U> {
            var input = s.source.slice(s.position);
            pattern.lastIndex = 0;
            var ms = pattern.exec(input);
            // In javascript' Regex, ^ matches not only the benning of the input but the beginniing of new line.
            //  "input.indexOf(matches[0]) == 0" is needed.
            if(ms && ms.index == 0 && ms.length > 0){
                var m = ms[0];
                return input.indexOf(ms[0]) == 0 ? success(s.seek(m.length), m) : failure(s, "/" + pattern + "/");
            }else{
                return failure(s, "" + pattern);
            }
        }
        return new Parser<string>(regexpParser);
    }

    export function range(min: string, max: string): Parser<string> ;
    export function range(min: number, max: number): Parser<string> ;
    export function range(min: any,    max: any): Parser<string> {

        assert(
            (
                (typeof min === "number" || <Number>min instanceof Number) && 
                (typeof min === "number" || <Number>min instanceof Number)
            ) || (
                (typeof min === "string" || <String>min instanceof String) && (min.length === 1) &&
                (typeof min === "string" || <String>min instanceof String) && (max.length === 1)
            )
        );
        min = (typeof min === "string" || <String>min instanceof String) ? min.charCodeAt(0) : min;
        max = (typeof min === "string" || <String>min instanceof String) ? max.charCodeAt(0) : max;
        return satisfy((_,i)=> min <= i && i <= max );
    }

    export function charCode(charCode: number): Parser<string> {
        assert(typeof charCode === "number" || <Number>charCode instanceof Number);
        return satisfy((_,i)=> i === charCode);
    }

    ////////////////////////////////////////////////////////////////////
    // Util ////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////

    export function breakPoint<T>(parser: Parser<T>): Parser<T> {
        parser = asParser(parser);
        function breakPointParser<U>(source: State<U>): Reply<T,U> {
            debugger;
            return parse(parser, source);
        }
        return new Parser(breakPointParser);
    }

    export function log(f: (state: number)=>void): Parser<void>{
        assert(f instanceof Function);
        var count = 0;
        function logParser<U>(source: State<U>): Reply<void,U> {
            var pos = Math.floor(source.position / source.source.length);
            if(pos > count) {
                count = pos;
                f(count);
            }
            return success(source, undefined);
        };
        return new Parser(logParser);
    }

    // assert argument conditions.
    function assert(condition: boolean): void {
        if( ! condition) throw new Error("Argument Assertion Error");
    }

    /// Compare two jsons
    export function jsonEq<T>(a:T, b:T): boolean {
        if(
            (typeof a === "boolean"  ) || (typeof b === "boolean"  ) ||
            (typeof a === "string"   ) || (typeof b === "string"   ) ||
            (typeof a === "number"   ) || (typeof b === "number"   ) ||
            (typeof a === "undefined") || (typeof b === "undefined") ||
            (       a === null       ) || (       b === null       )
        ){
            return a === b;
        }else if(a instanceof Array || b instanceof Array){
            var xs: Array = <any> a, ys: Array = <any> b;
            return xs instanceof Array && ys instanceof Array && xs.every((x: any, i: number) => jsonEq(ys[i], x));
        }else{
            var f = true;
            for(var x in a){
                f = f && (x in b && jsonEq(a[x], b[x]) || true);
            }
            for(var x in b){
                f = f && (x in a && jsonEq(b[x], a[x]) || true);
            }
        }
        return f;
    }

    export module Join {
        export function many  (p: Parser<string>                                         ): Parser<string> { return map(x=>x.join(''), Parsect.many(p)); }
        export function many1 (p: Parser<string>                                         ): Parser<string> { return map(x=>x.join(''), Parsect.many1(p)); }
        export function sepBy1(p: Parser<string>, q: Parser<string>                      ): Parser<string> { return map(x=>x.join(''), Parsect.sepBy1(p, q)); }
        export function sepByN(m: number, n: number, p: Parser<string>, q: Parser<string>): Parser<string> { return map(x=>x.join(''), Parsect.sepByN(m, n, p, q)); }
        export function repeat(m: number, n: number, p: Parser<string>                   ): Parser<string> { return map(x=>x.join(''), Parsect.repeat(m, n, p)); }
        export function array (ps: Parser<string>[]                                      ): Parser<string> { return map(x=>x.join(''), Parsect.array(ps)); }
        export function series(...ps: Parser<string>[]                                   ): Parser<string> { return map(x=>x.join(''), Parsect.array(ps)); }
    }
}

// *HACK* ... function overload combination hack
interface String {
    runParser: <U>(source: Parsect.State<U>)=>Parsect.Reply<string,U>;
}

interface RegExp {
    runParser: <U>(source: Parsect.State<U>)=>Parsect.Reply<string,U>;
}

interface Function {
    runParser: <U>(source: Parsect.State<U>)=>Parsect.Reply<any,U>;
}

// Bug?
//interface Array {
//    parse: (source: Parsect.State)=>Parsect.Reply<any>;
//}