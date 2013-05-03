/// <reference path="qunit.d.ts" />
/// <reference path="../src/parsect.ts" />
/// <reference path="../src/globals.ts" />

function join(ss:string[]): string{
    return ss.join();
}

test("Source object instantiation and equation", function() {
    var src:Parsect.Source = new Parsect.Source("hoge");
    ok(src.equals(new Source("hoge", 0)));
    var src2:Parsect.Source = new Parsect.Source("hoge", 2);
    ok(src2.equals(new Source("hoge", 2)));
    ok(new Source("hoge", 4).equals(new Source("hoge", 4)));
    ok(new Source("hoge", 5).equals(new Source("hoge", 5)));
});

test("Source object invariance test", function() {
    var src:Parsect.Source = new Parsect.Source("hoge");
    src.progress(3);
    ok(src.equals(new Source("hoge", 0)));
    src.success(2, "2");
    ok(src.equals(new Source("hoge", 0)));    
    src.fail("fail");
    ok(src.equals(new Source("hoge", 0)));
});

test("parse function test", function() {
    var parser = "hoge";

    // Success
    var s = parse(parser, new Source("hoge"));
    ok(s.success);
    strictEqual(s.source.position, 4);
    strictEqual(s.value, "hoge");
    strictEqual(s.errorMesssage, undefined);

    // Success
    var s = parse(parser, "hoge");
    ok(s.success);
    strictEqual(s.source.position, 4);
    strictEqual(s.value, "hoge");
    strictEqual(s.errorMesssage, undefined);
});

test("string parser test", function() {
    var parser = "hoge";

    // Success
    var source = "hoge";
    var expectedS = Parsect.newSuccessState(source, 4, "hoge");
    ok(parse(parser, source).equals(expectedS));

      // Fail
    var source = "piyo";
    var expected = Parsect.newFailureState(source, 0, "expected \"hoge\"");
    ok(parse(parser, source).equals(expected));

    // Fail
    var source = "hopo";
    var expected = Parsect.newFailureState(source, 0, "expected \"hoge\"");
    ok(parse(parser, source).equals(expected));

      // Fail
    var source = "";
    var expected = Parsect.newFailureState(source, 0, "expected \"hoge\"");
    ok(parse(parser, source).equals(expected));
});

interface SeqTestData{
    e: string;
}

test("seq parser test", function() {
    var parser = seq<SeqTestData>((s,o)=>{
        s("(");
        o.e = s("hoge");
        s(")");
    });

    // Success
    var source = "(hoge)";
    var expected: Parsect.State<SeqTestData> = Parsect.newSuccessState<SeqTestData>(source, 6, { 'e': 'hoge' });
    ok(parse(parser, source).equals(expected));

      // Fail
    var source = "(piyo)";
    var expected2: Parsect.State<undefined> = Parsect.newFailureState(source, 1, "expected \"hoge\"");
    ok(parse(parser, source).equals(expected2));
});

interface SeqTestJsonData{
    name: string;
    type: string;
    args: SeqTestJsonDataArgs[];
    ret: string;
}

interface SeqTestJsonDataArgs{
    name: string;
    optional: string;
    type: string;
}

