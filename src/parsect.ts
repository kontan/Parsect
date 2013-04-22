// Parsect (https://github.com/kontan/Parsect)
// @author Kon - http://phyzkit.net/

/// <reference path="prelude.ts" />


interface Func0<                R>{ (                                              ): R; }
interface Func2<A,B,            R>{ (a: A, b: B                                    ): R; }
interface Func3<A,B,C,          R>{ (a: A, b: B, c: C                              ): R; }
interface Func4<A,B,C,D,        R>{ (a: A, b: B, c: C, d: D                        ): R; }
interface Func5<A,B,C,D,E,      R>{ (a: A, b: B, c: C, d: D, e: E                  ): R; }
interface Func6<A,B,C,D,E,F,    R>{ (a: A, b: B, c: C, d: D, e: E, f: F            ): R; }		
interface Func7<A,B,C,D,E,F,G,  R>{ (a: A, b: B, c: C, d: D, e: E, f: F, g: G      ): R; }
interface Func8<A,B,C,D,E,F,G,H,R>{ (a: A, b: B, c: C, d: D, e: E, f: F, g: G, H: H): R; }

module Parsect{

	/////////////////////////////////////////////////////////////////////////////////////////
	// Data
	/////////////////////////////////////////////////////////////////////////////////////////

	/// parser object
	export class Parser<T>{
		/// create new parser.
		/// @param parse parsing function
		/// @param expecting human-readable string description that this parser expecting. 
		constructor(public parse: Func1<Source, State<T>>, private expecting?:string){
		}
	}

	//interface Parser<T> {
	//	(source: Source): State<T>; 
	//}

	/// Parse an input.
	/// This function acceps string primitive value as string parser or RegExp object as regexp parser.
	/// @param parser parser.
	/// @param input input.
	/// @return the result of parssing.
	export function parse<T>(parser: Parser<T>, input: string): State<T>;
	export function parse<T>(parser: Parser<T>, input: Source): State<T>;
	export function parse(parser: string, input: string): State<string>;
	export function parse(parser: string, input: Source): State<string>;
	export function parse(parser: String, input: string): State<String>;
	export function parse(parser: String, input: Source): State<String>;	
	export function parse(parser: RegExp, input: string): State<string>;
	export function parse(parser: RegExp, input: Source): State<string>;	
	export function parse(parser: any, input: any):any {
		var p = parser instanceof Parser ? parser :
		        parser instanceof String ? string(parser) :
		        parser instanceof RegExp ? regexp(parser) :
		        typeof parser === "string" ? string(parser) :
		        undefined;
		var i = input instanceof Source ? input : new Source(input);
		if( ! p) throw new Error();
		return p.parse(i);
	}
 
	export class State<T>{ 
		source: Source;
		success: bool;

		value: T;

		errorMesssage: string;

		/// private constructor
		/// You should use success or fail functions instead of the constructor.
		constructor(source: Source, success: bool, value?: T, errorMesssage?: string){
			this.value = value;
			this.source = source;
			this.success = success;
			this.errorMesssage = errorMesssage;
		}

		equals(st:State):bool{
			return st &&
				   this.source.equals(st.source)     && 
			       this.success       === st.success &&
			       this.success ? this.value === st.value : this.errorMesssage === st.errorMesssage;
		}
	}

	export function newSuccessState<T>(source:Source, value:T):State<T>;
	export function newSuccessState<T>(source:string, position:number, value:T):State<T>;
	export function newSuccessState(arg0:any, arg1:any, arg2?:any): any {
		var source = arg0 instanceof Source ? arg0 : new Source(arg0, arg1);
		var value  = arg0 instanceof Source ? arg1 : arg2;
		return new State(source, true, value, undefined);
	}

	export function newFailState(source:Source, errorMesssage:string):State<undefined>;
	export function newFailState(source:string, position:number, errorMesssage:string):State<undefined>;
	export function newFailState(arg0:any, arg1:any, arg2?:any): any {
		var source  = arg0 instanceof Source ? arg0 : new Source(arg0, arg1);
		var message = arg0 instanceof Source ? arg1 : arg2;
		return new State<undefined>(source, false, undefined, message);
	}

