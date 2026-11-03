from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Literal, TypedDict

HarnessType = Literal["persona", "preference", "strategy", "knowledge", "compliance"]


@dataclass
class ChatRequest:
    message: str
    wallet_address: str | None = None
    context: dict[str, Any] | None = None


@dataclass
class ChatResponse:
    response: str
    agent: str
    conversation_id: str | None = None


@dataclass
class Harness:
    id: str
    wallet_address: str
    harness_type: HarnessType
    content: dict[str, Any]
    tags: list[str] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""


@dataclass
class HarnessCreateRequest:
    wallet_address: str
    harness_type: HarnessType
    content: dict[str, Any]
    tags: list[str] | None = None


@dataclass
class MCPToolInfo:
    name: str
    description: str
    input_schema: dict[str, Any] = field(default_factory=dict)


@dataclass
class MarketplaceListing:
    id: str
    name: str
    description: str
    listing_type: str
    creator_wallet: str
    status: str = "pending"
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: str = ""


@dataclass
class Task:
    id: str
    title: str
    status: str = "pending"
    description: str | None = None
    agent: str | None = None
    created_at: str = ""
    updated_at: str = ""


@dataclass
class User:
    id: str
    wallet_address: str
    username: str | None = None
    created_at: str = ""


class RunPack(TypedDict, total=False):
    """The House run pack — pay per run after the free day (live values)."""

    product_id: str | None
    runs: int
    price_cents: int
    price: str
    per_run: str
    buy: str
    rails: list[str]
    spent: str
    no_refunds: bool


class RunLadder(TypedDict, total=False):
    """The three rungs as data: free (signed in), a run pack, the Lab."""

    free: dict[str, Any]
    run_pack: RunPack
    lab: dict[str, Any]


class BudgetRefusal(TypedDict, total=False):
    """The 429 a run door answers. ``code``: sign_in_required ·
    free_runs_spent · free_runs_ceiling · budget_unavailable; ``ladder`` rides
    free_runs_spent and free_runs_ceiling."""

    ok: bool
    error: str
    code: str
    message: str
    upgrade: str
    relay: dict[str, Any]
    ladder: RunLadder


class StudioAccess(TypedDict, total=False):
    """``GET /api/studio/access`` — your own Lab entitlement."""

    studio: bool
    access: str
    current_period_end: str
    tokens: float
