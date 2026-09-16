# v0.3.0
# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }

from dataclasses import dataclass
import genlayer as gl
from genlayer.types import *
from genlayer.storage import allow as allow_storage


@allow_storage
@dataclass
class VaultDeposit:
    depositor: gl.Address
    amount: gl.u256
    deposited_at: str


@allow_storage
@dataclass
class Vault:
    id: str
    creator: gl.Address
    team_address: gl.Address
    deadline: str  # ISO datetime string
    condition: str  # plain English condition
    status: str  # "active", "released", "refunded", "expired"
    total_deposited: gl.u256
    condition_contract: gl.Address
    verdict: str  # "", "success", "failure"
    verdict_reason: str
    evaluated_at: str


class SelfDestructingVault(gl.contract.Contract):
    vaults: gl.storage.TreeMap[str, Vault]
    deposits: gl.storage.TreeMap[str, gl.storage.TreeMap[gl.Address, VaultDeposit]]  # vault_id -> depositor -> deposit
    depositor_list: gl.storage.TreeMap[str, gl.storage.DynArray[gl.Address]]  # vault_id -> list of depositors
    
    def __init__(self):
        pass

    @gl.public.write
    def create_vault(
        self,
        vault_id: str,
        team_address: gl.Address,
        deadline: str,
        condition: str,
        condition_contract: gl.Address,
    ) -> str:
        if vault_id in self.vaults:
            raise gl.vm.UserError("Vault already exists")

        # Callers (frontend / SDK) pass hex strings; the storage slot is an
        # Address, so coerce explicitly — a bare str raises AttributeError
        # ('str' object has no attribute 'as_bytes') inside the VM.
        team_addr = gl.Address(team_address)
        condition_addr = gl.Address(condition_contract)

        self.vaults[vault_id] = Vault(
            id=vault_id,
            creator=gl.message.sender_address,
            team_address=team_addr,
            deadline=deadline,
            condition=condition,
            status="active",
            total_deposited=gl.u256(0),
            condition_contract=condition_addr,
            verdict="",
            verdict_reason="",
            evaluated_at="",
        )
        # Create the depositor list lazily; nested storage containers cannot
        # be constructed with DynArray()/TreeMap() (that raises TypeError in
        # v0.3.0). get_or_insert_default allocates the slot in-place instead.
        self.depositor_list.get_or_insert_default(vault_id)
        return "Vault created: " + vault_id

    @gl.public.write.payable
    def deposit(self, vault_id: str) -> str:
        vault = self.vaults.get(vault_id)
        if not vault:
            raise gl.vm.UserError("Vault not found")
        if vault.status != "active":
            raise gl.vm.UserError("Vault is not active")
        
        amount = gl.message.value
        if amount == gl.u256(0):
            raise gl.vm.UserError("Must send value")
        
        depositor = gl.message.sender_address

        # Nested containers can't be constructed directly in v0.3.0 —
        # get_or_insert_default allocates them in storage instead.
        deposits_for_vault = self.deposits.get_or_insert_default(vault_id)
        depositor_list = self.depositor_list.get_or_insert_default(vault_id)

        existing = deposits_for_vault.get(depositor)
        if existing:
            # Add to existing deposit
            deposits_for_vault[depositor] = VaultDeposit(
                depositor=depositor,
                amount=existing.amount + amount,
                deposited_at=str(gl.message.raw["datetime"]),
            )
        else:
            deposits_for_vault[depositor] = VaultDeposit(
                depositor=depositor,
                amount=amount,
                deposited_at=str(gl.message.raw["datetime"]),
            )
            depositor_list.append(depositor)
        
        vault.total_deposited = vault.total_deposited + amount
        return "Deposited " + str(amount) + " to vault " + vault_id

    @gl.public.write
    def release(self, vault_id: str) -> str:
        """Release funds to team — only if condition contract says SUCCESS."""
        vault = self.vaults.get(vault_id)
        if not vault:
            raise gl.vm.UserError("Vault not found")
        if vault.status != "active":
            raise gl.vm.UserError("Vault is not active")
        
        # READ the condition contract verdict — this is the governance gate
        condition = gl.contract.get_at(vault.condition_contract)
        verdict = condition.view().get_verdict(vault_id)
        
        if not verdict or verdict.get("decision") != "success":
            raise gl.vm.UserError("Condition not met: " + str(verdict.get("reason", "not evaluated")))
        
        # Record verdict
        vault.verdict = "success"
        vault.verdict_reason = verdict.get("reason", "")
        vault.evaluated_at = str(gl.message.raw["datetime"])
        vault.status = "released"
        
        # Transfer to team
        total = vault.total_deposited
        gl.chain.Account(vault.team_address).emit_transfer(total)
        vault.total_deposited = gl.u256(0)
        
        return "Released " + str(total) + " to " + str(vault.team_address)

    @gl.public.write
    def refund(self, vault_id: str) -> str:
        """Refund to depositors — only if condition contract says FAILURE or deadline passed."""
        vault = self.vaults.get(vault_id)
        if not vault:
            raise gl.vm.UserError("Vault not found")
        if vault.status != "active":
            raise gl.vm.UserError("Vault is not active")
        
        # Check condition contract verdict
        condition = gl.contract.get_at(vault.condition_contract)
        verdict = condition.view().get_verdict(vault_id)
        
        # Allow refund if condition failed OR deadline passed.
        #
        # The governor returns one of three decisions:
        #   "success"      -> release only (blocked here)
        #   "failure"      -> a CONFIDENT read said the condition is false -> refund OK
        #   "inconclusive" -> the page could not be read/judged -> NOT a failure.
        #                     Before the deadline this blocks the refund so that
        #                     evaluate() can be retried; after the deadline it
        #                     falls through and depositors are refunded, so funds
        #                     are never permanently trapped by a site outage.
        current_time = str(gl.message.raw["datetime"])
        deadline_passed = current_time > vault.deadline
        
        if verdict and verdict.get("decision") == "success":
            raise gl.vm.UserError("Condition was met — use release() instead")
        
        if not deadline_passed and (not verdict or verdict.get("decision") != "failure"):
            raise gl.vm.UserError("Deadline not passed and condition not yet failed")
        
        vault.verdict = "failure"
        vault.verdict_reason = verdict.get("reason", "deadline passed") if verdict else "deadline passed"
        vault.evaluated_at = current_time
        vault.status = "refunded"
        
        # Refund all depositors proportionally
        depositors = self.depositor_list.get(vault_id)
        deposits_for_vault = self.deposits.get(vault_id)
        total = vault.total_deposited

        if depositors and deposits_for_vault:
            for dep in depositors:
                d = deposits_for_vault.get(dep)
                if d and d.amount > gl.u256(0):
                    gl.chain.Account(dep).emit_transfer(d.amount)
        
        vault.total_deposited = gl.u256(0)
        return "Refunded all depositors for vault " + vault_id

    # Views
    @gl.public.view
    def get_vault(self, vault_id: str) -> dict:
        v = self.vaults.get(vault_id)
        if not v:
            return {}
        return {
            "id": v.id,
            "creator": str(v.creator),
            "team_address": str(v.team_address),
            "deadline": v.deadline,
            "condition": v.condition,
            "status": v.status,
            "total_deposited": str(v.total_deposited),
            "condition_contract": str(v.condition_contract),
            "verdict": v.verdict,
            "verdict_reason": v.verdict_reason,
            "evaluated_at": v.evaluated_at,
        }

    @gl.public.view
    def get_all_vaults(self) -> list:
        results = []
        for key in self.vaults.keys():
            v = self.vaults[key]
            results.append({
                "id": v.id,
                "creator": str(v.creator),
                "team_address": str(v.team_address),
                "deadline": v.deadline,
                "condition": v.condition,
                "status": v.status,
                "total_deposited": str(v.total_deposited),
                "verdict": v.verdict,
            })
        return results

    @gl.public.view
    def get_vault_depositors(self, vault_id: str) -> list:
        # Read-only: must NOT use get_or_insert_default (that writes storage).
        depositors = self.depositor_list.get(vault_id)
        if not depositors:
            return []
        deposits_for_vault = self.deposits.get(vault_id)
        if not deposits_for_vault:
            return []
        results = []
        for dep in depositors:
            d = deposits_for_vault.get(dep)
            if d:
                results.append({
                    "depositor": str(d.depositor),
                    "amount": str(d.amount),
                    "deposited_at": d.deposited_at,
                })
        return results

    @gl.public.view
    def get_deposit(self, vault_id: str, depositor: gl.Address) -> dict:
        deposits_for_vault = self.deposits.get(vault_id)
        if not deposits_for_vault:
            return {}
        # Callers pass hex strings; coerce since the map is keyed by Address.
        d = deposits_for_vault.get(gl.Address(depositor))
        if not d:
            return {}
        return {
            "depositor": str(d.depositor),
            "amount": str(d.amount),
            "deposited_at": d.deposited_at,
        }
