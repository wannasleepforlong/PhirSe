"""Minimal Supabase access for the worker: PostgREST and Storage over HTTPS with the service role."""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import quote

import requests


def load_env(path: Path) -> None:
    """Read KEY=value lines from the app's .env without overriding variables already set."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


class Supa:
    def __init__(self, url: str | None = None, key: str | None = None):
        self.url = (url or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or "").rstrip("/")
        self.key = key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
        if not self.url or not self.key:
            raise RuntimeError("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see the app's .env)")
        self.s = requests.Session()
        self.s.headers.update({"apikey": self.key, "Authorization": f"Bearer {self.key}"})

    def select(self, table: str, params: dict) -> list[dict]:
        r = self.s.get(f"{self.url}/rest/v1/{table}", params=params, timeout=30)
        r.raise_for_status()
        return r.json()

    def update(self, table: str, match: dict, values: dict) -> None:
        params = {k: f"eq.{v}" for k, v in match.items()}
        r = self.s.patch(f"{self.url}/rest/v1/{table}", params=params, json=values, timeout=30)
        r.raise_for_status()

    def upsert(self, table: str, row: dict) -> None:
        r = self.s.post(
            f"{self.url}/rest/v1/{table}",
            json=row,
            headers={"Prefer": "resolution=merge-duplicates"},
            timeout=30,
        )
        r.raise_for_status()

    def download(self, bucket: str, path: str) -> bytes:
        r = self.s.get(f"{self.url}/storage/v1/object/{bucket}/{quote(path)}", timeout=60)
        r.raise_for_status()
        return r.content
