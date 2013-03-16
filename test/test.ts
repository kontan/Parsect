/// <reference path="qunit.d.ts" />
/// <reference path="../src/parsect.ts" />
/// <reference path="../src/globals.ts" />

var jsonEq = Parsect.jsonEq;

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
    var parser = "hoge";

    // Success
    var s = parse(parser, new Source("hoge"));
    ok(s.success);
      strictEqual(s.position, 4);
      strictEqual(s.value, "hoge");
      strictEqual(s.errorMesssage, undefined);

    // Success
    var s = parse(parser, "hoge");
    ok(s.success);
      strictEqual(s.position, 4);
      strictEqual(s.value, "hoge");
      strictEqual(s.errorMesssage, undefined);
});

test("string parser test", function() {
    var parser = "hoge";

    // Success
    var s = parse(parser, "hoge");
    ok(s.success);
      strictEqual(s.position, 4);
      strictEqual(s.value, "hoge");
      strictEqual(s.errorMesssage, undefined);

      // Fail
    var f = parse(parser, "piyo");
    ok(!f.success);
      strictEqual(f.position, 0);
      strictEqual(f.value, undefined);
      strictEqual(f.errorMesssage, "expected \"hoge\""); 

    // Fail
    var f = parse(parser, "hopo");
    ok(!f.success);
      strictEqual(f.position, 0);
      strictEqual(f.value, undefined);
      strictEqual(f.errorMesssage, "expected \"hoge\""); 

      // Fail
    var e = parse(parser, "");
    ok(!e.success);
      strictEqual(e.position, 0);
      strictEqual(e.value, undefined);
      strictEqual(e.errorMesssage, "expected \"hoge\""); 
});

test("seq parser test", function() {
    var parser = seq((s,o)=>{
        s("(");
        o.e = s("hoge");
        s(")");
    });

    // Success
    var s = parse(parser, "(hoge)");
    ok(s.success);
      strictEqual(s.position, 6);
      ok(jsonEq(s.value, { 'e': 'hoge' }));
      strictEqual(s.errorMesssage, undefined);

      // Fail
    var f = parse(parser, "(piyo)");
    ok(!f.success);
      strictEqual(f.position, 1);
      strictEqual(f.value, undefined);
      strictEqual(f.errorMesssage, "expected \"hoge\""); 
});

test("seq parser json ast test", function() {
    var identifier = regexp(/[A-z]+/);
    var parser = seq((s,o)=>{
        o.name = s(identifier);
        s('(');
        o.args = s(sepBy(seq((s,o)=>{
            o.name = s(identifier);
            o.optional = s(optional('?'));
            s(':');
            o.type = s(identifier);
        }), string(',')));
        s(')');
        s(':');
        o.ret = s(identifier);
    });

    // Success
    var input = "indexOf(searchString:string,position?:number):number";
    var s = parse(parser, input);
    ok(s.success);
      strictEqual(s.position, input.length);
      ok(jsonEq(s.value, { 
      	'name': 'indexOf', 
      	'args': [ 
      		{ 'name': 'searchString', 'optional': undefined, 'type': 'string' },
      		{ 'name': 'position', 'optional': '?', 'type': 'number' },
      	],
      	'ret': 'number' 
      }));
      strictEqual(s.errorMesssage, undefined);
});


test("trying test", ()=>{
    var parser = trying(seq((s)=>{
        s("(");
        var e = s("hoge");
        s(")");
        return e;
    }));
    var parens_a = between('(', 'a', ')');
    var parens_b = between('(', 'b', ')');
    ok(parse(parser, "(hoge)").equals(Parsect.State.success(new Parsect.Source("(hoge)", 6), "hoge")));
    ok(parse(or(parens_a, parens_b), "(b)").equals(Parsect.State.fail(new Source("(b)", 1), "expected \"a\"")));
    ok(parse(or(trying(parens_a), parens_b), "(b)").equals(Parsect.State.success(new Source("(b)", 3), "b")));
});

test("count function test", ()=>{
    var parser:Parsect.Parser = map(join, count(3, "a"));
    ok(parse(parser, "aaa").equals(Parsect.State.success(new Parsect.Source("aaa", 3), "a,a,a")));
});

test("many function test", ()=>{
    var parser:Parsect.Parser = map(join, many("a"));
    ok(parse(parser, "aa").equals(Parsect.State.success(new Parsect.Source("aa", 2), "a,a")));
});

test("many1 function test", ()=>{
    var parser:Parsect.Parser = map(join, many1("a"));
    ok(parse(parser, "aaaaaaa").equals(Parsect.State.success(new Parsect.Source("aaaaaaa", 7), "a,a,a,a,a,a,a")));
});

test("many1 function test", ()=>{
    var parser:Parsect.Parser = map(join, many1("a"));
    ok(parse(parser, "aaaaaaa").equals(Parsect.State.success(new Parsect.Source("aaaaaaa", 7), "a,a,a,a,a,a,a")));
});

test("number parser test", ()=>{
    var expected = Parsect.State.success(new Parsect.Source("-123.567", 8), -123.567);
    ok(parse(number, "-123.567").equals(expected));
});

test("or function test", ()=>{
    var source = "baabbabaabbbazaabb";
    var parser = map(join, many(or(string("a"), string("b"))));
    var expected = Parsect.State.success(new Parsect.Source(source, 13), "b,a,a,b,b,a,b,a,a,b,b,b,a");
    ok(parse(parser, source).equals(expected));
});

test("sepBy1 test 1", ()=>{
    var source = "a_a_a";
    var parser = map(join, sepBy1(string("a"), string("_"))); 
    var expected = Parsect.State.success(source, 5, "a,a,a");
    ok(parse(parser, source).equals(expected));
});

