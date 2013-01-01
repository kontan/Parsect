// Parsect (https://github.com/kontan/Parsect)
// @author Kon - http://phyzkit.net/

/// <reference path="parsect.ts" />
/// <reference path="tester.ts" /> 

var test = new Tester();

test.parse("string 0", string("hoge"), "hoge", 4, "hoge");
test.parse("string 1", string("piyo"), "hoge", 0);

var seqTest = seq((s)=>{
	s(string("("));
	var e = s(string("a"));
	s(string(")"));
	return e;
});


function join(ss:string[]){
	return ss.join();
}

test.parse("seqTest" ,       seqTest,                                       "(a)", 3, "a");
test.parse("countTest",      map(join, count(3, string("a"))),              "aaa", 3, "a,a,a");
test.parse("manyTest",       map(join, many(string("a"))),                  "aaaaaaa", 7, "a,a,a,a,a,a,a");
test.parse("many1Test",      map(join, many1(string("a"))),                 "aaaaaaa", 7, "a,a,a,a,a,a,a");
test.parse("numberTest",     number,                                        "-123.567", 8, "-123.567");
test.parse("orTest",         map(join, many(or(string("a"), string("b")))), "baabbabaabbbazaabb", 13, "b,a,a,b,b,a,b,a,a,b,b,b,a");

var sepTest = map(join, sepBy1(string("a"), string("_"))); 
test.parse("sepBy1 2",        sepTest , "a_a_a", 5, "a,a,a");

var sepBy1Test = sepBy1(string("a"), string("_")); 
test.parse("sepBy1 2",        sepBy1Test , "", 0, undefined, false);

var sepBy_1 = sepBy(string("a"), string("_")); 
test.parse("sepBy 1",        sepBy_1 , "", 0, undefined, true);

var span:HTMLElement = <any>document.querySelector("#result");
span.innerHTML = test.report();
