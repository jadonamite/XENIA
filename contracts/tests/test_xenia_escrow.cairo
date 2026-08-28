//! The suite PRD §4.7 requires, plus deposit validation.
//!
//! Note on the refund cases: PRD §4.7 words them as "refund by anyone other than `refund_to`".
//! That check is not implementable — `get_caller_address()` is always the pool. Refund is
//! authorised by a signature under `XENIA_REFUND_TAG_V1` instead, so the test asserts the
//! equivalent property: a refund not signed by the link key reverts `NOT_REFUND_OWNER`. See
//! `contracts/INTERFACE.md`.

use openzeppelin::interfaces::token::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
use snforge_std::signature::KeyPairTrait;
use snforge_std::signature::stark_curve::{StarkCurveKeyPairImpl, StarkCurveSignerImpl};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, EventSpyAssertionsTrait, declare, spy_events,
    start_cheat_block_timestamp_global, start_cheat_caller_address, stop_cheat_caller_address,
};
use starknet::ContractAddress;
use xenia::xenia_escrow::XeniaEscrow::{ClaimCreated, ClaimPrefunded, ClaimRedeemed, ClaimRefunded};
use xenia::xenia_escrow::{
    IXeniaEscrowDispatcher, IXeniaEscrowDispatcherTrait, XeniaOperation, claim_message,
    compute_commitment, public_claim_message, refund_message,
};

const POOL: felt252 = 'POOL';
const SENDER: felt252 = 'SENDER';
const CLAIMANT: felt252 = 'CLAIMANT';
const ATTACKER: felt252 = 'ATTACKER';

const AMOUNT: u128 = 1_000_000;
/// Fee-token balance handed to the escrow so it has something to pre-fund with.
const ESCROW_FUNDING: u256 = 500_000;
const PREFUND: u128 = 2_000;
const START_TS: u64 = 1_000;
const EXPIRY: u64 = 2_000;

fn addr(value: felt252) -> ContractAddress {
    value.try_into().unwrap()
}

/// Deploys the mock token and the escrow, and puts the clock at `START_TS`.
fn setup() -> (IXeniaEscrowDispatcher, ContractAddress) {
    start_cheat_block_timestamp_global(START_TS);

    let token_class = declare("MockERC20").unwrap().contract_class();
    let mut token_args = array![];
    addr(SENDER).serialize(ref token_args);
    let supply: u256 = 1_000_000_000;
    supply.serialize(ref token_args);
    let (token, _) = token_class.deploy(@token_args).unwrap();

    let escrow_class = declare("XeniaEscrow").unwrap().contract_class();
    // The mock doubles as the fee token; a claim in one token still owes its fee in another, so the
    // contract keeps them separate.
    let (escrow, _) = escrow_class.deploy(@array![POOL, token.into()]).unwrap();

    // Give the escrow a balance so the pre-funding path has something to send.
    start_cheat_caller_address(token, addr(SENDER));
    IERC20Dispatcher { contract_address: token }.transfer(escrow, ESCROW_FUNDING);
    stop_cheat_caller_address(token);

    (IXeniaEscrowDispatcher { contract_address: escrow }, token)
}

/// A deposit as the pool would make it. Returns the link key pair.
fn deposit(
    escrow: IXeniaEscrowDispatcher, token: ContractAddress,
) -> snforge_std::signature::KeyPair<felt252, felt252> {
    let link_key = KeyPairTrait::<felt252, felt252>::generate();
    let commitment = compute_commitment(link_key.public_key);

    start_cheat_caller_address(escrow.contract_address, addr(POOL));
    escrow
        .privacy_invoke(
            XeniaOperation::Deposit,
            commitment,
            token,
            AMOUNT,
            EXPIRY,
            addr(SENDER),
            addr(0),
            0,
            0,
            0,
        );
    stop_cheat_caller_address(escrow.contract_address);

    link_key
}

/// Calls Claim (or Refund) with a signature by `signer` binding `recipient`.
fn settle(
    escrow: IXeniaEscrowDispatcher,
    link_key: snforge_std::signature::KeyPair<felt252, felt252>,
    signer: snforge_std::signature::KeyPair<felt252, felt252>,
    recipient: ContractAddress,
    is_refund: bool,
) {
    let commitment = compute_commitment(link_key.public_key);
    let message = if is_refund {
        refund_message(commitment, recipient)
    } else {
        claim_message(commitment, recipient)
    };
    let (r, s) = signer.sign(message).unwrap();
    let operation = if is_refund {
        XeniaOperation::Refund
    } else {
        XeniaOperation::Claim
    };

    start_cheat_caller_address(escrow.contract_address, addr(POOL));
    escrow
        .privacy_invoke(
            operation, link_key.public_key, addr(0), 0, 0, addr(0), recipient, r, s, 'NOTE_ID',
        );
    stop_cheat_caller_address(escrow.contract_address);
}