	export class Source{ 
		constructor(public source: string, public position: number = 0, public userData?: any){	
			// _position == _source.length + 1 at the maximum because of eof.
			if(position < 0 || position > source.length + 1) throw "_position: out of range: " + position;
		}

		// Progress the position.
		progress(delta:number): Source{
			return new Source(this.source, this.position + delta, this.userData);
		}

		/// 
		/// success(n, v) consumes n chars and set v as the value.
		///
		// ここも　↓　の定義が正しいけど、ほかの行でエラーになる 
		//success<T>(delta:number = 0, value: T = undefined): State<T>{
		success(delta:number = 0, value: any = undefined): State{
			return newSuccessState(new Source(this.source, this.position + delta, this.userData), value);
		}

		fail(message?: string): State<undefined>{
			return newFailState(this, message);
		}

		getPosition(): Position{
			var lines = this.source.slice(0, this.position).split('\n');
			return { line: lines.length, column: lines[lines.length - 1].length };
		}

		getInput(): string{
			return this.source.slice(this.position);
		}

		equals(src:Source): bool{
			return src && this.source === src.source && this.position === src.position;
		}
	}

	export interface Position{
		line: number;
		column: number;
	}

	/// seq のコンテキストオブジェクト。
	export interface Context<S>{
		
		/// パーサをこのコンテキストで実行し、そのパーサの意味値を返します。
		/// パースが失敗した場合は undefined を返します。
		/// コンテキストが失敗している場合は、パースは実行されず undefined が返ります。
		<T>(p: Parser<T>): T;
		(s:string): string;
		(p:RegExp): string;

		/// 現在のコンテキストのユーザ状態。自由に書き込み、読み込みが可能です。
		getUserState(): any;

		notFollowedBy:(p:Parser)=>void;
		peek():string;	// for debugging
		success():bool;   // for debugging
		result():any;     // for debugging

		/// このコンテキストの意味値。デフォルトでは空のオブジェクト。
		///ただし、seq コールバックが undefined 以外の値を返す場合は、out メンバ変数は無視され、その返り値が意味値となる。 
		out: S;
	}

	///////////////////////////////////////////////////////////////////////////////////
	// Parser constructors
	////////////////////////////////////////////////////////////////////////////////////

	/// string parser
	export function string(text: string): Parser<string> {

		// ここもこっちの定義が正しいと思うけど、コンパイル通らない件
		//function stringParser(s: Source): State<string> {

		function stringParser(s: Source): any {
			return s.source.indexOf(text, s.position) === s.position ? s.success(text.length, text) : s.fail("expected \"" + text + "\"");
		}
		return new Parser<string>(stringParser, "\"" + text + "\"");
	}

	
	// regular expression parser
	export function regexp(pattern: RegExp): Parser<string> {
		function regexpParser(s:Source){
			var input = s.source.slice(s.position);
			pattern.lastIndex = 0;
			var ms = pattern.exec(input);
			// In javascript' Regex, ^ matches not only the benning of the input but the beginniing of new line.
			//  "input.indexOf(matches[0]) == 0" is needed.
			if(ms && ms.index == 0 && ms.length > 0){
				var m = ms[0];
				return input.indexOf(ms[0]) == 0 ? s.success(m.length, m) : s.fail("expected /" + pattern + "/");
			}else{
				return s.fail("expected " + pattern);
			}
		}
		return new Parser<string>(regexpParser, pattern.toString());
	}

	export function satisfy(cond:(c:string)=>bool): Parser<string> {
		function expectedChars(){
			var cs = [];
			for(var i = 32; i <= 126; i++){
				var c = String.fromCharCode(i);
				if(cond(c)){
					cs.push(c);					
				}
			}
			return cs;
		}
		function satisfyParser(s: Source){
			var c = s.source[s.position];
			return cond(c) ? s.success(1, c) : s.fail("expected one char of \"" + expectedChars().join('') + "\"");
		}
		return new Parser<string>(satisfyParser, '(satisfy)');
	}

