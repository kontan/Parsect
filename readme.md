# Parsect : Parser Combinator for JavaScript/TypeScript

## Abstract

**Parsect** is a parser combinator library for [TypeScript](http://www.typescriptlang.org/) or JavaScript. It provides a easy way to write a readable parser in only TypeScript/JavaScript without any other domain-specific languages like yacc/lex, ANTLR or PEG.js. Parsect can be used from not only TypeScript and JavaScript but also other [AltJS](http://altjs.org/)s.

I got the idea for Parsect from [Parsec](http://www.haskell.org/haskellwiki/Parsec) parser combinator library in Haskell, however this is not a porting of Parsec. Unfortunately, this library doesn't have underlying Monad or Fanctor and it doesn't deal a string as a list of character. However, you can combine parsers in the same manner as Parsec with Parsect. 

* Parsec-like API
* Statically typed: The API of Parsect is statically typed like Parsec with TypeScript. However, you can also use it from JavaScript as dynamically typed API.
* *do-notation* like syntax: Parsect has Haskell's do-notation-like notation style. This notation makes a parser more readable. 
* Functional Programming API: Most of functions are referential transparent. It means you don't need to consider states of your parsers. 
* Easy debugging: You can set a breakpoint in the middle of your parser and watch that the parser consumes the input step-by-step.　 
* Exitra parsers: Regular expression parser also is supported. You can combine RegExp parsers with other parsers. 
* Token parser builder: `makeTokenParser` function is supported.
* Expression parser builder: `buildExpressionParser` function is supported.



## Getting Started

### `string` Parser Constructor

Parsect has some functions that creates a parser. `string` function is one of them. `string` take a string and return new parser. This parser parses the string and return it as a raw result value. For example, if you want to parse a string "apple", use *string* function as follows:

    var parser: Parsect.Parser<string> = Parsect.string("apple");
    var state: Parsect.State<void> = Parsect.state("apple, grape, banana", 0);
    var reply: Parsect.Reply<string,void> = Parsect.parse(parser, state);
    console.log(reply.value);   // prints "apple".

Note a difference from `string` in Parsec. If the parser recieve a unexpected input string like `"application"`, the parser would consume no characters and fail. The both two words have first four letter `"appl"` but the parser don't throw a exception and parsing would continue to search other matchings. 

### `many` Parser Combinator

Combinator is a function takes parsers as a parameter and returns new parser. **many** combinator create a parser parses infinitely repeat of a string pattern. *many* function takes a parser and return new parser. For example, the following parser comsumes a string like "abcabcabcabc...":

    Parsect.many(Parsect.string("abc"))

### `seq` Parser Combinator

`seq` combinator provides **do notaion** like notaion for Parsect. `seq` function take a other function for parameter. The parameter function is called back when the *seq* parses a string. The parameter function recieves a other function as a parameter. Typically, *seq* function is used as: 

    var parser: Parsect.Parser<number> = Parsect.seq((s: Parsect.Context<void>): number => {
        s(string("("));
        var v: number = s(number);
        s(string(")"));
        return v;
    });

This parser parses a numeric string between parenses. The argument `s` is a function takes a parser and execute it. A return value of `s(number)` is not a `Parsect.State` object but a **raw value** of result of parsing. So, the variable `v` would be bounded a `string` object. When `p` parses a string `"(100)"`, `v` is `100`. 

If a parser applied to `s` failed, all following parsers would be ignore. 

When the parsing succeeded, `seq` returns a State object contains the value returned from the parameter function. Otherwise, the `value` property of the state object is `undefined`, regardless of the parameter function returns any value.

If calculation for the result value is costly, you should call *success()* function and avoid the calculation as follows:

    var parser: Parsect.Parser<number> = Parsect.seq((s: Parsect.Context<void>)=>{
        s(string("("));
        var v: number = s(number);
        s(string(")"));
        return s.success && very_very_large_operation(v);
    });

### `or` combinator

`or` combinator takes some parsers as parameter and try parsing in sequence. If one of them could parse the input, the State object would be returned. For example, the following parser will consume any combination of "a" or "b":

    Parsect.many(Parsect.or(Parsect.string("a"), Parsect.string("b")));












## Common Pitfall


### Left Recursion

(TODO: Left Recursion)



### Definition Ordering and lazy parser

(TODO: Definition Ordering)




### Predictive Parsers

Here are two parsers. `pa` parses `"[a]"` and `pb` parses `"[b]"`. A parser `or(pa, pb)` fails to parse `"[b]"`.

    var pa = Parsect.between(Parsect.string('['), Parsect.string('a'), Parsect.string(']'));
    var pb = Parsect.between(Parsect.string('['), Parsect.string('b'), Parsect.string(']'));
    var parser = Parsect.or(pa, pb);

    var state = Parsect.state("(b)", 0);
    var reply = Parsect.parse(parser, state);
    console.log(reply.success);                 // prints "false"!

It's because `pa` consumes `"["` even if whole of `pa` failed. Generally, commonalizing `"["` of both of parsers is the best way. 

    var pa = Parsect.series(Parsect.string('a'), Parsect.string(']'));
    var pb = Parsect.series(Parsect.string('b'), Parsect.string(']'));
    var parser  = Parsect.seq(s=>{
        s(string('['));
        return s(Parsect.or(pa, pb));
    });

    var state = Parsect.state("(b)", 0);
    var reply = Parsect.parse(parser, state);
    console.log(reply.success);                 // prints "true"!

However, if commonalizing is difficult, you can use `triable` combinator to solve it. `triable` parser can retrieve overconsumed strings.

    var pa = Parsect.between(Parsect.string('['), Parsect.string('a'), Parsect.string(']'));
    var pb = Parsect.between(Parsect.string('['), Parsect.string('b'), Parsect.string(']'));
    var parser = Parsect.or(Parsect.triable(pa), pb);

    var state = Parsect.state("(b)", 0);
    var reply = Parsect.parse(parser, state);
    console.log(reply.success);                 // prints "true"!








## APIs

### Date Types

----

#### `class State` 

##### Type Variables

* `U` User state.

##### Constructors

* `state(source: string, position: number = 0, userState?: U): State<U>`

##### Members

* `source: string` Source string.
* `position: number` Current position.
* `getRowColumn(): { raw: number; column: number; }` Calculate raw number and column number from current position. Those values are ZERO-BASED.
* `seek(delta: number): State<U>` Creates new State object that has new position.
* `equals(src: State<U>): boolean` Compare two state objects.

----

#### `class Reply` 

    class Reply<A,U>

##### Type Variables

* `A` Semantic value.
* `U` User state.

##### Constructors

* `ok<A,U>(state: State<U>, value: A): Reply<A,U>`
* `error<A,U>(state: State<U>, expected?: ()=> string): Reply<A,U>`

##### Members

* `state: State<U>` State after the parsing.
* `success: boolean` Succeed or failed.
* `value: A` The semantic value. 
* `expected: ()=> string` 
* `equals(st: Reply<A,U>): boolean`

----

#### `interface Context`

##### Type Variables 

* `U` User state.

##### Members

* `<T>(p: Parser<T>): T`
* `userState: U` (read/write) Current user state.
* `peek: string` (For debugging) Current input string.
* `success: boolean` (For debugging) Success or fail.

----

#### `parse<A,U>(parser: Parser<A>, state: State<U>): Reply<A,U>`

Invoke parser with the state.

    // parser parses "abc" between "[" and "]".
    var parser: Parsect.State<string> = Parsect.between(
        Parsect.string("["),
        Parsect.string("abc"),
        Parsect.string("]")
    );

    var state: Parsect.State<void> = Parsect.state("[abc]", 0);
    var reply: Reply<void> = Parsect.parse(parser, state);
    console.log(reply.success);             // true
    console.log(reply.value);               // "abc"
    console.log(reply.state.source);        // "[abc]"
    console.log(reply.state.position);      // 5

    var state2: Parsect.State<void> = Parsect.state("[xyz]", 0);
    var reply2: Reply<void> = Parsect.parse(parser, state);
    console.log(reply2.success);             // false
    console.log(reply2.expected);            // "abc"
    console.log(reply2.state.source);        // "[abc]"
    console.log(reply2.state.position);      // 1    (It's because the parser consume heading "[" then failed)

----

### Parser Constructors
    
----

#### `choice<T>(ps: Parser<T>[]): Parser<T>`

#### `or<T>(...ps: Parser<T>[]): Parser<T>`

#### `repeat<T>(min: number, max: number, p: Parser<T>): Parser<T[]>`

#### `count<T>(n: number, p: Parser<T>): Parser<T[]>`

#### `many<T>(p:Parser<T>): Parser<T[]>`

#### `many1<T>(p: Parser<T>): Parser<T[]>`

#### `array<T>(ps: Parser<T>[]): Parser<T[]>`

#### `series<T>(...ps: Parser<T>[]): Parser<T[]>`

#### `head<T>(p:Parser<T>, ...ps:Parser<any>[]): Parser<T>`

#### `between<T>(open:Parser<any>, p:Parser<T>, close:Parser<any>): Parser<T>`

#### `seq<A,U>(f: (s: Context<A,U>)=>A): Parser<A>`

#### `sepByN<A>(min: number, max: number, p: Parser<A>, sep: Parser<any>): Parser<A[]>`

#### `sepBy1<T>(p: Parser<T>, sep: Parser<any>): Parser<T[]>`

#### `sepBy<T>(p:Parser<T>, sep:Parser<any>): Parser<T[]>`

#### `endByN<T>(min: number, max: number, p: Parser<T>, sep: Parser<any>): Parser<T[]>`

#### `endBy1<T>(p: Parser<T>, sep: Parser<any>): Parser<T[]>`

#### `endBy<T>(p: Parser<T>, sep: Parser<any>): Parser<T[]>`

#### `option<T>(defaultValue: T, p: Parser<T>): Parser<T>`

#### `optional<T>(p: Parser<T>): Parser<void>`

#### `skipMany<A>(p: Parser<A>): Parser<void>`

#### `skipMany1<A>(p: Parser<A>): Parser<void>`



### Error Handling Parser Constructors

#### `fail(message: string): Parser<any>`

#### `unexpected(message: string): Parser<any>`



### Primitive Parsers

#### `eof: Parser<void>`

#### `empty: Parser<void>`

#### `label<A>(message: string, p: Parser<A>): Parser<A>`

#### `lookAhead<T>(p: Parser<T>): Parser<T>`

#### `pure<A>(x: A): Parser<A>`

#### `triable<A>(p: Parser<A>): Parser<A>`

#### `notFollowedBy<A>(p: Parser<A>): Parser<void>`

#### `fmap<A,B>(f: (x: A)=>B,   p: Parser<A>): Parser<B>`

#### `lazy<A>(f: () => Parser<A>): Parser<A>`





### Character Parsers

#### `oneOf(chars: string): Parser<string>`

#### `noneOf(chars: string): Parser<string>`

#### `space: Parser<string>`

#### `spaces: Parser<string>`

#### `newline: Parser<string>`

#### `tab: Parser<string>`

#### `upper: Parser<string>`

#### `lower: Parser<string>`

#### `alphaNum: Parser<string>`

#### `letter: Parser<string>`

#### `digit: Parser<string>`

#### `hexDigit: Parser<string>`

#### `octDigit: Parser<string>`

#### `char(c: string): Parser<string>`

#### `anyChar:  Parser<string>`

#### `satisfy(condition: (character: string, code: number)=>boolean): Parser<string>`

#### `charCode(charCode: number): Parser<string>`

----



### String Parsers
----

#### `string(text: string, caseSensitive: boolean = true): Parser<string>`

#### `regexp(pattern: RegExp): Parser<string>`

----



### Token Parser
----

### `interface LanguageDef`

* `commentStart:       Parser<string>`
* `commentEnd:         Parser<string>`
* `commentLine:        Parser<string>`
* `nestedComments:     boolean`
* `identStart:         Parser<string>`
* `identLetter:        Parser<string>`
* `opStart:            Parser<string>`
* `opLetter:           Parser<string>`
* `reservedNames:      string[]`
* `reservedOpNames:    string[]`
* `caseSensitive:      boolean`

### `interface GenTokenParser`

* `identifier:     Parser<string>`
* `reserved:       (s: string)=>Parser<string>`
* `operator:       Parser<string>`
* `reservedOp:     (s: string)=>Parser<string>`
* `charLiteral:    Parser<string>`
* `stringLiteral:  Parser<string>`
* `natural:        Parser<number>`
* `integer:        Parser<number>`
* `float:          Parser<number>`
* `naturalOrFloat: Parser<number>`
* `decimal:        Parser<number>`
* `hexadecimal:    Parser<number>`
* `octal:          Parser<number>`
* `symbol:         (s: String)=>Parser<string>`
* `lexeme:         <A>(p: Parser<A>)=>Parser<A>`
* `whiteSpace:     Parser<void>`
* `parens:         <A>(p: Parser<A>)=>Parser<A>`
* `braces:         <A>(p: Parser<A>)=>Parser<A>`
* `angles:         <A>(p: Parser<A>)=>Parser<A>`
* `brackets:       <A>(p: Parser<A>)=>Parser<A>`
* `semi:           Parser<string>`
* `comma:          Parser<string>`
* `colon:          Parser<string>`
* `dot:            Parser<string>`
* `semiSep:        <A>(p: Parser<A>)=>Parser<A[]>`
* `semiSep1:       <A>(p: Parser<A>)=>Parser<A[]>`
* `commaSep:       <A>(p: Parser<A>)=>Parser<A[]>`
* `commaSep1:      <A>(p: Parser<A>)=>Parser<A[]>`

* `binary:  <A>(name: string, fun: (a: A, b: A)=>A, assoc: Assoc) => Operator<A>`
* `prefix:  <A>(name: string, fun: (a: A)=>A) => Operator<A>`
* `postfix: <A>(name: string, fun: (a: A)=>A) => Operator<A>`




#### `makeTokenParser(def: LanguageDef): GenTokenParser`

----



### Expression Parser
----

#### `enum Assoc`

* `None`
* `Left`
* `Right`

#### `infix<A>(p: Parser<(l: A, r: A) => A>, assoc: Assoc): Operator<A>`

#### `prefix<A>(p: Parser<(a: A) => A>): Operator<A>`

#### `postfix<A>(p: Parser<(a: A) => A>): Operator<A>`

#### `buildExpressionParser<A>(table: Operator<A>[][], term: Parser<A>): Parser<A>`









## Change log

* 2013/09/26 **ver. 0.2**. All APIs are cleaned up. `makeTokenParser` and `buildExpressionParser` supported.
* 2013/01/01 **ver. 0.1**. Happy New Year! 

## TODO

* Adding more test cases or examples.
* Performance tuning.
* Cleaning up user state API.

## License

Parsect is licensed under the MIT License.

    The MIT License
    
    Copyright 2013 Kon (http://phyzkit.net/)
    
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.



Some of the codes of Parsect were ported from [Parsec](http://hackage.haskell.org/package/parsec-3.1.3). 
Parsec is provided under BSD-style license as below:

    Copyright 1999-2000, Daan Leijen; 2007, Paolo Martini. All rights reserved.

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

    This software is provided by the copyright holders "as is" and any express or
    implied warranties, including, but not limited to, the implied warranties of
    merchantability and fitness for a particular purpose are disclaimed. In no
    event shall the copyright holders be liable for any direct, indirect,
    incidental, special, exemplary, or consequential damages (including, but not
    limited to, procurement of substitute goods or services; loss of use, data,
    or profits; or business interruption) however caused and on any theory of
    liability, whether in contract, strict liability, or tort (including
    negligence or otherwise) arising in any way out of the use of this software,
    even if advised of the possibility of such damage.    

## Contact



Author: Kon ( [@KDKTN](http://twitter.com/KDKTN/), http://phyzkit.net/ )
    
日本語でもおｋ Japanese also available to contact me.