// ── Access control
// ──────────────────────────────────────────────────────────────────────────

#[test]
#[should_panic(expected: 'CALLER_NOT_PRIVACY')]
fn caller_that_is_not_the_pool_reverts() {
    let (escrow, token) = setup();
    start_cheat_caller_address(escrow.contract_address, addr(ATTACKER));
    escrow
        .privacy_invoke(
            XeniaOperation::Deposit,
            'COMMITMENT',
            token,
            AMOUNT,
            EXPIRY,
            addr(SENDER),
            addr(0),
            0,
            0,
            0,
        );
}

// ── Deposit
// ─────────────────────────────────────────────────────────────────────────────────

#[test]
fn deposit_stores_the_entry_and_emits() {
    let (escrow, token) = setup();
    let mut spy = spy_events();

    let link_key = deposit(escrow, token);
    let commitment = compute_commitment(link_key.public_key);

    let entry = escrow.get_claim(commitment);
    assert!(entry.token == token, "token");
    assert!(entry.amount == AMOUNT, "amount");
    assert!(entry.expiry == EXPIRY, "expiry");
    assert!(entry.refund_to == addr(SENDER), "refund_to");
    assert!(!entry.claimed, "claimed");

    spy
        .assert_emitted(
            @array![
                (
                    escrow.contract_address,
                    xenia::xenia_escrow::XeniaEscrow::Event::ClaimCreated(
                        ClaimCreated { commitment, token, amount: AMOUNT, expiry: EXPIRY },
                    ),
                ),
            ],
        );
}

#[test]
#[should_panic(expected: 'COMMITMENT_EXISTS')]
fn deposit_rejects_a_duplicate_commitment() {
    let (escrow, token) = setup();
    let link_key = KeyPairTrait::<felt252, felt252>::generate();
    let commitment = compute_commitment(link_key.public_key);

    start_cheat_caller_address(escrow.contract_address, addr(POOL));
    escrow
        .privacy_invoke(
            XeniaOperation::Deposit,
            commitment,
            token,
            AMOUNT,
            EXPIRY,
            addr(SENDER),
            addr(0),
            0,
            0,
            0,
        );
    escrow
        .privacy_invoke(
            XeniaOperation::Deposit,
            commitment,
            token,
            AMOUNT,
            EXPIRY,
            addr(SENDER),
            addr(0),
            0,
            0,
            0,
        );
}

#[test]
#[should_panic(expected: 'EXPIRY_IN_PAST')]
fn deposit_rejects_an_expiry_in_the_past() {
    let (escrow, token) = setup();
    start_cheat_caller_address(escrow.contract_address, addr(POOL));
    escrow
        .privacy_invoke(
            XeniaOperation::Deposit,
            'COMMITMENT',
            token,
            AMOUNT,
            START_TS,
            addr(SENDER),
            addr(0),
            0,
            0,
            0,
        );
}

#[test]
#[should_panic(expected: 'ZERO_AMOUNT')]
fn deposit_rejects_a_zero_amount() {
    let (escrow, token) = setup();
    start_cheat_caller_address(escrow.contract_address, addr(POOL));
    escrow
        .privacy_invoke(
            XeniaOperation::Deposit, 'COMMITMENT', token, 0, EXPIRY, addr(SENDER), addr(0), 0, 0, 0,
        );
}

// ── Claim
// ───────────────────────────────────────────────────────────────────────────────────

#[test]
fn claim_succeeds_once_and_credits_the_right_amount() {
    let (escrow, token) = setup();
    let link_key = deposit(escrow, token);
    let commitment = compute_commitment(link_key.public_key);
    let mut spy = spy_events();

    settle(escrow, link_key, link_key, addr(CLAIMANT), false);

    assert!(escrow.get_claim(commitment).claimed, "claimed flag did not flip");

    spy
        .assert_emitted(
            @array![
                (
                    escrow.contract_address,
                    xenia::xenia_escrow::XeniaEscrow::Event::ClaimRedeemed(
                        ClaimRedeemed { commitment, claimant: addr(CLAIMANT), amount: AMOUNT },
                    ),
                ),
            ],
        );
}

#[test]
#[should_panic(expected: 'ALREADY_CLAIMED')]
fn second_claim_reverts() {
    let (escrow, token) = setup();
    let link_key = deposit(escrow, token);
    settle(escrow, link_key, link_key, addr(CLAIMANT), false);
    settle(escrow, link_key, link_key, addr(CLAIMANT), false);
}

