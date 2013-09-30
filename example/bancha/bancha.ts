/// <reference path="../../src/parsect.ts" />

// Sample program: BanchaScript compiler
//
// BanchaScript is a AltJS, a programming language compiled into JavaScript source code.
// See bancha.html for sample soruce codes.
//

module bancha {
    import p = Parsect;

    // Lexer. 字句解析器
    var identStart  = p.oneOf("_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
    var identLetter = p.oneOf("_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
    var opStart     = p.oneOf("+-*/=!$%&^~@?_><:|\\.");
    var opLetter    = p.oneOf("+-*/=!$%&^~@?_><:|\\.");
    var lexer: p.GenTokenParser = p.makeTokenParser({
        commentStart:       p.string('/*'),
        commentEnd:         p.string('*/'),
        commentLine:        p.string('//'),
        nestedComments:     true,
        identStart:         identStart,
        identLetter:        identLetter,
        opStart:            opStart,
        opLetter:           opLetter,
        reservedNames:      ["function", "return", "operator", "infix", "infixl", "infixr", "prefix", "postfix", "var", "if", "else", "for", "native"],
        reservedOpNames:    [],
        caseSensitive:      true
    });    

    export class Scope {

        operators: p.OperatorTable<string>[] = [];

        // 演算子の関数化のためのテーブル
        binaryOps: { [symbol: string]: (x: string, y: string) => string } = {};
        unaryOps:  { [symbol: string]: (x: string           ) => string } = {};        

        constructor(){
            this.operators[0] = new p.OperatorTable();

            // 関数の中置記法
            this.operators[0].infix.push(
                lexer.lexeme(p.seq(s=>{
                    s(p.string("`"));   // バッククォートの後ろに空白を許可していない
                    var ops = s(identStart);
                    var opl = s(p.many(identLetter));
                    s(p.string("`"));
                    return (x: string, y: string)=> "(" + ops + opl.join('') + "(" + x + "," + y + "))";
                }))
            );            
        }
    }

    export function compile(scope: Scope, source: string): p.Reply<string,void> {

        // mutable
        var _expression: p.Parser<string> = null;

        var expression: p.Parser<string> = p.lazy((): p.Parser<string> => {
            if( ! _expression){
                var _table = Object.keys(scope.operators).sort().map(k => scope.operators[k]);
                _expression = p.makeExpressionParser(_table, term);
            }
            return _expression;
        });

        var term: p.Parser<string> = p.label("term", p.seq((s: p.Context<void>): string =>{

            var arrowFunctionArgs = p.or(
                p.fmap((x: string): string[] => [x], lexer.identifier),
                lexer.parens(p.sepBy(lexer.identifier, lexer.comma))
            );
            var arrowFunctionBody = p.or(
                p.fmap((xs: string[]): string => "{" + xs.join('') + "}", lexer.braces(p.many(statement))),
                expression
            );
            var arrowFunction: p.Parser<string> = p.seq((s: p.Context<void>): string =>{
                var args: string[] = s(arrowFunctionArgs);
                s(lexer.symbol("=>"));
                var e: string = s(arrowFunctionBody);
                return s.success && "(function(" + args.join(',') + "){return " + e + "})";
            });

            var nativeDirective: p.Parser<string> = p.seq((s: p.Context<void>): string =>{
                s(lexer.reserved("native"));
                return s(lexer.stringLiteral);
            });

            var functionalOperator: p.Parser<string> = p.fmap((op: string): string =>{
                     if(scope.binaryOps[op]) return '(function(x,y){return ' + scope.binaryOps[op]("x", "y") + '})';
                else if(scope.unaryOps [op]) return '(function(x){return '   + scope.unaryOps[op]("x") + '})';
                else throw new Error("Unknown operator: " + op);
            }, lexer.parens(lexer.operator));

            var arrayLiteral: p.Parser<string> = p.fmap((xs: string[]): string => "[" + xs.join(',') + "]", lexer.brackets(p.sepBy(expression, lexer.comma)));

            var rightSection: p.Parser<string> = p.seq((s: p.Context<void>): string =>{
                s(lexer.symbol("("));
                var op = s(lexer.operator);
                var e = s(simpleExpressionParser);
                s(lexer.symbol(")"));
                if(scope.binaryOps[op]){
                    return "(function(x){return " + scope.binaryOps[op]("x", e) + "})";
                }
            });

            var leftSection: p.Parser<string> = p.seq((s: p.Context<void>): string =>{
                s(lexer.symbol("("));
                var e = s(simpleExpressionParser);
                var op = s(lexer.operator);
                s(lexer.symbol(")"));
                if(scope.binaryOps[op]){
                    return "(function(x){return " + scope.binaryOps[op](e, "x") + "})";
                }
            });

            var simpleExpressionParser: p.Parser<string> = p.or(
                p.triable(functionalOperator),                                          // `演算子`
                p.triable(arrowFunction),                                               // アロー関数式      
                arrayLiteral,                                                           // 配列リテラル
                p.triable(rightSection),
                p.triable(leftSection),
                p.fmap(x => '(' + x + ')', lexer.parens(expression)),                   // ( 式 )
                p.fmap(x => '"' + x + '"', lexer.stringLiteral),                        // 文字列リテラル
                p.fmap(x => x.toString(), lexer.naturalOrFloat),                        // 数値リテラル
                nativeDirective,                                                        // native ディレクティブ
                lexer.identifier                                                        // 識別子
            );


            var simpleExpression: string = s(simpleExpressionParser);

            // Function application syntax parser. 関数適用
            var functionApplication: p.Parser<string> = p.fmap(
                (args: string[]): string　=>　{
                    if(args.every(x => !!x)){
                        // 通常の関数適用
                        return simpleExpression +　"("　+　args.join(',')　+　")"
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
                        return "(function(fn){return function(" + remains.join(',') + "){return fn(" + params.join(',') + ")}}(" + simpleExpression + "))";
                    }
                }, 
                lexer.parens(p.sepBy(p.option(null, expression), lexer.comma))
            ); // 関数呼び出し
            
            return s(p.option(simpleExpression, functionApplication));
        }));
        
        var exprStatement: p.Parser<string> = p.fmap((e: string): string => e + ";", p.head(expression, lexer.semi));

        var varExpression: p.Parser<string> = p.seq((s: p.Context<void>): string => {
            s(lexer.reserved("var"));
            var name: string = s(lexer.identifier);
            s(lexer.symbol("="));
            var e: string = s(expression);
            return "var " + name + "=" + e;
        });


        var varStatement: p.Parser<string> = p.seq((s: p.Context<void>): string => {
            var e: string = s(varExpression);
            s(lexer.semi);
            return e + ";";
        });

        var returnStatement: p.Parser<string> = p.fmap((e: string): string => "return "+e+";", p.between(lexer.reserved("return"), expression, lexer.semi));

        var operatorStatement: p.Parser<string> = p.seq((s: p.Context<void>): string =>{            
            s(lexer.reserved("operator"));
            var op: string = s(lexer.operator);
            var type = s(p.choice(["infixl", "infixr", "infix", "prefix", "postfix"].map(lexer.reserved)));        
            var precedence = s(lexer.natural);
            s(lexer.symbol("="));

            function addOperator(unary: (x: string)=>string, binary: (x: string, y: string)=>string): void {
                var table = scope.operators[precedence];
                if( ! table){
                    table = new p.OperatorTable();
                    scope.operators[precedence] = table;
                }
                switch(type){
                    case "infixl" : table.infixl .push(p.fmap(_ => binary, lexer.reservedOp(op))); scope.binaryOps[op] = binary; break;
                    case "infixr" : table.infixr .push(p.fmap(_ => binary, lexer.reservedOp(op))); scope.binaryOps[op] = binary; break;
                    case "infix"  : table.infix  .push(p.fmap(_ => binary, lexer.reservedOp(op))); scope.binaryOps[op] = binary; break;
                    case "prefix" : table.prefix .push(p.fmap(_ => unary , lexer.reservedOp(op))); scope.unaryOps [op] = unary;  break;
                    case "postfix": table.postfix.push(p.fmap(_ => unary , lexer.reservedOp(op))); scope.unaryOps [op] = unary;  break;                        
                }
                _expression = null;
            }

            s(p.or(
                // Function Alias Operator 
                p.fmap(func => { 
                    addOperator(
                        (x: string           ) => [func, "(", x,         ")"].join(''), 
                        (x: string, y: string) => [func, "(", x, ",", y, ")"].join('')
                    );
                }, lexer.identifier),
                
                // Native Operator 
                p.fmap(lit => { 
                    addOperator(
                        (x: string           ) => lit.replace("{0}", x                  ), 
                        (x: string, y: string) => lit.replace("{0}", x).replace("{1}", y)
                    );
                }, lexer.stringLiteral)
            ));
            s(lexer.semi);
            return "";
        });

        var ifStatement: p.Parser<string> = p.seq(s=>{
            s(lexer.reserved("if"));
            var condition = s(lexer.parens(expression));
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
                var init = s(p.option("", p.or(varExpression, expression)));
                s(lexer.semi);
                var cond = s(expression);
                s(lexer.semi);
                var next = s(expression);
                return "(" + init + ";" + cond + ";" + next + ")";
            })));
            var body = s(block);
            return "for" + header + body;
        });

        var functionStatement = p.seq((s: p.Context<void>)=>{
            s(lexer.reserved("function"));
            var name: string = s(lexer.identifier);
            var args: string[] = s(lexer.parens(p.sepBy(lexer.identifier, lexer.comma)));
            var body: string[] = s(lexer.braces(p.many(statement)));
            return s.success && ["function ", name, "(", args.join(','), "){", body.join(""), "}"].join('');
        });

        var statement = p.or(functionStatement, returnStatement, ifStatement, forStatement, varStatement, exprStatement);

        var block = p.or(p.fmap((xs: string[]) => "{" + xs.join('') + "}", lexer.braces(p.many(statement))), expression);

        var topLevelStatement: p.Parser<string> = p.or(functionStatement, operatorStatement, ifStatement, forStatement, varStatement, exprStatement);

        // スクリプト全体を解析するパーサ
        var script: p.Parser<string> = p.between(
            // パーサは常にトークンの直前で停止しているものとします。
            // 最初のトークンの直前まで空白を読み飛ばします
            lexer.whiteSpace, 
            
            // スクリプト本体の構文解析
            p.fmap((xs: string[])=>xs.join(''), p.many(topLevelStatement)), 
            
            // 入力の終端を確認するために、eof を使います。
            p.eof
        );

        return p.parse(script, new p.State(source, 0));
    }
}