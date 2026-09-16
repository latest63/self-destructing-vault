"""End-to-end vault logic: create -> deposit -> (verdict gate) -> release/refund."""


def test_deposit_path(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/vault.py")
    direct_vm.sender = direct_alice
    alice = "0x" + bytes(direct_alice).hex()

    contract.create_vault(
        "v1",
        "0x1234567890abcdef1234567890abcdef12345678",
        "2099-12-31T23:59:59Z",
        "Complete project",
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    )

    direct_vm.value = 1000
    print("deposit:", contract.deposit("v1"))

    vault = contract.get_vault("v1")
    print("vault:", vault)
    assert vault["total_deposited"] == "1000"

    dep = contract.get_deposit("v1", alice)
    print("get_deposit:", dep)
    assert dep["amount"] == "1000"

    depositors = contract.get_vault_depositors("v1")
    print("depositors:", depositors)
    assert len(depositors) == 1

    # second deposit from bob accumulates
    direct_vm.sender = direct_bob
    direct_vm.value = 500
    contract.deposit("v1")
    direct_vm.sender = direct_alice
    print("after bob:", contract.get_vault("v1")["total_deposited"])
    print("depositors:", len(contract.get_vault_depositors("v1")))
