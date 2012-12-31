# Parsect / Parser Combinator for TypeScript

## Abstract

**Parsect** is a parser combinator library for [TypeScript](http://www.typescriptlang.org/). Naturally it can also be used from not only TypeScript and JavaScript.

I got the idea for Parsect from [Parsec](http://www.haskell.org/haskellwiki/Parsec) parser combinator library in Haskell, however this is not a porting or clone of Parsec. This library doesn't have underlying Monad or Fanctor and it doesn't deal string as a list of charactor. However, you can combine parsers in the same manner as Parsec. 

Parsect places importance on debuggerability and readability. You can execute parsing step-by-step with debugger. Of course, the best way to eusure robustness of the parsers is writing a lot of unit tests but sometimes stepping-on-breakpoints-debugging is useful. Parsec provides a good way to understand the code flow. In most of Parsec-like library, debugging is difficult.

Parsect characteristically has Haskell's **do notation**-like notation style. This notation makes a parser more readable. Additionally, **Regular Expression Parser** also be suppoted. You can combine RegExp parsers with other parsers.

## Getting Started

In the following sample codes, the identifiers are not prefixed with the module name. All functions or Classes are in *Parsect* module but *globals.ts* binds those identifiers to global namespace (It's a bad practice but I'm so lazy!). If you would not use the global indentifier definition, you need to add a prefix of module name "Parsect" to all identifiers or *import* the module. 

### *number* parsers

Parsect provides some commonly-used parsers. **number** parser parses numeral strings. **number** is a **Parser** object and a Parser object has **parse** function in it's property. *parse* takes a string parameter as input. So following code parses numeric riteral "−273.15" with *number* parser. 

    var r = number.parse("−273.15");

*parse* function returns a **ParserState** object. It contains the parsed numeric value, either or successed, or failed and position.

    var r = number.parse("−273.15");
    
    var success:bool  = r.success;	 // successed or failed?
    var value:number  = r.value;     // any parsing result value	
    var input:string  = r.input;     // whole of input string
    var pos:number    = r.position;  // current position in input string 

You can consider all parsers imutable objects. Any parsing would not modify the parser and you can reuse those parsers as many times you want. Additionally you should not change parsers property.

If you want shorter notation, *bind* is it (*bind* of Monad ). 

### *string* parser

**string** parser is the most simple parser. *string* parses a specific string and return it. To get a *string* parser, use *string* function. If you want to parse a string "apple", use *string* as follows:

    string("apple")

If the parser recieve a unexpected input string like "application", the parser would consume no charactors and fail. The both two words have first four letter "appl" but the parser don't throw a exception and parsing would continue to search other matchings. Parsect (currently) is not a predictive parser.

### *regexp* parser

**regexp** parser parses a string represented by regular expression. *regexp* function takes a RegExp object. For example, the folllowing parser accepts any numerical string:

    var number = regexp(/^[-+]?\d+(\.\d+)?/);

*regexp* parser consumes a charactors from first charactor of input to end charactor of the matched string.

### *many* combinator

**many** combinator create a parser parses infinitely repeat of a string pattern. *many* function takes a parser and return new parser. For example, the following parser comsumes a string like "abcabcabcabc...":

    many(string("abc"))

Of course, *many* combinator can take a *regexp* parser:

    many(number)

It consumes iteration of number, like "-33". 

### *series* combinator

**series** combinator creates a series of parsers. For example, 

	series(number, string("+"), number, string("=", number))

consumes a string like "12+3=15".

### *seq* combinator

**seq** combinator provides *do notaion* like notaion for Parsect. *seq* function take a other function for parameter. The parameter function is called back when the *seq* parses a string. The parameter function recieves a other function as a parameter. Typically, *seq* function is used as: 

    seq((s)=>{
    	s(string("("));
    	var v:number = s(number);
    	s(string(")"));
    	return v;
    });

This parser parses a numeric string between parenses. *s* function recieves a parser. A return value of *s(number)* is not ParserState but a **raw value** of result of parsing. So, variable *v* is bounded a *number* object. When the parser parses a string "(100)", *v* is 100. 

If a parser applied to *s* failed, all following parsers would be ignore. 

When the parsing succeeded, *seq* returns a state object contains the value returned from the parameter function. Otherwise, the value of state object is undefined.

### *choice* combinator

    choice((c)=>{
        c(number);
        c(bool);
    });

If you need, you can attach a break point to those calling of *c* for a debugger. If a unanticipatedly

*c* function returns a raw value of parsing. However, there is usually no necessity to bind athe value to a variable. 

### *or* combinator

If you need not to that sequential selecting, you can use **or** combinator. It provides shorter nonation than *choice*. *or* takes variable arguments. 

    or(number, bool);

## Change log

2012 12 31 **ver. 0,1**

* First release

## TODO

* Adding more useful functions like *sepBy*, *endBy*.
* Adding more test cases or examples.
* Performance tuning.

## License

Parsect is licensed under MIT License.

Copyright (C) 2012 Kon (http://phyzkit.net)

日本語でもおｋ Japanese also available to contact me.