	//////////////////////////////////////////////////////////////////////////////////////
	// Parser Combinators
	//////////////////////////////////////////////////////////////////////////////////////

	///
	/// seq コンテキストオブジェクトを介して、パーサを順に適用します。
	/// パラメータ f の引数 s は 
	/// 
	/// @param f コンテキストを実行するコールバック。
	/// 
	export function seq<T>(f: (s:Context<T>, o: T)=>void): Parser<T>{
		function seqParser(source: Source): State<T> {
			var st:State = source.success();
			var s:Context = <any>((a:any)=>{
				if(st.success){
					st = parse(a, st.source);
					if(st.success){ 
						return st.value; 
					}
				}
			});
			s.notFollowedBy = (p:Parser)=>{
				var _st = parse(p, st.source);
				if(_st.success){
					st = st.source.fail('unexpected charactor');
				}
			};
			s.getUserState = ()=>source.userData;
			s.success = ()=> st.success;
			s.peek  = ()=> st.source.source.slice(st.source.position, st.source.position + 128);
			s.result  = ()=> st.value;
			s.out = {};
			var r = f(s, s.out);
			if(r === undefined){
				r = s.out;
			}
			return s.success() ? (r !== undefined ? st.source.success(0, r) : st) : st;
		}
		return new Parser<T>(seqParser);
	}

	export function trying<T>(p: Parser<T>): Parser<T> {
		function tryingParser(source:Source): State<T> {
			var st = parse(p, source);
			return st.success ? st : source.fail(st.errorMesssage);
		}
		return new Parser<T>(tryingParser);
	}

	// series function takes parsers and apply its sequentially.
	// This function returns the State object that last parser returned.
	export function series<A              >(a:Parser<A>                                                                                           ):Parser<A>;
	export function series<A,B            >(a:Parser<A>, b:Parser<B>                                                                              ):Parser<B>;
	export function series<A,B,C          >(a:Parser<A>, b:Parser<B>, c:Parser<C>                                                                 ):Parser<C>;
	export function series<A,B,C,D,E      >(a:Parser<A>, b:Parser<B>, c:Parser<C>, d:Parser<D>                                                    ):Parser<D>;	
	export function series<A,B,C,D,E,F    >(a:Parser<A>, b:Parser<B>, c:Parser<C>, d:Parser<D>, e:Parser<E>                                       ):Parser<E>;
	export function series<A,B,C,D,E,F,G  >(a:Parser<A>, b:Parser<B>, c:Parser<C>, d:Parser<D>, e:Parser<E>, f:Parser<F>, g:Parser<G>             ):Parser<G>;
	export function series<A,B,C,D,E,F,G,H>(a:Parser<A>, b:Parser<B>, c:Parser<C>, d:Parser<D>, e:Parser<E>, f:Parser<F>, g:Parser<G>, h:Parser<H>):Parser<H>;
	export function series(...ps:Parser<any>[]): any {
		function seriesParser(source:Source){
			var st:State = source.success();
			for(var i = 0; i < ps.length && st.success; i++){
				var _st = parse(ps[i], st.source);
				if(_st.success){ 
					st = _st;
				}else{
					return st.source.fail(_st.errorMesssage);
				}
			}
			return st.success ? st : st.source.fail();
		}
		return new Parser(seriesParser);
	}

	export function head<A>(a:Parser<A>, ...ps:Parser[]): Parser<A>;
	export function head(a:string, ...ps:Parser[]): Parser<string>;	
	export function head(a:RegExp, ...ps:Parser[]): Parser<string>;	
	export function head(a:any, ...ps:Parser[]): Parser {
		function headParser(source: Source){
			var st:State = source.success();
			for(var i = 0; i < ps.length && st.success; i++){
				var _st = parse(ps[i], st.source);
				if(_st.success){ 
					st = _st;
				}else{
					return st.source.fail(_st.errorMesssage);
				}
			}
			return st.success ? st : st.source.fail();
		}
		return new Parser(headParser);
	}

