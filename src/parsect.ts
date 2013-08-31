// Parsect (https://github.com/kontan/Parsect)
// @author Kon - http://phyzkit.net/

module Parsect{

	/////////////////////////////////////////////////////////////////////////////////////////
	// Data
	/////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * class Parser<T>
	 */
	export class Parser{
		constructor(public name:string, public parse:(source:Source)=>State, public expected?:string){
		}
	}

	export function parse(parser: Parser, input: string): State;
	export function parse(parser: Parser, input: Source): State;
	export function parse(parser: string, input: string): State;
	export function parse(parser: string, input: Source): State;
	export function parse(parser: String, input: string): State;
	export function parse(parser: String, input: Source): State;	
	export function parse(parser: RegExp, input: string): State;
	export function parse(parser: RegExp, input: Source): State;		
	export function parse(parser: any, input: any): State{
		var p = parser instanceof Parser ? parser :
		        parser instanceof String ? string(parser) :
		        parser instanceof RegExp ? regexp(parser) :
		        string(parser);
		var i = input instanceof Source ? input : new Source(input);
		return p.parse(i);
	}

	/**
	 * 
	 */ 
	export class State{ 
		value:any;
		source:Source;
		success:bool;
		errorMesssage:string;
		position: number;

		/** 
		 * private constructor
		 * You should use success or fail functions instead of the constructor.
		 */
		constructor(value:any, source:Source, success:bool=true, errorMesssage?:string);
		constructor(value:any, source:string, success:bool=true, errorMesssage?:string);
		constructor(value:any, source:any,    success:bool=true, errorMesssage?:string){
			this.value = value;
			this.source = source instanceof Source ? source : new Source(source);
			this.success = success;
			this.errorMesssage = errorMesssage;
			this.position = this.source.position;
		}

		static success(source:Source, value:any):State;
		static success(source:string, position:number, value:any):State;
		static success(arg0:any, arg1:any, arg2?:any):State{
			var source = arg0 instanceof Source ? arg0 : new Source(arg0, arg1);
			var value  = arg0 instanceof Source ? arg1 : arg2;
			return new State(value, source, true, undefined);
		}

		static fail(source:Source, errorMesssage:string):State;
		static fail(source:string, position:number, errorMesssage:string):State;
		static fail(arg0:any, arg1:any, arg2?:any):State{
			var source  = arg0 instanceof Source ? arg0 : new Source(arg0, arg1);
			var message = arg0 instanceof Source ? arg1 : arg2;
			return new State(undefined, source, false, message);
		}

		equals(st:State):bool{
			if(!st) return false;
			return this.value         === st.value   && 
			       this.source.equals(st.source)     && 
			       this.success       === st.success &&
			       this.errorMesssage === st.errorMesssage;
		}
	}

	export class Source{ 
		constructor(public source:string, public position?:number = 0, public userData?: any){	
			// _position == _source.length + 1 at the maximum because of eof.
			if(position < 0 || position > source.length + 1) throw "_position: out of range: " + position;
		}

		// Progress the position.
		progress(delta:number):Source{
			return new Source(this.source, this.position + delta, this.userData);
		}

		success(delta?:number=0, value?:any=undefined):State{
			return State.success(new Source(this.source, this.position + delta, this.userData), value);
		}
		fail(message?:string):State{
			return State.fail(this, message);
		}
		getPosition():Position{
			var lines = this.source.slice(0, this.position).split('\n');
			return { line: lines.length, column: lines[lines.length - 1].length };
		}
		getInput():string{
			return this.source.slice(this.position);
		}

		equals(src:Source):bool{
			return src && this.source === src.source && this.position === src.position;
		}
	}

	export interface Position{
		line:number;
		column:number;
	}

	/**
	 * seq のコンテキストオブジェクト。
	 */
	export interface Context{
		
		/**
		 * パーサをこのコンテキストで実行し、そのパーサの意味値を返します。
		 * パースが失敗した場合は undefined を返します。
		 * コンテキストが失敗している場合は、パースは実行されず undefined が返ります。
		 */
		(p:Parser):any;
		(s:string):string;
		(p:RegExp):string;

