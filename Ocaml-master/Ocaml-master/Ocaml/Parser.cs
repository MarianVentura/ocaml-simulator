using OcamlCompiler.Lexing;
using System;
using System.Collections.Generic;

namespace OcamlCompiler.Parsing
{
    // AST base
    public abstract class Expr { }

    public class LetExpr : Expr
    {
        public string Identifier;
        public Expr Value;

        public LetExpr(string id, Expr val)
        {
            Identifier = id;
            Value = val;
        }
    }

    public class IfExpr : Expr
    {
        public Expr Condition, ThenBranch, ElseBranch;
        public IfExpr(Expr cond, Expr thenB, Expr elseB)
        {
            Condition = cond; ThenBranch = thenB; ElseBranch = elseB;
        }
    }

    public class MatchExpr : Expr
    {
        public Expr MatchedExpr;
        public List<(Pattern, Expr)> Cases;

        public MatchExpr(Expr matchedExpr, List<(Pattern, Expr)> cases)
        {
            MatchedExpr = matchedExpr;
            Cases = cases;
        }
    }

    // Función anónima: fun x -> expr
    public class FunExpr : Expr
    {
        public string Param;
        public Expr Body;

        public FunExpr(string param, Expr body)
        {
            Param = param;
            Body = body;
        }
    }

    public class CallExpr : Expr
    {
        public Expr Callee;
        public Expr Argument;

        public CallExpr(Expr callee, Expr argument)
        {
            Callee = callee;
            Argument = argument;
        }
    }

    public class LiteralExpr : Expr
    {
        public Token LiteralToken;
        public LiteralExpr(Token token) { LiteralToken = token; }
    }

    public class IdentifierExpr : Expr
    {
        public string Name;
        public IdentifierExpr(string name) { Name = name; }
    }

    // Patterns para match (simplificado)
    public abstract class Pattern { }
    public class WildcardPattern : Pattern { }
    public class IdentifierPattern : Pattern
    {
        public string Name;
        public IdentifierPattern(string name) { Name = name; }
    }

    public class Parser
    {
        private readonly List<Token> tokens;
        private int current = 0;

        public Parser(IEnumerable<Token> tokens)
        {
            this.tokens = new List<Token>(tokens);
        }

        public void Parse()
        {
            bool foundAny = false;

            while (!IsAtEnd())
            {
                try
                {
                    Expr expr = ParseExpr();
                    foundAny = true;
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine($"✔ Expresión válida: {ExprToString(expr)} en línea {Previous().Line}");
                    Console.ResetColor();

                    // Removido el Advance() aquí porque ParseExpr ya consume lo necesario.
                }
                catch (Exception ex)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine(ex.Message);
                    Console.ResetColor();
                    Synchronize();
                }
            }

            if (!foundAny)
            {
                Console.WriteLine("No se encontraron expresiones válidas.");
            }
        }

        // Entry: expresión general
        public Expr ParseExpr()
        {
            if (Match(TokenType.Keyword, "let")) return ParseLetExpr();
            if (Match(TokenType.Keyword, "if")) return ParseIfExpr();
            if (Match(TokenType.Keyword, "fun")) return ParseFunExpr();
            if (Match(TokenType.Keyword, "match")) return ParseMatchExpr();

            return ParseAssignment();
        }

        // let x = expr
        private Expr ParseLetExpr()
        {
            if (!Match(TokenType.Identifier))
                throw Error(Peek(), "Se esperaba un identificador después de 'let'.");

            string id = Previous().Lexeme;

            if (!Match(TokenType.Operator, "="))
                throw Error(Peek(), "Se esperaba '=' después del identificador.");

            Expr value = ParseExpr();

            return new LetExpr(id, value);
        }