#[test]
#[should_panic(expected: 'BAD_SIGNATURE')]
fn claim_with_a_signature_over_a_different_address_reverts() {
    let (escrow, token) = setup();
    let link_key = deposit(escrow, token);

    // Sign for CLAIMANT, then submit naming ATTACKER — the front-running case from PRD §4.5.
    let commitment = compute_commitment(link_key.public_key);
    let (r, s) = link_key.sign(claim_message(commitment, addr(CLAIMANT))).unwrap();

    start_cheat_caller_address(escrow.contract_address, addr(POOL));
    escrow
        .privacy_invoke(
            XeniaOperation::Claim,
            link_key.public_key,
            addr(0),
            0,
            0,
            addr(0),
            addr(ATTACKER),
            r,
            s,
            'NOTE_ID',
        );
}

#[test]
#[should_panic(expected: 'CLAIM_EXPIRED')]
fn claim_after_expiry_reverts() {
    let (escrow, token) = setup();
    let link_key = deposit(escrow, token);
    start_cheat_block_timestamp_global(EXPIRY);
    settle(escrow, link_key, link_key, addr(CLAIMANT), false);
}

#[test]
#[should_panic(expected: 'COMMITMENT_NOT_FOUND')]
fn claim_against_an_unknown_link_key_reverts() {
    let (escrow, token) = setup();
    deposit(escrow, token);
    let stranger = KeyPairTrait::<felt252, felt252>::generate();
    settle(escrow, stranger, stranger, addr(CLAIMANT), false);
}

// ── Refund
// ──────────────────────────────────────────────────────────────────────────────────

#[test]
fn refund_after_expiry_succeeds_and_emits() {
    let (escrow, token) = setup();
    let link_key = deposit(escrow, token);
    let commitment = compute_commitment(link_key.public_key);
    start_cheat_block_timestamp_global(EXPIRY);
    let mut spy = spy_events();

    settle(escrow, link_key, link_key, addr(SENDER), true);

    assert!(escrow.get_claim(commitment).claimed, "claimed flag did not flip");

    spy
        .assert_emitted(
            @array![
                (
                    escrow.contract_address,
                    xenia::xenia_escrow::XeniaEscrow::Event::ClaimRefunded(
                        ClaimRefunded { commitment, refund_to: addr(SENDER), amount: AMOUNT },
                    ),
                ),
            ],
        );
}

#[test]
#[should_panic(expected: 'NOT_YET_EXPIRED')]
fn refund_before_expiry_reverts() {
    let (escrow, token) = setup();
    let link_key = deposit(escrow, token);
    settle(escrow, link_key, link_key, addr(SENDER), true);
}

#[test]
#[should_panic(expected: 'NOT_REFUND_OWNER')]
fn refund_not_signed_by_the_link_key_reverts() {
    let (escrow, token) = setup();
    let link_key = deposit(escrow, token);
    let attacker_key = KeyPairTrait::<felt252, felt252>::generate();
    start_cheat_block_timestamp_global(EXPIRY);
    settle(escrow, link_key, attacker_key, addr(ATTACKER), true);
}

#[test]
#[should_panic(expected: 'ALREADY_CLAIMED')]
fn refund_after_a_claim_reverts() {
    let (escrow, token) = setup();
    let link_key = deposit(escrow, token);
    settle(escrow, link_key, link_key, addr(CLAIMANT), false);
    start_cheat_block_timestamp_global(EXPIRY);
    settle(escrow, link_key, link_key, addr(SENDER), true);
}

#[test]
#[should_panic(expected: 'BAD_SIGNATURE')]
fn a_claim_signature_cannot_be_replayed_as_a_refund() {
    let (escrow, token) = setup();
    let link_key = deposit(escrow, token);
    let commitment = compute_commitment(link_key.public_key);

    // A signature made under the refund tag, submitted as a Claim. Domain separation rejects it.
    let (r, s) = link_key.sign(refund_message(commitment, addr(CLAIMANT))).unwrap();

    start_cheat_caller_address(escrow.contract_address, addr(POOL));
    escrow
        .privacy_invoke(
            XeniaOperation::Claim,
            link_key.public_key,
            addr(0),
            0,
            0,
            addr(0),
            addr(CLAIMANT),
            r,
            s,
            'NOTE_ID',
        );
}


// ── Pre-funding
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn deposit_prefunds_the_named_address() {
    let (escrow, token) = setup();
    let link_key = KeyPairTrait::<felt252, felt252>::generate();
    let commitment = compute_commitment(link_key.public_key);
    let erc20 = IERC20Dispatcher { contract_address: token };
    let before = erc20.balance_of(addr(CLAIMANT));
    let mut spy = spy_events();

    start_cheat_caller_address(escrow.contract_address, addr(POOL));
    escrow
        .privacy_invoke(
            XeniaOperation::Deposit,
            commitment,
            token,
            AMOUNT,
            EXPIRY,
            addr(SENDER),
            addr(CLAIMANT), // reused on Deposit: who to pre-fund
            0,
            0,
            PREFUND.into() // reused on Deposit: how much
        );
    stop_cheat_caller_address(escrow.contract_address);

    assert!(erc20.balance_of(addr(CLAIMANT)) == before + PREFUND.into(), "prefund not received");

    spy
        .assert_emitted(
            @array![
                (
                    escrow.contract_address,
                    xenia::xenia_escrow::XeniaEscrow::Event::ClaimPrefunded(
                        ClaimPrefunded { commitment, recipient: addr(CLAIMANT), amount: PREFUND },
                    ),
                ),
            ],
        );
}