	export function take1<A,B>(a:Parser<A>, b:Parser<B>, ...ps:Parser[]):Parser<B>{
		function take2Parser(source:Source){
			var st:State = source.success();
			for(var i = 0; i < ps.length && st.success; i++){
				var _st = parse(ps[i], st.source);
				if(_st.success){ 
					st = _st;
				}else{
					return st.source.fail(_st.errorMesssage);
				}
			}
			return st.success ? st : st.source.fail();
		}
		return new Parser<B>(take2Parser);
	}	

	export function stream<T>(ps: Parser<T>[]): Parser<T> {
		function streamparser(source:Source){
			var st:State = source.success();
			for(var i = 0; i < ps.length && st.success; i++){
				var _st = parse(ps[i], st.source);
				if(_st.success){ 
					st = _st;
				}else{
					return st.source.fail(_st.errorMesssage);
				}
			}
			return st.success ? st : st.source.fail();
		}
		return new Parser<T>(streamparser);
	}

	// ret:(f:()=>T):Parser<T>
	// ret function injects a arbitrary value. 
	// ret consumes no input. 
	export function ret<T>(f: ()=>T): Parser<T>{
		function retParser(s: Source){
			return s.success(0, f());
		}
		return <any> new Parser(retParser);
	}

	// count:(n:number, p:Parser<T>):Parser<T[]>
	export function count<T>(n: number, p: Parser<T>): Parser<T[]>;
	export function count(n: number, p: String): Parser<string[]>;
	export function count(n: number, p: RegExp): Parser<string[]>;
	export function count(n: number, p: any): any {
		function countParser(s: Source){
			var st = s.success();
			var results:any[] = [];
			for(var i = 0; i < n; i++){
				var _st = parse(p, st.source);
				if(_st.success){
					st = _st;
					results.push(st.value);
				}else{
					return st.source.fail();
				}
			}
			return st.source.success(0, results);
		}
		return new Parser(countParser);
	}

	export function many<T>(p:Parser<T>): Parser<T>;
	export function many(p:String): Parser<string>;
	export function many(p:RegExp): Parser<string>;
	export function many(p:any): Parser<any>{
		function manyParser(s: Source){
			var st = s.success();
			var results = [];
			for(var i = 0; true; i++){
				var _st = parse(p, st.source);
				if(_st.success){
					st = _st;
					results.push(st.value);
				}else if(_st.source.position == st.source.position){
					return st.source.success(0, results);
				}else{
					return _st;
				}
			}
		}
		return new Parser(manyParser);
	}

	// many1:(p:Parser<T>):Parser<T[]>
	export function many1<T>(p: Parser<T>): Parser<T>;
	export function many1(p: String): Parser<string>;
	export function many1(p: RegExp): Parser<string>;
	export function many1(p: any): Parser<any> {
		function many1parser(s: Source){
			var st = s.success();
			var results = [];
			var i = 0;
			for(var i = 0; true; i++){
				var _st = parse(p, st.source);
				if(_st.success){
					st = _st;
					results.push(st.value);
				}else{
					break;
				}
			}
			return results.length > 0 ? st.source.success(0, results) : st.source.fail("");
		}
		return new Parser(many1parser);
	}

	export function or<T>(p: Parser<T>, q: Parser<T>, ...ps:Parser<T>[]): Parser<T>;
	export function or(p:String,         q:Parser<string>): Parser<string>;
	export function or(p:RegExp,         q:Parser<string>): Parser<string>;
	export function or(p:Parser<string>, q:String        ): Parser<string>;
	export function or(p:String,         q:String        ): Parser<string>;
	export function or(p:RegExp,         q:String        ): Parser<string>;
	export function or(p:Parser<string>, q:RegExp        ): Parser<string>;
	export function or(p:String,         q:RegExp        ): Parser<string>;
	export function or(p:RegExp,         q:RegExp        ): Parser<string>;			
	export function or(...ps:any[]): Parser<any> {
		var ps:Parser[] = <any>arguments;
		function orParser(source: Source){
			for(var i = 0; i < ps.length; i++){
				var st = parse(ps[i], source);
				if(st.success){
					return st;
				}else if(st.source.position != source.position){
					return st;
				}
			}
			return source.fail();
		}
		return new Parser(orParser);
	}