		/**
		 * 現在のコンテキストのユーザ状態。自由に書き込み、読み込みが可能です。
		 */
		getUserState(): any;


		notFollowedBy:(p:Parser)=>void;
		peek():string;	// for debugging
		success():bool;   // for debugging
		result():any;     // for debugging

		/**
		 * このコンテキストの意味値。デフォルトでは空のオブジェクト。
		 * ただし、seq コールバックが undefined 以外の値を返す場合は、out メンバ変数は無視され、その返り値が意味値となる。 
		 */
		out: any;
	}

	///////////////////////////////////////////////////////////////////////////////////
	// Parser Builders
	////////////////////////////////////////////////////////////////////////////////////

	/**
	 * string : (text: string) => Parser<string> 
	 */
	export function string(text:string):Parser{
		return new Parser(
			"string \"" + text + "\"", 
			(s:Source)=>s.source.indexOf(text, s.position) === s.position ? s.success(text.length, text) : s.fail("expected \"" + text + "\""),
			"\"" + text + "\""
		);
	}

	/**
	 * regexp : (pattern: RegExp) => Parser<string>
	 */
	export function regexp(pattern:RegExp):Parser{
		return new Parser("regexp \"" + pattern + "\"", (s:Source)=>{
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
		}, pattern.toString());
	}

	export function satisfy(cond:(c:string)=>bool):Parser{
		var expectedChars = ()=>{
			var cs = [];
			for(var i = 32; i <= 126; i++){
				var c = String.fromCharCode(i);
				if(cond(c)){
					cs.push(c);					
				}
			}
			return cs;
		};
		return new Parser("satisfy", (s:Source)=>{
			var c = s.source[s.position];
			return cond(c) ? s.success(1, c) : s.fail("expected one char of \"" + expectedChars().join('') + "\"");
		}, '(satisfy)');
	}

	//////////////////////////////////////////////////////////////////////////////////////
	// Parser Combinators
	//////////////////////////////////////////////////////////////////////////////////////