test("seq parser json ast test", function() {
    var identifier = regexp(/[A-z]+/);

    var argParser: Parsect.Parser<SeqTestJsonDataArgs> = seq<SeqTestJsonDataArgs>((s,o)=>{
        o.name = s(identifier);
        o.optional = s(optional('?'));
        s(':');
        o.type = s(identifier);
    });

    // このへんに <any> が必要なのもバグっぽい
    var argsParser: Parsect.Parser<SeqTestJsonDataArgs[]> = <any> sepBy(argParser, <any> string(','));

    var parser: Parsect.Parser<SeqTestJsonData> = seq<SeqTestJsonData>((s,o)=>{
        o.name = s(identifier);
        s('(');
        o.args = s(argsParser);
        s(')');
        s(':');
        o.ret = s(identifier);
    });

    // Success
    var input = "indexOf(searchString:string,position?:number):number";
    var s = parse(parser, input);
    ok(s.success);
      strictEqual(s.source.position, input.length);
      ok(Parsect.jsonEq(s.value, { 
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
    ok(parse(parser, "(hoge)").equals(Parsect.newSuccessState(new Parsect.Source("(hoge)", 6), "hoge")));
    ok(parse(or(parens_a, parens_b), "(b)").equals(Parsect.newFailureState(new Source("(b)", 1), "expected \"a\"")));
    ok(parse(or(trying(parens_a), parens_b), "(b)").equals(Parsect.newSuccessState(new Source("(b)", 3), "b")));
});

test("count function test", ()=>{
    var parser:Parsect.Parser<string> = map(<any>join, <any> count(3, "a"));
    ok(parse(parser, "aaa").equals(Parsect.newSuccessState(new Parsect.Source("aaa", 3), "a,a,a")));
});

test("many function test", ()=>{
    var parser:Parsect.Parser<string> = map(<any>join, many("a"));
    ok(parse(parser, "aa").equals(Parsect.newSuccessState(new Parsect.Source("aa", 2), "a,a")));
});

test("many1 function test", ()=>{
    var parser:Parsect.Parser<string> = map(<any> join, many1("a"));
    ok(parse(parser, "aaaaaaa").equals(Parsect.newSuccessState(new Parsect.Source("aaaaaaa", 7), "a,a,a,a,a,a,a")));
});

test("many1 function test", ()=>{
    var parser:Parsect.Parser<string> = map(<any>join, many1("a"));
    ok(parse(parser, "aaaaaaa").equals(Parsect.newSuccessState(new Parsect.Source("aaaaaaa", 7), "a,a,a,a,a,a,a")));
});

test("number parser test", ()=>{
    var expected = Parsect.newSuccessState(new Parsect.Source("-123.567", 8), -123.567);
    ok(parse(number, "-123.567").equals(expected));
});

test("or function test", ()=>{
    var source = "baabbabaabbbazaabb";
    var parser = map(<any>join, many(or(string("a"), string("b"))));
    var expected = Parsect.newSuccessState(new Parsect.Source(source, 13), "b,a,a,b,b,a,b,a,a,b,b,b,a");
    ok(parse(parser, source).equals(expected));
});

test("sepBy1 test 1", ()=>{
    var source = "a_a_a";
    var parser = map(<any>join, sepBy1(string("a"), string("_"))); 
    var expected = Parsect.newSuccessState(source, 5, "a,a,a");
    ok(parse(parser, source).equals(expected));
});

test("sepBy1 test 2", ()=>{
    var parser = map(<any>join, sepBy1(string("a"), string("_"))); 
    var source = "";
    var expected = Parsect.newFailureState(source, 0, "expected \"a\"");
    ok(parse(parser, source).equals(expected));
});

test("sepBy1 test 3", ()=>{
    var parser = map(<any>join, sepBy1(string("a"), string("_"))); 
    var source = "a";
    var expected = Parsect.newSuccessState(source, 1, "a");
    ok(parse(parser, source).equals(expected));
});

test("sepBy1 test 4", ()=>{
    var parser = map(<any>join, sepBy1(string("a"), string("_"))); 
    var source = "a_b";
    var expected = Parsect.newFailureState(source, 2, "expected \"a\"");
    ok(parse(parser, source).equals(expected));
});

test("between test 1", ()=>{
    var parser = between(string('['), string('a'), string(']')); 
    var source = "[a]";
    var expected = Parsect.newSuccessState(source, 3, "a");
    ok(parse(parser, source).equals(expected));
});

test("between test 2", ()=>{
    var parser = between(string('['), string('a'), string(']')); 
    var source = "[b]";
    var expected = Parsect.newFailureState(source, 1, "expected \"a\"");
    ok(parse(parser, source).equals(expected));
});

test("eof test 1", ()=>{
    var parser = between(string('['), string('a'), string(']')); 
    var source = "";
    var expected = Parsect.newSuccessState(source, 1, <any> undefined);
    ok(parse(eof, source).equals(expected));
});

test("eof test 2", ()=>{
    var parser = series(<any>string("a"), <any>eof); 
    var source = "a";
    var expected = Parsect.newSuccessState(source, 2, <any> undefined);
    ok(parse(parser, source).equals(expected));
});

test("eof test 2", ()=>{
    var parser = eof; 
    var source = "a";
    var expected = Parsect.newFailureState(source, 0, <any> undefined);
    ok(parse(parser, source).equals(expected));
});

test("empty test", ()=>{
    var parser = empty; 
    var source = "a";
    var expected = Parsect.newSuccessState(source, 0, <any> undefined);
    ok(parse(parser, source).equals(expected));
});

test("satisfy test 1", ()=>{
    var parser = map(<any>join, many1(satisfy(c=>{ 
        var i = c.charCodeAt(0);
        return i >= 80 && i <= 85;
    })));; 
    var source = "PQRRQPOPhoge";
    var expected = Parsect.newSuccessState(source, 6, 'P,Q,R,R,Q,P');
    ok(parse(parser, source).equals(expected));
});

test("satisfy test 1", ()=>{
    var parser = map(<any>join, many1(satisfy(c=>{ 
        var i = c.charCodeAt(0);
        return i >= 80 && i <= 85;
    })));; 
    var source = "XXXXXXXXXXXX";
    var expected = Parsect.newFailureState(source, 0, '');
    ok(parse(parser, source).equals(expected));
});

test("regexp test 1", ()=>{
    var parser = regexp(/abcde/); 
    var source = "abcde";
    var expected = Parsect.newSuccessState(source, 5, source);
    ok(parse(parser, source).equals(expected));
});

test("regexp test 2", ()=>{
    var parser = regexp(/abc/); 
    var source = "xxabcxx";
    var expected = Parsect.newFailureState(source, 0, 'expected /abc/');
    ok(parse(parser, source).equals(expected));
});

test("regexp test 3", ()=>{
    var parser = regexp(/a*/); 
    var source = "aaaaabbbbb";
    var expected = Parsect.newSuccessState(source, 5, 'aaaaa');
    ok(parse(parser, source).equals(expected));
});

interface URIParams{
    name: string;
    value: string;
}

interface URI{
    scheme: string;
    host: string[]; 
    port: string;
    path: string[]; 
    params: URIParams[];    
}

test("URI", ()=>{
    var param: Parsect.Parser<URIParams> = seq<URIParams>((s,o)=>{
    	o.name = s(/[_A-z0-9]+/);
    	s('=');
    	o.value = s(/[^&]+/);
	});
    var parser: Parsect.Parser<URI> = seq<URI>((s,o)=>{
    	o.scheme = s(/[a-z]+/);
    	s('://');
    	o.host = s(sepBy1(/[a-z]+/, '.'));
    	o.port = s(optional(series(<any>string(':'), <any>regexp(/\d+/))));
    	s('/');
    	o.path = s(sepBy(/[^\/?]+/, '/'));
    	o.params = s(optional(series(<any>string("?"), <any>sepBy(param,"&"))));
    });
    var source = 'http://www.nicovideo.jp/watch/1356674833?via=thumb_watch';
    var result = parse(parser, source);
    var expected = {"scheme":"http","host":["www","nicovideo","jp"],"path":["watch","1363247616"],"params":[{"name":"via","value":"thumb_watch"}]};
    ok(Parsect.jsonEq(result.value, expected));
});

