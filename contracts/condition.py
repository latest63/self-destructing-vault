# { "Depends": "py-genlayer:9b8kjyda2ycxyq4ea6g4yfpnydxhd52gqba5rb8dw7krkh5mn9p0" }

import json
from dataclasses import dataclass
import genlayer as gl
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
    decision: str  # "success" | "failure"
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
            created_at=str(gl.message_raw["datetime"]),
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
        
        # Already evaluated — return cached verdict
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
                body = response.body
                if len(body) > 8000:
                    body = body[:8000]
            except Exception:
                return {
                    "verified": False,
                    "reason": "Could not fetch URL: " + url,
                }
            
            if status != 200:
                return {
                    "verified": False,
                    "reason": "URL returned status " + str(status),
                }
            
            result = gl.nondet.exec_prompt(
                "You are a condition verification agent.\n"
                + "A vault holds funds that should be released ONLY if a specific condition is met.\n\n"
                + "SUCCESS CONDITION:\n"
                + success_condition
                + "\n\nCHECK URL:\n"
                + url
                + "\n\nPAGE CONTENT (truncated):\n"
                + body
                + "\n\nEvaluate whether the content at the URL satisfies the success condition.\n"
                + 'Return JSON: {"verified": true/false, "reason": "brief explanation"}\n'
                + "Be strict — only verify if the content CLEARLY meets the condition.\n"
                + "If the content is empty, missing, or does not satisfy the condition, return verified: false.",
            )
            
            text = str(result).strip()
            if text.startswith("```"):
                lines = text.split("\n")
                text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
                text = text.replace("```json", "").replace("```", "").strip()
            
            try:
                parsed = json.loads(text)
                verified = bool(parsed.get("verified", False))
                reason = str(parsed.get("reason", "No reason provided"))
            except Exception:
                verified = False
                reason = "Could not parse verification result"
            
            return {"verified": verified, "reason": reason}
        
        # AI consensus — multiple validators must agree
        verdict_result = gl.eq_principle.prompt_comparative(
            do_evaluation,
            principle="The verification result (verified true/false) must match",
        )
        
        verified = bool(verdict_result.get("verified", False))
        reason = str(verdict_result.get("reason", ""))
        
        decision = "success" if verified else "failure"
        
        self.verdicts[vault_id] = Verdict(
            vault_id=vault_id,
            decision=decision,
            reason=reason,
            evaluated_at=str(gl.message_raw["datetime"]),
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