	// seq:(f(s:Context)=>T)=>Parser<T>
	/**
	 * seq コンテキストオブジェクトを介して、パーサを順に適用します。
	 * パラメータ f の引数 s は 
	 * 
	 * @param f コンテキストを実行するコールバック。
	 */
	export function seq(f:(s:Context, o:any)=>any):Parser{
		return new Parser("seq", (source:Source)=>{
			var st:State = source.success();
			var s:Context = <any>(a:any)=>{
				if(st.success){
					st = parse(a, st.source);
					if(st.success){ 
						return st.value; 
					}
				}
			};
			s.notFollowedBy = (p:Parser)=>{
				var _st = parse(p, st.source);
				if(_st.success){
					st = st.source.fail('unexpected ' + p.expected);
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
		});
	}

	// trying:(p:Parser<T>)=>Parser<T>
	export function trying(p:Parser):Parser{
		return new Parser('tring', (source:Source)=>{
			var st = parse(p, source);
			return st.success ? st : source.fail(st.errorMesssage);
		});
	}

	// many:(...ps:Parser<any>[]):Parser<any>
	// series function takes parsers and apply its sequentially.
	// This function returns the State object that last parser returned.
	export function series(...ps:Parser[]):Parser{
		return new Parser("series", (source:Source)=>{
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
		});
	}

	export function seqencial(ps:Parser[], action?:(x:any)=>any, finish?:(x:any)=>any):Parser{
		return new Parser("series", (source:Source)=>{
			var st:State = source.success();
			var values:any[] = [];
			for(var i = 0; i < ps.length && st.success; i++){
				var _st = parse(ps[i], st.source);
				if(_st.success){ 
					var value = action(_st.value);
					st = _st;
				}else{
					return st.source.fail(_st.errorMesssage);
				}
			}
			return st.success ? st : st.source.fail();
		});
	}

	export function stream(ps:Parser[]):Parser{
		return new Parser("series", (source:Source)=>{
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
		});
	}

	// ret:(f:()=>T):Parser<T>
	// ret function injects a arbitrary value. 
	// ret consumes no input. 
	export function ret(f:()=>any):Parser{
		return new Parser("ret", (s:Source)=> s.success(0, f()));
	}

	// count:(n:number, p:Parser<T>):Parser<T[]>
	export function count(n:number, p:Parser):Parser;
	export function count(n:number, p:String):Parser;
	export function count(n:number, p:RegExp):Parser;
	export function count(n:number, p:any):Parser{
		return new Parser("count " + n, (s:Source)=>{
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
		});
	}

	// many:(p:Parser<T>):Parser<T[]>
	export function many(p:Parser):Parser;
	export function many(p:String):Parser;
	export function many(p:RegExp):Parser;
	export function many(p:any):Parser{
		return new Parser("many", (s:Source)=>{
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
		});
	}

	// many1:(p:Parser<T>):Parser<T[]>
	export function many1(p:Parser):Parser;
	export function many1(p:String):Parser;
	export function many1(p:RegExp):Parser;
	export function many1(p:any):Parser{
		return new Parser("many1", (s:Source)=>{
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
			return results.length > 0 ? st.source.success(0, results) : st.source.fail("expected one or more " + p.expected);
		});
	}

	// or:(...ps:Parser<T>[]):Parser<T>

	export function or(p:Parser):Parser;
	export function or(p:String):Parser;
	export function or(p:RegExp):Parser;
	export function or(p:Parser, q:Parser):Parser;
	export function or(p:String, q:Parser):Parser;
	export function or(p:RegExp, q:Parser):Parser;
	export function or(p:Parser, q:String):Parser;
	export function or(p:String, q:String):Parser;
	export function or(p:RegExp, q:String):Parser;
	export function or(p:Parser, q:RegExp):Parser;
	export function or(p:String, q:RegExp):Parser;
	export function or(p:RegExp, q:RegExp):Parser;			
	export function or(...ps:Parser[]):Parser;
	export function or(...ps:any[]):Parser{
		var ps:Parser[] = <any>arguments;
		return new Parser("or", (source:Source)=>{
			for(var i = 0; i < ps.length; i++){
				var st = parse(ps[i], source);
				if(st.success){
					return st;
				}else if(st.source.position != source.position){
					return st;
				}
			}
			return source.fail();
		});
	}

	// option:(def:T, p:Parser<T>):Parser<T>
	export function option(defaultValue:any, p:Parser):Parser;
	export function option(defaultValue:any, p:string):Parser;
	export function option(defaultValue:any, p:RegExp):Parser;
	export function option(defaultValue:any, p:any):Parser{
		if( ! p){
			throw "Parsect.option: invalid argument: p";
		}
		return new Parser("option", (source:Source)=>{
			var st = parse(p, source);
			return st.success ? st : source.success(0, defaultValue);
		});
	}

	// optional:(p:Parser<T>):Parser<T>
	export function optional(p:Parser):Parser;
	export function optional(p:string):Parser;
	export function optional(p:RegExp):Parser;
	export function optional(p:any):Parser{
		return option(undefined, p);
	}

	export function notFollowedBy(value:any, p:Parser):Parser{
		return new Parser("notFollowedBy " + p.name, (source:Source)=>{
			var st = parse(p, source);
			return st.success ? State.success(source, value) : st.source.fail('not expected ' + p.expected);
		});
	}

	export function map(f:(v:any)=>any, p:Parser): Parser;
	export function map(f:(v:any)=>any, p:String): Parser;
	export function map(f:(v:any)=>any, p:RegExp): Parser;
	export function map(f:(v:any)=>any, p:any): Parser{
		return new Parser("map(" + p.name + ")", (source:Source)=>{
			var st = parse(p, source);
			return st.success ? st.source.success(0, f(st.value)) : st;
		});
	}

	export function sepBy1(p:Parser, sep:Parser): Parser{
		return seq((s)=>{
			var x = s(p);
			var xs = s(many(series(sep, p)));
			if(s.success()){
				xs.unshift(x);
				return xs;
			}
		});
	}

	export var sepBy = (p:Parser, sep:Parser)=>new Parser("sepBy", (source:Source)=>{
		return parse(or(sepBy1(p, sep), map(()=>[], empty)), source);
	});	

	export var endBy1 = (p:Parser, sep:Parser)=>new Parser("endBy1", (source:Source)=>{
		var q = seq((s)=>{ var x = s(p); s(sep); return x; });
		return parse(seq((s)=>{
			var x = s(q);
			var xs = s(many(q));
			if(s.success()){
				xs.unshift(x);
				return xs;
			} 
		}), source); 
	});

	export var endBy = (p:Parser, sep:Parser)=>new Parser("endBy", (source:Source)=>{
		return parse(or(endBy1(p, sep), empty), source);
	});

	// between:(open:Parser, close:Parser, p:Parser)=>Parser
	export function between(open:Parser, p:Parser, close:Parser): Parser;
	export function between(open:Parser, p:Parser, close:String): Parser;
	export function between(open:Parser, p:Parser, close:RegExp): Parser;
	export function between(open:Parser, p:String, close:Parser): Parser;
	export function between(open:Parser, p:String, close:String): Parser;
	export function between(open:Parser, p:String, close:RegExp): Parser;
	export function between(open:Parser, p:RegExp, close:Parser): Parser;
	export function between(open:Parser, p:RegExp, close:String): Parser;
	export function between(open:Parser, p:RegExp, close:RegExp): Parser;
	export function between(open:String, p:Parser, close:Parser): Parser;
	export function between(open:String, p:Parser, close:String): Parser;
	export function between(open:String, p:Parser, close:RegExp): Parser;
	export function between(open:String, p:String, close:Parser): Parser;
	export function between(open:String, p:String, close:String): Parser;
	export function between(open:String, p:String, close:RegExp): Parser;
	export function between(open:String, p:RegExp, close:Parser): Parser;
	export function between(open:String, p:RegExp, close:String): Parser;
	export function between(open:String, p:RegExp, close:RegExp): Parser;
	export function between(open:RegExp, p:Parser, close:Parser): Parser;
	export function between(open:RegExp, p:Parser, close:String): Parser;
	export function between(open:RegExp, p:Parser, close:RegExp): Parser;
	export function between(open:RegExp, p:String, close:Parser): Parser;
	export function between(open:RegExp, p:String, close:String): Parser;
	export function between(open:RegExp, p:String, close:RegExp): Parser;
	export function between(open:RegExp, p:RegExp, close:Parser): Parser;
	export function between(open:RegExp, p:RegExp, close:String): Parser;
	export function between(open:RegExp, p:RegExp, close:RegExp): Parser;
	export function between(open:any, p:any, close:any): Parser{
		return seq((s)=>{
			if( ! (open && p && close) ) throw "Parsect.between: Invalid argument:";
			s(open);
			var v = s(p);
			s(close);
			return v;
		});	
	}

	export function whole(p:any): Parser{
		return new Parser("whole", (source:Source)=>{
			var pos = source.position;
			var _st = parse(p, source);
			return _st.success ? source.success(0, source.source.slice(pos, _st.position)) : _st;
		});
	}	

	/////////////////////////////////////////////////////////////////////////////////
	// Applycative-like style utils
	//////////////////////////////////////////////////////////////////////////

	export function apply(func:Function, ...parserSeq:Parser[][]): Parser{
		return new Parser("apply", (source:Source)=>{
			var args:any[] = [];
			var st:State = source.success();
			for(var i = 0; i < parserSeq.length; i++){
				var _st:State = parse(stream(parserSeq[i]), st.source);
				if(_st.success){
					st = _st;
					args.push(_st.value);
				}else{
					return st.source.fail("");
				}
			}
			return st.source.success(0, func.apply(undefined, args));
		});
	}

	export function build(ctor:Function, ...parserSeq:Parser[][]): Parser{

		for(var i = 0; i < parserSeq.length; i++){
			for(var k = 0; k < parserSeq[i].length; k++){
				if( ! parserSeq[i][k]){
					throw "Parsect.build: Invalid argument: ps[" + i + "][" + k + "]";
				}
			}
		}

		return new Parser("apply", (source:Source)=>{
			var args:any[] = [];
			var st:State = source.success();
			for(var i = 0; i < parserSeq.length; i++){
				var _st:State = parse(stream(parserSeq[i]), st.source);
				if(_st.success){
					st = _st;
					args.push(_st.value);
				}else{
					return st.source.fail("");
				}
			}
			var obj = Object.create(ctor.prototype);
			ctor.apply(obj, args);
			return st.source.success(0, obj);
		});
	}	

	///////////////////////////////////////////////////////////////////////////////////////
	// Build-in Parsees
	/////////////////////////////////////////////////////////////////////////////////////////

	export function lazy(f:()=>Parser): Parser{
		return new Parser("log", (source)=>{
			return parse(f(), source);
		});
	}

	export function log(f:(state:number)=>void): Parser{
        var count = 0;
        return new Parser("log", (source)=>{
            var pos = Math.floor(100 * source.position / source.source.length);
            if(pos > count) {
                count = pos;
                f(count);
            }
            return source.success(0);
        });
    }

	// Primitives
	export var eof:Parser    = new Parser('eof',   (source:Source)=>source.position === source.source.length ? source.success(1) : source.fail());
	export var empty:Parser  = new Parser("empty", (source:Source)=>source.success(0));

	// Charactors
	export var spaces:Parser = regexp(/^\s*/);
	export var lower         = regexp(/^[a-z]/);
	export var upper         = regexp(/^[A-Z]/);
	export var alpha         = regexp(/^[a-zA-Z]/);
	export var digit         = regexp(/^[0-9]/);
	export var alphaNum      = regexp(/^[0-9a-zA-Z]/);

	// Misc
	export var number:Parser; // :Parser<number>
	number = map(parseFloat, regexp(/^[-+]?\d+(\.\d+)?/));



	// Util ////////////////////////////////////////////////////////////

	export function jsonEq(a:any, b:any){
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










	/*


	export class Seeker{
		public success: bool = true;
		constructor(public source: string, public position?: number = 0){
		}
	}

	export interface ASTEmitter{
		parse(): any;
	}

	export class Branch{
		constructor(name: string, parser:ASTEmitter){
		}

	}

	export class Choice implements ASTEmitter{
		constructor(branches: Branch[]){
		}
		constructor(...branches: Branch[]){
		}
		parse(seeker: Seeker): any{
			var initialPosition: number = seeker.position;
			for(var i = 0; i < this.branches.length; i++){
				var branch: Branch = this.branches[i];
				var value = branch.parse(seeker);
				if(current.success){
					return { "type": branch.name, "value": value }; 
				}else if(seeker.position != initialPosition){
					return undefined;
				}else{
					seeker.success = true;
				}
			}
			seeker.success = false;
			return undefined;
		}
	}

	export class Car{
		constructor(public parser:Parser, public visible?: bool = true){
		}
	}

	function car(p: Parser): Car{
		return new Car(p, true);
	}
	function ucar(): Car{
		return new Car(p, false);
	}
	function ceof(): Car{
	}

	export class Sequence implements ASTEmitter{
		constructor(...cars: Car[]){
		}
		parse(): any{

		}
	}



	var data = seq("data", pIdentifier, "=", car ]);

	// ["hoge", ]


	// choice(
	//     branch("foo", string("foo")), 
	//     branch("bar", string("bar"))
	// );
	//
	// { "type": "foo", "value": "foo" }
	// { "type": "bar", "value": "bar" }


	*/


}