	export function option<T>(defaultValue: T, p: Parser<T>): Parser<T>;
	export function option(defaultValue: string, p: string): Parser<string>;
	export function option(defaultValue: string, p: RegExp): Parser<string>;
	export function option(defaultValue: any, p: any): Parser<any> {
		function optionParser(source: Source){
			var st = parse(p, source);
			return st.success ? st : source.success(0, defaultValue);
		}		
		if( ! p){
			throw "Parsect.option: invalid argument: p";
		}

		return new Parser(optionParser);
	}

	// optional:(p:Parser<T>):Parser<T>
	export function optional<T>(p: Parser<T>): Parser<T>;
	export function optional(p: string): Parser<string>;
	export function optional(p:RegExp): Parser<string>;
	export function optional(p:any): Parser<any> {
		function optionalParser(source: Source){
			return parse(option(undefined, p), source);
		}
		return new Parser(optionalParser);
	}

	export function notFollowedBy<T>(value: T, p: Parser<T>): Parser<T> {
		function notFollowedByParser(source:Source){
			var st = parse(p, source);
			return st.success ? newSuccessState(source, value) : st.source.fail('');			
		}
		return new Parser(notFollowedByParser);
	}
	
	export function map<T, S>(f: (v: T)=>S, p: Parser<T>): Parser<S>;
	
	// このへんのオーバーロードも通らなくて生きるのがつらい
	//export function map<   S>(f: (v:string)=>S, p:string   ): Parser<S>;
	//export function map<   S>(f: (v:string)=>S, p:RegExp   ): Parser<S>;
	
	export function map(f: (v:any)=>any, p:any): Parser<any> {
		function mapParser(source: Source){
			var st = parse(p, source);
			return st.success ? st.source.success(0, f(st.value)) : st;
		}
		return new Parser(mapParser);
	}

	export function sepBy1<T>(p: Parser<T>, sep: Parser): Parser<T[]>;
	export function sepBy1<T>(p: Parser<T>, sep: string): Parser<T[]>;
	export function sepBy1<T>(p: Parser<T>, sep: RegExp): Parser<T[]>;		
	export function sepBy1(p: string, sep: Parser): Parser<string[]>;
	export function sepBy1(p: string, sep: string): Parser<string[]>;	
	export function sepBy1(p: RegExp, sep: Parser): Parser<string[]>;
	export function sepBy1(p: string, sep: RegExp): Parser<string[]>;
	export function sepBy1(p: RegExp, sep: string): Parser<string[]>;
	export function sepBy1(p: RegExp, sep: RegExp): Parser<string[]>;
	export function sepBy1(p: any,    sep: any   ): Parser<any[]> {
		function sepBy1parser(source: Source){
			return parse(seq(s=>{
				var x = s(p);
				var xs = s(many(series(sep, p)));
				if(s.success()){
					xs.unshift(x);
					return xs;
				}
			}), source);
		}
		return new Parser(sepBy1parser);
	}

	export function sepBy<T>(p:Parser<T>, sep:Parser): Parser<T[]>;	
	export function sepBy<T>(p:Parser<T>, sep:string): Parser<T[]>;
	export function sepBy<T>(p:Parser<T>, sep:RegExp): Parser<T[]>;
	export function sepBy(p:string, sep:Parser): Parser<string[]>;
	export function sepBy(p:string, sep:string): Parser<string[]>;	
	export function sepBy(p:string, sep:RegExp): Parser<string[]>;
	export function sepBy(p:RegExp, sep:Parser): Parser<string[]>;
	export function sepBy(p:RegExp, sep:string): Parser<string[]>;
	export function sepBy(p:RegExp, sep:RegExp): Parser<string[]>;
	export function sepBy(p:any, sep:any): Parser<any[]>{
		function sepByParser(source:Source){
			return parse(or(sepBy1(p, sep), map(()=>[], empty)), source);
		}
		return new Parser(sepByParser);
	}

