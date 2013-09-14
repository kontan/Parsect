// Parsect (https://github.com/kontan/Parsect)
// @author Kon - http://phyzkit.net/

'use strict';

// *HACK* ... function overload combination hack
interface String {
    parse: (source: Parsect.Source)=>Parsect.State<string>;
}

interface RegExp {
    parse: (source: Parsect.Source)=>Parsect.State<string>;
}

interface Function {
    parse: (source: Parsect.Source)=>Parsect.State<string>;
}

module Parsect{

    // assert argument conditions.
    function assert(condition: boolean): void {
        if( ! condition) throw new Error("Argument Assertion Error");
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Data Type Definitions ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    export class Source { 
        constructor(public source: string, public position: number = 0){    
            // _position == _source.length + 1 at the maximum because of eof.
            if(position < 0 || position > source.length + 1) throw "_position: out of range: " + position;
        }
        step(count: number): Source {
            return new Source(this.source, this.position + count);
        }
        equals(src: Source): boolean {
            return src && this.source === src.source && this.position === src.position;
        }
    }

    export class State<T> { 
        /// private constructor
        /// You should use success or fail functions instead of the constructor.
        constructor(public source: Source, public success: boolean, public value?: T, public errorMesssage?: string){
        }

        equals(st:State<T>): boolean {
            return st &&
                   this.source.equals(st.source)     && 
                   this.success       === st.success &&
                   (this.success ? jsonEq(this.value, st.value) : this.errorMesssage === st.errorMesssage);
        }
    }

    // create new successful state.

    export function success<T>(source:Source, value:T): State<T>;
    export function success<T>(source:string, value:T): State<T>;        
    export function success<T>(source:any,    value:T): State<T> {
        source = typeof source === "string" ? new Source(source, 0) : source;
        return new State(source, true, value, undefined);
    }

    // create new failure state
    export function failure<T>(source:string, errorMesssage?:string): State<T> ;
    export function failure<T>(source:Source, errorMesssage?:string): State<T> ;
    export function failure<T>(source:any   , errorMesssage?:string): State<T> {
        source = typeof source === "string" ? new Source(source, 0) : source;
        return new State<any>(source, false, undefined, errorMesssage);
    }

    /// parser object
    export class Parser<T>{
        /// create new parser.
        /// @param parse parsing function
        /// @param expecting human-readable string description that this parser expecting. 
        constructor(public parse: (source: Source)=>State<T>){
        }
    }

    /// Parse an input.
    /// This function acceps string primitive value as string parser or RegExp object as regexp parser.
    /// @param parser parser.
    /// @param input input.
    /// @return the result of parssing.
    export function parse<T,U>(parser: Parser<T>, input: string, userState?: U): State<T>;
    export function parse<T,U>(parser: Parser<T>, input: Source, userState?: U): State<T>;
    export function parse<T,U>(parser: Parser<T>, input: any   , userState?: U): State<T> {
             if(input instanceof Source  ) ;
        else if(typeof input === "string") input = new Source(input);
        else if(input instanceof String  ) input = new Source(input);
        else throw new Error();
        var parser = <any>asParser(parser);
        if(<any>parser instanceof Function) parser = (<any>parser)();   // *HACK*
        return parser.parse(input);
    }

    // convert a argument into a string parser.
    // *HACK* ... It returns Parser<T> or Function! 
    function asParser(pattern: Parser<string>    ): Parser<string> ;
    function asParser(pattern: string            ): Parser<string> ;
    function asParser(pattern: RegExp            ): Parser<string> ;
    function asParser(pattern: ()=>Parser<string>): Parser<string> ;
    function asParser(pattern: any               ): Parser<string> {
             if(pattern instanceof Parser  ) return pattern;
        else if(pattern instanceof String  ) return string(pattern);
        else if(pattern instanceof RegExp  ) return regexp(pattern);
        else if(typeof pattern === "string") return string(pattern);
        else if(pattern instanceof Function) return pattern;    // *HACK* 
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

        // pure(f) と同じ
        <T>(f: ()=>T    ): T;

        userState: U;        /// 現在のコンテキストのユーザ状態。自由に書き込み、読み込みが可能です。
        peek: string;       // Current input string
        success: boolean;
        value: any;

        /// このコンテキストの意味値。デフォルトでは空のオブジェクト。
        ///ただし、seq コールバックが undefined 以外の値を返す場合は、out メンバ変数は無視され、その返り値が意味値となる。 
        out: S;
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Parser constructors ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /// string parser
    export function string(text: string): Parser<string> {
        assert(typeof text === "string" || <String>text instanceof String)
        function stringParser(s: Source): State<string> {
            return s.source.indexOf(text, s.position) === s.position ? success(s.step(text.length), text) : failure(s, "\"" + text + "\"");
        }
        return new Parser<string>(stringParser);
    }

    // regular expression parser
    export function regexp(pattern: RegExp): Parser<string> {
        assert(pattern instanceof RegExp);
        function regexpParser(s:Source){
            var input = s.source.slice(s.position);
            pattern.lastIndex = 0;
            var ms = pattern.exec(input);
            // In javascript' Regex, ^ matches not only the benning of the input but the beginniing of new line.
            //  "input.indexOf(matches[0]) == 0" is needed.
            if(ms && ms.index == 0 && ms.length > 0){
                var m = ms[0];
                return input.indexOf(ms[0]) == 0 ? success(s.step(m.length), m) : failure(s, "/" + pattern + "/");
            }else{
                return failure(s, "" + pattern);
            }
        }
        return new Parser<string>(regexpParser);
    }

    /// `satisfy cond` returns a parser consume a charactor that satisfy the condition `cond` 
    export function satisfy(condition: (charactor: string, code: number)=>boolean): Parser<string> {
        assert(condition instanceof Function);
        function expectedChars(){
            var cs = [];
            for(var i = 32; i <= 126; i++){
                var c = String.fromCharCode(i);
                if(condition(c, i)){
                    cs.push(c);
                }
            }
            return cs;
        }
        function satisfyParser(s: Source){
            var c = s.source[s.position];
            var i = s.source.charCodeAt(s.position);
            if(condition(c, i)){
                return success(s.step(1), c);
            }else{
                var cs = expectedChars();
                return failure(s, (cs.length === 1 ? "" : "one of ") + "\"" + cs.join('') + "\"");
            }
        }
        return new Parser<string>(satisfyParser);
    }

    export function range(min: number, max: number): Parser<string> {
        assert(
            (typeof min === "number" || <Number>min instanceof Number) && 
            (typeof min === "number" || <Number>min instanceof Number)
        );
        return satisfy((_,i)=> min <= i && i <= max );
    }

    export function charCode(charCode: number): Parser<string> {
        assert(typeof charCode === "number" || <Number>charCode instanceof Number);
        return satisfy((_,i)=> i === charCode);
    }    

    //////////////////////////////////////////////////////////////////////////////////////
    // Parser Combinators
    //////////////////////////////////////////////////////////////////////////////////////

    // Sequential parser constructors ///////////////////////////////////////////////////////////////////////////////////////

    ///
    /// seq コンテキストオブジェクトを介して、パーサを順に適用します。
    /// パラメータ f の引数 s は 
    /// 
    /// @param f コンテキストを実行するコールバック。
    /// 
    export function seq<T,U>(f: (s: Context<T,U>, o: T)=>void): Parser<T>{
        assert(f instanceof Function);
        function seqParser(source: Source): State<T> {
            var st:State<T> = success(source, undefined);
            var context:Context<T,U> = <Context<T,U>> ((a: any)=>{
                if(st.success){
                    if(a instanceof Function) a = pure(a);
                    st = parse(a, st.source);
                    return st.value; 
                }
            });
            Object.defineProperty(context, "success", { get: ()=> st.success });
            Object.defineProperty(context, "peek",    { get: ()=> st.source.source.slice(st.source.position, st.source.position + 128) });
            Object.defineProperty(context, "value",   { get: ()=> st.value });
            context.out = <T> {};
            var returnValue: any = f(context, context.out);
            var value = typeof returnValue === "undefined" ? context.out : returnValue;
            return context.success ? (value !== undefined ? success(st.source, value) : st) : st;
        }
        return new Parser<T>(seqParser);
    }

    /// head(a, b, c, ...) parses a, b, c and etc, and returns value of a.
    export function head<T>(p:Parser<T>, ...ps:Parser<any>[]): Parser<T> {
        p = asParser(p); ps = ps.map(asParser);
        function headParser(source: Source){
            var st:State<any> = parse(p, source);
            var value: T = st.value;
            for(var i = 0; i < ps.length && st.success; i++){
                st = parse(ps[i], st.source);
            }
            return st.success ? success(st.source, value) : st;
        }
        return new Parser(headParser);
    }


    // tail function takes parsers and apply its sequentially.
    // This function returns the State object that last parser returned.
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
        function tailParser(source:Source){
            var st:State<any> = success(source, undefined);
            for(var i = 0; i < ps.length && st.success; i++){
                st = parse(ps[i], st.source);
            }
            return st;
        }
        return new Parser(tailParser);
    }

    /// stream parser receives an array of Parser and consumes those parser input sequentially.
    export function stream<T>(ps: Parser<T>[]): Parser<T> {
        function streamparser(source:Source){
            var st:State<T> = success(source, undefined);
            for(var i = 0; i < ps.length && st.success; i++){
                st = parse(ps[i], st.source);
            }
            return st;
        }
        return new Parser<T>(streamparser);
    }

    // Repetitious parser constructors ////////////////////////////////////////////////////////////////////////////////////////

    // repeat:(n:number, m: number, p:Parser<T>):Parser<T[]>
    export function repeat<T>(min: number, max: number, p: Parser<T>): Parser<T[]> {
        p = asParser(p);
        function repeatParser(s: Source){
            // For debugging　and efficiency, expand list as loop intentionally.
            var xs:any[] = [];
            var st = success(s, undefined);
            for(var i = 0; i < max; i++){
                var _st = parse(p, st.source);
                if(_st.success){
                    st = _st;
                    xs.push(st.value);
                }else if(i < min){
                    return _st;
                }else{
                    break;
                }
            }
            return success(st.source, xs);
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

    // Alternative parser constructors /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    export function sepByN<T>(min: number, max: number, p: Parser<T>, sep: Parser<any>): Parser<T[]> {
        p = asParser(p); sep = asParser(sep);
        assert(min <= max);
        function sepByNParser(source: Source){
            // For debugging　and efficiency, expand list as loop intentionally.
            var xs = [];
            var st = success(source, undefined);

            var _st = parse(p, st.source);
            if(_st.success){
                st = _st;
                xs.push(_st.value);

                for(var i = 1; i < max; i++){
                    var _st = parse(sep, st.source);
                    if(_st.success){
                        st = parse(p, _st.source);
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
                return success(st.source, xs);
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

    export function between<T>(open:Parser<any>, p:Parser<T>, close:Parser<any>): Parser<T> {
        return tail(open, head(p, close));
    }

    // Selective parser constructors //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    export function or<T>(...ps: Parser<T>[]): Parser<T> {
        ps = ps.map(asParser);
        function orParser(source: Source){
            // For debugging　and efficiency, expand list as loop intentionally.
            var sts = [];
            for(var i = 0; i < ps.length; i++){
                var st = parse(ps[i], source);
                if(st.success || st.source.position != source.position){
                    return st;
                }
                sts.push(st);
            }
            return failure(source, "one of " + sts.map(st=>st.errorMesssage).join(','));
        }
        return new Parser(orParser);
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

    export function trying<T>(p: Parser<T>): Parser<T> {
        assert(p instanceof Parser);
        function tryingParser(source: Source): State<T> {
            var st = parse(p, source);
            return st.success ? st : failure(source, st.errorMesssage);
        }
        return new Parser<T>(tryingParser);
    }

    export function lookAhead<T>(p: Parser<T>): Parser<T> {
        assert(p instanceof Parser);
        function lookAhead(source:Source){
            var st = parse(p, source);
            return st.success ? success(source, st.value) : st;            
        }
        return new Parser(lookAhead);
    }    

    export function notFollowedBy<T>(value: T, p: Parser<T>): Parser<T> {
        assert(p instanceof Parser);
        function notFollowedByParser(source:Source){
            var st = parse(p, source);
            return st.success ? success(source, value) : failure(st.source, '');
        }
        return new Parser(notFollowedByParser);
    }
    
    export function map<T, S>(f: (v: T     )=>S,   p: Parser<T>): Parser<S>;
    export function map<   S>(f: (v: string)=>S,   p: string   ): Parser<S>;
    export function map<   S>(f: (v: string)=>S,   p: RegExp   ): Parser<S>;
    export function map      (f: (v: any   )=>any, p: any      ): Parser<any> {
        p = asParser(p);
        function mapParser(source: Source){
            var st = parse(p, source);
            return st.success ? success(st.source, f(st.value)) : st;
        }
        return new Parser(mapParser);
    }

    export function lazy<T>(f: ()=>Parser<T>): Parser<T> {
        assert(f instanceof Function);
        function lazyParser(source){
            return parse(f(), source);
        }
        return new Parser(lazyParser);
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Applycative-like style utils
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    export function apply<A,B,            R>(m: (a: A, b: B                                   )=>R, pa: Parser<A>, pb: Parser<B>                                                                                          ): Parser<R>;
    export function apply<A,B,C,          R>(m: (a: A, b: B, c: C                             )=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>                                                                           ): Parser<R>;
    export function apply<A,B,C,D,        R>(m: (a: A, b: B, c: C, d: D                       )=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>                                                            ): Parser<R>;
    export function apply<A,B,C,D,E,      R>(m: (a: A, b: B, c: C, d: D, e: E                 )=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>, pe: Parser<E>                                             ): Parser<R>;
    export function apply<A,B,C,D,E,F,    R>(m: (a: A, b: B, c: C, d: D, e: E, f: F           )=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>, pe: Parser<E>, pf: Parser<F>                              ): Parser<R>;    
    export function apply<A,B,C,D,E,F,G,  R>(m: (a: A, b: B, c: C, d: D, e: E, f: F, g: G     )=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>, pe: Parser<E>, pf: Parser<F>, pg: Parser<G>               ): Parser<R>;    
    export function apply<A,B,C,D,E,F,G,H,R>(m: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h:H)=>R, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>, pe: Parser<E>, pf: Parser<F>, pg: Parser<G>, ph: Parser<H>): Parser<R>;    
    export function apply(func: Function, ...ps: Parser<any>[]): Parser<any> {
        assert(func instanceof Function);
        return map(xs=>func.apply(undefined, xs), stream(ps))
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Build-in Parsees /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    export function log(f: (state: number)=>void): Parser<void>{
        assert(f instanceof Function);
        var count = 0;
        function logParser(source: Source){
            var pos = Math.floor(source.position / source.source.length);
            if(pos > count) {
                count = pos;
                f(count);
            }
            return success(source, undefined);
        };
        return new Parser(logParser);
    }

    // Primitives
    export var eof:      Parser<void> = new Parser((source:Source)=>source.position === source.source.length ? success(source.step(1), undefined) : failure(source, undefined));
    export var empty:    Parser<void> = new Parser((source:Source)=>success(source, undefined));

    // Charactors
    export var spaces:   Parser<string> = regexp(/^\s*/);
    export var lower:    Parser<string> = regexp(/^[a-z]/);
    export var upper:    Parser<string> = regexp(/^[A-Z]/);
    export var alpha:    Parser<string> = regexp(/^[a-zA-Z]/);
    export var digit:    Parser<string> = regexp(/^[0-9]/);
    export var alphaNum: Parser<string> = regexp(/^[0-9a-zA-Z]/);
    
    // Misc
    export var number:   Parser<number> = map(parseFloat, regexp(/^[-+]?\d+(\.\d+)?/));

    ////////////////////////////////////////////////////////////////////
    // Util ////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////

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
            return xs instanceof Array && ys instanceof Array && xs.every((x,i) => jsonEq(ys[i], x));
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
        export var many:   (p: Parser<string>                                         ) => Parser<string> = p            => map(x=>x.join(''), many(p));
        export var many1:  (p: Parser<string>                                         ) => Parser<string> = p            => map(x=>x.join(''), many1(p));
        export var sepBy1: (p: Parser<string>, q: Parser<string>                      ) => Parser<string> = (p, q      ) => map(x=>x.join(''), sepBy1(p, q));
        export var sepByN: (m: number, n: number, p: Parser<string>, q: Parser<string>) => Parser<string> = (m, n, p, q) => map(x=>x.join(''), sepByN(m, n, p, q));
        export var repeat: (m: number, n: number, p: Parser<string>                   ) => Parser<string> = (m, n, p   ) => map(x=>x.join(''), repeat(m, n, p));
    }
}

