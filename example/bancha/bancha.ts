/// <reference path="../../src/parsect.ts" />
module bancha {
    import p = Parsect;

    export function compile(source: string): p.Reply<string,void> {
        // 字句解析器
        var lexer = p.makeTokenParser({
            commentStart:       '/*',
            commentEnd:         '*/',
            commentLine:        '//',
            nestedComments:     true,
            identStart:         /[_$a-zA-Z]/,
            identLetter:        /[_$a-zA-Z0-9]/,
            opStart:            /[+\-*\/=!$%&\^~@?_><:|\\.]/,
            opLetter:           /[+\-*\/=!$%&\^~@?_><:|\\.]/,
            reservedNames:      ["def", "return", "operator", "infix", "infixl", "infixr", "prefix", "postfix", "var", "if", "else", "for"],
            reservedOpNames:    [],
            caseSensitive:      true
        });

        // 演算子表
        var opTable: p.Operator<string>[][] = [
            [], // Precedense 0   (in javascript, 3)
            [lexer.prefix("-", x=>"-"+x), lexer.prefix("+", x=>x)], // Precedense 1 (4)
            [lexer.binary("*", (x,y)=>x+"*"+y, p.Assoc.Left), lexer.binary("/", (x,y)=>x+"/"+y, p.Assoc.Left)], // 2 (5)
            [lexer.binary("+", (x,y)=>x+"+"+y, p.Assoc.Left), lexer.binary("-", (x,y)=>x+"-"+y, p.Assoc.Left)], // 3 (6)
            [], 
            [lexer.binary("<", (x,y)=>x+"<"+y, p.Assoc.Left), lexer.binary(">", (x,y)=>x+">"+y, p.Assoc.Left), lexer.binary(">=", (x,y)=>x+">="+y, p.Assoc.Left), lexer.binary("<=", (x,y)=>x+"<="+y, p.Assoc.Left)], // 5 (8) 
            [lexer.binary("==", (x,y)=>x+"=="+y, p.Assoc.Left), lexer.binary("!=", (x,y)=>x+"!="+y, p.Assoc.Left)], // 6 (9)
            [], [], []
        ];

        // 構文解析器
        function buildStatementParser(): p.Parser<string> {

            var term = p.label("term", p.seq(s=>{
                var value = s(p.or(
                    p.fmap(x=>'('+x+')', lexer.parens(()=>expr)),                         // ( 式 )
                    p.fmap(x=>'"'+x+'"', lexer.stringLiteral),      // 文字列リテラル
                    p.fmap(x=>x.toString(), lexer.naturalOrFloat),                           // 数値リテラル
                    lexer.identifier                                // 識別子
                ));
                var app = p.fmap(args=>[value, "(", args.join(','), ")"].join(''), lexer.parens(p.sepBy(expr, lexer.comma))); // 関数呼び出し
                return s(p.option(value, app));
            }));
            var expr = p.buildExpressionParser(opTable, term);

            var exprStatement = p.fmap((e: string)=>e+";", p.head(expr, lexer.semi));

            var varStatement = p.seq(s=>{
                s(lexer.reserved("var"));
                var name = s(lexer.identifier);
                s(lexer.symbol("="));
                var e = s(expr);
                s(lexer.semi);
                return s.success && ["var ", name, "=", e, ";"].join('');
            });

            var returnStatement = p.fmap((e: string)=>"return "+e+";", p.between(lexer.reserved("return"), expr, lexer.semi));

            var operatorStatement = p.seq(s=>{
                s(lexer.reserved("operator"));
                var op: string = s(lexer.operator);
                var type = s(p.choice(["infixl", "infixr", "infix", "prefix", "postfix"].map(lexer.reserved)));        
                var precedence = s(lexer.natural);
                s(lexer.symbol("="));
                var func = s(lexer.identifier);
                s(lexer.semi);
                if(s.success){
                    var newOperator = type === "prefix"  ? lexer.prefix (op, (x)=>[func, "(", x, ")"].join('')) :
                                      type === "postfix" ? lexer.postfix(op, (x)=>[func, "(", x, ")"].join('')) :
                                      lexer.binary(
                                          op, (x,y)=>[func, "(", x, ",", y, ")"].join(''), 
                                          type === "infixl" ? p.Assoc.Left : type === "infixr" ? p.Assoc.Right : p.Assoc.None
                                      );
                    opTable[precedence].push(newOperator);
                    topLevelStatement = buildStatementParser();
                }
                return "";
            });

            var ifStatement = p.seq(s=>{
                s(lexer.reserved("if"));
                var condition = s(lexer.parens(expr));
                var thenClause = s(block);
                var elseClause = s(p.option("", p.seq(s=>{
                    s(lexer.reserved("else"));
                    return "else" + s(p.or(block, ifStatement));
                })));
                return "if(" + condition + ")" + thenClause + elseClause;
            });

            var forStatement = p.seq(s=>{
                s(lexer.reserved("for"));
                var header = s(lexer.parens(p.seq(s=>{
                    var init = s(expr);
                    s(lexer.semi);
                    var cond = s(expr);
                    s(lexer.semi);
                    var next = s(expr);
                    return "(" + init + ";" + cond + ";" + next + ")";
                })));
                var body = s(block);
                return s.success && "for" + header + body;
            });

            var funcStatement = p.seq(s=>{
                s(lexer.reserved("def"));
                var name = s(lexer.identifier);
                var args = s(lexer.parens(p.sepBy(lexer.identifier, lexer.comma)));
                var body = s(lexer.braces(p.many(statement)));
                return s.success && ["function ", name, "(", args.join(','), "){", body.join(""), "}"].join('');
            });

            var statement = p.or(funcStatement, returnStatement, ifStatement, forStatement, varStatement, exprStatement);

            var block = p.or(p.fmap(xs=>"{" + xs.join('') + "}", lexer.braces(p.many(statement))), expr);

            return p.or(funcStatement, operatorStatement, ifStatement, forStatement, varStatement, exprStatement);
        }

        var topLevelStatement = buildStatementParser();
        var script = p.between(
            lexer.whiteSpace, 
            p.fmap((xs: string[])=>xs.join(''), p.many(p.lazy(()=>topLevelStatement))), 
            p.eof
        );
        return p.parse(script, new p.State(source, 0));
    }
}