"""Tests for Self-Destructing Vault contract."""

from tests.direct.conftest import to_hex


def test_create_vault(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/vault.py")
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)

    team_addr = "0x1234567890abcdef1234567890abcdef12345678"
    condition_addr = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"

    result = contract.create_vault(
        "vault_1",
        team_addr,
        "2024-12-31T23:59:59Z",
        "Complete project milestone",
        condition_addr,
    )

    assert "Vault created: vault_1" in result

    vault = contract.get_vault("vault_1")
    assert vault["id"] == "vault_1"
    assert vault["creator"] == alice
    assert vault["team_address"] == team_addr
    assert vault["deadline"] == "2024-12-31T23:59:59Z"
    assert vault["condition"] == "Complete project milestone"
    assert vault["status"] == "active"
    assert vault["total_deposited"] == "0"
    assert vault["condition_contract"] == condition_addr
    assert vault["verdict"] == ""


def test_create_vault_duplicate(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/vault.py")
    direct_vm.sender = direct_alice

    team_addr = "0x1234567890abcdef1234567890abcdef12345678"
    condition_addr = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"

    contract.create_vault(
        "vault_1",
        team_addr,
        "2024-12-31T23:59:59Z",
        "Complete project",
        condition_addr,
    )

    with direct_vm.expect_revert("Vault already exists"):
        contract.create_vault(
            "vault_1",
            team_addr,
            "2024-12-31T23:59:59Z",
            "Different condition",
            condition_addr,
        )


def test_get_vault_exists(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/vault.py")
    direct_vm.sender = direct_alice

    team_addr = "0x1234567890abcdef1234567890abcdef12345678"
    condition_addr = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"

    contract.create_vault(
        "vault_1",
        team_addr,
        "2024-12-31T23:59:59Z",
        "Complete project",
        condition_addr,
    )

    vault = contract.get_vault("vault_1")
    assert vault["id"] == "vault_1"
    assert vault["status"] == "active"


def test_get_vault_not_found(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/vault.py")
    direct_vm.sender = direct_alice

    vault = contract.get_vault("nonexistent")
    assert vault == {}


def test_deposit_success(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/vault.py")
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)

    team_addr = "0x1234567890abcdef1234567890abcdef12345678"
    condition_addr = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"

    contract.create_vault(
        "vault_1",
        team_addr,
        "2024-12-31T23:59:59Z",
        "Complete project",
        condition_addr,
    )

    result = contract.deposit("vault_1", value=1000)
    assert "Deposited 1000 to vault vault_1" in result

    vault = contract.get_vault("vault_1")
    assert vault["total_deposited"] == "1000"

    deposit = contract.get_deposit("vault_1", direct_alice)
    assert deposit["depositor"] == alice
    assert deposit["amount"] == "1000"


def test_deposit_zero_value(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/vault.py")
    direct_vm.sender = direct_alice

    team_addr = "0x1234567890abcdef1234567890abcdef12345678"
    condition_addr = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"

    contract.create_vault(
        "vault_1",
        team_addr,
        "2024-12-31T23:59:59Z",
        "Complete project",
        condition_addr,
    )

    with direct_vm.expect_revert("Must send value"):
        contract.deposit("vault_1", value=0)


def test_deposit_wrong_vault(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/vault.py")
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Vault not found"):
        contract.deposit("nonexistent", value=1000)


def test_get_deposit_exists(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/vault.py")
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)

    team_addr = "0x1234567890abcdef1234567890abcdef12345678"
    condition_addr = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"

    contract.create_vault(
        "vault_1",
        team_addr,
        "2024-12-31T23:59:59Z",
        "Complete project",
        condition_addr,
    )

    contract.deposit("vault_1", value=500)

    deposit = contract.get_deposit("vault_1", direct_alice)
    assert deposit["depositor"] == alice
    assert deposit["amount"] == "500"


def test_get_deposit_not_found(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/vault.py")
    direct_vm.sender = direct_alice

    deposit = contract.get_deposit("vault_1", direct_alice)
    assert deposit == {}


def test_release_condition_not_met(direct_vm, direct_deploy, direct_alice):
    """Test that release fails when condition contract is not available."""
    contract = direct_deploy("contracts/vault.py")
    direct_vm.sender = direct_alice

    team_addr = "0x1234567890abcdef1234567890abcdef12345678"
    condition_addr = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"

    contract.create_vault(
        "vault_1",
        team_addr,
        "2024-12-31T23:59:59Z",
        "Complete project",
        condition_addr,
    )

    contract.deposit("vault_1", value=1000)

    # Without proper cross-contract mock, release should fail
    with direct_vm.expect_revert("Condition not met"):
        contract.release("vault_1")


def test_refund_deadline_not_passed(direct_vm, direct_deploy, direct_alice):
    """Test refund fails when deadline hasn't passed and condition not failed."""
    contract = direct_deploy("contracts/vault.py")
    direct_vm.sender = direct_alice

    team_addr = "0x1234567890abcdef1234567890abcdef12345678"
    condition_addr = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"

    # Create vault with future deadline
    contract.create_vault(
        "vault_1",
        team_addr,
        "2099-12-31T23:59:59Z",
        "Complete project",
        condition_addr,
    )

    contract.deposit("vault_1", value=1000)

    with direct_vm.expect_revert("Deadline not passed and condition not yet failed"):
        contract.refund("vault_1")
