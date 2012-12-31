/// <reference path="parsect.ts" />

var seqTest = seq((s)=>{
	s(string("("));
	var e = s(string("a"));
	s(string(")"));
	s(ret(()=>e));
});

console.log("seqTest " + seqTest.parse(new Source("(a)", 0)).value);

var choiceTest = choice((c)=>{
	c(string("a"));
	c(string("b"));
	c(string("c"));
});

//option("0", string("A"))

console.log("choiceTest " + choiceTest.parse(new Source("a", 0)).value);

var combinationTest = seq((s)=>{
	var x = s(choiceTest);
	var y = s(choiceTest);
	var z = s(choiceTest);
	s(ret(()=>[x,y,z].join("")));
});

console.log("combinationTest " + combinationTest.parse(new Source("bac", 0)).value);


var countTest = count(3, string("a"));
console.log("countTest " + countTest.parse(new Source("aaa", 0)).value);

var manyTest = many(string("a"));
console.log("manyTest" + manyTest.parse(new Source("aaaaaaa", 0)).value);

var many1Test = many1(string("a"));
console.log("many1Test " + many1Test.parse(new Source("aaaaaaa", 0)).value);

console.log("numberTest" + number.parse(new Source("-123.567", 0)).value);


var orTest = many(or(string("a"), string("b")));
console.log("orTest " + orTest.parse(new Source("baabbabaabbbazaabb", 0)).value);