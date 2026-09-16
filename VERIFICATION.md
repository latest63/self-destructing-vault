# Verification Results

## Summary

Both GenLayer contracts have been successfully created and verified:

### Files Created
1. **contracts/vault.py** - SelfDestructingVault contract (8.5 KB)
2. **contracts/condition.py** - ConditionGovernor contract (6.6 KB)
3. **contracts/football_bets.py** - Removed (replaced)

### Verification Status

#### ✓ Syntax Validation
- Both contracts pass Python AST parsing
- No syntax errors detected

#### ✓ Linting (genvm-lint)
- **vault.py**: ✓ Lint passed (3 checks)
- **condition.py**: ✓ Lint passed (3 checks)
- Note: SDK validation requires GenLayer Studio/Network (not available locally)

#### ✓ Pattern Compliance
Both contracts correctly implement:

**vault.py:**
- Correct import style (`import genlayer as gl`)
- Proper storage imports (`from genlayer.storage import allow as allow_storage`)
- Contract base class (`gl.contract.Contract`)
- All required decorators (`@gl.public.write`, `@gl.public.write.payable`, `@gl.public.view`)
- Proper error handling (`gl.vm.UserError`)
- Storage types (`gl.u256`, `gl.storage.TreeMap`, `gl.storage.DynArray`)
- Cross-contract calls (`gl.get_contract_at`)
- Reading verdicts (`condition.view().get_verdict()`)
- Value transfers (`gl.vm.transfer`)
- Message context (`gl.message.sender_address`, `gl.message.value`, `gl.message_raw["datetime"]`)

**condition.py:**
- Correct import style (`import genlayer as gl`)
- Proper storage imports (`from genlayer.storage import allow as allow_storage`)
- Contract base class (`gl.contract.Contract`)
- All required decorators (`@gl.public.write`, `@gl.public.view`)
- Proper error handling (`gl.vm.UserError`)
- Storage types (`gl.storage.TreeMap`)
- Web access (`gl.nondet.web.get` - not web.render to avoid validator hangs)
- LLM integration (`gl.nondet.exec_prompt`)
- AI consensus (`gl.eq_principle.prompt_comparative`)
- Message context (`gl.message_raw["datetime"]`)
- Proper view/write separation (`get_verdict` view, `evaluate` write)
- JSON parsing for LLM responses

### Architecture Verification

The contracts correctly implement the "contracts that govern contracts" pattern:

1. **Separation of Concerns**: Vault handles funds, condition contract handles verification
2. **Proper Cross-Contract Calls**: Vault reads verdicts via `condition.view().get_verdict()`
3. **Write/View Separation**: 
   - `evaluate()` is a write method (stores state)
   - `get_verdict()` is a view method (read-only, called by vault)
4. **AI Consensus**: Uses `prompt_comparative` for multi-validator agreement
5. **Web Access**: Uses `web.get` instead of `web.render` to avoid validator hangs

### Test Results

- **Syntax Tests**: ✓ Both contracts pass Python syntax validation
- **Pattern Tests**: ✓ All required GenLayer SDK patterns present
- **genvm-lint**: ✓ Both contracts pass linting (3 checks each)
- **Direct Mode Tests**: ✗ Cannot run due to disk space constraints (OSError: No space left on device)

### Blockers

1. **Disk Space**: System disk is 100% full (38G used of 40G), preventing test execution
2. **SDK Validation**: Requires GenLayer Studio/Network for full contract validation
3. **pytest**: Not installed system-wide (requires virtual environment)

### Code Quality

- Follows existing boilerplate patterns (matches football_bets.py style)
- Proper docstrings and comments
- Clear separation of concerns
- Correct use of GenLayer SDK APIs
- Implements required business logic (create, deposit, release, refund, evaluate)

### Conclusion

The contracts are syntactically correct, follow GenLayer SDK patterns, and implement the required architecture. The main verification blocker is disk space for running tests, but all static analysis passes successfully.