        // if cond then expr else expr
        private Expr ParseIfExpr()
        {
            Expr condition = ParseExpr();

            if (!Match(TokenType.Keyword, "then"))
                throw Error(Peek(), "Se esperaba 'then' después de la condición.");

            Expr thenBranch = ParseExpr();

            if (!Match(TokenType.Keyword, "else"))
                throw Error(Peek(), "Se esperaba 'else' después del 'then'.");

            Expr elseBranch = ParseExpr();

            return new IfExpr(condition, thenBranch, elseBranch);
        }

        // fun param -> expr (soporta múltiples params: fun a b -> expr)
        private Expr ParseFunExpr()
        {
            var parameters = new List<string>();

            do
            {
                if (!Match(TokenType.Identifier))
                    throw Error(Peek(), "Se esperaba un parámetro después de 'fun'.");
                parameters.Add(Previous().Lexeme);
            }
            while (Check(TokenType.Identifier));

            if (!Match(TokenType.Operator, "->"))
                throw Error(Peek(), "Se esperaba '->' después de los parámetros.");

            Expr body = ParseExpr();

            // Currificar: fun a b -> expr = fun a -> fun b -> expr
            Expr funExpr = body;
            for (int i = parameters.Count - 1; i >= 0; i--)
            {
                funExpr = new FunExpr(parameters[i], funExpr);
            }

            return funExpr;
        }

        // match expr with | pat -> expr | ...
        private Expr ParseMatchExpr()
        {
            Expr matchedExpr = ParseExpr();

            if (!Match(TokenType.Keyword, "with"))
                throw Error(Peek(), "Se esperaba 'with' después de la expresión 'match'.");

            var cases = new List<(Pattern, Expr)>();

            do
            {
                if (!Match(TokenType.Delimiter, "|"))
                    throw Error(Peek(), "Se esperaba '|' para comenzar un caso.");

                Pattern pattern = ParsePattern();

                if (!Match(TokenType.Operator, "->"))
                    throw Error(Peek(), "Se esperaba '->' después del patrón.");

                Expr expr = ParseExpr();

                cases.Add((pattern, expr));

            } while (Check(TokenType.Delimiter, "|"));

            return new MatchExpr(matchedExpr, cases);
        }

        // Patrones (simplificado: solo _ y identificadores)
        private Pattern ParsePattern()
        {
            if (Match(TokenType.Operator, "_")) return new WildcardPattern();

            if (Match(TokenType.Identifier)) return new IdentifierPattern(Previous().Lexeme);

            throw Error(Peek(), "Patrón inválido en match.");
        }

        // Parse expresiones con asignaciones y llamadas
        private Expr ParseAssignment()
        {
            Expr expr = ParseLogicalOr();

            return expr;
        }

        // Parse or lógico: a || b
        private Expr ParseLogicalOr()
        {
            Expr expr = ParseLogicalAnd();

            while (Match(TokenType.Operator, "||"))
            {
                Expr right = ParseLogicalAnd();
                expr = new CallExpr(new IdentifierExpr("or"), new CallExpr(expr, right));
            }

            return expr;
        }

        // Parse and lógico: a && b
        private Expr ParseLogicalAnd()
        {
            Expr expr = ParseEquality();

            while (Match(TokenType.Operator, "&&"))
            {
                Expr right = ParseEquality();
                expr = new CallExpr(new IdentifierExpr("and"), new CallExpr(expr, right));
            }

            return expr;
        }

        // Igualdad y desigualdad: ==, <>, etc
        private Expr ParseEquality()
        {
            Expr expr = ParseComparison();

            while (Match(TokenType.Operator, "==") || Match(TokenType.Operator, "<>"))
            {
                string op = Previous().Lexeme;
                Expr right = ParseComparison();
                expr = new CallExpr(new IdentifierExpr(op), new CallExpr(expr, right));
            }

            return expr;
        }

        // Comparación: <, >
        private Expr ParseComparison()
        {
            Expr expr = ParseAddSub();

            while (Match(TokenType.Operator, "<") || Match(TokenType.Operator, ">"))
            {
                string op = Previous().Lexeme;
                Expr right = ParseAddSub();
                expr = new CallExpr(new IdentifierExpr(op), new CallExpr(expr, right));
            }

            return expr;
        }

