
module Prelude {

    ////////////////////////////////////////////////////////////////////////////////////////////////
    // Function ////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    export interface Func0<                R>{ (                                              ): R; }
    export interface Func1<A,              R>{ (a: A                                          ): R; }
    export interface Func2<A,B,            R>{ (a: A, b: B                                    ): R; }
    export interface Func3<A,B,C,          R>{ (a: A, b: B, c: C                              ): R; }
    export interface Func4<A,B,C,D,        R>{ (a: A, b: B, c: C, d: D                        ): R; }
    export interface Func5<A,B,C,D,E,      R>{ (a: A, b: B, c: C, d: D, e: E                  ): R; }
    export interface Func6<A,B,C,D,E,F,    R>{ (a: A, b: B, c: C, d: D, e: E, f: F            ): R; }        
    export interface Func7<A,B,C,D,E,F,G,  R>{ (a: A, b: B, c: C, d: D, e: E, f: F, g: G      ): R; }
    export interface Func8<A,B,C,D,E,F,G,H,R>{ (a: A, b: B, c: C, d: D, e: E, f: F, g: G, H: H): R; }

    // create curryed function.
    export function curry<A,              R>(f: Func1<A,              R>): Func1<A,                                                                R>       ;
    export function curry<A,B,            R>(f: Func2<A,B,            R>): Func1<A, Func1<B,                                                       R>>      ;
    export function curry<A,B,C,          R>(f: Func3<A,B,C,          R>): Func1<A, Func1<B, Func1<C,                                              R>>>     ;
    export function curry<A,B,C,D,        R>(f: Func4<A,B,C,D,        R>): Func1<A, Func1<B, Func1<C, Func1<D,                                     R>>>>    ;
    export function curry<A,B,C,D,E,      R>(f: Func5<A,B,C,D,E,      R>): Func1<A, Func1<B, Func1<C, Func1<D, Func1<E,                            R>>>>>   ;
    export function curry<A,B,C,D,E,F,    R>(f: Func6<A,B,C,D,E,F,    R>): Func1<A, Func1<B, Func1<C, Func1<D, Func1<E, Func1<F,                   R>>>>>>  ;
    export function curry<A,B,C,D,E,F,G,  R>(f: Func7<A,B,C,D,E,F,G,  R>): Func1<A, Func1<B, Func1<C, Func1<D, Func1<E, Func1<F, Func1<G,          R>>>>>>> ;
    export function curry<A,B,C,D,E,F,G,H,R>(f: Func8<A,B,C,D,E,F,G,H,R>): Func1<A, Func1<B, Func1<C, Func1<D, Func1<E, Func1<F, Func1<G, Func1<H, R>>>>>>>>;
    export function curry(f: any): any{
        //return function _curry(xs){
        //    return xs.length < f.length ? function(x){ return _curry(xs.concat([x])); } : f.apply(undefined, xs);
        //}([]);
        function _curry(xs){
            return xs.length < f.length ? function(x){ return _curry(xs.concat([x])); } : f.apply(undefined, xs);
        }
        return _curry([]);
    }

    export function uncurry<A,              R>(f: Func1<A,                                                                R>       ): Func1<A,              R>;
    export function uncurry<A,B,            R>(f: Func1<A, Func1<B,                                                       R>>      ): Func2<A,B,            R>;
    export function uncurry<A,B,C,          R>(f: Func1<A, Func1<B, Func1<C,                                              R>>>     ): Func3<A,B,C,          R>;
    export function uncurry<A,B,C,D,        R>(f: Func1<A, Func1<B, Func1<C, Func1<D,                                     R>>>>    ): Func4<A,B,C,D,        R>;
    export function uncurry<A,B,C,D,E,      R>(f: Func1<A, Func1<B, Func1<C, Func1<D, Func1<E,                            R>>>>>   ): Func5<A,B,C,D,E,      R>;
    export function uncurry<A,B,C,D,E,F,    R>(f: Func1<A, Func1<B, Func1<C, Func1<D, Func1<E, Func1<F,                   R>>>>>>  ): Func6<A,B,C,D,E,F,    R>;
    export function uncurry<A,B,C,D,E,F,G,  R>(f: Func1<A, Func1<B, Func1<C, Func1<D, Func1<E, Func1<F, Func1<G,          R>>>>>>> ): Func7<A,B,C,D,E,F,G,  R>;
    export function uncurry<A,B,C,D,E,F,G,H,R>(f: Func1<A, Func1<B, Func1<C, Func1<D, Func1<E, Func1<F, Func1<G, Func1<H, R>>>>>>>>): Func8<A,B,C,D,E,F,G,H,R>;
    export function uncurry<A,B,C,D,E,F,G,H,R>(f: any): any {
        throw new Error();
    }

