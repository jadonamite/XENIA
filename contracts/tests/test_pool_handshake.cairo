//! The full lifecycle driven the way the pool drives it.
//!
//! `test_xenia_escrow.cairo` proves the escrow's logic, but it cheats the caller address and calls
//! through a typed dispatcher. That leaves three things unexercised, and all three sit exactly
//! where a client integration goes wrong:
//!
//! 1. **Flat calldata.** The pool forwards a `Span<felt252>` and Starknet deserialises it
//!    positionally into `privacy_invoke`'s ten parameters. The arrays below are byte-for-byte what
//!    `contracts/CLIENT-FIXES.md` tells the client to send — if the shape is wrong, these fail.
//! 2. **The returned span.** The pool deserialises our return value as `Span<OpenNoteDeposit>`. An
//!    empty span on deposit and a one-entry span on claim both have to survive that round trip.
//! 3. **Approve, then pull.** The escrow approves and the pool calls `transfer_from`. If the
//!    approval is missing or short, the pull reverts — and nothing in the dispatcher tests would
//!    have noticed.

use openzeppelin::interfaces::token::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
use snforge_std::signature::KeyPairTrait;
use snforge_std::signature::stark_curve::{StarkCurveKeyPairImpl, StarkCurveSignerImpl};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_block_timestamp_global,
};
use starknet::ContractAddress;
use xenia::mocks::{IMockPrivacyPoolDispatcher, IMockPrivacyPoolDispatcherTrait};
use xenia::xenia_escrow::{
    IXeniaEscrowDispatcher, IXeniaEscrowDispatcherTrait, claim_message, compute_commitment,
    refund_message,
};

const SUPPLY: u256 = 1_000_000_000;
const AMOUNT: u128 = 250_000;
const START_TS: u64 = 1_000;
const EXPIRY: u64 = 2_000;
const NOTE_ID: felt252 = 'NOTE_ID';

fn addr(value: felt252) -> ContractAddress {
    value.try_into().unwrap()
}

/// Token, pool and escrow, wired as they are on chain: the escrow trusts the pool, and the pool
/// holds the tokens it will withdraw.
fn setup() -> (IMockPrivacyPoolDispatcher, IXeniaEscrowDispatcher, ContractAddress) {
    start_cheat_block_timestamp_global(START_TS);

    let pool_class = declare("MockPrivacyPool").unwrap().contract_class();
    let (pool, _) = pool_class.deploy(@array![]).unwrap();

    let token_class = declare("MockERC20").unwrap().contract_class();
    let mut args = array![];
    pool.serialize(ref args); // the pool starts holding the supply
    SUPPLY.serialize(ref args);
    let (token, _) = token_class.deploy(@args).unwrap();

    let escrow_class = declare("XeniaEscrow").unwrap().contract_class();
    let (escrow, _) = escrow_class.deploy(@array![pool.into(), token.into()]).unwrap();

    (
        IMockPrivacyPoolDispatcher { contract_address: pool },
        IXeniaEscrowDispatcher { contract_address: escrow },
        token,
    )
}

/// Exactly the array in CLIENT-FIXES.md: ten felts, unused positions zero.
fn deposit_calldata(
    commitment: felt252, token: ContractAddress, refund_to: ContractAddress,
) -> Array<felt252> {
    array![
        0, // Deposit
        commitment, token.into(), AMOUNT.into(), EXPIRY.into(), refund_to.into(), 0,
        0, 0, 0,
    ]
}

fn settle_calldata(
    operation: felt252, link_pubkey: felt252, recipient: ContractAddress, r: felt252, s: felt252,
) -> Array<felt252> {
    array![operation, link_pubkey, 0, 0, 0, 0, recipient.into(), r, s, NOTE_ID]
}

