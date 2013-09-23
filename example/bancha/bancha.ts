/// <reference path="../../src/parsect.ts" />
module bancha {
    import p = Parsect;

    // 字句解析器
    var lexer: p.GenTokenParser = p.makeTokenParser({
        commentStart:       '/*',
        commentEnd:         '*/',
        commentLine:        '//',
        nestedComments:     true,
        identStart:         p.regexp(/[_$a-zA-Z]/),
        identLetter:        p.regexp(/[_$a-zA-Z0-9]/),
        opStart:            p.regexp(/[+\-*\/=!$%&\^~@?_><:|\\.]/),
        opLetter:           p.regexp(/[+\-*\/=!$%&\^~@?_><:|\\.]/),
        reservedNames:      ["function", "return", "operator", "infix", "infixl", "infixr", "prefix", "postfix", "var", "if", "else", "for", "native"],
        reservedOpNames:    [],
        caseSensitive:      true
    });    

    export class Scope {

        opTable: p.Operator<string>[][] = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
        
        constructor(){
        }
    }

    export function compile(scope: Scope, source: string): p.Reply<string,void> {

        // mutable
        var expression: p.Parser<string> = null;

        var expr: p.Parser<string> = p.lazy((): p.Parser<string> => {
            if( ! expression){
                expression = p.buildExpressionParser(scope.opTable, term);
            }
            return expression;
        });

        var term: p.Parser<string> = p.label("term", p.seq((s: p.Context<string,void>): string =>{

            var arrowFunction: p.Parser<string> = p.seq((s: p.Context<string,void>): string =>{
                var args: string[] = s(p.or(
                    p.fmap((x: string): string[] => [x], lexer.identifier),
                    lexer.parens(p.sepBy(lexer.identifier, lexer.comma))
                ));
                s(lexer.symbol("=>"));
                var e: string = s(p.or(
                    p.fmap((xs: string[]): string => "{" + xs.join('') + "}", lexer.braces(p.many(statement))),
                    expr
                ));
                return s.success && "(function(" + args.join(',') + "){return " + e + "})";
            });

            var nativeDirective: p.Parser<string> = p.seq((s: p.Context<string,void>): string =>{
                s(lexer.reserved("native"));
                return s(lexer.stringLiteral);
            });

            var functionalOperator: p.Parser<string> = p.fmap((op: string): string => '(function(x,y){return x' + op + 'y})', lexer.parens(lexer.operator));

            var value: string = s(p.or(
                p.triable(functionalOperator),
                p.fmap(x => '(' + x + ')', lexer.parens(expr)),                         // ( 式 )
                p.fmap(x => '"' + x + '"', lexer.stringLiteral),                        // 文字列リテラル
                p.fmap(x => x.toString(), lexer.naturalOrFloat),                        // 数値リテラル
                nativeDirective,                                                        // native ディレクティブ
                p.triable(arrowFunction),                                               // アロー関数式
                lexer.identifier                                                        // 識別子
            ));
            
            // 関数適用
            var app: p.Parser<string> = p.fmap(
                (args: string[]): string　=>　{
                    if(args.every(x => !!x)){
                        // 通常の関数適用
                        return value　+　"("　+　args.join(',')　+　")"
                    }else{
                        // 関数の部分適用
                        var params: string[] = [];
                        var remains: string[] = [];
                        for(var i = 0; i < args.length; i++){
                            if(args[i] === null){
                                var v = String.fromCharCode(97 + i).toString();
                                remains.push(v);                                
                                params.push(v);
                            }else{
                                params.push(args[i]);
                            }
                        }
                        return "(function(fn){return function(" + remains.join(',') + "){return fn(" + params.join(',') + ")}}(" + value + "))";
                    }
                }, 
                lexer.parens(p.sepBy(p.option(null, expr), lexer.comma))
            ); // 関数呼び出し
            
            return s(p.option(value, app));
        }));
        
        var exprStatement: p.Parser<string> = p.fmap((e: string): string => e + ";", p.head(expr, lexer.semi));

        var varExpression: p.Parser<string> = p.seq((s: p.Context<string,void>): string => {
            s(lexer.reserved("var"));
            var name: string = s(lexer.identifier);
            s(lexer.symbol("="));
            var e: string = s(expr);
            return "var " + name + "=" + e;
        });

        var varStatement: p.Parser<string> = p.seq((s: p.Context<string,void>): string => {
            var e: string = s(varExpression);
            s(lexer.semi);
            return e + ";";
        });

        var returnStatement: p.Parser<string> = p.fmap((e: string): string => "return "+e+";", p.between(lexer.reserved("return"), expr, lexer.semi));

        var operatorStatement: p.Parser<string> = p.seq((s: p.Context<string,void>): string =>{
            function addOperator(unary: (x: string)=>string, binary: (x: string, y: string)=>string): void {
                var newOperator = type === "prefix"  ? lexer.prefix (op, unary) :
                                  type === "postfix" ? lexer.postfix(op, unary) :
                                  lexer.binary(
                                      op, binary, 
                                      type === "infixl" ? p.Assoc.Left : 
                                      type === "infixr" ? p.Assoc.Right : 
                                      p.Assoc.None
                                  );
                scope.opTable[precedence].push(newOperator);
                expression = null;
            }

            s(lexer.reserved("operator"));
            var op: string = s(lexer.operator);
            var type = s(p.choice(["infixl", "infixr", "infix", "prefix", "postfix"].map(lexer.reserved)));        
            var precedence = s(lexer.natural);
            s(lexer.symbol("="));
            s(p.or(
                p.fmap(func =>{ 
                    addOperator((x)=>[func, "(", x, ")"].join(''), (x,y)=>[func, "(", x, ",", y, ")"].join(''));
                }, lexer.identifier),
                p.fmap(lit =>{ 
                    addOperator((x: string)=>lit.replace("{0}", x), (x: string, y: string)=>lit.replace("{0}", x).replace("{1}", y));
                }, lexer.stringLiteral)
            ));
            s(lexer.semi);
            return "";
        });

        var ifStatement: p.Parser<string> = p.seq(s=>{
            s(lexer.reserved("if"));
            var condition = s(lexer.parens(expr));
            var thenClause = s(block);
            var elseClause = s(p.option("", p.seq(s=>{
                s(lexer.reserved("else"));
                return "else" + s(p.or(block, ifStatement));
            })));
            return "if(" + condition + ")" + thenClause + elseClause;
        });

        var forStatement: p.Parser<string> = p.seq(s=>{
            s(lexer.reserved("for"));
            var header = s(lexer.parens(p.seq(s=>{
                var init = s(p.option("", p.or(varExpression, expr)));
                s(lexer.semi);
                var cond = s(expr);
                s(lexer.semi);
                var next = s(expr);
                return "(" + init + ";" + cond + ";" + next + ")";
            })));
            var body = s(block);
            return "for" + header + body;
        });

        var funcStatement = p.seq((s: p.Context<string,void>)=>{
            s(lexer.reserved("function"));
            var name: string = s(lexer.identifier);
            var args: string[] = s(lexer.parens(p.sepBy(lexer.identifier, lexer.comma)));
            var body: string[] = s(lexer.braces(p.many(statement)));
            return s.success && ["function ", name, "(", args.join(','), "){", body.join(""), "}"].join('');
        });

        var statement = p.or(funcStatement, returnStatement, ifStatement, forStatement, varStatement, exprStatement);

        var block = p.or(p.fmap((xs: string[]) => "{" + xs.join('') + "}", lexer.braces(p.many(statement))), expr);

        var topLevelStatement: p.Parser<string> = p.or(funcStatement, operatorStatement, ifStatement, forStatement, varStatement, exprStatement);

        var script: p.Parser<string> = p.between(
            lexer.whiteSpace, 
            p.fmap((xs: string[])=>xs.join(''), p.many(topLevelStatement)), 
            p.eof
        );

        return p.parse(script, new p.State(source, 0));
    }
}