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

module Parsect {

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Data Type Definitions ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    // Current parsing state.
    // <U> Type of user state.
    export class State<U> {

        // You can use `state` function instead of `new State`.
        constructor(public source: string, public position: number = 0, public _userState?: U){    
            assert(typeof source !== "undefined");
            assert(source !== null);
            if(position < 0 || position > source.length + 1) throw "_position: out of range: " + position;
        }

        getRowColumn(): { raw: number; column: number; } {
            var lines = this.source.split("\n");
            var position = 0;
            var raw = 0;
            while(position < this.position){
                if(this.position <= position + lines[raw].length) break;
                position += lines[raw].length + 1;
                raw++;
            }
            var column = this.position - position;
            return { raw: raw, column: column };
        }

        seek(delta: number): State {
            return new State(this.source, this.position + delta, this._userState);
        }

        equals(src: State<U>): boolean {
            return src && this.source === src.source && this.position === src.position && jsonEq(this._userState, src._userState);
        }
    }

    // Create new state object.
    export function state<U>(source: string, position: number = 0, userState?: U): State<U> {
        return new State(source, position, userState);
    }

    /// Result of parsing.
    /// (equiv. Text.Parsec.Prim.Reply)
    /// <A>　Type of semantic value.
    /// <U> Type of User state.
    export class Reply<A,U> { 
        /// private constructor.
        /// You should use success or fail functions instead of this constructor.
        constructor(public state: State<U>, public success: boolean, public value: A, public expected: ()=> string){
        }

        equals(st: Reply<A,U>): boolean {
            return st &&
                   this.state.equals(st.state)     && 
                   this.success       === st.success &&
                   (this.success ? jsonEq(this.value, st.value) : ((this.expected === undefined && st.expected === undefined) || (this.expected() === st.expected())));
        }
    }

    /// create new successful state.
    /// (equiv. Text.Parsec.Prim.OK)
    /// @param state    a state after parsing.
    /// @param value    semantic value.
    export function ok<A,U>(state: State<U>, value: A): Reply<A,U> {
        return new Reply(state, true, value, undefined);
    }

    /// create new failure state.
    /// (equiv. Text.Parsec.Prim.Error)
    /// @param state    a state after parsing.
    /// @param expected 
    export function error<A,U>(state: State<U>, expected?: ()=> string): Reply<A,U> {
        return new Reply<A>(state, false, undefined, expected);
    }

    /// parser object.
    /// <A> Type of Semantic value.
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
    /// @param state state.
    /// @return the result of parssing.
    export function parse<A,U>(parser: Parser<A>, state: State<U>): Reply<A,U> {
        //assert( !! parser);
        return parser.runParser(state);
    }

    /// seq function context object. See `seq` function.
    /// This is a distinctive object of Parsect.
    export interface Context<U> {        
        /// Apply a parser and return the semantic value.
        /// If `context.success` is true, apply `p` parser. If the parser succeeded, returns a semantic value. Otherwise, it returns undefined.
        /// If `context.success` is false, it ignores `p` and returns undefined 
        <T>(p: Parser<T>): T;

        userState: U;        /// (read/write) Current user state.
        
        // The following properties provided for debugging, you should not use to parsing.
        //peek: string;        /// Current input string.
        success: boolean;    /// Success or fail.
    }









    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Parser Combinators (Text.Parsec.Combinator) ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Choice parser combinators //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /// (equiv. Text.Parsec.Combinator.choice)
    export function choice<T>(ps: Parser<T>[]): Parser<T> {
        function choiceParser<U>(state: State<U>){
            // For debugging　and efficiency, expand list as loop intentionally.
            var sts: Reply<T,U>[] = [];
            for(var i: number = 0; i < ps.length; i++){
                var st: Reply<T,U> = parse(ps[i], state);
                if(st.success || st.state.position != state.position){
                    return st;
                }
                sts.push(st);
            }
            return error(state, ()=> "one of " + sts.map(st=>st.expected()).join(','));
        }
        return new Parser(choiceParser);
    }

    /// Variable parameter version of `choice`.
    export function or<T>(...ps: Parser<T>[]): Parser<T> {
        return choice(ps);
    }

    // Repetitious parser constructors ////////////////////////////////////////////////////////////////////////////////////////

