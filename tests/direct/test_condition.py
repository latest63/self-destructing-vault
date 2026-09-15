"""Tests for Condition Governor contract."""

from tests.direct.conftest import to_hex


def test_register_condition(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/condition.py")
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)

    result = contract.register_condition(
        "vault_1",
        "https://github.com/team/project",
        "Has at least 10 commits and a README file",
        alice,
    )

    assert "Condition registered for vault vault_1" in result

    condition = contract.get_condition("vault_1")
    assert condition["vault_id"] == "vault_1"
    assert condition["check_url"] == "https://github.com/team/project"
    assert condition["success_condition"] == "Has at least 10 commits and a README file"
    assert condition["team_address"] == alice


def test_register_condition_duplicate(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/condition.py")
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)

    contract.register_condition(
        "vault_1",
        "https://github.com/team/project",
        "Has at least 10 commits",
        alice,
    )

    with direct_vm.expect_revert("Condition already registered"):
        contract.register_condition(
            "vault_1",
            "https://github.com/team/other",
            "Different condition",
            alice,
        )


def test_get_condition_exists(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/condition.py")
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)

    contract.register_condition(
        "vault_1",
        "https://github.com/team/project",
        "Has README",
        alice,
    )

    condition = contract.get_condition("vault_1")
    assert condition["vault_id"] == "vault_1"
    assert condition["check_url"] == "https://github.com/team/project"


def test_get_condition_not_found(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/condition.py")
    direct_vm.sender = direct_alice

    condition = contract.get_condition("nonexistent")
    assert condition == {}


def test_get_verdict_pending(direct_vm, direct_deploy, direct_alice):
    """Test get_verdict before evaluation."""
    contract = direct_deploy("contracts/condition.py")
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)

    contract.register_condition(
        "vault_1",
        "https://github.com/team/project",
        "Has README",
        alice,
    )

    verdict = contract.get_verdict("vault_1")
    assert verdict["decision"] == "pending"
    assert verdict["reason"] == "Not yet evaluated"


def test_evaluate_condition_success(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/condition.py")
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)

    contract.register_condition(
        "vault_1",
        "https://github.com/team/project",
        "Has at least 10 commits and a README",
        alice,
    )

    # Mock web response
    direct_vm.mock_web(
        r".*github\.com.*",
        {"status": 200, "body": "Repository with 15 commits and README.md"},
    )

    # Mock LLM to return verified - the condition.py uses exec_prompt which returns raw text
    direct_vm.mock_llm(
        r".*verification.*",
        '{"verified": true, "reason": "Repository has 15 commits and README file"}',
    )

    result = contract.evaluate("vault_1")
    assert result["decision"] == "success"
    assert "Repository has 15 commits" in result["reason"]

    verdict = contract.get_verdict("vault_1")
    assert verdict["decision"] == "success"


def test_evaluate_condition_failure(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/condition.py")
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)

    contract.register_condition(
        "vault_1",
        "https://github.com/team/project",
        "Has at least 10 commits",
        alice,
    )

    # Mock web response
    direct_vm.mock_web(
        r".*github\.com.*",
        {"status": 200, "body": "Empty repository with no commits"},
    )

    # Mock LLM to return not verified
    direct_vm.mock_llm(
        r".*verification.*",
        '{"verified": false, "reason": "Repository has 0 commits"}',
    )

    result = contract.evaluate("vault_1")
    assert result["decision"] == "failure"
    assert "0 commits" in result["reason"]

    verdict = contract.get_verdict("vault_1")
    assert verdict["decision"] == "failure"


def test_evaluate_already_evaluated(direct_vm, direct_deploy, direct_alice):
    """Test that re-evaluating returns cached result."""
    contract = direct_deploy("contracts/condition.py")
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)

    contract.register_condition(
        "vault_1",
        "https://github.com/team/project",
        "Has README",
        alice,
    )

    # First evaluation
    direct_vm.mock_web(
        r".*github\.com.*",
        {"status": 200, "body": "Repository with README"},
    )
    direct_vm.mock_llm(
        r".*verification.*",
        '{"verified": true, "reason": "Has README"}',
    )

    first_result = contract.evaluate("vault_1")
    assert first_result["decision"] == "success"

    # Clear mocks - should not be called again
    direct_vm.clear_mocks()

    # Second evaluation should return cached result
    second_result = contract.evaluate("vault_1")
    assert second_result["decision"] == "success"
    assert second_result["reason"] == first_result["reason"]


def test_evaluate_not_found(direct_vm, direct_deploy, direct_alice):
    """Test evaluating a condition that doesn't exist."""
    contract = direct_deploy("contracts/condition.py")
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Condition not found for vault nonexistent"):
        contract.evaluate("nonexistent")
