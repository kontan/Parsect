var tok_number = map(parseFloat, regexp(/^\s*[-+]?\d+(\.\d+)?\s*/));
var tok_plus = regexp(/^\s*\+\s*/);
var tok_minus = regexp(/^\s*\-\s*/);
var tok_div = regexp(/^\s*\/\s*/);
var tok_mul = regexp(/^\s*\*\s*/);
var tok_left = regexp(/^\s*\(\s*/);
var tok_right = regexp(/^\s*\)\s*/);
var expr = seq(function (s) {
    var v = s(term);
    s(option(v, or(seq(function (s) {
        s(tok_plus);
        var e = s(expr);
        return v + e;
    }), seq(function (s) {
        s(tok_minus);
        var e = s(expr);
        return v - e;
    }))));
});
var term = seq(function (s) {
    var v = s(factor);
    s(option(v, or(seq(function (s) {
        s(tok_mul);
        var t = s(term);
        return v * t;
    }), seq(function (s) {
        s(tok_div);
        var t = s(term);
        return v / t;
    }))));
});
var factor = choice(function (c) {
    c(seq(function (s) {
        s(tok_left);
        var v = s(expr);
        s(tok_right);
        s(ret(function () {
            return v;
        }));
    }));
    c(tok_number);
});
console.log("test expr: ");
console.log(expr.parse(new Source("(4+1.5+-2.5)*2/0.5", 0)).value);
console.log("test div: 12/2= ");
console.log(expr.parse(new Source("12/2", 0)).value);
console.log("test number: ");
console.log(many(number).parse(new Source("-123.56+34-33.3", 0)).value);
var exprInput = document.querySelector("#expression");
var resultSpan = document.querySelector("#result");
var update = function () {
    setTimeout(function () {
        try  {
            var exprText = exprInput.value;
            resultSpan.innerHTML = expr.parse(new Source(exprText, 0)).value;
        } catch (ex) {
            resultSpan.innerHTML = "?";
            throw ex;
        }
    }, 1);
};
exprInput.addEventListener("change", update);
exprInput.addEventListener("keydown", update);
