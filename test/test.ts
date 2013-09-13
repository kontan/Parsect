/// <reference path="qunit.d.ts" />
/// <reference path="../src/parsect.ts" />

module Tests {

    import p = Parsect;

    function join(ss:string[]): string{
        return ss.join();
    }

    test("Source object instantiation and equation", function() {
        var src:p.Source = new p.Source("hoge");
        ok(src.equals(new p.Source("hoge", 0)));
        var src2:p.Source = new p.Source("hoge", 2);
        ok(src2.equals(new p.Source("hoge", 2)));
        ok(new p.Source("hoge", 4).equals(new p.Source("hoge", 4)));
        ok(new p.Source("hoge", 5).equals(new p.Source("hoge", 5)));
    });

    test("Source object invariance test", function() {
        var src:p.Source = new p.Source("hoge");
        ok(src.equals(new p.Source("hoge", 0)));
        Parsect.success(src, 2, "2");
        ok(src.equals(new p.Source("hoge", 0)));    
        Parsect.failure(src, "fail");
        ok(src.equals(new p.Source("hoge", 0)));
    });

    test("parse function test", function() {
        var parser = "hoge";

        // Success
        var s = p.parse(parser, new p.Source("hoge"));
        ok(s.success);
        strictEqual(s.source.position, 4);
        strictEqual(s.value, "hoge");
        strictEqual(s.errorMesssage, undefined);

        // Success
        var s = p.parse(parser, "hoge");
        ok(s.success);
        strictEqual(s.source.position, 4);
        strictEqual(s.value, "hoge");
        strictEqual(s.errorMesssage, undefined);
    });

    test("string parser test", function() {
        var parser = "hoge";

        // Success
        var source = "hoge";
        var expectedS = Parsect.success(source, 0, "hoge");
        ok(p.parse(parser, source).equals(expectedS));

          // Fail
        var source = "piyo";
        var expected = Parsect.failure(source, 0, "expected \"hoge\"");
        ok(p.parse(parser, source).equals(expected));

        // Fail
        var source = "hopo";
        var expected = Parsect.failure(source, 0, "expected \"hoge\"");
        ok(p.parse(parser, source).equals(expected));

          // Fail
        var source = "";
        var expected = Parsect.failure(source, 0, "expected \"hoge\"");
        ok(p.parse(parser, source).equals(expected));
    });

    interface SeqTestData{
        e: string;
    }

    test("seq parser test", function() {
        var parser = p.seq<SeqTestData,void>((s,o)=>{
            s("(");
            o.e = s("hoge");
            s(")");
        });

        // Success
        var source = "(hoge)";
        var expected: Parsect.State<SeqTestData> = Parsect.success<SeqTestData>(source, 6, { 'e': 'hoge' });
        ok(p.parse(parser, source).equals(expected));

          // Fail
        var source = "(piyo)";
        var expected2: Parsect.State<any> = Parsect.failure(source, 1, "expected \"hoge\"");
        ok(p.parse(parser, source).equals(expected2));
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
        var identifier = p.regexp(/[A-z]+/);

        var argParser: Parsect.Parser<SeqTestJsonDataArgs> = p.seq<SeqTestJsonDataArgs,void>((s,o)=>{
            o.name = s(identifier);
            o.optional = s(p.optional('?'));
            s(':');
            o.type = s(identifier);
        });

        var argsParser: Parsect.Parser<SeqTestJsonDataArgs[]> = p.sepBy(argParser,  p.string(','));

        var parser: Parsect.Parser<SeqTestJsonData> = p.seq<SeqTestJsonData,void>((s,o)=>{
            o.name = s(identifier);
            s('(');
            o.args = s(argsParser);
            s(')');
            s(':');
            o.ret = s(identifier);
        });

        // Success
        var input = "indexOf(searchString:string,position?:number):number";
        var s = p.parse(parser, input);
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
        var parser = p.trying(p.seq((s)=>{
            s("(");
            var e = s("hoge");
            s(")");
            return e;
        }));
        var parens_a = p.between(p.string('('), p.string('a'), p.string(')'));
        var parens_b = p.between(p.string('('), p.string('b'), p.string(')'));
        //ok(p.parse(parser, "(hoge)").equals(new Parsect.State(new p.Source("(hoge)", 6), true, "hoge")));
        ok(p.parse(p.or(parens_a, parens_b), "(b)").equals(new Parsect.State(new p.Source("(b)", 1), false, undefined, "expected \"a\"")));
        //ok(p.parse(p.or(trying(parens_a), parens_b), "(b)").equals(Parsect.success(new p.Source("(b)", 3), 0, "b")));
    });

