# complexity_parser.py
from tree_sitter_languages import get_parser

# Parsers Tree-sitter
PARSER_JS = get_parser("python")
PARSER_TS = get_parser("typescript")
PARSER_TSX = get_parser("tsx")
PARSER_CSS = get_parser("css")

def compute_structural_complexity(patch: str, lang: str) -> float:
    added_code = "\n".join(
        line[1:] for line in patch.splitlines()
        if line.startswith("+") and not line.startswith("+++")
    )
    if not added_code.strip():
        return 0.0

    parser = {
        "js": PARSER_JS,
        "ts": PARSER_TS,
        "tsx": PARSER_TSX,
        "css": PARSER_CSS,
    }.get(lang)

    if not parser:
        return 0.0

    try:
        tree = parser.parse(bytes(added_code, "utf8"))
        root = tree.root_node
    except Exception:
        return 0.0

    def count_nodes(node, types):
        count = 0
        if node.type in types:
            count += 1
        for child in node.children:
            count += count_nodes(child, types)
        return count

    if lang in ("js", "ts", "tsx"):
        functions = count_nodes(root, ["function", "function_declaration", "method_definition", "arrow_function"])
        classes = count_nodes(root, ["class_declaration"])
        loops = count_nodes(root, ["for_statement", "while_statement"])
        conditions = count_nodes(root, ["if_statement", "switch_statement"])
        try_blocks = count_nodes(root, ["try_statement"])
        score = (
            functions * 1.5 +
            classes * 2 +
            (loops + conditions) * 1.2 +
            try_blocks * 1.5
        )
    elif lang == "css":
        rules = count_nodes(root, ["rule_set"])
        selectors = count_nodes(root, ["class_selector", "id_selector", "type_selector"])
        score = rules * 1 + selectors * 0.5

    return round(score, 2)
