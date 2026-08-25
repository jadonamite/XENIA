//! Test-only contracts. Gated behind the `test_contracts` feature so they never reach a
//! deployment artifact — run the suite with `snforge test --features test_contracts`.

/// The smallest ERC-20 that satisfies `IERC20Dispatcher`. `XeniaEscrow` only ever calls `approve`,
/// but the full trait has to be present for the dispatcher's ABI to line up.
#[starknet::contract]
pub mod MockERC20 {
    use openzeppelin::interfaces::token::erc20::IERC20;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address};

    #[storage]
    struct Storage {
        total_supply: u256,
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, recipient: ContractAddress, supply: u256) {
        self.total_supply.write(supply);
        self.balances.write(recipient, supply);
    }

    #[abi(embed_v0)]
    impl MockERC20Impl of IERC20<ContractState> {
        fn total_supply(self: @ContractState) -> u256 {
            self.total_supply.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn allowance(
            self: @ContractState, owner: ContractAddress, spender: ContractAddress,
        ) -> u256 {
            self.allowances.read((owner, spender))
        }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let sender = get_caller_address();
            self.balances.write(sender, self.balances.read(sender) - amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
            true
        }

        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool {
            let spender = get_caller_address();
            let allowed = self.allowances.read((sender, spender));
            self.allowances.write((sender, spender), allowed - amount);
            self.balances.write(sender, self.balances.read(sender) - amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            self.allowances.write((get_caller_address(), spender), amount);
            true
        }
    }
}

/// A stand-in for the privacy pool, exercising the parts of the handshake our own tests otherwise
/// fake.
///
/// The suite in `test_xenia_escrow.cairo` cheats the caller address and calls through a typed
/// dispatcher, which proves the escrow's logic but not that it can be *driven the way the pool
/// drives it*. The real path is a raw `call_contract_syscall` carrying a flat calldata array, a
/// return value the pool deserialises as `Span<OpenNoteDeposit>`, and a `transfer_from` that
/// depends on the escrow having approved first. Each of those is a place the client can be correct
/// and the integration still fail.
#[starknet::interface]
pub trait IMockPrivacyPool<T> {
    /// `withdraw_amount` mirrors the pool's phase-6 Withdraw; pass zero for a claim, which sends
    /// nothing and only invokes.
    fn withdraw_and_invoke(
        ref self: T,
        helper: starknet::ContractAddress,
        token: starknet::ContractAddress,
        withdraw_amount: u256,
        calldata: Span<felt252>,
    ) -> Span<crate::open_note::OpenNoteDeposit>;
}

#[starknet::contract]
pub mod MockPrivacyPool {
    use core::num::traits::Zero;
    use openzeppelin::interfaces::token::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::syscalls::call_contract_syscall;
    use starknet::{ContractAddress, get_contract_address};
    use crate::open_note::OpenNoteDeposit;
    use super::IMockPrivacyPool;

    /// The selector the real pool uses — `privacy::utils::INVOKE_SELECTOR`.
    const INVOKE_SELECTOR: felt252 = selector!("privacy_invoke");

    #[storage]
    struct Storage {}

    #[abi(embed_v0)]
    impl MockPrivacyPoolImpl of IMockPrivacyPool<ContractState> {
        fn withdraw_and_invoke(
            ref self: ContractState,
            helper: ContractAddress,
            token: ContractAddress,
            withdraw_amount: u256,
            calldata: Span<felt252>,
        ) -> Span<OpenNoteDeposit> {
            // Phase 6 — the pool moves the input tokens to the helper before invoking it.
            if withdraw_amount.is_non_zero() {
                IERC20Dispatcher { contract_address: token }.transfer(helper, withdraw_amount);
            }

            // Phase 7 — raw syscall with flat calldata, exactly as the pool does it.
            let mut returned = call_contract_syscall(helper, INVOKE_SELECTOR, calldata).unwrap();
            let deposits: Span<OpenNoteDeposit> = Serde::deserialize(ref returned).unwrap();

            // Applying the deposits: pull what the helper approved. Fails if it approved nothing.
            let mut remaining = deposits;
            loop {
                match remaining.pop_front() {
                    Option::Some(d) => {
                        IERC20Dispatcher { contract_address: *d.token }
                            .transfer_from(helper, get_contract_address(), (*d.amount).into());
                    },
                    Option::None => { break; },
                }
            }

            deposits
        }
    }
}