    /// `repeat n m p` parses `n` occurrences of `p` at minimum, parses `m` occurrences of `p` at maximum.  
    export function repeat<T>(min: number, max: number, p: Parser<T>): Parser<T[]> {
        function repeatParser<U>(s: State<U>){
            // For debugging　and efficiency, expand list as loop intentionally.
            var xs:any[] = [];
            var st = ok(s, undefined);
            for(var i = 0; i < max; i++){
                var _st = parse(p, st.state);
                if(_st.success){
                    if(_st.state.position === st.state.position && max === Number.MAX_VALUE){
                        throw new Error("many combinator is applied to a parser that accepts an empty string.");
                    }else{
                        st = _st;
                        xs.push(st.value);
                    }
                }else if(st.state.position < _st.state.position){
                    return _st;
                }else if(i < min){
                    return _st;
                }else{
                    break;
                }
            }
            return ok(st.state, xs);
        }
        return new Parser(repeatParser);
    }

    /// (equiv. Text.Parsec.Combinator.count)
    export function count<T>(n: number, p: Parser<T>): Parser<T[]> {
        return repeat(n, n, p);
    }

    /// (equiv. Text.Parsec.Combinator.many)
    export function many<T>(p:Parser<T>): Parser<T[]> {
        return repeat(0, Number.MAX_VALUE, p);
    }

    /// (equiv. Text.Parsec.Combinator.many1)
    export function many1<T>(p: Parser<T>): Parser<T[]> {
        return repeat(1, Number.MAX_VALUE, p);
    }

    // Sequential parser constructors ///////////////////////////////////////////////////////////////////////////////////////

    /// `array ps` parses the parser of `ps` sequentially and return the reply of those parsers.
    export function array<T>(ps: Parser<T>[]): Parser<T[]> {
        function arrayParser<U>(state: State<U>): Reply<T[],U> {
            var values: T[] = [];
            var st:Reply<T,U> = ok(state, undefined);
            for(var i = 0; i < ps.length; i++){
                st = parse(ps[i], st.state);
                if( ! st.success) return error(st.state, st.expected);
                values.push(st.value);
            }
            return ok(st.state, values);
        }
        return new Parser<T[]>(arrayParser);
    }

    /// variable parameters version of `array`.
    export function series<T>(...ps: Parser<T>[]): Parser<T[]> {
        return array(ps);
    }

    /// `head(a, b, c, ...)` parses `a`, `b`, `c` and etc, and returns reply of `a`.
    export function head<T>(p:Parser<T>, ...ps:Parser<any>[]): Parser<T> {
        function headParser<U>(state: State<U>): Reply<T,U>{
            var st:Reply<any,U> = parse(p, state);
            var value: T = st.value;
            for(var i = 0; i < ps.length && st.success; i++){
                st = parse(ps[i], st.state);
            }
            return st.success ? ok(st.state, value) : st;
        }
        return new Parser(headParser);
    }

    /// (equiv. Text.Parsec.Combinator.between)
    export function between<T>(open:Parser<any>, p:Parser<T>, close:Parser<any>): Parser<T> {
        return seq(s=>{
            s(open);
            var v: T = s(p);
            s(close);
            return v;
        });
    }

    /// Do-notation like parsing control flow.  
    /// @param f    callback function
    export function seq<A,U>(f: (s: Context<U>)=>A): Parser<A>{
        assert(f instanceof Function);
        function seqParser<U>(state: State<U>): Reply<A,U> {
            var st: Reply<any,U> = ok(state, undefined);
            function contextFunction<T>(p: Parser<T>): T {
                if(st.success){
                    st = parse(p, st.state);
                    context.success = st.success;
                    return st.value; 
                }                
            }
            var context: Context<U> = <Context<U>> contextFunction;
            context.success = true;
            context.userState = st.state._userState;
            var value: A = f(context);
            st.state._userState = context.userState;
            return context.success ? ok(st.state, value) : st;
        }
        return new Parser<A>(seqParser);
    }

