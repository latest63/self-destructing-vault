# v0.3.0
# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
"""
ShipGuard GitHub Verifier
========================
Verifies that a wallet address owns a GitHub account.

Flow:
  1. Backend generates a one-time code
  2. User creates a PUBLIC GIST containing the code
  3. Backend fetches GitHub API:
     - GET /users/{gh_handle} → login, type, html_url (identity pin)
     - GET /gists → scan user's public gists for the code
  4. Backend calls submit(wallet_address, gh_handle, code, user_login, user_type, user_html_url, gist_found, gist_url)
  5. Backend calls verify(wallet_address)
  6. On success, get_gh_handle(wallet_address) returns the verified handle

This is what ShipGuard uses to gate raise creation:
  - The check_url (source of truth) must be under the verified GitHub handle
  - Prevents people from using someone else's GitHub as their own source of truth
"""
import json
import typing
from dataclasses import dataclass
import genlayer as gl
from genlayer.types import *
from genlayer.storage import allow as allow_storage


MAX_CODE_LEN = 12
MAX_HANDLE_LEN = 39
MAX_URL_LEN = 512


@allow_storage
@dataclass
class Verification:
    wallet_address: Address
    gh_handle: str
    code: str
    user_login: str
    user_type: str
    user_html_url: str
    gist_found: bool
    gist_url: str
    status: str  # "pending", "verified", "rejected"
    verdict: str
    timestamp: str


class GitHubVerifier(gl.contract.Contract):
    verifications: gl.storage.TreeMap[gl.Address, Verification]
    verified_handles: gl.storage.TreeMap[gl.Address, str]  # wallet_address → gh_handle
    count: gl.u256

    def __init__(self):
        self.count = gl.u256(0)

    # ── Submit ─────────────────────────────────────────────────────────────

    @gl.public.write
    def submit(
        self,
        wallet_address: str,
        gh_handle: str,
        code: str,
        user_login: str,
        user_type: str,
        user_html_url: str,
        gist_found: bool,
        gist_url: str,
    ) -> str:
        """Submit GitHub verification evidence. Called by the ShipGuard backend."""
        wallet_addr = gl.Address(wallet_address)
        gh_handle = gh_handle.strip()

        # Already verified?
        existing = self.verified_handles.get(wallet_addr, "")
        if existing != "":
            raise gl.vm.UserError(f"wallet already verified as {existing}")

        # Validate handle
        if len(gh_handle) < 2 or len(gh_handle) > MAX_HANDLE_LEN:
            raise gl.vm.UserError("invalid handle length (2-39 chars)")

        # Validate code
        if len(code) < 4 or len(code) > MAX_CODE_LEN:
            raise gl.vm.UserError("code must be 4-12 characters")

        # Must be a GitHub user, not an org
        if user_type != "User":
            raise gl.vm.UserError("GitHub account must be a user, not an organization")

        # Identity pin: html_url must match the claimed handle
        if user_html_url.lower() != f"https://github.com/{gh_handle.lower()}":
            raise gl.vm.UserError("html_url does not match the claimed GitHub handle")

        # Gist URL validation
        if gist_found:
            if not gist_url.startswith("https://gist.github.com/"):
                raise gl.vm.UserError("gist_url must start with https://gist.github.com/")

        now = str(gl.message.raw["datetime"])
        self.count = gl.u256(int(self.count) + 1)

        self.verifications[wallet_addr] = Verification(
            wallet_address=wallet_addr,
            gh_handle=gh_handle,
            code=code,
            user_login=user_login.strip(),
            user_type=user_type,
            user_html_url=user_html_url,
            gist_found=gist_found,
            gist_url=gist_url,
            status="pending",
            verdict="",
            timestamp=now,
        )

        return f"Verification submitted for wallet {wallet_address}"

    # ── Verify ─────────────────────────────────────────────────────────────

    @gl.public.write
    def verify(self, wallet_address: str) -> typing.Any:
        """Run consensus to verify the GitHub ownership claim.

        Checks:
          - user_type is "User" (not org)
          - gist_found is True (code was in a public gist)
          - user_login matches gh_handle (case-insensitive)
        """
        wallet_addr = gl.Address(wallet_address)
        v = self.verifications.get(wallet_addr)
        if v is None:
            raise gl.vm.UserError("verification not found — call submit() first")
        if v.status != "pending":
            raise gl.vm.UserError("verification already resolved")

        # Already verified?
        existing = self.verified_handles.get(wallet_addr, "")
        if existing != "":
            raise gl.vm.UserError(f"wallet already verified as {existing}")

        # Extract values before nd() — avoid capturing dataclass in closure
        user_type = v.user_type
        gist_found = v.gist_found
        user_login = v.user_login
        gh_handle = v.gh_handle

        def nd() -> str:
            """Fully deterministic — all validators read the same stored data."""
            login_match = user_login.lower() == gh_handle.lower()
            verified = (
                user_type == "User"
                and gist_found
                and login_match
                and len(gh_handle) >= 2
            )
            return json.dumps({"verified": verified}, sort_keys=True)

        raw = json.loads(gl.eq_principle.prompt_comparative(
            nd,
            "All validators must agree on the 'verified' field. Both must return true or both must return false.",
        ))

        verdict = "verified" if raw.get("verified", False) else "rejected"
        reason = (
            f"{gh_handle} verified for wallet {wallet_address}"
            if verdict == "verified"
            else f"could not confirm {gh_handle} — GitHub identity or gist code mismatch"
        )

        v.status = verdict
        v.verdict = reason
        self.verifications[wallet_addr] = v

        if verdict == "verified":
            self.verified_handles[wallet_addr] = gh_handle

        return {"status": verdict, "reason": reason}

    # ── Views ──────────────────────────────────────────────────────────────

    @gl.public.view
    def get_verification(self, wallet_address: str) -> dict:
        """Get the verification record for a wallet."""
        wallet_addr = gl.Address(wallet_address)
        v = self.verifications.get(wallet_addr)
        if v is None:
            return {}
        return {
            "wallet_address": str(v.wallet_address),
            "gh_handle": v.gh_handle,
            "code": v.code,
            "user_login": v.user_login,
            "user_type": v.user_type,
            "user_html_url": v.user_html_url,
            "gist_found": v.gist_found,
            "gist_url": v.gist_url,
            "status": v.status,
            "verdict": v.verdict,
            "timestamp": v.timestamp,
        }

    @gl.public.view
    def get_gh_handle(self, wallet_address: str) -> str:
        """Return the verified GitHub handle for a wallet, or empty string."""
        return self.verified_handles.get(gl.Address(wallet_address), "")

    @gl.public.view
    def is_verified(self, wallet_address: str) -> bool:
        """Check if a wallet has a verified GitHub handle."""
        return self.verified_handles.get(gl.Address(wallet_address), "") != ""

    @gl.public.view
    def get_count(self) -> int:
        return int(self.count)
