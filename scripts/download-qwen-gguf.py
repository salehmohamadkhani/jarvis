"""
Download Qwen2.5 3B Q4_K_M GGUF into models/ (for Ollama Modelfile).

Use only when HTTPS fails with SSL verify errors (MITM / corporate proxy).
Default: verify TLS. Pass --insecure to disable verification (risky).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

DEFAULT_URL = (
    "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/"
    "resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf"
)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--url", default=DEFAULT_URL)
    p.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "models" / "model.gguf",
    )
    p.add_argument(
        "--insecure",
        action="store_true",
        help="Disable TLS certificate verification (only if you understand the risk).",
    )
    args = p.parse_args()

    try:
        import httpx
    except ImportError:
        print("Install httpx: python -m pip install httpx", file=sys.stderr)
        return 1

    args.out.parent.mkdir(parents=True, exist_ok=True)
    verify = not args.insecure
    if args.insecure:
        print("WARNING: TLS verification disabled.", file=sys.stderr)

    with httpx.Client(verify=verify, follow_redirects=True, timeout=None) as client:
        with client.stream("GET", args.url) as r:
            r.raise_for_status()
            total = int(r.headers.get("content-length") or 0)
            done = 0
            with open(args.out, "wb") as f:
                for chunk in r.iter_bytes(chunk_size=1024 * 1024):
                    if not chunk:
                        continue
                    f.write(chunk)
                    done += len(chunk)
                    if total:
                        pct = 100 * done / total
                        print(f"\r{done / 1e9:.2f} / {total / 1e9:.2f} GB ({pct:.1f}%)", end="", flush=True)
            print()

    print(f"Saved: {args.out} ({args.out.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
