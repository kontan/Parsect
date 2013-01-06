// Parsect (https://github.com/kontan/Parsect)
// @author Kon - http://phyzkit.net/

module Parsect{

	/////////////////////////////////////////////////////////////////////////////////////////
	// Data
	/////////////////////////////////////////////////////////////////////////////////////////

	export class Parser{
		constructor(public name:string, public parse:(source:Source)=>State){
		}
	}

	export class State{ 
		constructor(public value:any, public source:Source, public success:bool=true, public errorMesssage?:string){
		}
	}

	export class Source{ 
		constructor(public source:string, public position?:number = 0){	
		}
		// Progress the position.
		progress(delta:number):Source{
			return new Source(this.source, this.position + delta);
		}

		success(delta?:number=0, value?:any=undefined):State{
			return new State(value, new Source(this.source, this.position + delta), true);
		}
		fail(message?:string):State{
			return new State(undefined, this, false, message);
		}
		getPosition():Position{
			var lines = this.source.slice(0, this.position).split('\n');
			return { line: lines.length, column: lines[lines.length - 1].length };
		}
		getInput():string{
			return this.source.slice(this.position);
		}
	}

	export interface Position{
		line:number;
		column:number;
	}

	export interface Context{
		(p:Parser):any;
		(s:string):string;
		source():string;	// for debugging
		success():bool;   // for debugging
		result():any;     // for debugging
	}

	///////////////////////////////////////////////////////////////////////////////////
	// Parser Builders
	////////////////////////////////////////////////////////////////////////////////////

	export function string(text:string):Parser{
		return new Parser("string \"" + text + "\"", (s:Source)=>s.source.indexOf(text, s.position) === s.position ? s.success(text.length, text) : s.fail("expected \"" + text + "\""));
	}

	export function regexp(pattern:RegExp):Parser{
		return new Parser("regexp \"" + pattern + "\"", (s:Source)=>{
			var input = s.source.slice(s.position);
			var ms = pattern.exec(input);
			// In javascript' Regex, ^ matches not only the benning of the input but the beginniing of new line.
			//  "input.indexOf(matches[0]) == 0" is needed.
			if(ms && ms.length > 0){
				var m = ms[0];
				return input.indexOf(ms[0]) == 0 ? s.success(m.length, m) : s.fail();
			}else{
				return s.fail();
			}
		});
	}

	export function satisfy(cond:(c:string)=>bool):Parser{
		return new Parser("satisfy", (s:Source)=>{
			var c = s.source[s.position];
			return cond(c) ? s.success(1, c) : s.fail();
		});
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
			s.success = ()=> st.success;
			s.source  = ()=> st.source.source.slice(st.source.position);
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
					return st.source.fail();
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
			return results.length > 0 ? st.source.success(0, results) : st.source.fail();
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
		return new Parser("option", (source:Source)=>{
			var st = p.parse(source);
			return st.success ? st : source.success(0, defaultValue);
		});
	}

	// optional:(p:Parser<T>):Parser<T>
	export function optional(p:Parser):Parser{
		return new Parser("optional", option(undefined, p).parse);
	}

	export function map(f:(v:any)=>any, p:Parser){
		return new Parser("map(" + p.name + ")", (source:Source)=>{
			var st = p.parse(source);
			return st.success ? st.source.success(0, f(st.value)) : st;
		});
	}

	export var sepBy1 = (p:Parser, sep:Parser)=>new Parser("sepBy1", 
		seq((s)=>{
			var x = s(p);
			var xs = s(many(series(sep, p)));
			if(s.success()){
				xs.unshift(x);
				return xs;
			}
		}).parse
	);

	export var sepBy = (p:Parser, sep:Parser)=>new Parser("sepBy", or(sepBy1(p, sep), map(()=>[], empty)).parse);	

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

	export var endBy = (p:Parser, sep:Parser)=>new Parser("endBy", or(endBy1(p, sep), empty).parse);

	// between:(open:Parser, close:Parser, p:Parser)=>Parser
	export var between = (open:Parser, close:Parser, p:Parser)=>seq((s)=>{
		s(open);
		var v = s(p);
		s(close);
		return v;
	});	

	///////////////////////////////////////////////////////////////////////////////////////
	// Build-in Parsees
	/////////////////////////////////////////////////////////////////////////////////////////

	// Primitives
	export var eof:Parser    = new Parser('eof',   (source:Source)=>source.position === source.source.length ? source.success(1) : source.fail());
	export var empty:Parser  = new Parser("empty", (source:Source)=>source.success(0));

	// Charactors
	export var spaces:Parser = regexp(/^\w*/);
	export var lower         = regexp(/^[a-z]/);
	export var upper         = regexp(/^[A-Z]/);
	export var alpha         = regexp(/^[a-zA-Z]/);
	export var digit         = regexp(/^[0-9]/);
	export var alphaNum      = regexp(/^[0-9a-zA-Z]/);

	// Misc
	export var number:Parser; // :Parser<number>
	number = map(parseFloat, regexp(/^[-+]?\d+(\.\d+)?/));
}