	export function endBy1<T>(p: Parser<T>, sep: Parser): Parser<T[]>;
	export function endBy1<T>(p: Parser<T>, sep: string): Parser<T[]>;
	export function endBy1<T>(p: Parser<T>, sep: RegExp): Parser<T[]>;
	export function endBy1(p: string, sep: Parser): Parser<string[]>;
	export function endBy1(p: string, sep: string): Parser<string[]>;
	export function endBy1(p: string, sep: RegExp): Parser<string[]>;
	export function endBy1(p: RegExp, sep: Parser): Parser<string[]>;
	export function endBy1(p: RegExp, sep: string): Parser<string[]>;
	export function endBy1(p: RegExp, sep: RegExp): Parser<string[]>;
	export function endBy1(p: any, sep: any): Parser<any>{
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

	export function endBy<T>(p: Parser<T>, sep: Parser): Parser<T[]>;
	export function endBy<T>(p: Parser<T>, sep: string): Parser<T[]>;
	export function endBy<T>(p: Parser<T>, sep: RegExp): Parser<T[]>;
	export function endBy(p: string, sep: Parser): Parser<string[]>;
	export function endBy(p: string, sep: string): Parser<string[]>;
	export function endBy(p: string, sep: RegExp): Parser<string[]>;
	export function endBy(p: RegExp, sep: Parser): Parser<string[]>;
	export function endBy(p: RegExp, sep: string): Parser<string[]>;
	export function endBy(p: RegExp, sep: RegExp): Parser<string[]>;
	export function endBy(p: any, sep: any): Parser<any> {
		function endByFunction(source:Source){
			return parse(or(endBy1(p, sep), empty), source);
		};
		return new Parser(endByFunction);
	}

	export function between<T>(open:Parser, p:Parser<T>, close:Parser): Parser<T>;
	export function between<T>(open:Parser, p:Parser<T>, close:String): Parser<T>;
	export function between<T>(open:Parser, p:Parser<T>, close:RegExp): Parser<T>;
	export function between(open:Parser, p:String, close:Parser): Parser<string>;
	export function between(open:Parser, p:String, close:String): Parser<string>;
	export function between(open:Parser, p:String, close:RegExp): Parser<string>;
	export function between(open:Parser, p:RegExp, close:Parser): Parser<string>;
	export function between(open:Parser, p:RegExp, close:String): Parser<string>;
	export function between(open:Parser, p:RegExp, close:RegExp): Parser<string>;
	export function between<T>(open:String, p:Parser<T>, close:Parser): Parser<T>;
	export function between<T>(open:String, p:Parser<T>, close:String): Parser<T>;
	export function between<T>(open:String, p:Parser<T>, close:RegExp): Parser<T>;
	export function between(open:String, p:String, close:Parser): Parser<string>;
	export function between(open:String, p:String, close:String): Parser<string>;
	export function between(open:String, p:String, close:RegExp): Parser<string>;
	export function between(open:String, p:RegExp, close:Parser): Parser<string>;
	export function between(open:String, p:RegExp, close:String): Parser<string>;
	export function between(open:String, p:RegExp, close:RegExp): Parser<string>;
	export function between<T>(open:RegExp, p:Parser<T>, close:Parser): Parser<T>;
	export function between<T>(open:RegExp, p:Parser<T>, close:String): Parser<T>;
	export function between<T>(open:RegExp, p:Parser<T>, close:RegExp): Parser<T>;
	export function between(open:RegExp, p:String, close:Parser): Parser<string>;
	export function between(open:RegExp, p:String, close:String): Parser<string>;
	export function between(open:RegExp, p:String, close:RegExp): Parser<string>;
	export function between(open:RegExp, p:RegExp, close:Parser): Parser<string>;
	export function between(open:RegExp, p:RegExp, close:String): Parser<string>;
	export function between(open:RegExp, p:RegExp, close:RegExp): Parser<string>;
	export function between(open:any, p:any, close:any): Parser<any> {
		function betweenParser(source: Source){
			return parse(seq(s=>{
				if( ! (open && p && close) ) throw "Parsect.between: Invalid argument:";
				s(open);
				var v = s(p);
				s(close);
				return v;
			}), source);
		}
		return new Parser(betweenParser);	
	}

	export function whole<T>(p: Parser<T>): Parser<T>{
		function wholeParser(source:Source){
			var pos = source.position;
			var _st = parse(p, source);
			return _st.success ? source.success(0, source.source.slice(pos, _st.source.position)) : _st;
		}
		return new Parser(wholeParser);
	}	

	/////////////////////////////////////////////////////////////////////////////////
	// Applycative-like style utils
	//////////////////////////////////////////////////////////////////////////


	export function apply<A,B,R            >(m: Func2<A,B,R            >, pa: Parser<A>, pb: Parser<B>                                                                                          ): Parser<R>;
	export function apply<A,B,C,R          >(m: Func3<A,B,C,R          >, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>                                                                           ): Parser<R>;
	export function apply<A,B,C,D,E,F,    R>(m: Func6<A,B,C,D,E,F,    R>, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>, pe: Parser<E>, pf: Parser<F>                              ): Parser<R>;	
	export function apply<A,B,C,D,E,F,G,  R>(m: Func7<A,B,C,D,E,F,G,  R>, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>, pe: Parser<E>, pf: Parser<F>, pg: Parser<G>               ): Parser<R>;	
	export function apply<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, pa: Parser<A>, pb: Parser<B>, pc: Parser<C>, pd: Parser<D>, pe: Parser<E>, pf: Parser<F>, pg: Parser<G>, ph: Parser<H>): Parser<R>;	
	export function apply(func: Function, ...ps: Parser<any>[]): Parser<any> {
		function applyParser(source: Source){
			var values = [];
			var st:State = source.success();
			for(var i = 0; i < ps.length; i++){
				var _st:State = parse(ps[i], st.source);
				if(_st.success){
					st = _st;
					values.push(_st.value);
				}else{
					return st.source.fail("");
				}
			}
			return st.source.success(0, func.apply(undefined, values));
		}
		return new Parser(applyParser);
	}

