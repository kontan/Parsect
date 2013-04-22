
module Prelude {

	////////////////////////////////////////////////////////////////////////////////////////////
	// Data.Tuple
	/////////////////////////////////////////////////////////////////////////////////////////////

	export enum Void { }

	export class Tuple2<A,B            > { constructor(public a: A, public b: B                                                                              ){ } get fst(): A{ return this.a; } get snd(): B{ return this.b; } }
	export class Tuple3<A,B,C          > { constructor(public a: A, public b: B, public c: C                                                                 ){ }}
	export class Tuple4<A,B,C,D        > { constructor(public a: A, public b: B, public c: C, public d: D                                                    ){ }}
	export class Tuple5<A,B,C,D,E      > { constructor(public a: A, public b: B, public c: C, public d: D, public e: E                                       ){ }}
	export class Tuple6<A,B,C,D,E,F    > { constructor(public a: A, public b: B, public c: C, public d: D, public e: E, public f: F                          ){ }}	
	export class Tuple7<A,B,C,D,E,F,G  > { constructor(public a: A, public b: B, public c: C, public d: D, public e: E, public f: F, public g: G             ){ }}
	export class Tuple8<A,B,C,D,E,F,G,H> { constructor(public a: A, public b: B, public c: C, public d: D, public e: E, public f: F, public g: G, public h: H){ }}	

	export function fst<A,B>(t: Tuple2<A,B>): A{
		return t.a;
	}
	export function snd<A,B>(t: Tuple2<A,B>): B{
		return t.b;
	}

	/////////////////////////////////////////////////////////////////////////////////////////////
	// Data.Function
	////////////////////////////////////////////////////////////////////////////////////////////////

	interface Func0<                R>{ (                                              ): R; }
	interface Func1<A,              R>{ (a: A                                          ): R; }
	interface Func2<A,B,            R>{ (a: A, b: B                                    ): R; }
	interface Func3<A,B,C,          R>{ (a: A, b: B, c: C                              ): R; }
	interface Func4<A,B,C,D,        R>{ (a: A, b: B, c: C, d: D                        ): R; }
	interface Func5<A,B,C,D,E,      R>{ (a: A, b: B, c: C, d: D, e: E                  ): R; }
	interface Func6<A,B,C,D,E,F,    R>{ (a: A, b: B, c: C, d: D, e: E, f: F            ): R; }		
	interface Func7<A,B,C,D,E,F,G,  R>{ (a: A, b: B, c: C, d: D, e: E, f: F, g: G      ): R; }
	interface Func8<A,B,C,D,E,F,G,H,R>{ (a: A, b: B, c: C, d: D, e: E, f: F, g: G, H: H): R; }