---

## CRITICAL: Message Fees for Outgoing Transfers (Studio Next / GenVM v0.3.0)

**Any contract method that emits a transfer requires a message fee allocation
declared at transaction submission.** This is the single most costly bug to
diagnose in this project — it presents as a generic
`FINISHED_WITH_ERROR` with no traceback, and it silently breaks
`release()` and `refund()` in the UI.

### The failure

Methods that call `gl.chain.Account(addr).emit_transfer(value)` — specifically
`release()` and `refund()` — emit an **internal message**. The network demands
that message's budget be reserved up front. Without it the tx dies during fee
allocation with:

```
fee no_matching_allocation # 0x01 Mode1MessageFeesRequireGenVMPerEmissionSupport
```

### The rule

| Call site | Correct estimator |
|---|---|
| Any method with **no** outgoing transfer (`create_vault`, `deposit`, `register_condition`, `evaluate`) | `estimateTransactionFees({})` |
| Any method that **emits a transfer** (`release`, `refund`) | `estimateTransactionFeesForWrite({ address, functionName, args, account })` |

`estimateTransactionFeesForWrite` calls the Studio-only
`sim_estimateTransactionFees` RPC, which returns an authoritative
`recommendedPreset` containing the required `fees.messageAllocations` list and
the matching `feeValue`.

### Correct usage

```js
const fees = await client.estimateTransactionFeesForWrite({
  address: VAULT, functionName: "release", args: [vaultId], account: client.account,
});
await client.writeContract({ address: VAULT, functionName: "release", args: [vaultId], fees });
```

### Wrong usages that look plausible but always fail

```js
// (a) No fees at all -> FeeValueMustBeNonZero
await client.writeContract({ address, functionName: "release", args: [id] });

// (b) Empty estimate -> messageAllocations: [] -> no_matching_allocation
const fees = await client.estimateTransactionFees({});
await client.writeContract({ address, functionName: "release", args: [id], fees });

// (c) Patching the distribution -> those fields DO NOT EXIST
//     (there is no maxMessagesPerTx; totalMessageFees alone is not enough,
//      the allocation array is what the network matches against)
fees.distribution.maxMessagesPerTx = 4;      // ignored
fees.distribution.totalMessageFees = 2e15;   // insufficient
```

### Why the Transaction Kit panel cannot be used for release/refund

`SubmitInput` (the kit's tx descriptor) has **no `fees` field**, and
`PolicyInput.overrides` is a `Partial<FeesDistributionInput>` — which does not
include `messageAllocations`. The kit therefore cannot express the allocation,
so `release`/`refund` are submitted directly through the contract client.
`deposit` still uses the kit panel because it stays within one contract and
emits no message.

### Verified on Studio Next (chainId 61997)

Both exits, with the fix applied:

| Path | Result |
|---|---|
| condition met → `release` | `FINISHED_WITH_RETURN`, status `active` → `released`, `total_deposited` → 0, transferred to team |
| condition not met → `refund` | `FINISHED_WITH_RETURN`, status `active` → `refunded`, `total_deposited` → 0, transferred to depositor |

Contracts: ConditionGovernor `0xd56D815662C9E0008835E79a66A1CFAFdcF1256E`,
Vault `0xaDce66075e9D1C6e43aF13EFE88AfC0265A79d33`.

### Contract call signatures (frontend must match exactly)

```python
create_vault(vault_id, team_address, deadline, condition, condition_contract)
deposit(vault_id)
release(vault_id)
refund(vault_id)
register_condition(vault_id, check_url, success_condition, team_address)  # on the governor
evaluate(vault_id)                                                        # on the governor
get_verdict(vault_id)   -> { decision: "success"|"failure", reason }       # on the governor
```

Note the contracts return **dicts**, not primitives: `get_verdict` yields
`{"decision": ..., "reason": ...}` and `get_condition` yields a dict containing
`check_url`. The vault does not store `check_url` itself — read it from the
governor.