    test("count function test", ()=>{
        var parser:Parsect.Parser<string> = p.map(join,  p.count(3, "a"));
        ok(p.parse(parser, "aaa").equals(new Parsect.State(new p.Source("aaa", 3), true, "a,a,a")));
    });

    test("many function test", ()=>{
        var parser:Parsect.Parser<string> = p.map(join, p.many("a"));
        ok(p.parse(parser, "aa").equals(new Parsect.State(new p.Source("aa", 2), true, "a,a")));
    });

    test("many1 function test", ()=>{
        var parser:Parsect.Parser<string> = p.map( join, p.many1("a"));
        ok(p.parse(parser, "aaaaaaa").equals(new Parsect.State(new p.Source("aaaaaaa", 7), true, "a,a,a,a,a,a,a")));
    });

    test("many1 function test", ()=>{
        var parser:Parsect.Parser<string> = p.map(join, p.many1("a"));
        ok(p.parse(parser, "aaaaaaa").equals(new Parsect.State(new p.Source("aaaaaaa", 7), true, "a,a,a,a,a,a,a")));
    });

    test("number parser test", ()=>{
        var expected = new Parsect.State(new p.Source("-123.567", 8), true, -123.567);
        ok(p.parse(p.number, "-123.567").equals(expected));
    });

    test("or function test", ()=>{
        var source = "baabbabaabbbazaabb";
        var parser = p.map(join, p.many(p.or(p.string("a"), p.string("b"))));
        var expected = new Parsect.State(new p.Source(source, 13), true, "b,a,a,b,b,a,b,a,a,b,b,b,a");
        ok(p.parse(parser, source).equals(expected));
    });

    test("sepBy1 test 1", ()=>{
        var source = "a_a_a";
        var parser = p.map(join, p.sepBy1(p.string("a"), p.string("_"))); 
        var expected = Parsect.success(source, 5, "a,a,a");
        ok(p.parse(parser, source).equals(expected));
    });

    test("sepBy1 test 2", ()=>{
        var parser = p.map(join, p.sepBy1(p.string("a"), p.string("_"))); 
        var source = "";
        var expected = Parsect.failure(source, 0, "expected \"a\"");
        ok(p.parse(parser, source).equals(expected));
    });

    test("sepBy1 test 3", ()=>{
        var parser = p.map(join, p.sepBy1(p.string("a"), p.string("_"))); 
        var source = "a";
        var expected = Parsect.success(source, 1, "a");
        ok(p.parse(parser, source).equals(expected));
    });

    test("sepBy1 test 4", ()=>{
        var parser = p.map(join, p.sepBy1(p.string("a"), p.string("_"))); 
        var source = "a_b";
        var expected = Parsect.failure(source, 2, "expected \"a\"");
        ok(p.parse(parser, source).equals(expected));
    });

    test("between test 1", ()=>{
        var parser = p.between(p.string('['), p.string('a'), p.string(']')); 
        var source = "[a]";
        var expected = Parsect.success(source, 3, "a");
        ok(p.parse(parser, source).equals(expected));
    });

    test("between test 2", ()=>{
        var parser = p.between(p.string('['), p.string('a'), p.string(']')); 
        var source = "[b]";
        var expected = Parsect.failure(source, 1, "expected \"a\"");
        ok(p.parse(parser, source).equals(expected));
    });

