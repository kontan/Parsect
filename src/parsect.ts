// Parsect (https://github.com/kontan/Parsect)
// @author Kon - http://phyzkit.net/

'use strict';

module Parsect{

    function assert(condition: boolean): void {
        if( ! condition) throw new Error("Argument Assertion Error");
    }

    /////////////////////////////////////////////////////////////////////////////////////////
    // Data Type Definitions //////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////
    
    export class Source { 
        constructor(public source: string, public position: number = 0){    
            // _position == _source.length + 1 at the maximum because of eof.
            if(position < 0 || position > source.length + 1) throw "_position: out of range: " + position;
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
                   this.success ? jsonEq(this.value, st.value) : this.errorMesssage === st.errorMesssage;
        }
    }

    export function success<T>(source:Source, delta: number, value:T): State<T>;
    export function success<T>(source:string, delta: number, value:T): State<T>;
    export function success<T>(source:any,    delta: number, value:T): State<T> {
        source = typeof source === "string" ? new Source(source, 0) : source;
        return new State(new Source(source.source, source.position + delta), true, value, undefined);
    }

    export function failure<T>(source:Source,                  errorMesssage:string): State<T> ;
    export function failure<T>(source:string, position:number, errorMesssage:string): State<T> ;
    export function failure<T>(arg0:any,      arg1:any,        arg2?:any           ): State<T> {
        var source  = arg0 instanceof Source ? arg0 : new Source(arg0, arg1);
        var message = arg0 instanceof Source ? arg1 : arg2;
        return new State<any>(source, false, undefined, message);
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
    export function parse<  U>(parser: string,    input: string, userState?: U): State<string>;
    export function parse<  U>(parser: string,    input: Source, userState?: U): State<string>;
    export function parse<  U>(parser: String,    input: string, userState?: U): State<String>;
    export function parse<  U>(parser: String,    input: Source, userState?: U): State<String>;    
    export function parse<  U>(parser: RegExp,    input: string, userState?: U): State<string>;
    export function parse<  U>(parser: RegExp,    input: Source, userState?: U): State<string>;    
    export function parse<  U>(parser: any,       input: any   , userState?: U): State<any> {
             if(input instanceof Source  ) ;
        else if(typeof input === "string") input = new Source(input);
        else if(input instanceof String  ) input = new Source(input);
        else throw new Error();
        return asParser(parser).parse(input);
    }

    function asParser(pattern: Parser<string>): Parser<string> ;
    function asParser(pattern: string        ): Parser<string> ;
    function asParser(pattern: RegExp        ): Parser<string> ;
    function asParser(pattern: any           ): Parser<string> {
             if(pattern instanceof Parser  ) return pattern;
        else if(pattern instanceof String  ) return string(pattern);
        else if(pattern instanceof RegExp  ) return regexp(pattern);
        else if(typeof pattern === "string") return string(pattern);
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

        /// 現在のコンテキストのユーザ状態。自由に書き込み、読み込みが可能です。
        userState: U;

        /// contextual parser combinators
        notFollowedBy(p: Parser<any>): void;
        
        // (members for debugging)
        peek(): string;
        success(): boolean;
        result(): any;

        /// このコンテキストの意味値。デフォルトでは空のオブジェクト。
        ///ただし、seq コールバックが undefined 以外の値を返す場合は、out メンバ変数は無視され、その返り値が意味値となる。 
        out: S;
    }

    ///////////////////////////////////////////////////////////////////////////////////
    // Parser constructors ////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////

    /// string parser
    export function string(text: string): Parser<string> {
        assert(typeof text === "string" || <String>text instanceof String)
        function stringParser(s: Source): State<string> {
            return s.source.indexOf(text, s.position) === s.position ? success(s, text.length, text) : failure(s, "expected \"" + text + "\"");
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
                return input.indexOf(ms[0]) == 0 ? success(s, m.length, m) : failure(s, "expected /" + pattern + "/");
            }else{
                return failure(s, "expected " + pattern);
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
            return condition(c, i) ? success(s, 1, c) : failure(s, "expected one char of \"" + expectedChars().join('') + "\"");
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

    export function char(charCode: number): Parser<string> {
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
            var st:State<T> = success(source, 0, undefined);
            var s:Context<T,U> = <Context<T,U>> ((a:any)=>{
                if(st.success){
                    st = parse(a, st.source);
                    if(st.success){ 
                        return st.value; 
                    }
                }
            });
            s.notFollowedBy = (p:Parser<T>)=>{
                var _st = parse(p, st.source);
                if(_st.success){
                    st = failure(st.source, 'unexpected charactor');
                }
            };
            s.success = ()=> st.success;
            s.peek  = ()=> st.source.source.slice(st.source.position, st.source.position + 128);
            s.result  = ()=> st.value;
            s.out = <T> {};
            var r: any = f(s, s.out);
            if(typeof r === "undefined"){
                r = <any> s.out;
            }
            return s.success() ? (r !== undefined ? success(st.source, 0, r) : st) : st;
        }
        return new Parser<T>(seqParser);
    }

    /// head(a, b, c, ...) parses a, b, c and etc, and returns new parser of `a`.
    export function head<A>(a:Parser<A>, ...ps:Parser<any>[]): Parser<A>;
    export function head   (a:string,    ...ps:Parser<any>[]): Parser<string>;    
    export function head   (a:RegExp,    ...ps:Parser<any>[]): Parser<string>;    
    export function head   (a:any,       ...ps:Parser<any>[]): Parser {
        a = asParser(a); ps = ps.map(asParser);
        function headParser(source: Source){
            var st:State<any> = new State<any>(source, true, undefined);
            for(var i = 0; i < ps.length && st.success; i++){
                var _st = parse(ps[i], st.source);
                if(_st.success){ 
                    st = _st;
                }else{
                    return failure(st.source, _st.errorMesssage);
                }
            }
            return st.success ? st : failure(st.source, "");
        }
        return new Parser(headParser);
    }


    // tail function takes parsers and apply its sequentially.
    // This function returns the State object that last parser returned.
    export function tail<A              >(a:Parser<A>                                                                                           ):Parser<A>;
    export function tail<A,B            >(a:Parser<A>, b:Parser<B>                                                                              ):Parser<B>;
    export function tail<A,B,C          >(a:Parser<A>, b:Parser<B>, c:Parser<C>                                                                 ):Parser<C>;
    export function tail<A,B,C,D,E      >(a:Parser<A>, b:Parser<B>, c:Parser<C>, d:Parser<D>                                                    ):Parser<D>;    
    export function tail<A,B,C,D,E,F    >(a:Parser<A>, b:Parser<B>, c:Parser<C>, d:Parser<D>, e:Parser<E>                                       ):Parser<E>;
    export function tail<A,B,C,D,E,F,G  >(a:Parser<A>, b:Parser<B>, c:Parser<C>, d:Parser<D>, e:Parser<E>, f:Parser<F>, g:Parser<G>             ):Parser<G>;
    export function tail<A,B,C,D,E,F,G,H>(a:Parser<A>, b:Parser<B>, c:Parser<C>, d:Parser<D>, e:Parser<E>, f:Parser<F>, g:Parser<G>, h:Parser<H>):Parser<H>;
    export function tail(...ps:Parser<any>[]): any {
        ps = ps.map(asParser);
        function tailParser(source:Source){
            var st:State<any> = new State<any>(source, true, undefined);
            for(var i = 0; i < ps.length && st.success; i++){
                var _st = parse(ps[i], st.source);
                if(_st.success){ 
                    st = _st;
                }else{
                    return failure(st.source, _st.errorMesssage);
                }
            }
            return st.success ? st : failure(st.source, "");
        }
        return new Parser(tailParser);
    }

    /// stream parser receives an array of Parser and consumes those parser input sequentially.
    export function stream<T>(ps: Parser<T>[]): Parser<T> {
        function streamparser(source:Source){
            var st:State<T> = success(source, 0, undefined);
            for(var i = 0; i < ps.length && st.success; i++){
                var _st = parse(ps[i], st.source);
                if(_st.success){ 
                    st = _st;
                }else{
                    return failure(st.source, _st.errorMesssage);
                }
            }
            return st.success ? st : failure(st.source, "");
        }
        return new Parser<T>(streamparser);
    }

    // Repetitious parser constructors ////////////////////////////////////////////////////////////////////////////////////////

    // repeat:(n:number, m: number, p:Parser<T>):Parser<T[]>
    export function repeat<T>(min: number, max: number, p: Parser<T>): Parser<T[]>;
    export function repeat   (min: number, max: number, p: String   ): Parser<string[]>;
    export function repeat   (min: number, max: number, p: RegExp   ): Parser<string[]>;
    export function repeat   (min: number, max: number, p: any      ): any {
        p = asParser(p);
        function repeatParser(s: Source){
            var results:any[] = [];
            var st = success(s, 0, undefined);
            for(var i = 0; i < max; i++){
                var _st = parse(p, st.source);
                if(_st.success){
                    st = _st;
                    results.push(st.value);
                }else{
                    break;
                }
            }
            return results.length < min || _st.source.position > st.source.position ? _st : success(st.source, 0, results);
        }
        return new Parser(repeatParser);
    }

    // count:(n:number, p:Parser<T>):Parser<T[]>
    export function count<T>(n: number, p: Parser<T>): Parser<T[]>;
    export function count   (n: number, p: String   ): Parser<string[]>;
    export function count   (n: number, p: RegExp   ): Parser<string[]>;
    export function count   (n: number, p: any      ): any {
        return repeat(n, n, p);
    }

    export function many<T>(p:Parser<T>): Parser<T[]>;
    export function many   (p:String   ): Parser<string[]>;
    export function many   (p:RegExp   ): Parser<string[]>;
    export function many   (p:any      ): Parser<any>{
        return repeat(0, Number.MAX_VALUE, p);
    }

    // many1:(p:Parser<T>):Parser<T[]>
    export function many1<T>(p: Parser<T>): Parser<T[]>;
    export function many1   (p: String   ): Parser<string[]>;
    export function many1   (p: RegExp   ): Parser<string[]>;
    export function many1   (p: any      ): Parser<any[]> {
        return repeat(1, Number.MAX_VALUE, p);
    }

    // Alternative parser constructors /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    export function sepBy1<T>(p: Parser<T>, sep: Parser<any>): Parser<T[]>;
    export function sepBy1<T>(p: Parser<T>, sep: string     ): Parser<T[]>;
    export function sepBy1<T>(p: Parser<T>, sep: RegExp     ): Parser<T[]>;        
    export function sepBy1   (p: string,    sep: Parser<any>): Parser<string[]>;
    export function sepBy1   (p: string,    sep: string     ): Parser<string[]>;    
    export function sepBy1   (p: RegExp,    sep: Parser<any>): Parser<string[]>;
    export function sepBy1   (p: string,    sep: RegExp     ): Parser<string[]>;
    export function sepBy1   (p: RegExp,    sep: string     ): Parser<string[]>;
    export function sepBy1   (p: RegExp,    sep: RegExp     ): Parser<string[]>;
    export function sepBy1   (p: any,       sep: any        ): Parser<any[]> {
        p = asParser(p); sep = asParser(sep);
        function sepBy1parser(source: Source){
            return parse(seq(s=>{
                var x = s(p);
                var xs = s(many(tail(sep, p)));
                if(s.success()){
                    xs.unshift(x);
                    return xs;
                }
            }), source);
        }
        return new Parser(sepBy1parser);
    }

    export function sepByN<T>(min: number, max: number, p: Parser<T>, sep: Parser<any>): Parser<T[]> {
        p = asParser(p); sep = asParser(sep);
        if(max < min) throw new Error();
        function sepByNParser(source: Source){
            var xs = [];
            var st = success(source, 0, undefined);

            var _st = parse(p, st.source);
            if(_st.success){
                st = _st;
                xs.push(_st.value);

                for(var i = 1; i < max; i++){
                    var _st = parse(sep, st.source);
                    if(_st.success){
                        var __st = parse(p, _st.source);
                        if(__st.success){
                            st = __st;
                            xs.push(__st.value);
                        }else{
                            break;
                        }
                    }else{
                        break;
                    }
                }
            }

            if(st.success){
                return min <= xs.length ? success(st.source, 0, xs) : failure(st.source, 0, "sepByN: too few tokens.");
            }else{
                return st;
            }
                
        }
        return new Parser(sepByNParser);
    }


    export function sepBy<T>(p:Parser<T>, sep:Parser<any>): Parser<T[]>;    
    export function sepBy<T>(p:Parser<T>, sep:string     ): Parser<T[]>;
    export function sepBy<T>(p:Parser<T>, sep:RegExp     ): Parser<T[]>;
    export function sepBy   (p:string,    sep:Parser<any>): Parser<string[]>;
    export function sepBy   (p:string,    sep:string     ): Parser<string[]>;    
    export function sepBy   (p:string,    sep:RegExp     ): Parser<string[]>;
    export function sepBy   (p:RegExp,    sep:Parser<any>): Parser<string[]>;
    export function sepBy   (p:RegExp,    sep:string     ): Parser<string[]>;
    export function sepBy   (p:RegExp,    sep:RegExp     ): Parser<string[]>;
    export function sepBy   (p:any,       sep:any        ): Parser<any[]>{
        p = asParser(p); sep = asParser(sep);
        function sepByParser(source:Source){
            return parse(or(sepBy1(p, sep), map(()=>[], empty)), source);
        }
        return new Parser(sepByParser);
    }

    export function endBy1<T>(p: Parser<T>, sep: Parser<any>): Parser<T[]>;
    export function endBy1<T>(p: Parser<T>, sep: string     ): Parser<T[]>;
    export function endBy1<T>(p: Parser<T>, sep: RegExp     ): Parser<T[]>;
    export function endBy1   (p: string,    sep: Parser<any>): Parser<string[]>;
    export function endBy1   (p: string,    sep: string     ): Parser<string[]>;
    export function endBy1   (p: string,    sep: RegExp     ): Parser<string[]>;
    export function endBy1   (p: RegExp,    sep: Parser<any>): Parser<string[]>;
    export function endBy1   (p: RegExp,    sep: string     ): Parser<string[]>;
    export function endBy1   (p: RegExp,    sep: RegExp     ): Parser<string[]>;
    export function endBy1   (p: any,       sep: any        ): Parser<any>{
        p = asParser(p); sep = asParser(sep);
        function endBy1Parser(source:Source){
            var q = seq((s)=>{ var x = s(p); s(sep); return x; });
            return parse(seq((s)=>{
                var x = s(q);
                var xs = s(many(q));
                if(s.success()){
                    xs.unshift(x);
                    return xs;
                } 
            }), source); 
        }
        return new Parser(endBy1Parser);
    }

    export function endBy<T>(p: Parser<T>, sep: Parser<any>): Parser<T[]>;
    export function endBy<T>(p: Parser<T>, sep: string     ): Parser<T[]>;
    export function endBy<T>(p: Parser<T>, sep: RegExp     ): Parser<T[]>;
    export function endBy   (p: string,    sep: Parser<any>): Parser<string[]>;
    export function endBy   (p: string,    sep: string     ): Parser<string[]>;
    export function endBy   (p: string,    sep: RegExp     ): Parser<string[]>;
    export function endBy   (p: RegExp,    sep: Parser<any>): Parser<string[]>;
    export function endBy   (p: RegExp,    sep: string     ): Parser<string[]>;
    export function endBy   (p: RegExp,    sep: RegExp     ): Parser<string[]>;
    export function endBy   (p: any,       sep: any        ): Parser<any> {
        p = asParser(p); sep = asParser(sep);
        function endByFunction(source:Source){
            return parse(or(<Parser<any>> endBy1(p, sep), empty), source);
        };
        return new Parser<any>(endByFunction);
    }

    export function between<T>(open:Parser<any>, p:Parser<T>, close:Parser<any>): Parser<T>;
    export function between<T>(open:Parser<any>, p:Parser<T>, close:String     ): Parser<T>;
    export function between<T>(open:Parser<any>, p:Parser<T>, close:RegExp     ): Parser<T>;
    export function between   (open:Parser<any>, p:String,    close:Parser<any>): Parser<string>;
    export function between   (open:Parser<any>, p:String,    close:String     ): Parser<string>;
    export function between   (open:Parser<any>, p:String,    close:RegExp     ): Parser<string>;
    export function between   (open:Parser<any>, p:RegExp,    close:Parser<any>): Parser<string>;
    export function between   (open:Parser<any>, p:RegExp,    close:String     ): Parser<string>;
    export function between   (open:Parser<any>, p:RegExp,    close:RegExp     ): Parser<string>;
    export function between<T>(open:String,      p:Parser<T>, close:Parser<any>): Parser<T>;
    export function between<T>(open:String,      p:Parser<T>, close:String     ): Parser<T>;
    export function between<T>(open:String,      p:Parser<T>, close:RegExp     ): Parser<T>;
    export function between   (open:String,      p:String,    close:Parser<any>): Parser<string>;
    export function between   (open:String,      p:String,    close:String     ): Parser<string>;
    export function between   (open:String,      p:String,    close:RegExp     ): Parser<string>;
    export function between   (open:String,      p:RegExp,    close:Parser<any>): Parser<string>;
    export function between   (open:String,      p:RegExp,    close:String     ): Parser<string>;
    export function between   (open:String,      p:RegExp,    close:RegExp     ): Parser<string>;
    export function between<T>(open:RegExp,      p:Parser<T>, close:Parser<any>): Parser<T>;
    export function between<T>(open:RegExp,      p:Parser<T>, close:String     ): Parser<T>;
    export function between<T>(open:RegExp,      p:Parser<T>, close:RegExp     ): Parser<T>;
    export function between   (open:RegExp,      p:String,    close:Parser<any>): Parser<string>;
    export function between   (open:RegExp,      p:String,    close:String     ): Parser<string>;
    export function between   (open:RegExp,      p:String,    close:RegExp     ): Parser<string>;
    export function between   (open:RegExp,      p:RegExp,    close:Parser<any>): Parser<string>;
    export function between   (open:RegExp,      p:RegExp,    close:String     ): Parser<string>;
    export function between   (open:RegExp,      p:RegExp,    close:RegExp     ): Parser<string>;
    export function between   (open:any,         p:any,       close:any        ): Parser<any> {
        open = asParser(open); p = asParser(p); close = asParser(close);
        function betweenParser(source: Source){
            return parse(seq(s=>{
                s(open);
                var v = s(p);
                s(close);
                return v;
            }), source);
        }
        return new Parser(betweenParser);    
    }

    // Selective parser constructors //////////////////////////////////////////////////////////////////////////////

    export function or<T>(p: Parser<T>,     q: Parser<T>,    ...ps:Parser<T>[]): Parser<T>;
    export function or   (p:String,         q:Parser<string>                  ): Parser<string>;
    export function or   (p:RegExp,         q:Parser<string>                  ): Parser<string>;
    export function or   (p:Parser<string>, q:String                          ): Parser<string>;
    export function or   (p:String,         q:String                          ): Parser<string>;
    export function or   (p:RegExp,         q:String                          ): Parser<string>;
    export function or   (p:Parser<string>, q:RegExp                          ): Parser<string>;
    export function or   (p:String,         q:RegExp                          ): Parser<string>;
    export function or   (p:RegExp,         q:RegExp                          ): Parser<string>;            
    export function or   (...ps:any[]): Parser<any> {
        ps = ps.map(asParser);
        function orParser(source: Source){
            for(var i = 0; i < ps.length; i++){
                var st = parse(ps[i], source);
                if(st.success){
                    return st;
                }else if(st.source.position != source.position){
                    return st;
                }
            }
            return failure(source, "");
        }
        return new Parser(orParser);
    }

    // Optional parser constructors ///////////////////////////////////////////////////////////////////////////////////////////

    export function option<T>(defaultValue: T,      p: Parser<T>): Parser<T>;
    export function option   (defaultValue: string, p: string   ): Parser<string>;
    export function option   (defaultValue: string, p: RegExp   ): Parser<string>;
    export function option   (defaultValue: any,    p: any      ): Parser<any> {
        p = asParser(p);
        function optionParser(source: Source){
            var st = parse(p, source);
            return st.success ? st : new State(source, true, defaultValue);
        }
        return new Parser(optionParser);
    }

    // optional:(p:Parser<T>):Parser<T>
    export function optional<T>(p: Parser<T>): Parser<T>;
    export function optional   (p: string   ): Parser<string>;
    export function optional   (p:RegExp    ): Parser<string>;
    export function optional   (p:any       ): Parser<any> {
        return option(undefined, p);
    }


    // Special parser constructors /////////////////////////////////////////////////////////////////////////////////////////////

    // pure:(f:()=>T):Parser<T>
    // pure function injects a arbitrary value. 
    // pure consumes no input. 
    export function pure<T>(f: ()=>T): Parser<T>{
        assert(f instanceof Function);
        function pureParser(s: Source){
            return success(s, 0, f());
        }
        return new Parser<T>(pureParser);
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
            return st.success ? success(source, 0, st.value) : failure(st.source, '');            
        }
        return new Parser(lookAhead);
    }    

    export function notFollowedBy<T>(value: T, p: Parser<T>): Parser<T> {
        assert(p instanceof Parser);
        function notFollowedByParser(source:Source){
            var st = parse(p, source);
            return st.success ? success(source, 0, value) : failure(st.source, '');            
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
            return st.success ? new State(st.source, true, f(st.value)) : st;
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
        ps = ps.map(asParser);
        function applyParser(source: Source){
            var values = [];
            var st:State<any> = success(source, 0, undefined);
            for(var i = 0; i < ps.length; i++){
                var _st:State<any> = parse(ps[i], st.source);
                if(_st.success){
                    st = _st;
                    values.push(_st.value);
                }else{
                    return failure(st.source, "");
                }
            }
            return success(st.source, 0, func.apply(undefined, values));
        }
        return new Parser(applyParser);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Build-in Parsees /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    export function log(f: (state: number)=>void): Parser<void>{
        assert(f instanceof Function);
        var count = 0;
        function logParser(source){
            var pos = Math.floor(100 * source.position / source.source.length);
            if(pos > count) {
                count = pos;
                f(count);
            }
            return source.success(0);
        };
        return new Parser(logParser);
    }

    // Primitives
    export var eof:      Parser<void> = new Parser((source:Source)=>source.position === source.source.length ? success(source, 1, undefined) : failure(source, undefined));
    export var empty:    Parser<void> = new Parser((source:Source)=>success(source, 0, undefined));

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

