/// <reference path="qunit.d.ts" />
/// <reference path="../src/parsect.ts" />
/// <reference path="../src/globals.ts" />

function join(ss:string[]){
	return ss.join();
}

test("Source object instantiation and equation", function() {
	var src:Parsect.Source = new Parsect.Source("hoge");
	ok(src.equals(new Source("hoge", 0)));
	var src2:Parsect.Source = new Parsect.Source("hoge", 2);
	ok(src2.equals(new Source("hoge", 2)));
	ok(new Source("hoge", 4).equals(new Source("hoge", 4)));
	ok(new Source("hoge", 5).equals(new Source("hoge", 5)));
	//throws(()=>new Parsect.Source("hoge", -1), "_position: out of range: -1");
	//throws(()=>new Parsect.Source("hoge", 6), "_position: out of range: 5");
	//throws(()=>new Parsect.Source("hoge", 10), "_position: out of range: 10");
});

test("Source object invariance test", function() {
	var src:Parsect.Source = new Parsect.Source("hoge");
	src.progress(3);
	ok(src.equals(new Source("hoge", 0)));
	src.success(2, "2");
	ok(src.equals(new Source("hoge", 0)));	
	src.fail("fail");
	ok(src.equals(new Source("hoge", 0)));
	//throws(()=>src.source = "foo");
	//throws(()=>src.position = 10);
});

test("parse function test", function() {
	var parser = string("hoge");

	// Success
	var s = parser.parse(new Source("hoge"));
	ok(s.success);
  	strictEqual(s.position, 4);
  	strictEqual(s.value, "hoge");
  	strictEqual(s.errorMesssage, undefined);

	// Success
	var s = parser.parse("hoge");
	ok(s.success);
  	strictEqual(s.position, 4);
  	strictEqual(s.value, "hoge");
  	strictEqual(s.errorMesssage, undefined);
});

test("string parser test", function() {
	var parser = string("hoge");

	// Success
	var s = parser.parse("hoge");
	ok(s.success);
  	strictEqual(s.position, 4);
  	strictEqual(s.value, "hoge");
  	strictEqual(s.errorMesssage, undefined);

  	// Fail
	var f = parser.parse("piyo");
	ok(!f.success);
  	strictEqual(f.position, 0);
  	strictEqual(f.value, undefined);
  	strictEqual(f.errorMesssage, "expected \"hoge\""); 

	// Fail
	var f = parser.parse("hopo");
	ok(!f.success);
  	strictEqual(f.position, 0);
  	strictEqual(f.value, undefined);
  	strictEqual(f.errorMesssage, "expected \"hoge\""); 

  	// Fail
	var e = parser.parse("");
	ok(!e.success);
  	strictEqual(e.position, 0);
  	strictEqual(e.value, undefined);
  	strictEqual(e.errorMesssage, "expected \"hoge\""); 
});

test("seq parser test", function() {
	var parser = seq((s)=>{
		s(string("("));
		var e = s(string("hoge"));
		s(string(")"));
		return e;
	});

	// Success
	var s = parser.parse("(hoge)");
	ok(s.success);
  	strictEqual(s.position, 6);
  	strictEqual(s.value, "hoge");
  	strictEqual(s.errorMesssage, undefined);

  	// Fail
	var f = parser.parse("(piyo)");
	ok(!f.success);
  	strictEqual(f.position, 1);
  	strictEqual(f.value, undefined);
  	strictEqual(f.errorMesssage, "expected \"hoge\""); 
});

test("trying test", ()=>{
	var parser = trying(seq((s)=>{
		s(string("("));
		var e = s(string("hoge"));
		s(string(")"));
		return e;
	}));
	var parens_a = between(string('('), string('a'), string(')'));
	var parens_b = between(string('('), string('b'), string(')'));
	ok(parser.parse("(hoge)").equals(Parsect.State.success(new Parsect.Source("(hoge)", 6), "hoge")));
	ok(or(parens_a, parens_b).parse("(b)").equals(Parsect.State.fail(new Source("(b)", 1), "expected \"a\"")));
	ok(or(trying(parens_a), parens_b).parse("(b)").equals(Parsect.State.success(new Source("(b)", 3), "b")));
});

test("count function test", ()=>{
	var parser:Parsect.Parser = map(join, count(3, string("a")));
	ok(parser.parse("aaa").equals(Parsect.State.success(new Parsect.Source("aaa", 3), "a,a,a")));
});

test("many function test", ()=>{
	var parser:Parsect.Parser = map(join, many(string("a")));
	ok(parser.parse("aa").equals(Parsect.State.success(new Parsect.Source("aa", 2), "a,a")));
});

test("many1 function test", ()=>{
	var parser:Parsect.Parser = map(join, many1(string("a")));
	ok(parser.parse("aaaaaaa").equals(Parsect.State.success(new Parsect.Source("aaaaaaa", 7), "a,a,a,a,a,a,a")));
});

test("many1 function test", ()=>{
	var parser:Parsect.Parser = map(join, many1(string("a")));
	ok(parser.parse("aaaaaaa").equals(Parsect.State.success(new Parsect.Source("aaaaaaa", 7), "a,a,a,a,a,a,a")));
});