	/**
	 * partial application
	 */
	export function $<A,              R>(m: Func1<A,              R>, a:A                                   ): Func0<              R>;
	export function $<A,B,            R>(m: Func2<A,B,            R>, a:A                                   ): Func1<B,            R>;
	export function $<A,B,            R>(m: Func2<A,B,            R>, a:A, b:B                              ): Func0<              R>;
	export function $<A,B,C,          R>(m: Func3<A,B,C,          R>, a:A                                   ): Func2<B,C,          R>;
	export function $<A,B,C,          R>(m: Func3<A,B,C,          R>, a:A, b:B                              ): Func1<  C,          R>;
	export function $<A,B,C,          R>(m: Func3<A,B,C,          R>, a:A, b:B, c:C                         ): Func0<              R>;	
	export function $<A,B,C,D,        R>(m: Func4<A,B,C,D,        R>, a:A                                   ): Func3<B,C,D,        R>;
	export function $<A,B,C,D,        R>(m: Func4<A,B,C,D,        R>, a:A, b:B                              ): Func2<  C,D,        R>;
	export function $<A,B,C,D,        R>(m: Func4<A,B,C,D,        R>, a:A, b:B, c:C                         ): Func1<    D,        R>;
	export function $<A,B,C,D,        R>(m: Func4<A,B,C,D,        R>, a:A, b:B, c:C, d:D                    ): Func0<              R>;		
	export function $<A,B,C,D,E,      R>(m: Func5<A,B,C,D,E,      R>, a:A                                   ): Func4<B,C,D,E,      R>;
	export function $<A,B,C,D,E,      R>(m: Func5<A,B,C,D,E,      R>, a:A, b:B                              ): Func3<  C,D,E,      R>;
	export function $<A,B,C,D,E,      R>(m: Func5<A,B,C,D,E,      R>, a:A, b:B, c:C                         ): Func2<    D,E,      R>;
	export function $<A,B,C,D,E,      R>(m: Func5<A,B,C,D,E,      R>, a:A, b:B, c:C, d:D                    ): Func1<      E,      R>;
	export function $<A,B,C,D,E,      R>(m: Func5<A,B,C,D,E,      R>, a:A, b:B, c:C, d:D, e:E               ): Func0<              R>;			
	export function $<A,B,C,D,E,F,    R>(m: Func6<A,B,C,D,E,F,    R>, a:A                                   ): Func5<B,C,D,E,F,    R>;
	export function $<A,B,C,D,E,F,    R>(m: Func6<A,B,C,D,E,F,    R>, a:A, b:B                              ): Func4<  C,D,E,F,    R>;
	export function $<A,B,C,D,E,F,    R>(m: Func6<A,B,C,D,E,F,    R>, a:A, b:B, c:C                         ): Func3<    D,E,F,    R>;
	export function $<A,B,C,D,E,F,    R>(m: Func6<A,B,C,D,E,F,    R>, a:A, b:B, c:C, d:D                    ): Func2<      E,F,    R>;
	export function $<A,B,C,D,E,F,    R>(m: Func6<A,B,C,D,E,F,    R>, a:A, b:B, c:C, d:D, e:E               ): Func1<        F,    R>;	
	export function $<A,B,C,D,E,F,    R>(m: Func6<A,B,C,D,E,F,    R>, a:A, b:B, c:C, d:D, e:E, f: F         ): Func0<              R>;
	export function $<A,B,C,D,E,F,G,  R>(m: Func7<A,B,C,D,E,F,G,  R>, a:A                                   ): Func6<B,C,D,E,F,G,  R>;
	export function $<A,B,C,D,E,F,G,  R>(m: Func7<A,B,C,D,E,F,G,  R>, a:A, b:B                              ): Func5<  C,D,E,F,G,  R>;
	export function $<A,B,C,D,E,F,G,  R>(m: Func7<A,B,C,D,E,F,G,  R>, a:A, b:B, c:C                         ): Func4<    D,E,F,G,  R>;
	export function $<A,B,C,D,E,F,G,  R>(m: Func7<A,B,C,D,E,F,G,  R>, a:A, b:B, c:C, d:D                    ): Func3<      E,F,G,  R>;
	export function $<A,B,C,D,E,F,G,  R>(m: Func7<A,B,C,D,E,F,G,  R>, a:A, b:B, c:C, d:D, e:E               ): Func2<        F,G,  R>;
	export function $<A,B,C,D,E,F,G,  R>(m: Func7<A,B,C,D,E,F,G,  R>, a:A, b:B, c:C, d:D, e:E, f:F          ): Func1<          G,  R>;
	export function $<A,B,C,D,E,F,G,  R>(m: Func7<A,B,C,D,E,F,G,  R>, a:A, b:B, c:C, d:D, e:E, f:F, g:G     ): Func0<              R>;
	export function $<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a:A                                   ): Func7<B,C,D,E,F,G,H,R>;
	export function $<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a:A, b:B                              ): Func6<  C,D,E,F,G,H,R>;
	export function $<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a:A, b:B, c:C                         ): Func5<    D,E,F,G,H,R>;
	export function $<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a:A, b:B, c:C, d:D                    ): Func4<      E,F,G,H,R>;
	export function $<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a:A, b:B, c:C, d:D, e:E               ): Func3<        F,G,H,R>;
	export function $<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a:A, b:B, c:C, d:D, e:E, f:F          ): Func2<          G,H,R>;
	export function $<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a:A, b:B, c:C, d:D, e:E, f:F, g:G     ): Func1<            H,R>;
	export function $<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a:A, b:B, c:C, d:D, e:E, f:F, g:G, h:H): Func0<              R>;
	export function $(m: any, ...args:any[]): any {
		return function(){
			return m.apply(this, args.slice(0).concat(arguments));
		};
	}

	//////////////////////////////////////////////////////////////
	// List
	///////////////////////////////////////////////////////////////

	interface Monoid<T>{
		mprod(t: T): T;
	}

	export class List<T> {
		private elements: T[];
		constructor(elements:T[]){
			this.elements = elements;
		}
		get length(): number {
			return this.elements.length;
		}
		get head(): T {
			return this.elements[0];
		}
		get tail(): List<T> {
			return new List<T>(this.elements.slice(1));
		}
		at(index: number): T {
			return this.elements[index];
		}
		show(): string {
			return "";
		}
	}

	export function foldr<T extends Monoid<T>>(list: List<T>): T{
		return list.head.mprod(foldr(list.tail));
	}
}