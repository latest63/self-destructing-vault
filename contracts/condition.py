# v0.3.0
# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }

import json
from dataclasses import dataclass
import genlayer as gl
from genlayer.types import *
from genlayer.storage import allow as allow_storage


@allow_storage
@dataclass
class Condition:
    vault_id: str
    check_url: str  # URL to check (GitHub repo, website, etc.)
    success_condition: str  # plain English: "has at least 10 commits and a README"
    team_address: str
    created_at: str


@allow_storage
@dataclass
class Verdict:
    vault_id: str
    decision: str  # "success" | "failure"  (only confident reads are stored)
    reason: str
    evaluated_at: str
    check_url: str


class ConditionGovernor(gl.contract.Contract):
    conditions: gl.storage.TreeMap[str, Condition]
    verdicts: gl.storage.TreeMap[str, Verdict]

    def __init__(self):
        pass

    @gl.public.write
    def register_condition(
        self,
        vault_id: str,
        check_url: str,
        success_condition: str,
        team_address: str,
    ) -> str:
        if vault_id in self.conditions:
            raise gl.vm.UserError("Condition already registered")
        
        self.conditions[vault_id] = Condition(
            vault_id=vault_id,
            check_url=check_url,
            success_condition=success_condition,
            team_address=team_address,
            created_at=str(gl.message.raw["datetime"]),
        )
        return "Condition registered for vault " + vault_id

    @gl.public.write
    def evaluate(self, vault_id: str) -> dict:
        """Run AI consensus to check if the condition is met.
        
        This is the core of the 'contract governs contract' pattern:
        - Reads the web (GitHub, website, etc.)
        - Uses AI consensus to judge if the plain-English condition is met
        - Stores the verdict on-chain
        - The vault contract reads this verdict to decide release/refund
        """
        condition = self.conditions.get(vault_id)
        if not condition:
            raise gl.vm.UserError("Condition not found for vault " + vault_id)
        
        # Already evaluated — return cached verdict.
        # Only a CONFIDENT result is ever stored (see below), so an inconclusive
        # run leaves this empty and evaluate() can be called again later.
        if vault_id in self.verdicts:
            v = self.verdicts[vault_id]
            return {"decision": v.decision, "reason": v.reason}
        
        url = condition.check_url
        success_condition = condition.success_condition
        
        def do_evaluation() -> dict:
            # Fetch the URL content (use web.get to avoid validator hangs)
            try:
                response = gl.nondet.web.get(url)
                status = response.status
                raw = response.body
            except Exception:
                return {
                    "verified": False,
                    "confident": False,
                    "reason": "Could not fetch URL: " + url,
                }

            # Response.body is bytes | None in v0.3.0
            if raw is None:
                body = ""
            elif isinstance(raw, (bytes, bytearray)):
                body = bytes(raw[:60000]).decode("utf-8", errors="replace")
            else:
                body = str(raw[:60000])

            if status != 200:
                return {
                    "verified": False,
                    "confident": False,
                    "reason": "URL returned status " + str(status),
                }

            if len(body.strip()) == 0:
                return {
                    "verified": False,
                    "confident": False,
                    "reason": "URL returned an empty body",
                }

            result = gl.nondet.exec_prompt(
                "You are a condition verification agent.\n"
                + "A vault holds funds that should be released ONLY if a specific condition is met.\n\n"
                + "SUCCESS CONDITION:\n"
                + success_condition
                + "\n\nCHECK URL:\n"
                + url
                + "\n\nPAGE CONTENT:\n"
                + body
                + "\n\nEvaluate whether the content at the URL satisfies the success condition.\n"
                + 'Return JSON: {"verified": true/false, "confident": true/false, "reason": "brief explanation"}\n'
                + "\n"
                + "IMPORTANT — report your CONFIDENCE honestly, because it changes what happens to real money:\n"
                + "- Set confident=true ONLY if the page you were given clearly shows whether the condition\n"
                + "  is met or not, and you judged it from the actual page content.\n"
                + "- Set confident=false if you cannot tell: the page failed to load, contained an error or\n"
                + "  login/consent wall, showed no relevant information, or the content looks like boilerplate\n"
                + "  metadata rather than the real page data.\n"
                + "- Beware of stale metadata: pages often embed SEO/JSON-LD schema blocks (e.g. an\n"
                + '  "eventStatus" field in <script type="application/ld+json">) that were generated when the\n'
                + "  page was first published and do NOT reflect the current state. If such a schema block\n"
                + "  contradicts the live content, TRUST THE LIVE CONTENT, not the schema.\n"
                + "- Do not invent a conclusion. If the evidence is not there, say confident=false.\n"
                + "\n"
                + "Set verified=true only if the content CLEARLY meets the condition.",
            )
            
            # exec_prompt may return str or (with response_format='json') a dict
            if isinstance(result, dict):
                parsed = result
            else:
                text = str(result).strip()
                if text.startswith("```"):
                    lines = text.split("\n")
                    text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
                    text = text.replace("```json", "").replace("```", "").strip()
                try:
                    parsed = json.loads(text)
                except Exception:
                    parsed = None

            if isinstance(parsed, dict):
                verified = bool(parsed.get("verified", False))
                # `confident` is what distinguishes "I read the page and the
                # condition is false" from "I couldn't read/understand it".
                # Absent the field, assume NOT confident — safer default, since
                # a wrong failure verdict permanently routes funds to refund.
                confident = bool(parsed.get("confident", False))
                reason = str(parsed.get("reason", "No reason provided"))
            else:
                verified = False
                confident = False
                reason = "Could not parse verification result"

            return {"verified": verified, "confident": confident, "reason": reason}

        # AI consensus — multiple validators must agree
        # NOTE: `principle` is POSITIONAL-ONLY in the v0.3.0 signature:
        #   prompt_comparative(fn, principle, /)
        verdict_result = gl.eq_principle.prompt_comparative(
            do_evaluation,
            "The verification result (verified true/false) and confidence must match",
        )

        verified = bool(verdict_result.get("verified", False))
        confident = bool(verdict_result.get("confident", False))
        reason = str(verdict_result.get("reason", ""))

        # THREE-STATE OUTCOME:
        #   confident + verified     -> "success"     (release to team)
        #   confident + !verified    -> "failure"     (refund depositors)
        #   !confident               -> "inconclusive" (store NOTHING; retryable)
        #
        # An inconclusive evaluation must NOT be cached. A transient site
        # outage, a 404, or an unparseable answer is not evidence that the
        # condition failed, and recording it as "failure" would permanently
        # route the funds to refund with no chance to re-evaluate.
        if not confident:
            return {
                "decision": "inconclusive",
                "reason": reason or "Could not determine the condition from the page",
            }

        decision = "success" if verified else "failure"

        self.verdicts[vault_id] = Verdict(
            vault_id=vault_id,
            decision=decision,
            reason=reason,
            evaluated_at=str(gl.message.raw["datetime"]),
            check_url=url,
        )
        
        return {"decision": decision, "reason": reason}

    # Views
    @gl.public.view
    def get_verdict(self, vault_id: str) -> dict:
        """Read the verdict for a vault — this is what the vault contract calls."""
        v = self.verdicts.get(vault_id)
        if not v:
            return {"decision": "pending", "reason": "Not yet evaluated"}
        return {"decision": v.decision, "reason": v.reason}

    @gl.public.view
    def get_condition(self, vault_id: str) -> dict:
        c = self.conditions.get(vault_id)
        if not c:
            return {}
        return {
            "vault_id": c.vault_id,
            "check_url": c.check_url,
            "success_condition": c.success_condition,
            "team_address": c.team_address,
            "created_at": c.created_at,
        }

    @gl.public.view
    def get_all_conditions(self) -> list:
        results = []
        for key in self.conditions.keys():
            c = self.conditions[key]
            results.append({
                "vault_id": c.vault_id,
                "check_url": c.check_url,
                "success_condition": c.success_condition,
                "team_address": c.team_address,
                "created_at": c.created_at,
            })
        return results
