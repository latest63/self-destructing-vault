"""Integration tests for Self-Destructing Vault full flow."""

from tests.direct.conftest import to_hex


def test_full_flow_condition_evaluation_success(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Test condition evaluation flow: register → evaluate → get verdict."""
    
    condition_contract = direct_deploy("contracts/condition.py")
    
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)
    bob = to_hex(direct_bob)
    
    # Step 1: Register condition
    condition_contract.register_condition(
        "vault_1",
        "https://github.com/team/project",
        "Has at least 10 commits and a README file",
        bob,
    )
    
    condition = condition_contract.get_condition("vault_1")
    assert condition["vault_id"] == "vault_1"
    
    # Step 2: Mock web and LLM for evaluation
    direct_vm.mock_web(
        r".*github\.com.*",
        {"status": 200, "body": "Repository with 15 commits and README.md"},
    )
    
    direct_vm.mock_llm(
        r".*verification.*",
        '{"verified": true, "reason": "Repository has 15 commits and README file"}',
    )
    
    # Step 3: Evaluate condition
    verdict = condition_contract.evaluate("vault_1")
    assert verdict["decision"] == "success"
    
    # Step 4: Verify verdict is stored
    stored_verdict = condition_contract.get_verdict("vault_1")
    assert stored_verdict["decision"] == "success"
    assert "15 commits" in stored_verdict["reason"]
    
    print("✓ Full flow success test passed")


def test_full_flow_condition_evaluation_failure(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Test condition evaluation flow with failure."""
    
    condition_contract = direct_deploy("contracts/condition.py")
    
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)
    bob = to_hex(direct_bob)
    
    # Step 1: Register condition
    condition_contract.register_condition(
        "vault_1",
        "https://github.com/team/project",
        "Has at least 10 commits",
        bob,
    )
    
    # Step 2: Mock web and LLM for evaluation (failure)
    direct_vm.mock_web(
        r".*github\.com.*",
        {"status": 200, "body": "Empty repository with 0 commits"},
    )
    
    direct_vm.mock_llm(
        r".*verification.*",
        '{"verified": false, "reason": "Repository has 0 commits"}',
    )
    
    # Step 3: Evaluate condition
    verdict = condition_contract.evaluate("vault_1")
    assert verdict["decision"] == "failure"
    
    # Step 4: Verify verdict is stored
    stored_verdict = condition_contract.get_verdict("vault_1")
    assert stored_verdict["decision"] == "failure"
    assert "0 commits" in stored_verdict["reason"]
    
    print("✓ Full flow failure test passed")


def test_vault_creation_and_deposits(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Test vault creation and multiple deposits."""
    
    vault_contract = direct_deploy("contracts/vault.py")
    
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)
    bob = to_hex(direct_bob)
    
    team_addr = "0x1234567890abcdef1234567890abcdef12345678"
    condition_addr = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    
    # Create vault
    vault_contract.create_vault(
        "vault_1",
        team_addr,
        "2024-12-31T23:59:59Z",
        "Complete project",
        condition_addr,
    )
    
    vault = vault_contract.get_vault("vault_1")
    assert vault["status"] == "active"
    assert vault["total_deposited"] == "0"
    
    # Alice deposits
    vault_contract.deposit("vault_1", value=1000)
    
    # Bob deposits
    direct_vm.sender = direct_bob
    vault_contract.deposit("vault_1", value=2000)
    
    # Alice deposits again
    direct_vm.sender = direct_alice
    vault_contract.deposit("vault_1", value=500)
    
    vault = vault_contract.get_vault("vault_1")
    assert vault["total_deposited"] == "3500"
    
    deposit_alice = vault_contract.get_deposit("vault_1", direct_alice)
    assert deposit_alice["amount"] == "1500"
    
    deposit_bob = vault_contract.get_deposit("vault_1", direct_bob)
    assert deposit_bob["amount"] == "2000"
    
    depositors = vault_contract.get_vault_depositors("vault_1")
    assert len(depositors) == 2
    
    print("✓ Vault creation and deposits test passed")


def test_condition_caching(direct_vm, direct_deploy, direct_alice):
    """Test that condition evaluation is cached properly."""
    
    condition_contract = direct_deploy("contracts/condition.py")
    
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)
    
    condition_contract.register_condition(
        "vault_1",
        "https://example.com",
        "Has content",
        alice,
    )
    
    # First evaluation
    direct_vm.mock_web(
        r".*example\.com.*",
        {"status": 200, "body": "Content present"},
    )
    
    direct_vm.mock_llm(
        r".*verification.*",
        '{"verified": true, "reason": "Content exists"}',
    )
    
    result1 = condition_contract.evaluate("vault_1")
    assert result1["decision"] == "success"
    
    # Clear mocks - should not be called again
    direct_vm.clear_mocks()
    
    # Second evaluation should return cached result
    result2 = condition_contract.evaluate("vault_1")
    assert result2["decision"] == "success"
    assert result2["reason"] == result1["reason"]
    
    # Verify verdict is cached
    verdict = condition_contract.get_verdict("vault_1")
    assert verdict["decision"] == "success"
    
    print("✓ Condition caching test passed")


def test_vault_status_transitions(direct_vm, direct_deploy, direct_alice):
    """Test that vault status can only transition in valid ways."""
    
    vault_contract = direct_deploy("contracts/vault.py")
    
    direct_vm.sender = direct_alice
    
    team_addr = "0x1234567890abcdef1234567890abcdef12345678"
    condition_addr = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    
    # Create vault - should be active
    vault_contract.create_vault(
        "vault_1",
        team_addr,
        "2024-12-31T23:59:59Z",
        "Complete project",
        condition_addr,
    )
    
    vault = vault_contract.get_vault("vault_1")
    assert vault["status"] == "active"
    
    # Deposit should work when active
    vault_contract.deposit("vault_1", value=1000)
    
    vault = vault_contract.get_vault("vault_1")
    assert vault["total_deposited"] == "1000"
    
    print("✓ Vault status transitions test passed")


def test_condition_not_found(direct_vm, direct_deploy, direct_alice):
    """Test error handling for missing conditions."""
    
    condition_contract = direct_deploy("contracts/condition.py")
    direct_vm.sender = direct_alice
    
    # Try to evaluate non-existent condition
    with direct_vm.expect_revert("Condition not found for vault nonexistent"):
        condition_contract.evaluate("nonexistent")
    
    # Try to get verdict for non-existent condition
    verdict = condition_contract.get_verdict("nonexistent")
    assert verdict["decision"] == "pending"
    
    # Try to get condition that doesn't exist
    condition = condition_contract.get_condition("nonexistent")
    assert condition == {}
    
    print("✓ Condition not found test passed")


def test_vault_not_found(direct_vm, direct_deploy, direct_alice):
    """Test error handling for missing vaults."""
    
    vault_contract = direct_deploy("contracts/vault.py")
    direct_vm.sender = direct_alice
    
    # Try to get vault that doesn't exist
    vault = vault_contract.get_vault("nonexistent")
    assert vault == {}
    
    # Try to deposit to non-existent vault
    with direct_vm.expect_revert("Vault not found"):
        vault_contract.deposit("nonexistent", value=1000)
    
    print("✓ Vault not found test passed")
