# { "Depends": "py-genlayer:9b8kjyda2ycxyq4ea6g4yfpnydxhd52gqba5rb8dw7krkh5mn9p0" }

from dataclasses import dataclass
import genlayer as gl
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
        
        self.vaults[vault_id] = Vault(
            id=vault_id,
            creator=gl.message.sender_address,
            team_address=team_address,
            deadline=deadline,
            condition=condition,
            status="active",
            total_deposited=gl.u256(0),
            condition_contract=condition_contract,
            verdict="",
            verdict_reason="",
            evaluated_at="",
        )
        self.depositor_list[vault_id] = gl.storage.DynArray[gl.Address]()
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
        
        # Initialize deposit map if needed
        if vault_id not in self.deposits:
            self.deposits[vault_id] = gl.storage.TreeMap[gl.Address, VaultDeposit]()
        
        existing = self.deposits[vault_id].get(depositor)
        if existing:
            # Add to existing deposit
            self.deposits[vault_id][depositor] = VaultDeposit(
                depositor=depositor,
                amount=existing.amount + amount,
                deposited_at=str(gl.message_raw["datetime"]),
            )
        else:
            self.deposits[vault_id][depositor] = VaultDeposit(
                depositor=depositor,
                amount=amount,
                deposited_at=str(gl.message_raw["datetime"]),
            )
            self.depositor_list[vault_id].append(depositor)
        
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
        condition = gl.get_contract_at(vault.condition_contract)
        verdict = condition.view().get_verdict(vault_id)
        
        if not verdict or verdict.get("decision") != "success":
            raise gl.vm.UserError("Condition not met: " + str(verdict.get("reason", "not evaluated")))
        
        # Record verdict
        vault.verdict = "success"
        vault.verdict_reason = verdict.get("reason", "")
        vault.evaluated_at = str(gl.message_raw["datetime"])
        vault.status = "released"
        
        # Transfer to team
        total = vault.total_deposited
        gl.vm.transfer(vault.team_address, total)
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
        condition = gl.get_contract_at(vault.condition_contract)
        verdict = condition.view().get_verdict(vault_id)
        
        # Allow refund if condition failed OR deadline passed
        current_time = str(gl.message_raw["datetime"])
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
        depositors = self.depositor_list.get(vault_id, gl.storage.DynArray[gl.Address]())
        total = vault.total_deposited
        
        for dep in depositors:
            d = self.deposits[vault_id].get(dep)
            if d and d.amount > gl.u256(0):
                gl.vm.transfer(dep, d.amount)
        
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
        depositors = self.depositor_list.get(vault_id, gl.storage.DynArray[gl.Address]())
        results = []
        for dep in depositors:
            d = self.deposits[vault_id].get(dep)
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
        d = deposits_for_vault.get(depositor)
        if not d:
            return {}
        return {
            "depositor": str(d.depositor),
            "amount": str(d.amount),
            "deposited_at": d.deposited_at,
        }
