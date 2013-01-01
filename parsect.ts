// Parsect (https://github.com/kontan/Parsect)
// @author Kon - http://phyzkit.net/

module Parsect{

	export class Parser{
		constructor(public name:string, public parse:(source:Source)=>State){
		}
	}

	export class State{ 
		constructor(public value:any, public source:Source, private success:bool=true){
		} 
		fail():State{
			return new State(this.value, this.source, false);
		}
		isSuccessed():bool{
			return this.success;
		}
	}

	export class Source{ 
		constructor(public source:string, public position:number){		
		}
		progress(delta:number):Source{
			return new Source(this.source, this.position + delta);
		}
	}

	export function seq(f:(s:(p:Parser)=>any)=>any):Parser{
		return new Parser("seq", (source:Source)=>{
			var currentState:State = new State(undefined, source, true);
			var active:bool = true;
			var s = (p:Parser)=>{
				if(active){
					currentState = p.parse(currentState.source);
					if(currentState.isSuccessed()){
						(<any>s).result = currentState.value.toString().slice(0, 16);
						return currentState.value;
					}else{
						active = false;
					}
				}
				s.success = false;
				return undefined;
			};
			(<any>s).source = source.source.slice(source.position, 16);
			(<any>s).success = true;
			var returnValue = f(s);
			return active ? (returnValue !== undefined ? new State(returnValue, currentState.source, true) : currentState) : new State(undefined, source, false);
		});
	}

	export function series():Parser{
		var ps:Parser[] = <any>arguments;
		return new Parser("series", (source:Source)=>{
			var currentState:State = new State(undefined, source, true);
			var currentState = new State(undefined, source, true);
			for(var i = 0; i < ps.length; i++){
				currentState = ps[i].parse(currentState.source);
				if(currentState.isSuccessed()){
					return currentState.value;
				}else{
					break;
				}
			}
			return currentState.isSuccessed() ? currentState : new State(undefined, source, false);
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
			
			//pattern.lastIndex = s.position;
			//var matches = pattern.exec(s.source.slice(s.position));
			var matches = pattern.exec(s.source.slice(s.position));

			if(matches && matches.length > 0){
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
				if(st.isSuccessed()){
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
				if(st.isSuccessed()){
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
				if(st.isSuccessed()){
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

	export function or(a?:Parser, b?:Parser, c?:Parser, d?:Parser, e?:Parser, f?:Parser, g?:Parser, h?:Parser):Parser{
		var ps:Parser[] = <any>arguments;
		return new Parser("or", (source:Source)=>{
			for(var i = 0; i < ps.length; i++){
				var _st = ps[i].parse(source);
				if(_st.isSuccessed()){
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
			if(_st.isSuccessed()){
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
			if(_st.isSuccessed()){
				return new State(f(_st.value), _st.source, true);
			}else{
				return _st;
			}
		});
	}

	export var number:Parser = map(parseFloat, regexp(/^[-+]?\d+(\.\d+)?/));
	export var spaces:Parser = regexp(/^\w*/);
}

