import hashlib
import json
import re

import numpy as np
import pandas as pd

MAX_PROFILE_ROWS = 100_000


def export_df_csv(df):
    import io

    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue()


def export_df_json(df):
    return df.to_json(orient="records", indent=2, date_format="iso")


def preview_df(df, n=100):
    if df is None or len(df.columns) == 0:
        return {
            "columns": [],
            "rows": [],
            "totalRows": len(df) if df is not None else 0,
            "totalColumns": 0,
        }

    return {
        "columns": [
            {
                "name": col,
                "dtype": str(df[col].dtype),
                "nullable": bool(df[col].isna().any()),
            }
            for col in df.columns
        ],
        "rows": json.loads(df.head(n).to_json(orient="records", date_format="iso")),
        "totalRows": len(df),
        "totalColumns": len(df.columns),
    }


def compute_histogram(series, bins=10):
    clean = series.dropna()
    if len(clean) == 0:
        return []

    counts, edges = np.histogram(clean, bins=bins)
    return [
        {
            "bin_start": float(edges[i]),
            "bin_end": float(edges[i + 1]),
            "count": int(counts[i]),
        }
        for i in range(len(counts))
    ]


def profile_df(df):
    profile_source = df
    if len(df) > MAX_PROFILE_ROWS:
        profile_source = df.sample(n=MAX_PROFILE_ROWS, random_state=42)

    profiles = []
    for col in profile_source.columns:
        series = profile_source[col]
        is_empty = len(series) == 0 or series.isna().all()

        profile = {
            "name": col,
            "dtype": str(series.dtype),
            "nullCount": int(series.isna().sum()) if not is_empty else len(series),
            "nullPct": float(series.isna().mean()) if len(series) > 0 else 0.0,
            "uniqueCount": int(series.nunique()) if not is_empty else 0,
        }

        if pd.api.types.is_numeric_dtype(series):
            profile["min"] = float(series.min()) if not is_empty else None
            profile["max"] = float(series.max()) if not is_empty else None
            profile["mean"] = float(series.mean()) if not is_empty else None
            profile["histogram"] = compute_histogram(series) if not is_empty else []
        elif pd.api.types.is_string_dtype(series) or series.dtype == "object":
            profile["topValues"] = (
                series.value_counts().head(10).to_dict() if not is_empty else {}
            )
        elif pd.api.types.is_datetime64_any_dtype(series):
            profile["min"] = series.min().isoformat() if not is_empty else None
            profile["max"] = series.max().isoformat() if not is_empty else None

        profiles.append(profile)

    return profiles


WHITELISTED_CALLS = {"abs", "round", "min", "max"}

BLOCKED_CUSTOM_PYTHON_CALLS = {
    "exec",
    "eval",
    "open",
    "__import__",
    "compile",
    "getattr",
    "setattr",
    "globals",
    "locals",
    "help",
    "input",
    "breakpoint",
    "vars",
    "dir",
    "delattr",
    "memoryview",
    "bytes",
    "bytearray",
}

_PARAM_REF_PATTERN = re.compile(r"\{(\w+)\}")


def _preprocess_param_refs(expr):
    return _PARAM_REF_PATTERN.sub(r"params['\1']", expr)


def validate_expression(expr):
    import ast

    if not isinstance(expr, str) or not expr.strip():
        return {"valid": False, "error": "Expression is empty"}

    normalized = _preprocess_param_refs(expr.strip())

    try:
        tree = ast.parse(normalized, mode="eval")
    except SyntaxError as exc:
        return {"valid": False, "error": str(exc)}

    for node in ast.walk(tree):
        node_type = type(node)

        if node_type in (
            ast.Expression,
            ast.Load,
            ast.Name,
            ast.Constant,
            ast.Compare,
            ast.BinOp,
            ast.UnaryOp,
            ast.BoolOp,
            ast.Subscript,
            ast.Attribute,
            ast.Tuple,
            ast.List,
            ast.Slice,
            ast.And,
            ast.Or,
            ast.Add,
            ast.Sub,
            ast.Mult,
            ast.Div,
            ast.Mod,
            ast.Pow,
            ast.Eq,
            ast.NotEq,
            ast.Lt,
            ast.LtE,
            ast.Gt,
            ast.GtE,
            ast.Is,
            ast.IsNot,
            ast.In,
            ast.NotIn,
            ast.USub,
            ast.UAdd,
            ast.Not,
        ):
            if node_type is ast.Attribute and node.attr.startswith("_"):
                return {"valid": False, "error": f"Attribute '{node.attr}' not allowed"}
            continue

        if node_type is ast.Call:
            if (
                isinstance(node.func, ast.Name)
                and node.func.id in WHITELISTED_CALLS
            ):
                continue
            return {"valid": False, "error": "Function calls not allowed"}

        if node_type in (ast.Import, ast.ImportFrom, ast.Lambda, ast.FunctionDef, ast.ClassDef):
            return {"valid": False, "error": f"Disallowed syntax: {node_type.__name__}"}

        return {"valid": False, "error": f"Disallowed syntax: {node_type.__name__}"}

    return {"valid": True}