        // + y -
        private Expr ParseAddSub()
        {
            Expr expr = ParseMulDiv();

            while (Match(TokenType.Operator, "+") || Match(TokenType.Operator, "-"))
            {
                string op = Previous().Lexeme;
                Expr right = ParseMulDiv();
                expr = new CallExpr(new IdentifierExpr(op), new CallExpr(expr, right));
            }

            return expr;
        }

        // * y /
        private Expr ParseMulDiv()
        {
            Expr expr = ParseUnary();

            while (Match(TokenType.Operator, "*") || Match(TokenType.Operator, "/"))
            {
                string op = Previous().Lexeme;
                Expr right = ParseUnary();
                expr = new CallExpr(new IdentifierExpr(op), new CallExpr(expr, right));
            }

            return expr;
        }

        // Unary: - expr
        private Expr ParseUnary()
        {
            if (Match(TokenType.Operator, "-"))
            {
                Expr right = ParseUnary();
                return new CallExpr(new IdentifierExpr("negate"), right);
            }

            return ParseCall();
        }

        // Parse llamada a funciones: expr expr
        private Expr ParseCall()
        {
            Expr expr = ParsePrimary();

            while (true)
            {
                if (Check(TokenType.Int) || Check(TokenType.Float) || Check(TokenType.String) || Check(TokenType.Char) || Check(TokenType.Identifier) || Check(TokenType.Delimiter, "("))
                {
                    Expr arg = ParsePrimary();
                    expr = new CallExpr(expr, arg);
                }
                else break;
            }

            return expr;
        }

        // Primarias: literales, identificadores, paréntesis
        private Expr ParsePrimary()
        {
            if (Match(TokenType.Int) || Match(TokenType.Float) || Match(TokenType.String) || Match(TokenType.Char))
                return new LiteralExpr(Previous());

            if (Match(TokenType.Identifier))
                return new IdentifierExpr(Previous().Lexeme);

            if (Match(TokenType.Delimiter, "("))
            {
                Expr expr = ParseExpr();
                if (!Match(TokenType.Delimiter, ")"))
                    throw Error(Peek(), "Se esperaba ')' al final de expresión.");
                return expr;
            }

            throw Error(Peek(), "Se esperaba una expresión válida.");
        }

        private bool Match(TokenType type, string lexeme = null)
        {
            if (Check(type, lexeme))
            {
                Advance();
                return true;
            }
            return false;
        }

        private bool Check(TokenType type, string lexeme = null)
        {
            if (IsAtEnd()) return false;
            var t = Peek();
            return t.Type == type && (lexeme == null || t.Lexeme == lexeme);
        }

        private Token Advance()
        {
            if (!IsAtEnd()) current++;
            return Previous();
        }

        private bool IsAtEnd() => Peek().Type == TokenType.EOF;
        private Token Peek() => tokens[current];
        private Token Previous() => tokens[current - 1];

        private Exception Error(Token token, string message)
        {
            return new Exception($"❌ Error en línea {token.Line}, col {token.Column}: {message}");
        }

        private void Synchronize()
        {
            Advance();

            while (!IsAtEnd())
            {
                if (Previous().Type == TokenType.Delimiter) return;

                if (Peek().Type == TokenType.Keyword) return;

                Advance();
            }
        }

        private string ExprToString(Expr expr)
        {
            return expr switch
            {
                LetExpr letE => $"let {letE.Identifier} = (...)",
                IfExpr ifE => "if (...) then (...) else (...)",
                FunExpr funE => $"fun {funE.Param} -> (...)",
                MatchExpr _ => "match (...) with (...)",
                LiteralExpr lit => $"literal '{lit.LiteralToken.Lexeme}'",
                IdentifierExpr id => $"identificador '{id.Name}'",
                CallExpr call => $"llamada a función ({ExprToString(call.Callee)}) con argumento ({ExprToString(call.Argument)})",
                _ => "expresión desconocida"
            };
        }
    }
}
