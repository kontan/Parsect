// Parsect (https://github.com/kontan/Parsect)
// @author Kon - http://phyzkit.net/

module Parsect{

	export class Parser{
		constructor(public name:string, public parse:(source:Source)=>State){
		}
	}

	export class State{ 
		constructor(public value:any, public source:Source, public success:bool=true){
		} 
		fail():State{
			return new State(this.value, this.source, false);
		}
	}

	export class Source{ 
		constructor(public source:string, public position?:number = 0){		
		}
		progress(delta:number):Source{
			return new Source(this.source, this.position + delta);
		}
	}

	interface Context{
		(p:Parser):any;
		(s:string):string;
		source:string;	// for debugging
		success:bool;   // for debugging
		result:any;     // for debugging
	}


	// seq :: ((Parser a -> a) -> b) -> Parser b
	export function seq(f:(s:Context)=>any):Parser{
		return new Parser("seq", (source:Source)=>{
			var currentState:State = new State(undefined, source, true);
			var active:bool = true;
			var s:Context = <any>(a:any)=>{
				var p:Parser = a instanceof Parser ? a : string(a);
				if(active){
					currentState = p.parse(currentState.source);
					if(currentState.success){
						s.result = currentState.value === undefined ? "<undefined>"
						         : currentState.value === null      ? "<null>"
						         : currentState.value.toString().slice(0, 16);
						s.source = currentState.source.source.slice(currentState.source.position, currentState.source.position + 64);        
						return currentState.value;
					}
				}
				active = false;
				s.success = false;
				return undefined;
			};
			s.source = source.source.slice(source.position, source.position + 64);
			s.success = true;
			var returnValue = f(s);
			return active ? (returnValue !== undefined ? new State(returnValue, currentState.source, true) : currentState) : new State(undefined, source, false);
		});
	}

	export function series():Parser{
		var ps:Parser[] = <any>arguments;
		return new Parser("series", (source:Source)=>{
			var currentState:State = new State(undefined, source, true);
			for(var i = 0; i < ps.length; i++){
				currentState = ps[i].parse(currentState.source);
				if(currentState.success){
				}else{
					break;
				}
			}
			return currentState.success ? currentState : new State(undefined, source, false);
		});
	}

	export function string(text:string):Parser{
		return new Parser("string \"" + text + "\"", (s:Source)=>{
			if(s.source.indexOf(text, s.position) === s.position){
				return new State(text, s.progress(text.length));
			}else{
				return new State(undefined, s, false);
			}
		});
	}

	export function regexp(pattern:RegExp):Parser{
		return new Parser("regexp \"" + pattern + "\"", (s:Source)=>{
			var input = s.source.slice(s.position);
			var matches = pattern.exec(input);
			// In javascript' Regex, ^ matches not only the benning of the input but the beginniing of new line.
			//  "input.indexOf(matches[0]) == 0" is needed.
			if(matches && matches.length > 0 && input.indexOf(matches[0]) == 0){
				var matched = matches[0];
				return new State(matched, s.progress(matched.length));
			}else{
				return new State(undefined, s, false);
			}
		});
	}

	export function ret(f:()=>any):Parser{
		return new Parser("ret", (s:Source)=>{
			return new State(f(), s);
		});
	}

	export function count(n:number, p:Parser):Parser{
		return new Parser("count " + n, (s:Source)=>{
			var st = new State(undefined, s, true);
			var results = [];
			for(var i = 0; i < n; i++){
				st = p.parse(st.source);
				if(st.success){
					results.push(st.value);
				}else{
					return new State(undefined, s, false);
				}
			}
			return new State(results, st.source, true);
		});
	}

	export function many(p:Parser):Parser{
		return new Parser("many", (s:Source)=>{
			var st = new State(undefined, s, true);
			var results = [];
			for(var i = 0; true; i++){
				st = p.parse(st.source);
				if(st.success){
					results.push(st.value);
				}else{
					break;
				}
			}
			return new State(results, st.source, true);
		});
	}

	export function many1(p:Parser):Parser{
		return new Parser("many1", (s:Source)=>{
			var st = new State(undefined, s, true);
			var results = [];
			var i = 0;
			for(; true; i++){
				st = p.parse(st.source);
				if(st.success){
					results.push(st.value);
				}else{
					break;
				}
			}
			if(i == 0){
				return new State(undefined, s, false);
			}else{
				return new State(results, st.source, true);			
			}
		});
	}

	export function or(...ps:Parser[]):Parser{
		var ps:Parser[] = <any>arguments;
		return new Parser("or", (source:Source)=>{
			for(var i = 0; i < ps.length; i++){
				var _st = ps[i].parse(source);
				if(_st.success){
					return _st;
				}
			}
			return new State(undefined, source, false);
		});
	}


	export function satisfy(cond:(c)=>bool):Parser{
		return new Parser("cond", (source:Source)=>{
			var c = source.source[source.position];
			if(cond(c)){
				return new State(c, source.progress(1), true);
			}else{
				return new State(undefined, source, false);
			}
		});
	}

	export function option(defaultValue:any, p:Parser):Parser{
		return new Parser("option", (source:Source)=>{
			var _st = p.parse(source);
			if(_st.success){
				return _st;
			}else{
				return new State(defaultValue, source, true);
			}
		});
	}

	export function optional(p:Parser):Parser{
		return new Parser("optional", option(undefined, p).parse);
	}

	export function map(f:(v:any)=>any, p:Parser){
		return new Parser("map(" + p.name + ")", (source:Source)=>{
			var _st = p.parse(source);
			if(_st.success){
				return new State(f(_st.value), _st.source, true);
			}else{
				return _st;
			}
		});
	}

	export var sepBy1 = (p:Parser, sep:Parser)=>new Parser("sepBy1", 
		seq((s)=>{
			var x = s(p);
			var xs = s(many(series(sep, p)));
			if(xs){
				xs.unshift(x);
				return xs;
			}
		}).parse
	);

	export var empty = new Parser("empty", (source:Source)=>new State(undefined, source, true));

	export var sepBy = (p:Parser, sep:Parser)=>new Parser("sepBy", or(sepBy1(p, sep), map(()=>[], empty)).parse);	

	export var endBy1 = (p:Parser, sep:Parser)=>new Parser("endBy1", (source:Source)=>{
		var q = seq((s)=>{ var x = s(p); s(sep); return x; });
		return seq((s)=>{
			var x = s(q);
			var xs = s(many(q));
			if(x){
				xs.unshift(x);
				return xs;
			} 
		}); 
	});

	export var endBy = (p:Parser, sep:Parser)=>new Parser("endBy", or(endBy1(p, sep), empty).parse);	

	export var number:Parser = map(parseFloat, regexp(/^[-+]?\d+(\.\d+)?/));
	export var spaces:Parser = regexp(/^\w*/);
}