def validate_custom_python(code):
    import ast

    if not isinstance(code, str) or not code.strip():
        return {"valid": False, "error": "Code is empty"}

    try:
        tree = ast.parse(code.strip(), mode="exec")
    except SyntaxError as exc:
        return {"valid": False, "error": str(exc)}

    for node in ast.walk(tree):
        node_type = type(node)

        if node_type in (
            ast.Module,
            ast.Assign,
            ast.AugAssign,
            ast.Expr,
            ast.Name,
            ast.Load,
            ast.Store,
            ast.Constant,
            ast.Subscript,
            ast.Attribute,
            ast.BinOp,
            ast.UnaryOp,
            ast.Compare,
            ast.BoolOp,
            ast.If,
            ast.For,
            ast.While,
            ast.Pass,
            ast.Break,
            ast.Continue,
            ast.Tuple,
            ast.List,
            ast.Dict,
            ast.Slice,
            ast.And,
            ast.Or,
            ast.Add,
            ast.Sub,
            ast.Mult,
            ast.Div,
            ast.Mod,
            ast.Pow,
            ast.Eq,
            ast.NotEq,
            ast.Lt,
            ast.LtE,
            ast.Gt,
            ast.GtE,
            ast.Is,
            ast.IsNot,
            ast.In,
            ast.NotIn,
            ast.USub,
            ast.UAdd,
            ast.Not,
            ast.keyword,
        ):
            if node_type is ast.Attribute and node.attr.startswith("_"):
                return {"valid": False, "error": f"Attribute '{node.attr}' not allowed"}
            continue

        if node_type is ast.Call:
            if isinstance(node.func, ast.Attribute):
                continue
            if isinstance(node.func, ast.Name):
                if node.func.id in BLOCKED_CUSTOM_PYTHON_CALLS:
                    return {
                        "valid": False,
                        "error": f"Call to '{node.func.id}' not allowed",
                    }
                continue
            return {"valid": False, "error": "Disallowed call expression"}

        if node_type in (
            ast.Import,
            ast.ImportFrom,
            ast.Lambda,
            ast.FunctionDef,
            ast.ClassDef,
            ast.With,
            ast.Try,
            ast.Raise,
            ast.Global,
            ast.Nonlocal,
        ):
            return {"valid": False, "error": f"Disallowed syntax: {node_type.__name__}"}

        return {"valid": False, "error": f"Disallowed syntax: {node_type.__name__}"}

    return {"valid": True}


def anonymize_hash(value, salt):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return value
    text = str(value)
    digest = hashlib.sha256((str(salt) + text).encode("utf-8")).hexdigest()
    return digest[:12]


def anonymize_mask(value, preserve_length=False):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return value
    text = str(value)
    if not preserve_length:
        return "*" * min(len(text), 8) if text else ""
    return "".join("*" if ch.isalnum() else ch for ch in text)


def store_node_summary(node_id, text):
    summaries = globals().get("_refineit_summaries")
    if summaries is None:
        summaries = {}
    summaries[str(node_id)] = str(text)
    globals()["_refineit_summaries"] = summaries


def build_dataset_stats_summary(df, top_k=10):
    lines = [
        f"Rows: {len(df):,}",
        f"Columns: {len(df.columns):,}",
    ]

    null_pct = float(df.isna().sum().sum()) / max(len(df) * len(df.columns), 1)
    lines.append(f"Null cells: {null_pct * 100:.1f}%")

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if numeric_cols:
        lines.append("")
        lines.append("Numeric summary:")
        desc = df[numeric_cols].describe().round(3)
        lines.append(desc.to_string())

    cat_cols = [
        col
        for col in df.columns
        if col not in numeric_cols
        and (pd.api.types.is_string_dtype(df[col]) or df[col].dtype == "object")
    ]
    for col in cat_cols[:5]:
        lines.append("")
        lines.append(f"Top values — {col}:")
        counts = df[col].astype(str).value_counts().head(top_k)
        for value, count in counts.items():
            lines.append(f"  {value}: {count}")

    return "\n".join(lines)


def build_column_text_summary(df, column, top_k=10):
    series = df[column]
    non_null = series.dropna().astype(str)
    lines = [
        f"Column: {column}",
        f"Rows: {len(df):,}",
        f"Nulls: {int(series.isna().sum())} ({float(series.isna().mean()) * 100:.1f}%)",
    ]

    if len(non_null) > 0:
        lengths = non_null.str.len()
        lines.append(
            f"Text length — min: {int(lengths.min())}, max: {int(lengths.max())}, mean: {lengths.mean():.1f}"
        )
        lines.append("")
        lines.append("Top terms:")
        terms = non_null.str.split().explode()
        for term, count in terms.value_counts().head(top_k).items():
            lines.append(f"  {term}: {count}")

    return "\n".join(lines)


def apply_classify_rules(series, rules, default_label=None):
    result = pd.Series(default_label, index=series.index, dtype="object")
    assigned = pd.Series(False, index=series.index)
    text = series.astype(str)

    for rule in rules:
        match_type = rule.get("match", "contains")
        pattern = rule.get("pattern", "")
        label = rule.get("label", "")
        if not pattern or not label:
            continue

        if match_type == "regex":
            mask = text.str.contains(pattern, regex=True, na=False) & ~assigned
        else:
            mask = text.str.contains(pattern, regex=False, na=False) & ~assigned

        result.loc[mask] = label
        assigned = assigned | mask

    return result