/// Zero in either reused field means "no pre-funding", which is what every existing caller sends.
#[test]
fn deposit_without_prefunding_is_unchanged() {
    let (escrow, token) = setup();
    let erc20 = IERC20Dispatcher { contract_address: token };
    let escrow_before = erc20.balance_of(escrow.contract_address);

    let link_key = deposit(escrow, token);

    assert!(
        erc20.balance_of(escrow.contract_address) == escrow_before,
        "escrow balance should not move",
    );
    assert!(!escrow.get_claim(compute_commitment(link_key.public_key)).claimed, "claimed");
}

// ── Public claim
// ────────────────────────────────────────────────────────────────────────────

/// Signs a public claim for `recipient` and submits it as an arbitrary caller.
fn claim_publicly(
    escrow: IXeniaEscrowDispatcher,
    link_key: snforge_std::signature::KeyPair<felt252, felt252>,
    signer: snforge_std::signature::KeyPair<felt252, felt252>,
    recipient: ContractAddress,
    caller: ContractAddress,
) {
    let commitment = compute_commitment(link_key.public_key);
    let (r, s) = signer.sign(public_claim_message(commitment, recipient)).unwrap();
    start_cheat_caller_address(escrow.contract_address, caller);
    escrow.claim_public(link_key.public_key, recipient, r, s);
    stop_cheat_caller_address(escrow.contract_address);
}

#[test]
fn a_public_claim_pays_the_claimant_directly() {
    let (escrow, token) = setup();
    let erc20 = IERC20Dispatcher { contract_address: token };
    let link_key = deposit(escrow, token);
    let before = erc20.balance_of(addr(CLAIMANT));

    claim_publicly(escrow, link_key, link_key, addr(CLAIMANT), addr(CLAIMANT));

    assert!(erc20.balance_of(addr(CLAIMANT)) == before + AMOUNT.into(), "not paid");
    assert!(escrow.get_claim(compute_commitment(link_key.public_key)).claimed, "not marked");
}

/// The point of leaving it permissionless: someone else can submit it for a claimant with no gas,
/// and still cannot redirect a token.
#[test]
fn anyone_may_submit_a_public_claim_on_the_claimants_behalf() {
    let (escrow, token) = setup();
    let erc20 = IERC20Dispatcher { contract_address: token };
    let link_key = deposit(escrow, token);

    claim_publicly(escrow, link_key, link_key, addr(CLAIMANT), addr(ATTACKER));

    assert!(erc20.balance_of(addr(CLAIMANT)) == AMOUNT.into(), "claimant not paid");
    assert!(erc20.balance_of(addr(ATTACKER)) == 0, "submitter took funds");
}

/// A private-claim signature must not work here, or anyone watching the mempool could force a
/// public payout and expose a recipient who chose privacy.
#[test]
#[should_panic(expected: 'BAD_SIGNATURE')]
fn a_private_claim_signature_cannot_force_a_public_payout() {
    let (escrow, token) = setup();
    let link_key = deposit(escrow, token);
    let commitment = compute_commitment(link_key.public_key);
    let (r, s) = link_key.sign(claim_message(commitment, addr(CLAIMANT))).unwrap();

    start_cheat_caller_address(escrow.contract_address, addr(CLAIMANT));
    escrow.claim_public(link_key.public_key, addr(CLAIMANT), r, s);
}

#[test]
#[should_panic(expected: 'ALREADY_CLAIMED')]
fn a_public_claim_cannot_follow_a_private_one() {
    let (escrow, token) = setup();
    let link_key = deposit(escrow, token);
    settle(escrow, link_key, link_key, addr(CLAIMANT), false);
    claim_publicly(escrow, link_key, link_key, addr(CLAIMANT), addr(CLAIMANT));
}

#[test]
#[should_panic(expected: 'BAD_SIGNATURE')]
fn a_public_claim_cannot_be_redirected() {
    let (escrow, token) = setup();
    let link_key = deposit(escrow, token);
    let commitment = compute_commitment(link_key.public_key);
    let (r, s) = link_key.sign(public_claim_message(commitment, addr(CLAIMANT))).unwrap();

    start_cheat_caller_address(escrow.contract_address, addr(ATTACKER));
    escrow.claim_public(link_key.public_key, addr(ATTACKER), r, s);
}