    test("between test 3", ()=>{
        var parser = p.between('[', 'a', ']'); 
        var source = "[a]";
        var expected = Parsect.success(source, 3, "a");
        ok(p.parse(parser, source).equals(expected));
    });


    test("eof test 1", ()=>{
        var parser = p.between(p.string('['), p.string('a'), p.string(']')); 
        var source = "";
        var expected = Parsect.success(source, 1,  undefined);
        ok(p.parse(p.eof, source).equals(expected));
    });

    test("eof test 2", ()=>{
        var parser = p.tail(p.string("a"), p.eof); 
        var source = "a";
        var expected = Parsect.success(source, 2,  undefined);
        ok(p.parse(parser, source).equals(expected));
    });

    test("eof test 2", ()=>{
        var parser = p.eof; 
        var source = "a";
        var expected = Parsect.failure(source, 0,  undefined);
        ok(p.parse(parser, source).equals(expected));
    });

    test("empty test", ()=>{
        var parser = p.empty; 
        var source = "a";
        var expected = Parsect.success(source, 0,  undefined);
        ok(p.parse(parser, source).equals(expected));
    });

    test("satisfy test 1", ()=>{
        var parser = p.map(join, p.many1(p.satisfy(c=>{ 
            var i = c.charCodeAt(0);
            return i >= 80 && i <= 85;
        })));; 
        var source = "PQRRQPOPhoge";
        var expected = Parsect.success(source, 6, 'P,Q,R,R,Q,P');
        ok(p.parse(parser, source).equals(expected));
    });

    test("satisfy test 2", ()=>{
        var parser = p.map(join, p.many1(p.satisfy(c=>{ 
            var i = c.charCodeAt(0);
            return i >= 80 && i <= 85;
        })));; 
        var source = "XXXXXXXXXXXX";
        var expected = Parsect.failure(source, 0, 'expected one char of "PQRSTU"');
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("regexp test 1", ()=>{
        var parser = p.regexp(/abcde/); 
        var source = "abcde";
        var expected = Parsect.success(source, 5, source);
        ok(p.parse(parser, source).equals(expected));
    });

    test("regexp test 2", ()=>{
        var parser = p.regexp(/abc/); 
        var source = "xxabcxx";
        var expected = Parsect.failure(source, 0, 'expected /abc/');
        ok(p.parse(parser, source).equals(expected));
    });

    test("regexp test 3", ()=>{
        var parser = p.regexp(/a*/); 
        var source = "aaaaabbbbb";
        var expected = Parsect.success(source, 5, 'aaaaa');
        ok(p.parse(parser, source).equals(expected));
    });

    test("lazy test 1", ()=>{
        var parser = p.or(/[a-z]/, p.between("[", ()=> parser, "]"));
        var source = "[[[[x]]]]";
        var expected = Parsect.success(source, 3, 'x');
        ok(p.parse(parser, source).equals(expected));
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
        var param: Parsect.Parser<URIParams> = p.seq<URIParams,void>((s,o)=>{
        	o.name = s(/[_A-z0-9]+/);
        	s('=');
        	o.value = s(/[^&]+/);
    	});
        var parser: Parsect.Parser<URI> = p.seq<URI,void>((s,o)=>{
        	o.scheme = s(/[a-z]+/);
        	s('://');
        	o.host = s(p.sepBy1(/[a-z]+/, '.'));
        	o.port = s(p.optional(p.tail(p.string(':'), p.regexp(/\d+/))));
        	s('/');
        	o.path = s(p.sepBy(/[^\/?]+/, '/'));
        	o.params = s(p.optional(p.tail(p.string("?"), p.sepBy(param,"&"))));
        });
        var source = 'http://www.nicovideo.jp/watch/1356674833?via=thumb_watch';
        var result = p.parse(parser, source);
        var expected = {"scheme":"http","host":["www","nicovideo","jp"],"path":["watch","1363247616"],"params":[{"name":"via","value":"thumb_watch"}]};
        ok(Parsect.jsonEq(result.value, expected));
    });
}