    // Alternative parser constructors /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /// 
    export function sepByN<A>(min: number, max: number, p: Parser<A>, sep: Parser<any>): Parser<A[]> {
        assert(p instanceof Parser); assert(sep instanceof Parser); assert(min <= max);
        function sepByNParser<U>(source: State<U>): Reply<A[],U>{
            var xs: A[] = [];
            var st = ok(source, undefined);
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
            return st.success ? ok(st.state, xs) : st;
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
        return or(p, pure(defaultValue));
    }

    export function optional<T>(p: Parser<T>): Parser<void> {
        return option(undefined, p);
    }

    // Build-in Parsees /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    export var eof:      Parser<void> = new Parser((state:State<any>)=>state.position === state.source.length ? ok(state.seek(1), undefined) : error(state, ()=> "end of file"));
    export var empty:    Parser<void> = new Parser((state:State<any>)=>ok(state, undefined));
    export var number:   Parser<number> = fmap(parseFloat, regexp(/^[-+]?\d+(\.\d+)?/));
    
    export function fail(message: string): Parser<any> {
        return new Parser<any>((state: State<any>)=>error(state, ()=> message));
    }

    export function unexpected(message: string): Parser<any> {
        function unexpectedParser<U>(state: State<U>): Reply<U,any> {
            return error(state, ()=> message);
        }
        return new Parser(unexpectedParser);
    }

    export function skipMany<A>(p: Parser<A>): Parser<void> {
        return fmap((_: A[])=> <void> undefined, many(p));
    }

    export function skipMany1<A>(p: Parser<A>): Parser<void> {
        return seq(s=>{
            s(p);
            s(skipMany(p));
        });
    }

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

    export function label<A>(message: string, p: Parser<A>): Parser<A> {
        function labelParser<U>(state: State<U>): Reply<U,any> {
            var reply = parse(p, state);
            return (( ! reply.success) && reply.state.position === state.position) ? error(state, ()=> message) : reply;
        }
        return new Parser(labelParser);
    }  

    export function lookAhead<T>(p: Parser<T>): Parser<T> {
        function lookAheadParser<U>(state: State<U>): Reply<T,U>{
            var st = parse(p, state);
            return st.success ? ok(state, st.value) : st;            
        }
        return new Parser(lookAheadParser);
    }    

    export function pure<T>(t: T): Parser<T>{
        return fmap(()=>t, empty);
    }

    export function triable<T>(p: Parser<T>): Parser<T> {
        function triableParser<U>(state: State<U>): Reply<T,U> {
            var st = parse(p, state);
            return st.success ? st : error(state, st.expected);
        }
        return new Parser<T>(triableParser);
    }

    export function notFollowedBy<T>(p: Parser<T>): Parser<void> {
        function notFollowedByParser<U>(state: State<U>): Reply<T,U> {
            var rep = parse(p, state);
            return rep.success ? error(state, ()=> 'not ' + rep.value) : ok(state, undefined);
        }
        return new Parser(notFollowedByParser);
    }

    export function fmap<T, S>(f: (v: T     )=>S,   p: Parser<T>): Parser<S> {
        function mapParser<U>(state: State<U>): Reply<T,U> {
            var st = parse(p, state);
            return st.success ? ok(st.state, f(st.value)) : st;
        }
        return new Parser(mapParser);
    }

    export function lazy<T>(f: ()=>Parser<T>): Parser<T> {
        assert(f instanceof Function);
        function lazyParser<U>(state: State<U>): Reply<T,U> {
            return parse(f(), state);
        }
        return new Parser(lazyParser);
    }








    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Charactor parser constructor (Text.Parsec.Char) /////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    export function oneOf(chars: string): Parser<string> {
        return satisfy(c=>chars.indexOf(c) >= 0);
    }

    export function noneOf(chars: string): Parser<string> {
        return satisfy(c=>chars.indexOf(c) == -1);
    }

    export var space:    Parser<string> = oneOf(" \t\r\n");
    export var spaces:   Parser<string> = fmap(xs=>xs.join(), many(space));
    export var newline:  Parser<string> = oneOf("\r\n");
    export var tab:      Parser<string> = char("\t");
    export var upper:    Parser<string> = oneOf("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    export var lower:    Parser<string> = oneOf("abcdefghijklmnopqrstuvwxyz");
    export var alphaNum: Parser<string> = oneOf("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
    export var letter:   Parser<string> = oneOf("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz");
    export var digit:    Parser<string> = oneOf("0123456789");
    export var hexDigit: Parser<string> = oneOf("0123456789abcdefghABCDEFGH");
    export var octDigit: Parser<string> = oneOf("01234567");
    
    export function char(c: string): Parser<string> {
        assert(c && c.length === 1);
        return satisfy(_c => c === _c);
    }
    
    export var anyChar:  Parser<string> = satisfy(_=>true);

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
            if(s.position < s.source.length){
                var c = s.source[s.position];
                var i = s.source.charCodeAt(s.position);
                if(condition(c, i)){
                    return ok(s.seek(1), c);
                }
            }
            return error(s, ()=>{ 
                var cs = expectedChars();
                return (cs.length === 1 ? "" : "one of ") + "\"" + cs.join('') + "\"";
            });
        }
        return new Parser<string>(satisfyParser);
    }

