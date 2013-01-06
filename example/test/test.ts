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

test.parse("test seq 1" ,    seqTest, "(a)", 3, "a");
test.parse("test seq 2" ,    seqTest, "(b)", 1, undefined, false);

test.parse("test trying 1" ,  trying(seqTest), "(a)", 3, "a");
test.parse("test trying 1" ,  or(trying(seqTest), between(string('('), string(')'))(string('b'))), "(b)", 3, "b");

test.parse("countTest",      map(join, count(3, string("a"))),              "aaa", 3, "a,a,a");
test.parse("test many",       map(join, many(string("a"))),                  "aa", 2, "a,a");
test.parse("many1Test",      map(join, many1(string("a"))),                 "aaaaaaa", 7, "a,a,a,a,a,a,a");
test.parse("numberTest",     number,                                        "-123.567", 8, "-123.567");
test.parse("orTest",         map(join, many(or(string("a"), string("b")))), "baabbabaabbbazaabb", 13, "b,a,a,b,b,a,b,a,a,b,b,b,a");

var sepTest = map(join, sepBy1(string("a"), string("_"))); 
test.parse("test sepBy1 1",        sepTest , "a_a_a", 5, "a,a,a");
test.parse("test sepBy1 2",        sepTest , "", 0, undefined, false);
test.parse("test sepBy1 3",        sepTest , "a", 1, "a", true);
test.parse("test sepBy1 4",        sepTest , "a_b", 2, undefined, false);

var sepBy_1 = sepBy(string("a"), string("_")); 
test.parse("sepBy 1",        sepBy_1 , "", 0, undefined, true);

test.parse("between 1",        between(string('['), string(']'))(string('a')) , "[a]", 3, 'a', true);
test.parse("between 2",        between(string('['), string(']'))(string('a')) , "[b]", 1, undefined, false);

test.parse("test eof 1",       eof, "", 1, undefined, true);
test.parse("test eof 2",       series(string("a"), eof), "a", 2, undefined, true);
test.parse("test eof 2",       eof, "a", 0, undefined, false);

test.parse("test empty",       empty, "a", 0, undefined, true);



var span:HTMLElement = <any>document.querySelector("#result");
span.innerHTML = test.report();
