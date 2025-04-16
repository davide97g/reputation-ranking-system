# scoring.py
from complexity_parser import compute_structural_complexity

def compute_complexity_score(file):
    filename = file["filename"]
    patch = file.get("patch", "") or ""
    complexity = 0.0

    if filename.endswith((".py", ".ts", ".js", ".tsx", ".css", ".java", ".cpp", ".rs")):
        complexity += 2
    elif filename.endswith((".json", ".yml", ".yaml", ".xml", ".ini")):
        complexity += 0.5

    keywords = ["async", "await", "try", "except", "class ", "def ", "function ", "=>", "for ", "while ", "if "]
    keyword_hits = sum(patch.count(k) for k in keywords)
    complexity += min(keyword_hits * 0.2, 3)

    if filename.endswith(".py") and patch:
        try:
            import ast
            added_code = "\n".join(
                line[1:] for line in patch.splitlines()
                if line.startswith("+") and not line.startswith("+++")
            )
            tree = ast.parse(added_code)
            complexity += sum(isinstance(node, (
                ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef,
                ast.If, ast.For, ast.While, ast.Try)) * {
                    ast.FunctionDef: 1.5,
                    ast.AsyncFunctionDef: 1.5,
                    ast.ClassDef: 2,
                    ast.If: 1.2,
                    ast.For: 1.2,
                    ast.While: 1.2,
                    ast.Try: 1.5,
                }.get(type(node), 0) for node in ast.walk(tree))
        except Exception:
            pass

    # Tree-sitter parsing
    if filename.endswith(".js"):
        complexity += compute_structural_complexity(patch, lang="js")
    elif filename.endswith(".ts"):
        complexity += compute_structural_complexity(patch, lang="ts")
    elif filename.endswith(".tsx"):
        complexity += compute_structural_complexity(patch, lang="tsx")
    elif filename.endswith(".css"):
        complexity += compute_structural_complexity(patch, lang="css")

    return round(complexity, 2)
