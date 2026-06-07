#!/usr/bin/env python3
"""Acuña un access token (JWT) de LiveKit para una identidad y una room.

Para el demo/test en vivo: genera el token del bot (en el pod) y el del navegador (en el Mac).
En producción los acuña la Edge Function `create-oral-b-session` (no este script).

Uso:
    LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=... \
      python livekit_token.py --identity profesor-bot --room oral-demo
"""
from __future__ import annotations

import argparse
import os

from livekit import api


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--identity", required=True)
    ap.add_argument("--room", required=True)
    ap.add_argument("--ttl", type=int, default=3600, help="validez en segundos")
    args = ap.parse_args()

    key = os.environ["LIVEKIT_API_KEY"]
    secret = os.environ["LIVEKIT_API_SECRET"]

    token = (
        api.AccessToken(key, secret)
        .with_identity(args.identity)
        .with_name(args.identity)
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=args.room,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )
        )
        .to_jwt()
    )
    print(token)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