test("number parser test", ()=>{
	var expected = Parsect.State.success(new Parsect.Source("-123.567", 8), -123.567);
	ok(number.parse("-123.567").equals(expected));
});

test("or function test", ()=>{
	var source = "baabbabaabbbazaabb";
	var parser = map(join, many(or(string("a"), string("b"))));
	var expected = Parsect.State.success(new Parsect.Source(source, 13), "b,a,a,b,b,a,b,a,a,b,b,b,a");
	ok(parser.parse(source).equals(expected));
});

test("sepBy1 test 1", ()=>{
	var source = "a_a_a";
	var parser = map(join, sepBy1(string("a"), string("_"))); 
	var expected = Parsect.State.success(source, 5, "a,a,a");
	ok(parser.parse(source).equals(expected));
});

test("sepBy1 test 2", ()=>{
	var parser = map(join, sepBy1(string("a"), string("_"))); 
	var source = "";
	var expected = Parsect.State.fail(source, 0, "expected \"a\"");
	ok(parser.parse(source).equals(expected));
});

test("sepBy1 test 3", ()=>{
	var parser = map(join, sepBy1(string("a"), string("_"))); 
	var source = "a";
	var expected = Parsect.State.success(source, 1, "a");
	ok(parser.parse(source).equals(expected));
});

test("sepBy1 test 4", ()=>{
	var parser = map(join, sepBy1(string("a"), string("_"))); 
	var source = "a_b";
	var expected = Parsect.State.fail(source, 2, "expected \"a\"");
	ok(parser.parse(source).equals(expected));
});

test("between test 1", ()=>{
	var parser = between(string('['), string('a'), string(']')); 
	var source = "[a]";
	var expected = Parsect.State.success(source, 3, "a");
	ok(parser.parse(source).equals(expected));
});

test("between test 2", ()=>{
	var parser = between(string('['), string('a'), string(']')); 
	var source = "[b]";
	var expected = Parsect.State.fail(source, 1, "expected \"a\"");
	ok(parser.parse(source).equals(expected));
});

test("eof test 1", ()=>{
	var parser = between(string('['), string('a'), string(']')); 
	var source = "";
	var expected = Parsect.State.success(source, 1, undefined);
	ok(eof.parse(source).equals(expected));
});

test("eof test 2", ()=>{
	var parser = series(string("a"), eof); 
	var source = "a";
	var expected = Parsect.State.success(source, 2, undefined);
	ok(parser.parse(source).equals(expected));
});

test("eof test 2", ()=>{
	var parser = eof; 
	var source = "a";
	var expected = Parsect.State.fail(source, 0, undefined);
	ok(parser.parse(source).equals(expected));
});

test("empty test", ()=>{
	var parser = empty; 
	var source = "a";
	var expected = Parsect.State.success(source, 0, undefined);
	ok(parser.parse(source).equals(expected));
});

test("satisfy test 1", ()=>{
	var parser = map(join, many1(satisfy(c=>{ 
		var i = c.charCodeAt(0);
		return i >= 80 && i <= 85;
	})));; 
	var source = "PQRRQPOPhoge";
	var expected = Parsect.State.success(source, 6, 'P,Q,R,R,Q,P');
	ok(parser.parse(source).equals(expected));
});

test("satisfy test 1", ()=>{
	var parser = map(join, many1(satisfy(c=>{ 
		var i = c.charCodeAt(0);
		return i >= 80 && i <= 85;
	})));; 
	var source = "XXXXXXXXXXXX";
	var expected = Parsect.State.fail(source, 0, 'expected one or more (satisfy)');
	ok(parser.parse(source).equals(expected));
});

test("regexp test 1", ()=>{
	var parser = regexp(/abcde/); 
	var source = "abcde";
	var expected = Parsect.State.success(source, 5, source);
	ok(parser.parse(source).equals(expected));
});

test("regexp test 2", ()=>{
	var parser = regexp(/abc/); 
	var source = "xxabcxx";
	var expected = Parsect.State.fail(source, 0, 'expected /abc/');
	ok(parser.parse(source).equals(expected));
});

test("regexp test 3", ()=>{
	var parser = regexp(/a*/); 
	var source = "aaaaabbbbb";
	var expected = Parsect.State.success(source, 5, 'aaaaa');
	ok(parser.parse(source).equals(expected));
});


test("expr test 1", ()=>{
	var parser = tok_number; 
	var source = " 123 ";
	var expected = Parsect.State.success(source, 5, 123);
	ok(parser.parse(source).equals(expected));
});

test("expr test 2", ()=>{
	var parser = expr; 
	var source = " 1 + 3 ";
	var expected = Parsect.State.success(source, 7, 4);
	ok(parser.parse(source).equals(expected));
});

test("expr test 3", ()=>{
	var parser = expr; 
	var source = "(3 + 4) * 5.0 / 0.2 - 7";
	var expected = Parsect.State.success(source, 23, 168);
	ok(parser.parse(source).equals(expected));
});

test("apply 3", ()=>{
	var pNumber = map(parseFloat, Parsect.digit);
	var parser = Parsect.apply((x,y)=>x+y, [pNumber], [string(" "), pNumber]); 
	var source = "5 9";
	var expected = Parsect.State.success(source, 3, 14);
	ok(parser.parse(source).equals(expected));
});