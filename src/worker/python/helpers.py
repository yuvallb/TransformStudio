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
