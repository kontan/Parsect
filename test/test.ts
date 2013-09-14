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
        Parsect.success(src.step(2), "2");
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
        strictEqual(s.expected, undefined);

        // Success
        var s = p.parse(parser, "hoge");
        ok(s.success);
        strictEqual(s.source.position, 4);
        strictEqual(s.value, "hoge");
        strictEqual(s.expected, undefined);
    });

    test("string parser test1", function() {
        var parser = "hoge";
        var source = "hoge";
        var expected = Parsect.success(new p.Source(source, 4), "hoge");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("string parser test2", function() {
        var parser = "hoge";
        var source = "piyo";
        var expected = Parsect.failure(source, "\"hoge\"");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("string parser test3", function() {
        var parser = "hoge";
        var source = "hopo";
        var expected = Parsect.failure(source, "\"hoge\"");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("string parser test4", function() {
        var parser = "hoge";
        var source = "";
        var expected = p.failure(source, "\"hoge\"");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
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
        var expected: p.State<SeqTestData> = p.success<SeqTestData>(new p.Source(source, 6), { 'e': 'hoge' });
        ok(p.parse(parser, source).equals(expected));

          // Fail
        var source = "(piyo)";
        var expected2: p.State<any> = p.failure(new p.Source(source, 1), "\"hoge\"");
        ok(p.parse(parser, source).equals(expected2));
    });

    interface SeqTestJsonData{
        name: string;
        args: SeqTestJsonDataArgs[];
        ret: string;
    }

    interface SeqTestJsonDataArgs{
        name: string;
        optional: string;
        type: string;
    }

    test("seq 1", ()=>{
        var parser = p.seq(s=>{
            var a = s("a");
            var b = s("b");
            return s(()=> a + b);
        }); 
        var source = "ab";
        var expected = p.success(new p.Source(source, 2), "ab");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("triable 1", ()=>{
        var parser = p.triable(p.seq((s)=>{
            s("(");
            var e = s("hoge");
            s(")");
            return e;
        }));
        var parens_a = p.between('(', 'a', ')');
        var parens_b = p.between('(', 'b', ')');
        var parser = p.or(parens_a, parens_b);

        var source = "(b)";
        var expected = p.failure(new p.Source("(b)", 1), "\"a\"");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("count 1", ()=>{
        var parser = p.map(join,  p.count(3, "a"));
        var source = "aaa";
        var expected = p.success(new p.Source("aaa", 3), "a,a,a");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("many 1", ()=>{
        var parser = p.map(join, p.many("a"));
        var source = "aa";
        var expected = p.success(new p.Source("aa", 2), "a,a");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("many1 1", ()=>{
        var parser = p.map( join, p.many1("a"));
        var source = "aaaaaaa";
        var expected = p.success(new p.Source("aaaaaaa", 7), "a,a,a,a,a,a,a");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("many1 2", ()=>{
        var parser = p.map(join, p.many1("a"));
        var source = "aaaaaaa";
        var expected = p.success(new p.Source("aaaaaaa", 7), "a,a,a,a,a,a,a");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("number 1", ()=>{
        var parser = p.number;
        var source = "-123.567";
        var expected = p.success(new p.Source("-123.567", 8), -123.567);
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("or 1", ()=>{
        var source = "baabbabaabbbazaabb";
        var parser = p.many(p.or("a", "b"));
        var expected = new Parsect.State(new p.Source(source, 13), true, ["b","a","a","b","b","a","b","a","a","b","b","b","a"]);
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("or 2", ()=>{
        var source = "x";
        var parser = p.or("a", "b", /c/);
        var expected = p.failure(new p.Source(source, 0), "one of \"a\",\"b\",/c/");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("head 1", ()=>{
        var parser = p.head("a", "b");         
        var source = "ab";
        var expected = p.success(new p.Source(source, 2), "a");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("tail 1", ()=>{
        var parser = p.tail("a", "b");         
        var source = "ab";
        var expected = p.success(new p.Source(source, 2), "b");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("tail 2", ()=>{
        var parser = p.tail("a", p.head("b", "c"));         
        var source = "abc";
        var expected = p.success(new p.Source(source, 3), "b");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });    

    test("sepBy1 1", ()=>{
        var source = "a_a_a";
        var parser = p.sepBy1("a", "_"); 
        var expected = Parsect.success(new p.Source(source, 5), ["a", "a", "a"]);
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("sepBy1 2", ()=>{
        var parser = p.map(join, p.sepBy1("a", "_")); 
        var source = "";
        var expected = Parsect.failure(source, "\"a\"");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("sepBy1 3", ()=>{
        var parser = p.map(join, p.sepBy1("a", "_")); 
        var source = "a";
        var expected = Parsect.success(new p.Source(source, 1), "a");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("sepBy1 4", ()=>{
        var parser = p.map(join, p.sepBy1("a", "_")); 
        var source = "a_b";
        var expected = Parsect.failure(new p.Source(source, 2), "\"a\"");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("endByN 1", ()=>{
        var source = "a;a;a;";
        var parser = p.endBy("a", ";"); 
        var expected = Parsect.success(new p.Source(source, 6), ["a", "a", "a"]);
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });


    test("between 1", ()=>{
        var parser = p.between('[', 'a', ']'); 
        var source = "[a]";
        var expected = Parsect.success(new p.Source(source, 3), "a");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("between 2", ()=>{
        var parser = p.between('[', 'a', ']'); 
        var source = "[b]";
        var expected = Parsect.failure(new p.Source(source, 1), "\"a\"");
        ok(p.parse(parser, source).equals(expected));
    });

    test("between 3", ()=>{
        var parser = p.between('[', 'a', ']'); 
        var source = "[a]";
        var expected = Parsect.success(new p.Source(source, 3), "a");
        ok(p.parse(parser, source).equals(expected));
    });

    test("pure 1", ()=>{
        var parser = p.pure(()=>"x");         
        var source = "abc";
        var expected = p.success(new p.Source(source, 0), "x");
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    }); 

    test("eof 1", ()=>{
        var parser = p.eof; 
        var source = "";
        var expected = Parsect.success(new p.Source(source, 1),  undefined);
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("eof 2", ()=>{
        var parser = p.tail("a", p.eof); 
        var source = "a";
        var expected = Parsect.success(new p.Source(source, 2),  undefined);
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("eof 2", ()=>{
        var parser = p.eof; 
        var source = "a";
        var expected = Parsect.failure(source, undefined);
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("empty 1", ()=>{
        var parser = p.empty; 
        var source = "a";
        var expected = Parsect.success(new p.Source(source, 0),  undefined);
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("satisfy 1", ()=>{
        var parser = p.map(join, p.many1(p.satisfy(c=>{ 
            var i = c.charCodeAt(0);
            return i >= 80 && i <= 85;
        })));; 
        var source = "PQRRQPOPhoge";
        var expected = Parsect.success(new p.Source(source, 6), 'P,Q,R,R,Q,P');
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("satisfy 2", ()=>{
        var parser = p.map(join, p.many1(p.satisfy(c=>{ 
            var i = c.charCodeAt(0);
            return i >= 80 && i <= 85;
        })));; 
        var source = "XXXXXXXXXXXX";
        var expected = Parsect.failure(source, 'one of "PQRSTU"');
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("regexp 1", ()=>{
        var parser = p.regexp(/abcde/); 
        var source = "abcde";
        var expected = Parsect.success(new p.Source(source, 5), source);
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("regexp 2", ()=>{
        var parser = p.regexp(/abc/); 
        var source = "xxabcxx";
        var expected = Parsect.failure(source, '/abc/');
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("regexp 3", ()=>{
        var parser = p.regexp(/a*/); 
        var source = "aaaaabbbbb";
        var expected = Parsect.success(new p.Source(source, 5), 'aaaaa');
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("recursive parser 1", ()=>{
        var parser = p.or(/[a-z]/, p.between("[", ()=> parser, "]"));
        var source = "[[[[x]]]]";
        var expected = Parsect.success(new p.Source(source, 9), 'x');
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("recursive parser 2", ()=>{
        var parser = p.or(/[a-z]/, p.between("[", ()=> parser, "]"));
        var source = "[[[[x]]]";
        var expected = Parsect.failure(new p.Source(source, 8), '"]"');
        var result = p.parse(parser, source);
        ok(result.equals(expected));
    });

    test("non-cfg 1", ()=>{
        // { a^n b^n c^n | n >= 0 } = { "", "abc", "aabbcc", "aaabbbccc", ... }
        var parser = p.seq(s=>{
            var a = s(p.many("a"));
            var b = s(p.count(a.length, "b"));
            var c = s(p.count(a.length, "c"));
            return [a, b, c];
        });
        
        var source = "aaaabbbbcccc";
        var expected = Parsect.success(new p.Source(source, 12), [["a", "a", "a", "a"], ["b", "b", "b", "b"], ["c", "c", "c", "c"]]);
        var result = p.parse(parser, source);
        ok(result.equals(expected));

        var source2 = "aaaabbbbcc";
        var expected2 = Parsect.failure(new p.Source(source2, 10), "\"c\"");
        var result2 = p.parse(parser, source2);
        ok(result2.equals(expected2));
    });

    test("seq parser json ast", function() {
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
        var source = "indexOf(searchString:string,position?:number):number";
        var expected: p.State<SeqTestJsonData> = p.success(new p.Source(source, source.length), 
            { 
                'name': 'indexOf', 
                'args': [ 
                    { 'name': 'searchString', 'optional': undefined, 'type': 'string' },
                    { 'name': 'position', 'optional': '?', 'type': 'number' },
                ],
                'ret': 'number' 
            }
        );
        var result = p.parse(parser, source);
        ok(result.equals(expected));
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