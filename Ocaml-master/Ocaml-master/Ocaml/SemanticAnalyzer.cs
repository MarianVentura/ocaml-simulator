using System;
using System.Collections.Generic;
using OcamlCompiler.Lexing;
using OcamlCompiler.Parsing;

namespace OcamlCompiler.Semantics
{
    public enum SimpleType
    {
        Int,
        Float,
        Bool,
        String,
        Char,
        Function,
        Unknown // Para casos sin info o error
    }

    public class SemanticException : Exception
    {
        public SemanticException(string message) : base(message) { }
    }

    public class SemanticAnalyzer
    {
        // Pila de scopes: cada scope tiene variables y sus tipos
        private readonly Stack<Dictionary<string, SimpleType>> _scopes = new();

        public SemanticAnalyzer()
        {
            _scopes.Push(new Dictionary<string, SimpleType>()); // Scope global
        }

        public void Analyze(Expr expr)
        {
            try
            {
                var type = AnalyzeExpr(expr);
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"✅ Análisis semántico exitoso. Tipo de expresión: {type}");
                Console.ResetColor();
            }
            catch (SemanticException ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ Error semántico: {ex.Message}");
                Console.ResetColor();
            }
        }

        // Devuelve el tipo inferido de la expresión o lanza excepción si hay error
        private SimpleType AnalyzeExpr(Expr expr)
        {
            switch (expr)
            {
                case LetExpr let:
                    {
                        var valueType = AnalyzeExpr(let.Value);

                        if (IsVariableDeclaredInCurrentScope(let.Identifier))
                            throw new SemanticException($"Variable duplicada: {let.Identifier}");

                        DeclareVariable(let.Identifier, valueType);

                        return valueType;
                    }

                case IdentifierExpr id:
                    {
                        var type = LookupVariable(id.Name);
                        if (type == SimpleType.Unknown)
                            throw new SemanticException($"Variable no declarada: {id.Name}");
                        return type;
                    }

                case IfExpr ife:
                    {
                        var condType = AnalyzeExpr(ife.Condition);
                        if (condType != SimpleType.Bool)
                            throw new SemanticException($"Condición de 'if' debe ser bool, no {condType}");

                        var thenType = AnalyzeExpr(ife.ThenBranch);
                        var elseType = AnalyzeExpr(ife.ElseBranch);

                        if (thenType != elseType)
                            throw new SemanticException($"Tipos en 'then' y 'else' no coinciden: {thenType} vs {elseType}");

                        return thenType;
                    }

                case FunExpr fun:
                    {
                        PushScope();

                        if (IsVariableDeclaredInCurrentScope(fun.Param))
                            throw new SemanticException($"Parámetro duplicado en función: {fun.Param}");

                        // Asumimos tipo desconocido para parámetro, podría mejorar con anotaciones
                        DeclareVariable(fun.Param, SimpleType.Unknown);

                        var bodyType = AnalyzeExpr(fun.Body);

                        PopScope();

                        // Tipo función simple (no detallado)
                        return SimpleType.Function;
                    }

                case CallExpr call:
                    {
                        var calleeType = AnalyzeExpr(call.Callee);
                        var argType = AnalyzeExpr(call.Argument);

                        if (calleeType != SimpleType.Function)
                            throw new SemanticException($"Se intenta llamar a algo que no es función (tipo {calleeType})");

                        // No validamos tipos de argumentos por simplicidad
                        return SimpleType.Unknown; // Retorno desconocido
                    }

                case LiteralExpr lit:
                    {
                        return InferLiteralType(lit.LiteralToken);
                    }

                case MatchExpr match:
                    {
                        var matchedType = AnalyzeExpr(match.MatchedExpr);

                        SimpleType resultType = SimpleType.Unknown;
                        bool first = true;

                        foreach (var (pat, caseExpr) in match.Cases)
                        {
                            PushScope();
                            DeclarePatternVariables(pat);
                            var caseType = AnalyzeExpr(caseExpr);
                            PopScope();

                            if (first)
                            {
                                resultType = caseType;
                                first = false;
                            }
                            else if (caseType != resultType)
                            {
                                throw new SemanticException($"Tipos en casos 'match' no coinciden: {resultType} vs {caseType}");
                            }
                        }
                        return resultType;
                    }

                default:
                    throw new SemanticException("Expresión no reconocida en análisis semántico");
            }
        }

        // Manejo scopes
        private void PushScope()
        {
            _scopes.Push(new Dictionary<string, SimpleType>());
        }

        private void PopScope()
        {
            if (_scopes.Count > 1)
                _scopes.Pop();
            else
                throw new SemanticException("Intento de cerrar scope global");
        }

        private void DeclareVariable(string name, SimpleType type)
        {
            _scopes.Peek()[name] = type;
        }

        private bool IsVariableDeclaredInCurrentScope(string name)
        {
            return _scopes.Peek().ContainsKey(name);
        }

        private SimpleType LookupVariable(string name)
        {
            foreach (var scope in _scopes)
            {
                if (scope.TryGetValue(name, out var type))
                    return type;
            }
            return SimpleType.Unknown;
        }

        private SimpleType InferLiteralType(Token token)
        {
            return token.Type switch
            {
                TokenType.Int => SimpleType.Int,
                TokenType.Float => SimpleType.Float,
                TokenType.String => SimpleType.String,
                TokenType.Char => SimpleType.Char,
                _ => SimpleType.Unknown,
            };
        }

        private void DeclarePatternVariables(Pattern pat)
        {
            switch (pat)
            {
                case WildcardPattern:
                    // No variables a declarar
                    break;
                case IdentifierPattern idPat:
                    if (IsVariableDeclaredInCurrentScope(idPat.Name))
                        throw new SemanticException($"Variable duplicada en patrón: {idPat.Name}");
                    DeclareVariable(idPat.Name, SimpleType.Unknown); // Tipo desconocido sin inferencia avanzada
                    break;
                default:
                    throw new SemanticException("Patrón no soportado en análisis semántico");
            }
        }
    }
}