	///////////////////////////////////////////////////////////////////////////////////////
	// Build-in Parsees
	/////////////////////////////////////////////////////////////////////////////////////////

	export function lazy<T>(f: ()=>Parser<T>): Parser<T> {
		function lazyParser(source){
			return parse(f(), source);
		}
		return new Parser(lazyParser);
	}

	export function log(f: (state: number)=>void): Parser<any>{
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
	export var eof:   Parser<any> = new Parser((source:Source)=>source.position === source.source.length ? source.success(1) : source.fail());
	export var empty: Parser<any> = new Parser((source:Source)=>source.success(0));

	// Charactors
	export var spaces:   Parser<string> = regexp(/^\s*/);
	export var lower:    Parser<string> = regexp(/^[a-z]/);
	export var upper:    Parser<string> = regexp(/^[A-Z]/);
	export var alpha:    Parser<string> = regexp(/^[a-zA-Z]/);
	export var digit:    Parser<string> = regexp(/^[0-9]/);
	export var alphaNum: Parser<string> = regexp(/^[0-9a-zA-Z]/);

	// Misc

	// 型がうまくあわない。 バグ？
	export var number: Parser<number> = map(<any> parseFloat, <any> regexp(/^[-+]?\d+(\.\d+)?/));

	// Util ////////////////////////////////////////////////////////////

	/// Compare two jsons
	export function jsonEq(a:any, b:any): bool {
		if(a === undefined && b === undefined){
			return true;
		}else if(
			(typeof(a) === "bool"  ) || (typeof(b) === "bool"  ) ||
			(typeof(a) === "string") || (typeof(b) === "string") ||
			(typeof(a) === "number") || (typeof(b) === "number") ||
			(a === undefined) || (b === undefined) ||
			(a === null) || (b === null)
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
}