#[test]
fn a_deposit_parks_the_funds_and_returns_an_empty_span() {
    let (pool, escrow, token) = setup();
    let erc20 = IERC20Dispatcher { contract_address: token };
    let link_key = KeyPairTrait::<felt252, felt252>::generate();
    let commitment = compute_commitment(link_key.public_key);

    let deposits = pool
        .withdraw_and_invoke(
            escrow.contract_address,
            token,
            AMOUNT.into(),
            deposit_calldata(commitment, token, addr('SENDER')).span(),
        );

    // An empty span has to survive the round trip, or the pool rejects the call outright.
    assert!(deposits.len() == 0, "deposit should credit nothing");
    assert!(erc20.balance_of(escrow.contract_address) == AMOUNT.into(), "funds not parked");

    let entry = escrow.get_claim(commitment);
    assert!(entry.token == token && entry.amount == AMOUNT, "entry not stored");
}

#[test]
fn a_claim_credits_the_pool_and_the_pool_can_pull() {
    let (pool, escrow, token) = setup();
    let erc20 = IERC20Dispatcher { contract_address: token };
    let link_key = KeyPairTrait::<felt252, felt252>::generate();
    let commitment = compute_commitment(link_key.public_key);
    let claimant = addr('CLAIMANT');

    pool
        .withdraw_and_invoke(
            escrow.contract_address,
            token,
            AMOUNT.into(),
            deposit_calldata(commitment, token, addr('SENDER')).span(),
        );
    let pool_before = erc20.balance_of(pool.contract_address);

    let (r, s) = link_key.sign(claim_message(commitment, claimant)).unwrap();
    let deposits = pool
        .withdraw_and_invoke(
            escrow.contract_address,
            token,
            0, // a claim sends nothing in
            settle_calldata(1, link_key.public_key, claimant, r, s).span(),
        );

    assert!(deposits.len() == 1, "claim should credit exactly one note");
    let d = *deposits.at(0);
    assert!(d.note_id == NOTE_ID, "wrong note id");
    assert!(d.token == token, "wrong token");
    assert!(d.amount == AMOUNT, "wrong amount");

    // The pull only works because the escrow approved first.
    assert!(
        erc20.balance_of(pool.contract_address) == pool_before + AMOUNT.into(),
        "pool could not pull the approved tokens",
    );
    assert!(erc20.balance_of(escrow.contract_address) == 0, "escrow should be empty");
    assert!(escrow.get_claim(commitment).claimed, "claim not marked");
}

#[test]
fn a_refund_after_expiry_returns_the_funds_through_the_pool() {
    let (pool, escrow, token) = setup();
    let erc20 = IERC20Dispatcher { contract_address: token };
    let link_key = KeyPairTrait::<felt252, felt252>::generate();
    let commitment = compute_commitment(link_key.public_key);
    let sender = addr('SENDER');

    pool
        .withdraw_and_invoke(
            escrow.contract_address,
            token,
            AMOUNT.into(),
            deposit_calldata(commitment, token, sender).span(),
        );

    start_cheat_block_timestamp_global(EXPIRY);
    let (r, s) = link_key.sign(refund_message(commitment, sender)).unwrap();
    let deposits = pool
        .withdraw_and_invoke(
            escrow.contract_address,
            token,
            0,
            settle_calldata(2, link_key.public_key, sender, r, s).span(),
        );

    assert!(deposits.len() == 1, "refund should credit exactly one note");
    assert!(*deposits.at(0).amount == AMOUNT, "wrong refund amount");
    assert!(erc20.balance_of(escrow.contract_address) == 0, "escrow should be empty");
}

/// The whole point of the design: a claim is authorised for one address and cannot be redirected by
/// whoever sees it first.
#[test]
#[should_panic]
fn a_claim_redirected_to_another_address_reverts_through_the_pool() {
    let (pool, escrow, token) = setup();
    let link_key = KeyPairTrait::<felt252, felt252>::generate();
    let commitment = compute_commitment(link_key.public_key);

    pool
        .withdraw_and_invoke(
            escrow.contract_address,
            token,
            AMOUNT.into(),
            deposit_calldata(commitment, token, addr('SENDER')).span(),
        );

    // Signed for CLAIMANT, submitted naming ATTACKER.
    let (r, s) = link_key.sign(claim_message(commitment, addr('CLAIMANT'))).unwrap();
    pool
        .withdraw_and_invoke(
            escrow.contract_address,
            token,
            0,
            settle_calldata(1, link_key.public_key, addr('ATTACKER'), r, s).span(),
        );
}
