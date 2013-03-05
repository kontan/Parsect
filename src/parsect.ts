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
		constructor(public name:string, private _parse:(source:Source)=>State, public expected?:string){

			// 今のところ動いてるけど、これがあると parse をほかの関数に渡した時に起こる無限再帰を回避できる場合がある
			// this の意味が変わったのが原因？
			//this.parse = (arg)=>{ return (arg instanceof Source) ? _parse(arg) : _parse(new Source(arg)); };
		
		}

		parse(source:Source):State; 
		parse(source:string):State;
		parse(arg:any):State{
			// unused
			return arg instanceof Source ? this._parse(arg) : this._parse(new Source(arg));
		}
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

	export interface Context{
		(p:Parser):any;
		(s:string):string;
		getUserState(): any;
		notFollowedBy:(p:Parser)=>void;
		peek():string;	// for debugging
		success():bool;   // for debugging
		result():any;     // for debugging
	}

	///////////////////////////////////////////////////////////////////////////////////
	// Parser Builders
	////////////////////////////////////////////////////////////////////////////////////

	export function string(text:string):Parser{
		return new Parser(
			"string \"" + text + "\"", 
			(s:Source)=>s.source.indexOf(text, s.position) === s.position ? s.success(text.length, text) : s.fail("expected \"" + text + "\""),
			"\"" + text + "\""
		);
	}

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
	export function seq(f:(s:Context)=>any):Parser{
		return new Parser("seq", (source:Source)=>{
			var st:State = source.success();
			var s:Context = <any>(a:any)=>{
				if(st.success){
					st = (a instanceof Parser ? a : string(a)).parse(st.source);
					if(st.success){ 
						return st.value; 
					}
				}
			};
			s.notFollowedBy = (p:Parser)=>{
				var _st = p.parse(st.source);
				if(_st.success){
					st = st.source.fail('unexpected ' + p.expected);
				}
			};
			s.getUserState = ()=>source.userData;
			s.success = ()=> st.success;
			s.peek  = ()=> st.source.source.slice(st.source.position, st.source.position + 128);
			s.result  = ()=> st.value;
			var r = f(s);
			return s.success() ? (r !== undefined ? st.source.success(0, r) : st) : st;
		});
	}

	// trying:(p:Parser<T>)=>Parser<T>
	export function trying(p:Parser):Parser{
		return new Parser('tring', (source:Source)=>{
			var st = p.parse(source);
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
				var _st = ps[i].parse(st.source);
				if(_st.success){ 
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
				var _st = ps[i].parse(st.source);
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
	export function count(n:number, p:Parser):Parser{
		return new Parser("count " + n, (s:Source)=>{
			var st = s.success();
			var results:any[] = [];
			for(var i = 0; i < n; i++){
				var _st = p.parse(st.source);
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
	export function many(p:Parser):Parser{
		return new Parser("many", (s:Source)=>{
			var st = s.success();
			var results = [];
			for(var i = 0; true; i++){
				var _st = p.parse(st.source);
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
	export function many1(p:Parser):Parser{
		return new Parser("many1", (s:Source)=>{
			var st = s.success();
			var results = [];
			var i = 0;
			for(var i = 0; true; i++){
				var _st = p.parse(st.source);
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
	export function or(...ps:Parser[]):Parser{
		var ps:Parser[] = <any>arguments;
		return new Parser("or", (source:Source)=>{
			for(var i = 0; i < ps.length; i++){
				var st = ps[i].parse(source);
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
	export function option(defaultValue:any, p:Parser):Parser{
		if( ! p){
			throw "Parsect.option: invalid argument: p";
		}
		return new Parser("option", (source:Source)=>{
			var st = p.parse(source);
			return st.success ? st : source.success(0, defaultValue);
		});
	}

	// optional:(p:Parser<T>):Parser<T>
	export function optional(p:Parser):Parser{
		return new Parser("optional", (source:Source)=>option(undefined, p).parse(source));
	}

	export function notFollowedBy(value:any, p:Parser):Parser{
		return new Parser("notFollowedBy " + p.name, (source:Source)=>{
			var st = p.parse(source);
			return st.success ? State.success(source, value) : st.source.fail('not expected ' + p.expected);
		});
	}

	export function map(f:(v:any)=>any, p:Parser){
		return new Parser("map(" + p.name + ")", (source:Source)=>{
			var st = p.parse(source);
			return st.success ? st.source.success(0, f(st.value)) : st;
		});
	}

	export var sepBy1 = (p:Parser, sep:Parser)=>new Parser("sepBy1", (source:Source)=>{
		return seq((s)=>{
			var x = s(p);
			var xs = s(many(series(sep, p)));
			if(s.success()){
				xs.unshift(x);
				return xs;
			}
		}).parse(source);
	});

	export var sepBy = (p:Parser, sep:Parser)=>new Parser("sepBy", (source:Source)=>{
		return or(sepBy1(p, sep), map(()=>[], empty)).parse(source);
	});	

	export var endBy1 = (p:Parser, sep:Parser)=>new Parser("endBy1", (source:Source)=>{
		var q = seq((s)=>{ var x = s(p); s(sep); return x; });
		return seq((s)=>{
			var x = s(q);
			var xs = s(many(q));
			if(s.success()){
				xs.unshift(x);
				return xs;
			} 
		}).parse(source); 
	});

	export var endBy = (p:Parser, sep:Parser)=>new Parser("endBy", (source:Source)=>{
		return or(endBy1(p, sep), empty).parse(source);
	});

	// between:(open:Parser, close:Parser, p:Parser)=>Parser
	export var between = (open:Parser, p:Parser, close:Parser)=>seq((s)=>{
		if( ! (open && p && close) ) throw "Parsect.between: Invalid argument:";
		s(open);
		var v = s(p);
		s(close);
		return v;
	});	

	/////////////////////////////////////////////////////////////////////////////////
	// Applycative-like style utils
	//////////////////////////////////////////////////////////////////////////

	export function apply(func:Function, ...parserSeq:Parser[][]): Parser{
		return new Parser("apply", (source:Source)=>{
			var args:any[] = [];
			var st:State = source.success();
			for(var i = 0; i < parserSeq.length; i++){
				var _st:State = stream(parserSeq[i]).parse(st.source);
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
				var _st:State = stream(parserSeq[i]).parse(st.source);
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
			return f().parse(source);
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
}