    /// string parser
    export function string(text: string, caseSensitive: boolean = true): Parser<string> {
        assert(typeof text === "string" || <String>text instanceof String)
        text = caseSensitive ? text : text.toLowerCase(); 
        function stringParser<U>(s: State<U>): Reply<string,U> {
            var slice = s.source.slice(s.position, s.position + text.length);
            return text === (caseSensitive ? slice : slice.toLowerCase()) ? ok(s.seek(text.length), text) : error(s, ()=> "\"" + text + "\"");
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
                return input.indexOf(ms[0]) == 0 ? ok(s.seek(m.length), m) : error(s, ()=> "/" + pattern + "/");
            }else{
                return error(s, ()=> "" + pattern);
            }
        }
        return new Parser<string>(regexpParser);
    }

    export function range(min: string, max: string): Parser<string> ;
    export function range(min: number, max: number): Parser<string> ;
    export function range(min: any,    max: any   ): Parser<string> {
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









    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Token parser builder (Text.Parsec.Token) ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    export interface LanguageDef {
        commentStart:       Parser<string>;
        commentEnd:         Parser<string>;
        commentLine:        Parser<string>;
        nestedComments:     boolean;
        identStart:         Parser<string>;
        identLetter:        Parser<string>;
        opStart:            Parser<string>;
        opLetter:           Parser<string>;
        reservedNames:      string[];
        reservedOpNames:    string[];
        caseSensitive:      boolean;

        // extension
        operator?:           Parser<string>;
    }           

    export interface GenTokenParser {
        identifier:     Parser<string>;
        reserved:       (s: string)=>Parser<string>;
        operator:       Parser<string>;
        reservedOp:     (s: string)=>Parser<string>;
        charLiteral:    Parser<string>;
        stringLiteral:  Parser<string>
        natural:        Parser<number>;
        integer:        Parser<number>;
        float:          Parser<number>;
        naturalOrFloat: Parser<number>;
        decimal:        Parser<number>;
        hexadecimal:    Parser<number>;
        octal:          Parser<number>;
        symbol:         (s: String)=>Parser<string>;
        lexeme:         <A>(p: Parser<A>)=>Parser<A>;
        whiteSpace:     Parser<void>;
        parens:         <A>(p: Parser<A>)=>Parser<A>;
        braces:         <A>(p: Parser<A>)=>Parser<A>;
        angles:         <A>(p: Parser<A>)=>Parser<A>;
        brackets:       <A>(p: Parser<A>)=>Parser<A>;
        semi:           Parser<string>;
        comma:          Parser<string>;
        colon:          Parser<string>;
        dot:            Parser<string>;
        semiSep:        <A>(p: Parser<A>)=>Parser<A[]>;
        semiSep1:       <A>(p: Parser<A>)=>Parser<A[]>;
        commaSep:       <A>(p: Parser<A>)=>Parser<A[]>;
        commaSep1:      <A>(p: Parser<A>)=>Parser<A[]>;
    }

    export function makeTokenParser(def: LanguageDef): GenTokenParser {
        /////////////////////////////////////////////////////////////////////////////////////////
        // White space & symbols
        ////////////////////////////////////////////////////////////////////////////////////////////
        function symbol(name: string): Parser<string> {
            return lexeme(string(name));
        }
        function lexeme<A>(p: Parser<A>): Parser<A> {
            return seq(s=>{
                var x = s(p); 
                s(whiteSpace); 
                return x;
            });
        }

        // whiteSpace
        //var noLine  = def.commentLine.length == 0;
        //var noMulti = def.commentStart.length == 0;
        var noLine  = def.commentLine === null;
        var noMulti = def.commentStart === null;


        //var commentStart = triable(string(def.commentStart));
        //var commentEnd = triable(string(def.commentEnd));
        //var startEnd = (def.commentEnd + def.commentStart).split('').filter((x, i, xs)=>xs.indexOf(x) === i).join("");
        var commentStart = triable(def.commentStart);
        var commentEnd = triable(def.commentEnd);

        var oneLineComment = seq(s=>{
            //s(triable(string(def.commentLine)));
            s(triable(def.commentLine));

            s(skipMany(satisfy(x=>x!='\n')));
            return <void> undefined;
        });
        var multiLineComment = seq(s=>{
            s(commentStart);
            return s(inComment);
        });

        var inCommentMulti =  label("end of comment", or(
            seq(s=>{ s(commentEnd); }),
            seq(s=>{ s(multiLineComment);               s(inCommentMulti) }),

            //seq(s=>{ s(skipMany1(noneOf(startEnd)));    s(inCommentMulti) }),
            //seq(s=>{ s(oneOf(startEnd));                s(inCommentMulti); })
            seq(s=>{ s(notFollowedBy(commentEnd)); s(anyChar);    s(inCommentMulti) })
        ));
        var inCommentSingle = label("end of comment", or(
            seq(s=>{ s(commentEnd); }),

            //seq(s=>{ s(skipMany1(noneOf(startEnd))); s(inCommentSingle); }),
            //seq(s=>{ s(oneOf(startEnd)); s(inCommentSingle); })
            seq(s=>{ s(notFollowedBy(commentEnd)); s(anyChar);    s(inCommentSingle) })

        ));
        var inComment = def.nestedComments ? inCommentMulti : inCommentSingle;          
        var simpleSpace = skipMany1(oneOf(" \t\r\n"));
        var whiteSpace =
            noLine && noMulti ? skipMany(simpleSpace) :
            noLine            ? skipMany(or(simpleSpace, multiLineComment)) :
            noMulti           ? skipMany(or(simpleSpace, oneLineComment)) :
                                skipMany(or(simpleSpace, oneLineComment, multiLineComment));


        ////////////////////////////////////////////////////////////////////////////////////
        // Operators & reserved ops
        ////////////////////////////////////////////////////////////////////////////////////////
        function reservedOp(name: string){
            return lexeme(triable(seq(s=>{
                var n = s(string(name));
                s(notFollowedBy(def.opLetter));
                return n;
            })));
        }

        var operator = lexeme(triable(seq(s=>{
            var name = s(oper);
            return isReservedOp(name) ? s(unexpected("reserved operator " + name)) : name;
        })));


        if(
            (def.operator && (def.opStart || def.opLetter)) || 
            ( ! def.operator && ! def.opStart && ! def.opLetter)
        ){ throw new Error(); }

        var oper = def.operator || seq(s=>{
            var c = s(def.opStart);
            var cs = s(Join.many(def.opLetter));
            return c + cs;
        });

        function isReservedOp(name: string){
            return def.reservedOpNames.indexOf(name) >= 0;
        }

        /////////////////////////////////////////////////////////////////////////
        // Identifiers & Reserved words
        /////////////////////////////////////////////////////////////////////////////////////////

        function reserved(name: string): Parser<string> {
            return lexeme(triable(label("end of " + name, 
                seq(s=>{
                    var n = s(string(name, def.caseSensitive));
                    s(notFollowedBy(def.identLetter));
                    return n;
                })
            )));
        }


        var identifier = lexeme(triable(seq(s=>{
            var name = s(ident);
            if(isReservedName(name)){
                return s(unexpected("reserved word " + name));
            }else{
                return name;
            }
        })));
        
        var ident = label("identifier", seq(s=>{
            var c = s(def.identStart);
            var cs = s(Join.many(def.identLetter));
            return s.success && (c + cs);
        }));

        var theReservedNames = def.caseSensitive ? def.reservedNames : def.reservedNames.map(n=>n.toLowerCase());

        function isReservedName(name: string){
            var caseName = def.caseSensitive ? name : name.toLowerCase();
            return theReservedNames.indexOf(caseName) >= 0;
        }
        
        ////////////////////////////////////////////////////////////////////////////////
        // Bracketing
        //////////////////////////////////////////////////////////////////////////////////////
        function parens<A>(p: Parser<A>): Parser<A> {
            return between(symbol("("), p, symbol(")"));
        }
        function braces<A>(p: Parser<A>): Parser<A> {
            return between(symbol("{"), p, symbol("}"));
        }
        function angles<A>(p: Parser<A>): Parser<A> {
            return between(symbol("<"), p, symbol(">"));
        }
        function brackets<A>(p: Parser<A>): Parser<A> {
            return between(symbol("["), p, symbol("]"));
        }

        var semi            = symbol(";");
        var comma           = symbol(",");
        var dot             = symbol(".");
        var colon           = symbol(":");

        function commaSep<A>(p: Parser<A>): Parser<A> {
            return sepBy(p, comma);
        }
        function semiSep<A>(p: Parser<A>): Parser<A> {
            return sepBy(p, semi);
        }
        function commaSep1<A>(p: Parser<A>): Parser<A> {
            return sepBy1(p, comma);
        }
        function semiSep1<A>(p: Parser<A>): Parser<A> {
            return sepBy1(p, semi);
        }

        /////////////////////////////////////////////////////////////////////////////////////////
        // Chars & Strings
        //////////////////////////////////////////////////////////////////////////////

        var escapeCode = seq(s=>{
            var c = s(satisfy(_=>true));
            switch(c){
                case "r": return "\r";
                case "n": return "\n";
                default: return s(unexpected(c));
            }
        });

        var charLetter = satisfy((c,i)=>(c != "'") && (c != "\\") && (i > 26));
        var charEscape = seq(s=>{
            s(string('\\'));
            return s(escapeCode);
        });
        var characterChar = label("literal character", or(charLetter, charEscape));
        var charLiteral = label("character", lexeme(between(
            string('\''), 
            characterChar, 
            label("end of character", string('\''))
        )));

        



        var escapeEmpty = string('&');
        var escapeGap   = seq((s: Context<void>)=>{
            s(many1(space));
            return s(label("end of string gap", string('\\')));
        });
        var stringEscape = seq(s=>{
            s(string('\\'));
            return s(or(
                seq(s=>{
                    s(escapeGap);
                    return s(pure(null));
                }),
                seq(s=>{
                    s(escapeEmpty);
                    return s(pure(null));
                }),
                escapeCode
            ))
        });
        var stringLetter = satisfy((c, i) => (c != '"') && (c != '\\') && (i > 26));
        var stringChar = label("string character", or(stringLetter, stringEscape));
        var stringLiteral = label("literal string", lexeme(fmap(
            xs => xs.join(''),
            between(
                string('"'),
                many(stringChar),
                label("end of string", string('"'))
            )
        )));

        // integers and naturals

        function number(base: number, baseDigit: Parser<string>): Parser<number> {
            assert( !! baseDigit);
            return fmap((xs: string[]) => xs.reduce((x,d)=> base*x + parseInt(d), 0), many1(baseDigit));
        }

        var decimal         = number(10, digit);
        var hexadecimal     = seq((s: Context<void>)=>{
            s(oneOf("xX"));
            return s(number(16, hexDigit));
        });
        var octal: Parser<number>           = seq(s=>{
            s(oneOf("oO"));
            return s(number(8,  octDigit));
        });
        var zeroNumber: Parser<number>      = label("", seq((s: Context<void>)=>{
            s(string('0'));
            return s(or(hexadecimal, octal, decimal, pure(0)));
        }));
        var nat: Parser<number> = or(zeroNumber, decimal);
        var sign: Parser<(x: number)=>number> = or(
            seq((s: Context<void>)=>{
                s(string('-'));
                return s(pure((x: number)=>-x));
            }),
            seq((s: Context<void>)=>{
                s(string('+'));
                return s(pure((x: number)=> x));
            }),
            pure((x: number)=>x)
        );
        var int: Parser<number> = seq(s=>{
            var f = s(lexeme(sign));
            var n = s(nat);
            return s.success ? f(n) : undefined;
        });


        //  -- floats
        var exponent$ = label("exponent", seq((s: Context<void>)=>{
            function power(e: number): number {
                return e < 0 ? 1.0 / power(-e) : (10^e);
            }
            s(oneOf("eE"));
            var f = s(sign);
            var e = s(label("exponent", decimal));
            return s.success ? power(f(e)) : undefined;
        }));


        var fraction = seq(s=>{
            s(string('.'));
            var digits = s(label("fraction", many1(digit)));
            function op(d: number, f: number){
                return (f + d) / 10.0;
            }
            return s.success ? digits.reduce(op, 0.0) : undefined;
        });
            
        function fractExponent(n: number){
            return or(
                seq(s=>{
                    var fract = s(fraction);
                    var expo = s(option(1.0, exponent$));
                    return s.success ? (n + fract) * expo : undefined;
                }),
                seq(s=>{
                    var expo = s(exponent$);
                    return s.success ? (n * expo) : undefined;
                })
            );
        }

        var floating = seq(s=>{
            var n = s(decimal);
            return s(fractExponent(n));
        });

        function fractFloat(n: number){
            return fractExponent(n);
        }
        var decimalFloat = seq(s=>{
            var n = s(decimal);
            return s(option(n, fractFloat(n)));
        });
        var zeroNumFloat = or(
            or(hexadecimal, octal),
            decimalFloat,
            fractFloat(0),
            pure(0)
        );
        var natFloat = or(
            seq((s: Context<void>)=>{
                s(string('0'));
                return s(zeroNumFloat);
            }), 
            decimalFloat
        );
        var naturalOrFloat = label("number",  lexeme(natFloat)); 
        var float          = label("float",   lexeme(floating)); 
        var integer        = label("integer", lexeme(int));
        var natural        = label("natural", lexeme(nat));

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
            commaSep1: commaSep1
        };
    }
    









    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Expression Parser (Text.Parsec.Expr) /////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    // Parsec-compatible interface

    export enum Assoc {
        None,
        Left,
        Right
    }

    export interface Operator<A>{
        //(term: Parser<A>): Parser<A>; 
    }

    class LAssoc<A> {
        constructor(public p: Parser<(l: A, r: A) => A>) {
        }
    }
    class RAssoc<A> {
        constructor(public p: Parser<(l: A, r: A) => A>) {
        }
    }    
    class NAssoc<A> {
        constructor(public p: Parser<(l: A, r: A) => A>) {
        }
    }
    class Prefix<A> {
        constructor(public p: Parser<(a: A) => A>){
        }
    }
    class Postfix<A> {
        constructor(public p: Parser<(a: A) => A>){
        }
    }

    export function infix<A>(p: Parser<(l: A, r: A) => A>, assoc: Assoc): Operator<A> {
        switch(assoc){
            case Assoc.None:  return new NAssoc(p);
            case Assoc.Left:  return new LAssoc(seq(s=>{
                return s(p);
                }));
            case Assoc.Right: return new RAssoc(p);
        }
    }
    export function prefix<A>(p: Parser<(a: A) => A>): Operator<A> {
        return new Prefix(p);
    }
    export function postfix<A>(p: Parser<(a: A) => A>): Operator<A> {
        return new Postfix(p);
    }

    export function buildExpressionParser<A>(operatorTable: Operator<A>[][], simpleExpr: Parser<A>): Parser<A> {
        return makeExpressionParser(operatorTable.map((ops: Operator<A>[])=>{
            var rassoc:  RAssoc <A>[] = <RAssoc <A>[]> ops.filter(op => op instanceof RAssoc );
            var lassoc:  LAssoc <A>[] = <LAssoc <A>[]> ops.filter(op => op instanceof LAssoc );
            var nassoc:  NAssoc <A>[] = <NAssoc <A>[]> ops.filter(op => op instanceof NAssoc );
            var prefix:  Prefix <A>[] = <Prefix <A>[]> ops.filter(op => op instanceof Prefix );
            var postfix: Postfix<A>[] = <Postfix<A>[]> ops.filter(op => op instanceof Postfix);
            return new OperatorTable(
                rassoc .map(r=>r.p),
                lassoc .map(r=>r.p),
                nassoc .map(r=>r.p),
                prefix .map(r=>r.p),
                postfix.map(r=>r.p)
            );
        }), simpleExpr);
    }



    // Parsect internal interface

    export class OperatorTable<A> {
        constructor(
            public infixr:  Parser<(l: A, r: A) => A>[] = [],
            public infixl:  Parser<(l: A, r: A) => A>[] = [],
            public infix:   Parser<(l: A, r: A) => A>[] = [],
            public prefix:  Parser<(a: A      ) => A>[] = [],
            public postfix: Parser<(a: A      ) => A>[] = []
        ){ }        
    }

    export function makeExpressionParser<A>(table: OperatorTable<A>[], simpleExpr: Parser<A>): Parser<A> {
        return table.reduce((term: Parser<A>, ops: OperatorTable<A>)=>{            
            var rassocOp  = choice(ops.infixr);
            var lassocOp  = choice(ops.infixl);
            var nassocOp  = choice(ops.infix);
            var prefixOp  = choice(ops.prefix);
            var postfixOp = choice(ops.postfix);

            function ambigious(assoc: string, op: any){
                return triable(seq(s=>{
                    s(op); 
                    return s(fail("ambiguous use of a " + assoc + " associative operator"));
                }));
            }

            var ambigiousRight    = ambigious("right", rassocOp);
            var ambigiousLeft     = ambigious("left",  lassocOp);
            var ambigiousNon      = ambigious("non",   nassocOp);

            var termP = seq(s=>{
                var pre  = s(prefixP);
                var x    = s(term);
                var post = s(postfixP);
                return s.success && post(pre(x));
            });

            var postfixP = or(postfixOp, pure((x: A)=>x));
            var prefixP = or(prefixOp, pure((x: A)=>x));
            function rassocP(x: A){
                return or(
                    seq(s=>{
                        var f: (a: A, b: A)=>A = s(rassocOp);
                        var y: A = s(seq(s=>{ var z = s(termP); return s(rassocP1(z)); }));
                        return s.success && f(x, y);
                    }),
                    ambigiousLeft,
                    ambigiousNon
                );
            }

            function rassocP1(x: A){
                return or(rassocP(x), pure(x));
            }

            function lassocP(x: A){
                return or(
                    seq(s=>{
                        var f = s(lassocOp);
                        var y = s(termP);
                        return s.success && s(lassocP1(f(x, y)));
                    }),
                    ambigiousRight,
                    ambigiousNon
                );
            }

            function lassocP1(x: A){
                return or(lassocP(x), pure(x));
            }

            function nassocP(x: A){
                return seq(s=>{
                    var f = s(nassocOp);
                    var y = s(termP);
                    return s.success && s(or(
                        ambigiousRight,
                        ambigiousLeft,
                        ambigiousNon,
                        pure(f(x, y))
                    ));
                });
            }

            return seq(s=>{
                var x = s(termP);
                return s.success && s(label("operator", or(rassocP(x), lassocP(x), nassocP(x), pure(x))));
            });
        }, simpleExpr);
    }






    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Util //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    export function breakPoint<T>(parser: Parser<T>): Parser<T> {
        function breakPointParser<U>(state: State<U>): Reply<T,U> {
            debugger;
            return parse(parser, state);
        }
        return new Parser(breakPointParser);
    }

    export function progress(f: (state: number)=>void): Parser<void>{
        assert(f instanceof Function);
        var count = 0;
        function logParser<U>(state: State<U>): Reply<void,U> {
            var pos = Math.floor(state.position / state.source.length);
            if(pos > count) {
                count = pos;
                f(count);
            }
            return ok(state, undefined);
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
        }else if(a instanceof Function || b instanceof Function){
            throw new Error();
        }else if(a instanceof RegExp || b instanceof RegExp){
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
        export function many  (p: Parser<string>                                         ): Parser<string> { return fmap(x=>x.join(''), Parsect.many(p)); }
        export function many1 (p: Parser<string>                                         ): Parser<string> { return fmap(x=>x.join(''), Parsect.many1(p)); }
        export function sepBy1(p: Parser<string>, q: Parser<string>                      ): Parser<string> { return fmap(x=>x.join(''), Parsect.sepBy1(p, q)); }
        export function sepByN(m: number, n: number, p: Parser<string>, q: Parser<string>): Parser<string> { return fmap(x=>x.join(''), Parsect.sepByN(m, n, p, q)); }
        export function repeat(m: number, n: number, p: Parser<string>                   ): Parser<string> { return fmap(x=>x.join(''), Parsect.repeat(m, n, p)); }
        export function array (ps: Parser<string>[]                                      ): Parser<string> { return fmap(x=>x.join(''), Parsect.array(ps)); }
        export function series(...ps: Parser<string>[]                                   ): Parser<string> { return fmap(x=>x.join(''), Parsect.array(ps)); }
    }
}