test("sepBy1 test 2", ()=>{
    var parser = map(join, sepBy1(string("a"), string("_"))); 
    var source = "";
    var expected = Parsect.State.fail(source, 0, "expected \"a\"");
    ok(parse(parser, source).equals(expected));
});

test("sepBy1 test 3", ()=>{
    var parser = map(join, sepBy1(string("a"), string("_"))); 
    var source = "a";
    var expected = Parsect.State.success(source, 1, "a");
    ok(parse(parser, source).equals(expected));
});

test("sepBy1 test 4", ()=>{
    var parser = map(join, sepBy1(string("a"), string("_"))); 
    var source = "a_b";
    var expected = Parsect.State.fail(source, 2, "expected \"a\"");
    ok(parse(parser, source).equals(expected));
});

test("between test 1", ()=>{
    var parser = between(string('['), string('a'), string(']')); 
    var source = "[a]";
    var expected = Parsect.State.success(source, 3, "a");
    ok(parse(parser, source).equals(expected));
});

test("between test 2", ()=>{
    var parser = between(string('['), string('a'), string(']')); 
    var source = "[b]";
    var expected = Parsect.State.fail(source, 1, "expected \"a\"");
    ok(parse(parser, source).equals(expected));
});

test("eof test 1", ()=>{
    var parser = between(string('['), string('a'), string(']')); 
    var source = "";
    var expected = Parsect.State.success(source, 1, undefined);
    ok(parse(eof, source).equals(expected));
});

test("eof test 2", ()=>{
    var parser = series(string("a"), eof); 
    var source = "a";
    var expected = Parsect.State.success(source, 2, undefined);
    ok(parse(parser, source).equals(expected));
});

test("eof test 2", ()=>{
    var parser = eof; 
    var source = "a";
    var expected = Parsect.State.fail(source, 0, undefined);
    ok(parse(parser, source).equals(expected));
});

test("empty test", ()=>{
    var parser = empty; 
    var source = "a";
    var expected = Parsect.State.success(source, 0, undefined);
    ok(parse(parser, source).equals(expected));
});

test("satisfy test 1", ()=>{
    var parser = map(join, many1(satisfy(c=>{ 
        var i = c.charCodeAt(0);
        return i >= 80 && i <= 85;
    })));; 
    var source = "PQRRQPOPhoge";
    var expected = Parsect.State.success(source, 6, 'P,Q,R,R,Q,P');
    ok(parse(parser, source).equals(expected));
});

test("satisfy test 1", ()=>{
    var parser = map(join, many1(satisfy(c=>{ 
        var i = c.charCodeAt(0);
        return i >= 80 && i <= 85;
    })));; 
    var source = "XXXXXXXXXXXX";
    var expected = Parsect.State.fail(source, 0, 'expected one or more (satisfy)');
    ok(parse(parser, source).equals(expected));
});

test("regexp test 1", ()=>{
    var parser = regexp(/abcde/); 
    var source = "abcde";
    var expected = Parsect.State.success(source, 5, source);
    ok(parse(parser, source).equals(expected));
});

test("regexp test 2", ()=>{
    var parser = regexp(/abc/); 
    var source = "xxabcxx";
    var expected = Parsect.State.fail(source, 0, 'expected /abc/');
    ok(parse(parser, source).equals(expected));
});

test("regexp test 3", ()=>{
    var parser = regexp(/a*/); 
    var source = "aaaaabbbbb";
    var expected = Parsect.State.success(source, 5, 'aaaaa');
    ok(parse(parser, source).equals(expected));
});


test("expr test 1", ()=>{
    var parser = tok_number; 
    var source = " 123 ";
    var expected = Parsect.State.success(source, 5, 123);
    ok(parse(parser, source).equals(expected));
});

test("expr test 2", ()=>{
    var parser = expr; 
    var source = " 1 + 3 ";
    var expected = Parsect.State.success(source, 7, 4);
    ok(parse(parser, source).equals(expected));
});

test("expr test 3", ()=>{
    var parser = expr; 
    var source = "(3 + 4) * 5.0 / 0.2 - 7";
    var expected = Parsect.State.success(source, 23, 168);
    ok(parse(parser, source).equals(expected));
});

test("apply 3", ()=>{
    var pNumber = map(parseFloat, Parsect.digit);
    var parser = Parsect.apply((x,y)=>x+y, [pNumber], [string(" "), pNumber]); 
    var source = "5 9";
    var expected = Parsect.State.success(source, 3, 14);
    ok(parse(parser, source).equals(expected));
});



test("URI", ()=>{
    var param = seq((s,o)=>{
    	o.name = s(/[_A-z0-9]+/);
    	s('=');
    	o.value = s(/[^&]+/);
	});
    var parser = seq((s,o)=>{
    	o.scheme = s(/[a-z]+/);
    	s('://');
    	o.host = s(sepBy1(/[a-z]+/, '.'));
    	o.port = s(optional(series(string(':'), regexp(/\d+/))));
    	s('/');
    	o.path = s(sepBy(/[^\/?]+/, '/'));
    	o.params = s(optional(series(string("?"), sepBy(param,"&"))));
    });
    var source = 'http://www.nicovideo.jp/watch/1356674833?via=thumb_watch';
    var result = parse(parser, source);
    var expected = {"scheme":"http","host":["www","nicovideo","jp"],"path":["watch","1363247616"],"params":[{"name":"via","value":"thumb_watch"}]};
    ok(jsonEq(result.value, expected));
});