    /// partial application of funtion.
    export function ap<A,              R>(m: Func1<A,              R>, a: A                                          ): Func0<              R>;
    export function ap<A,B,            R>(m: Func2<A,B,            R>, a: A                                          ): Func1<B,            R>;
    export function ap<A,B,C,          R>(m: Func3<A,B,C,          R>, a: A                                          ): Func2<B,C,          R>;
    export function ap<A,B,C,D,        R>(m: Func4<A,B,C,D,        R>, a: A                                          ): Func3<B,C,D,        R>;
    export function ap<A,B,C,D,E,      R>(m: Func5<A,B,C,D,E,      R>, a: A                                          ): Func4<B,C,D,E,      R>;
    export function ap<A,B,C,D,E,F,    R>(m: Func6<A,B,C,D,E,F,    R>, a: A                                          ): Func5<B,C,D,E,F,    R>;
    export function ap<A,B,C,D,E,F,G,  R>(m: Func7<A,B,C,D,E,F,G,  R>, a: A                                          ): Func6<B,C,D,E,F,G,  R>;
    export function ap<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a: A                                          ): Func7<B,C,D,E,F,G,H,R>;
    export function ap<A,B,            R>(m: Func2<A,B,            R>, a: A, b: B                                    ): Func0<              R>;
    export function ap<A,B,C,          R>(m: Func3<A,B,C,          R>, a: A, b: B                                    ): Func1<  C,          R>;
    export function ap<A,B,C,D,        R>(m: Func4<A,B,C,D,        R>, a: A, b: B                                    ): Func2<  C,D,        R>;
    export function ap<A,B,C,D,E,      R>(m: Func5<A,B,C,D,E,      R>, a: A, b: B                                    ): Func3<  C,D,E,      R>;
    export function ap<A,B,C,D,E,F,    R>(m: Func6<A,B,C,D,E,F,    R>, a: A, b: B                                    ): Func4<  C,D,E,F,    R>;
    export function ap<A,B,C,D,E,F,G,  R>(m: Func7<A,B,C,D,E,F,G,  R>, a: A, b: B                                    ): Func5<  C,D,E,F,G,  R>;
    export function ap<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a: A, b: B                                    ): Func6<  C,D,E,F,G,H,R>;
    export function ap<A,B,C,          R>(m: Func3<A,B,C,          R>, a: A, b: B, c: C                              ): Func0<              R>;
    export function ap<A,B,C,D,        R>(m: Func4<A,B,C,D,        R>, a: A, b: B, c: C                              ): Func1<    D,        R>;
    export function ap<A,B,C,D,E,      R>(m: Func5<A,B,C,D,E,      R>, a: A, b: B, c: C                              ): Func2<    D,E,      R>;
    export function ap<A,B,C,D,E,F,    R>(m: Func6<A,B,C,D,E,F,    R>, a: A, b: B, c: C                              ): Func3<    D,E,F,    R>;
    export function ap<A,B,C,D,E,F,G,  R>(m: Func7<A,B,C,D,E,F,G,  R>, a: A, b: B, c: C                              ): Func4<    D,E,F,G,  R>;
    export function ap<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a: A, b: B, c: C                              ): Func5<    D,E,F,G,H,R>;    
    export function ap<A,B,C,D,        R>(m: Func4<A,B,C,D,        R>, a: A, b: B, c: C, d: D                        ): Func0<              R>;
    export function ap<A,B,C,D,E,      R>(m: Func5<A,B,C,D,E,      R>, a: A, b: B, c: C, d: D                        ): Func1<      E,      R>;
    export function ap<A,B,C,D,E,F,    R>(m: Func6<A,B,C,D,E,F,    R>, a: A, b: B, c: C, d: D                        ): Func2<      E,F,    R>;
    export function ap<A,B,C,D,E,F,G,  R>(m: Func7<A,B,C,D,E,F,G,  R>, a: A, b: B, c: C, d: D                        ): Func3<      E,F,G,  R>;
    export function ap<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a: A, b: B, c: C, d: D                        ): Func4<      E,F,G,H,R>; 
    export function ap<A,B,C,D,E,      R>(m: Func5<A,B,C,D,E,      R>, a: A, b: B, c: C, d: D, e: E                  ): Func0<              R>;
    export function ap<A,B,C,D,E,F,    R>(m: Func6<A,B,C,D,E,F,    R>, a: A, b: B, c: C, d: D, e: E                  ): Func1<        F,    R>;
    export function ap<A,B,C,D,E,F,G,  R>(m: Func7<A,B,C,D,E,F,G,  R>, a: A, b: B, c: C, d: D, e: E                  ): Func2<        F,G,  R>;
    export function ap<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a: A, b: B, c: C, d: D, e: E                  ): Func3<        F,G,H,R>;     
    export function ap<A,B,C,D,E,F,    R>(m: Func6<A,B,C,D,E,F,    R>, a: A, b: B, c: C, d: D, e: E, f: F            ): Func0<              R>;
    export function ap<A,B,C,D,E,F,G,  R>(m: Func7<A,B,C,D,E,F,G,  R>, a: A, b: B, c: C, d: D, e: E, f: F            ): Func1<          G,  R>;
    export function ap<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a: A, b: B, c: C, d: D, e: E, f: F            ): Func2<          G,H,R>;
    export function ap<A,B,C,D,E,F,G,  R>(m: Func7<A,B,C,D,E,F,G,  R>, a: A, b: B, c: C, d: D, e: E, f: F, g: G      ): Func0<              R>;
    export function ap<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a: A, b: B, c: C, d: D, e: E, f: F, g: G      ): Func1<            H,R>;    
    export function ap<A,B,C,D,E,F,G,H,R>(m: Func8<A,B,C,D,E,F,G,H,R>, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H): Func0<              R>;    
    export function ap(m: any, ...args: any[]): any{
        switch(m.length - args.length){
            case 0: return function(             ){ m.apply(this, args                        ); };
            case 1: return function(a            ){ m.apply(this, args.concat([a            ])); };
            case 2: return function(a,b          ){ m.apply(this, args.concat([a,b          ])); };
            case 3: return function(a,b,c        ){ m.apply(this, args.concat([a,b,c        ])); };
            case 4: return function(a,b,c,d      ){ m.apply(this, args.concat([a,b,c,d      ])); };            
            case 5: return function(a,b,c,d,e    ){ m.apply(this, args.concat([a,b,c,d,e    ])); };            
            case 6: return function(a,b,c,d,e,f  ){ m.apply(this, args.concat([a,b,c,d,e,f  ])); };
            case 7: return function(a,b,c,d,e,f,g){ m.apply(this, args.concat([a,b,c,d,e,f,g])); };
            default: new Error();
        }
    }

    /// Function composition
    export function dot<A,B,R>(f: Func1<B,R>, g: Func1<A,B>): Func1<A,R> {
        return function(x){ return f(g(x)); };
    }

    // identity function
    export function id<T>(v: T): T {
        return v;
    }

    // constant function
    export function constant<T,S>(v: T, s: S): T;
    export function constant<T,S>(v: T): Func1<S,T>;
    export function constant<T,S>(v: T, s?: S): any {
        if(arguments.length <= 1){
            return function(s: S){ return v; };
        }else{
            return v;
        }
    }

    export function flip<A,B,R>(f: Func2<A,B,R>): Func2<B,A,R> {
        return function(b: B, a: A){ return f(a, b); };
    }

    /////////////////////////////////////////////////////////////////////////////////////////////
    // Tuple ////////////////////////////////////////////////////////////////////////////////////
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
    // List /////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////

    export function foldl<T>(mprod: Func2<T,T,T>, x: T, xs: T[]): T {
        for(var i = 0; i < xs.length; i++){
            x = mprod(x, xs[i]);
        }
        return x;
    }

    export function foldl1<T>(mprod: Func2<T,T,T>, xs: T[]): T {
        var x = xs[0];
        for(var i = 1; i < xs.length; i++){
            x = mprod(x, xs[i]);
        }
        return x;
    }

    export function foldr<T>(mprod: Func2<T,T,T>, x: T, xs: T[]): T {
        for(var i = xs.length - 1; i >= 0; i--){
            x = mprod(xs[i], x);
        }
        return x;
    }

    export function foldr1<T>(mprod: Func2<T,T,T>, xs: T[]): T {
        var x = xs[xs.length - 1];
        for(var i = xs.length - 2; i >= 0; i--){
            x = mprod(xs[i], x);
        }
        return x;
    }

    export function and(xs: boolean[]): bool {
        var x: boolean = true;
        for(var i = 0; i < xs.length; i++){
            x = x && xs[i];
        }
        return x;
    }

    export function or(xs: boolean[]): bool {
        var x = false;
        for(var i = 0; i < xs.length; i++){
            x = x || xs[i];
        }
        return x;
    }

    export function sum(xs: number[]): number {
        var x = 0;
        for(var i = 0; i < xs.length; i++){
            x += xs[i];
        }
        return x;
    }

    export function product(xs: number[]): number {
        var x = 1;
        for(var i = 0; i < xs.length; i++){
            x *= xs[i];
        }
        return x;
    }    

    export function maximun(xs: number[]): number {
        var x = Number.MIN_VALUE;
        for(var i = 0; i < xs.length; i++){
            x = Math.max(x, xs[i]);
        }
        return x;
    } 

    export function minimum(xs: number[]): number {
        var x = Number.MAX_VALUE;
        for(var i = 0; i < xs.length; i++){
            x = Math.min(x, xs[i]);
        }
        return x;
    }

    export function head<T>(xs: T[]): T {
        return xs[0];
    }

    export function tail<T>(xs: T[]): T[] {
        return xs.slice(1);
    }

    export function last<T>(xs: T[]): T {
        return xs[xs.length - 1];
    }

    export function take<T>(n: number, xs: T[]): T[] {
        return xs.slice(0, n);
    }

    export function drop<T>(n: number, xs: T[]): T[] {
        return xs.slice(n);
    }

    export function splitAt<T>(n: number, xs: T[]): Tuple2<T[],T[]> {
        return new Tuple2<T[],T[]>(take(n, xs), drop(n, xs));
    }

    export function takeWhile<T>(f: Func1<T,boolean>, xs: T[]): T[] {
        for(var i = 0; i < xs.length; i++){
            if( ! f(xs[i])){
                return xs.slice(0, i);
            }
        }
        return xs;
    }

    export function dropWhile<T>(f: Func1<T,boolean>, xs: T[]): T[] {
        for(var i = 0; i < xs.length; i++){
            if( ! f(xs[i])){
                return xs.slice(i);
            }
        }
        return [];
    }

    export function span<T>(f: Func1<T,boolean>, xs: T[]): Tuple2<T[],T[]> {
        for(var i = 0; i < xs.length; i++){
            if( ! f(xs[i])){
                return new Tuple2<T[],T[]>(xs.slice(0,i), xs.slice(i));
            }
        }
        return new Tuple2<T[],T[]>([], xs);
    }

    // 
    export function broken<T>(f: Func1<T,boolean>, xs: T[]): Tuple2<T[],T[]> {
        for(var i = 0; i < xs.length; i++){
            if(f(xs[i])){
                return new Tuple2<T[],T[]>(xs.slice(0,i), xs.slice(i));
            }
        }
        return new Tuple2<T[],T[]>(xs, []);
    }

    export function elem<T>(x: T, xs: T[], f: Func2<T,T,boolean>): boolean {
        for(var i = 0; i < xs.length; i++){
            if(f(x, xs[i])){
                return true;
            }
        }
        return false;
    }

    export function notElem<T>(x: T, xs: T[], f: Func2<T,T,boolean>): boolean {
        for(var i = 0; i < xs.length; i++){
            if(f(x, xs[i])){
                return false;
            }
        }
        return true;
    }


    //////////////////////////////////////////////////////////////////////////////////////////////
    // Zip ///////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////

    export function zip<X,Y>(xs: X[], ys: Y[]): Tuple2<X,Y>[] {
        var ts: Tuple2<X,Y>[] = [];
        var length = Math.min(xs.length, ys.length);
        for(var i = 0; i < length; i++){
            ts.push(new Tuple2<X,Y>(xs[i], ys[i]));
        }
        return ts;
    }

    export function zip3<X,Y,Z>(xs: X[], ys: Y[], zs: Z[]): Tuple3<X,Y,Z>[] {
        var ts: Tuple3<X,Y,Z>[] = [];
        var length = Math.min(Math.min(xs.length, ys.length), zs.length);
        for(var i = 0; i < length; i++){
            ts.push(new Tuple3<X,Y,Z>(xs[i], ys[i], zs[i]));
        }
        return ts;
    }

    export function zipWith<X,Y,R>(f: Func2<X,Y,R>, xs: X[], ys: Y[]): R[] {
        var ts: R[] = [];
        var length = Math.min(xs.length, ys.length);
        for(var i = 0; i < length; i++){
            ts.push(f(xs[i], ys[i]));
        }
        return ts;
    }

    export function zipWith3<X,Y,Z,R>(f: Func3<X,Y,Z,R>, xs: X[], ys: Y[], zs: Z[]): R[] {
        var ts: R[] = [];
        var length = Math.min(Math.min(xs.length, ys.length), zs.length);
        for(var i = 0; i < length; i++){
            ts.push(f(xs[i], ys[i], zs[i]));
        }
        return ts;
    }

    export function unzip<X,Y>(ts: Tuple2<X,Y>[]): Tuple2<X[],Y[]> {
        var xs: X[] = [];
        var ys: Y[] = [];
        for(var i = 0; i < ts.length; i++){

            //var x: Tuple2<X,Y> = xs[i];
            var x: any = ts[i];
            
            xs.push(x.a);
            ys.push(x.b);
        }
        return new Tuple2<X[],Y[]>(xs, ys);
    }

    export function unzip3<X,Y,Z>(ts: Tuple3<X,Y,Z>[]): Tuple3<X[],Y[],Z[]> {
        var xs: X[] = [];
        var ys: Y[] = [];
        var zs: Z[] = [];
        for(var i = 0; i < ts.length; i++){
            //var x: Tuple3<X,Y,Z> = ts[i];
            var x: any = xs[i];
            
            xs.push(x.a);
            ys.push(x.b);
            zs.push(x.c);
        }
        return new Tuple3<X[],Y[], Z[]>(xs, ys, zs);
    }

    /////////////////////////////////////////////////////////////////////////////////////////////
    // String ///////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////

    export function lines(x: string): string[] {
        return x.split('\n');
    }

    export function words(x: string): string[] {
        return x.split(/\w+/);
    }

    export function unlines(xs: string[]): string {
        return xs.join('\n');
    }

    export function unwords(xs: string[]): string {
        return xs.join(' ');
    }

    ///////////////////////////////////////////////////////////////////////////////////////////
    // Show ///////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////

    export interface Show{
        show(): string;
    }

    export interface Read<T>{
        (x: string): T;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////
    // IO //////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////

    var buffer: string[] = [];

    export function putStr(x: string): void {
        buffer.push(x);
    }

    export function putStrLn(x?: string): void {
        if(x){
            buffer.push(x);
        }
        console.log(buffer.join(''));
        buffer = [];
    }

    export function print<T extends Show>(x?: T): void {
        if(x){
            buffer.push(x.show());
        }
        console.log(buffer.join(''));
        buffer = [];
    }

    ///////////////////////////////////////////////////////////////////////////////////////////
    // number /////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////

    export function even(x: number): boolean {
        return x % 2 == 0;
    }

    export function odd(x: number): boolean {
        return x % 2 == 1;
    }

    export function gcd(x: number, y: number): number {
        var m = Math.floor(Math.max(x, y));
        var n = Math.floor(Math.min(x, y));
        while(n === 0){
            var _n = n;
            n = m % n;
            m = _n;
        }
        return m;
    }

    export function lcm(x: number, y: number): number {
        return Math.floor(x) * Math.floor(y) / gcd(x, y);
    }
}

