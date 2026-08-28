//! # XeniaEscrow
//!
//! A stateful `privacy_invoke` anonymizer for the STRK20 pool that lets a sender pay someone who
//! has never registered a viewing key.
//!
//! Derived from the reference escrow helper published on STRK20 by Example
//! (<https://strk20-by-example.org/helpers/escrow>) — unofficial, and not audited by StarkWare.
//! Xenia adds, over that reference:
//!
//! * **Expiry and refund**, so a lost link does not strand tokens forever.
//! * **Link keys instead of bare secrets** (see [`compute_commitment`]). The reference escrow
//!   authorises a claim with a raw preimage, which is visible in public calldata and replayable by
//!   anyone who sees the claim before it is included. Xenia binds the authorisation to the
//!   claimant's address with a STARK-curve signature instead.
//! * **Events on every state-changing path**, of which the reference emits none.

use starknet::ContractAddress;
use crate::open_note::OpenNoteDeposit;

/// Entry stored per commitment.
///
/// A zero `token` means "not found" — the same sentinel the reference escrow uses.
#[derive(Serde, Copy, Drop, PartialEq, Debug, starknet::Store)]
pub struct ClaimEntry {
    pub token: ContractAddress,
    pub amount: u128,
    /// Absolute block timestamp. Claims are valid strictly before it, refunds at or after it.
    pub expiry: u64,
    /// Recorded at deposit and echoed in `ClaimRefunded`. See the note on refund authorisation in
    /// [`IXeniaEscrow::privacy_invoke`] — this field is metadata, not an access check.
    pub refund_to: ContractAddress,
    /// Flips exactly once, by either a claim or a refund. The two are mutually exclusive.
    pub claimed: bool,
}

/// Operation to perform on the escrow.
#[derive(Serde, Copy, Drop, PartialEq, Debug)]
pub enum XeniaOperation {
    Deposit,
    Claim,
    Refund,
}

#[starknet::interface]
pub trait IXeniaEscrow<T> {
    /// Returns the entry for a commitment. All fields are zero if it does not exist.
    fn get_claim(self: @T, commitment: felt252) -> ClaimEntry;

    /// The privacy pool this escrow accepts calls from.
    fn privacy_contract(self: @T) -> ContractAddress;

    /// Pay a claim out as ordinary tokens, without going through the pool at all.
    ///
    /// The pool can only credit a private note to someone who has published a viewing key, and
    /// only they can publish it — so a recipient who has never used the pool cannot be paid
    /// privately, whatever the sender does. This path pays them anyway, in plain ERC-20, needing
    /// nothing of them but an address.
    ///
    /// **Deliberately permissionless.** Anyone may call it, because the funds can only ever go to
    /// the address the signature names. That lets a third party submit it for a recipient who has
    /// no gas, without being able to redirect a single token.
    ///
    /// The trade is the recipient's own privacy: this transfer is public, so their address is
    /// visible receiving from the escrow. The sender stays hidden either way — their address was
    /// encrypted when the pool moved the funds here.
    fn claim_public(
        ref self: T,
        link_pubkey: felt252,
        claimant: ContractAddress,
        sig_r: felt252,
        sig_s: felt252,
    );

    /// Called by the privacy pool via the `INVOKE_SELECTOR` during `InvokeExternal`.
    ///
    /// The pool deserialises calldata straight into these parameters, so the order is frozen
    /// (PRD §4.1) and must match the client byte for byte.
    ///
    /// **Deposit** — records a claim backed by tokens the pool has already withdrawn to this
    /// contract. Returns an empty span; there is nothing to credit yet.
    /// * `commitment` — `poseidon(XENIA_COMMITMENT_TAG_V1, pk)`, computed off-chain.
    /// * `token`, `amount`, `expiry`, `refund_to` — the entry to store.
    /// * `claimant` — **reused on Deposit** as the address to pre-fund, or zero for none.
    /// * `note_id` — **reused on Deposit** as how much fee token to pre-fund it with.
    /// * `sig_r`, `sig_s` — ignored.
    ///
    /// Pre-funding exists so a claimant can arrive with an empty wallet. The pool charges a fee in
    /// STRK per transaction, and its balance invariant requires that fee to be matched by an inflow
    /// inside the same transaction — which someone holding nothing cannot provide. Sending them
    /// the fee ahead of time, out of the escrow rather than out of the sender's own address,
    /// supplies it without putting a sender-to-recipient edge on chain.
    ///
    /// The two parameters are reused rather than appended because the pool deserialises calldata
    /// positionally: appending would change the calldata length and break every existing caller.
    /// Both were already passed as zero on Deposit, so zero keeps the old behaviour exactly.
    ///
    /// **Claim** — proves possession of the link key and credits the claimant's open note.
    /// * `commitment` — carries the link **public key** `pk`, not the stored key. The contract
    ///   recomputes `poseidon(TAG, pk)` itself and looks that up, so a passed-in commitment is
    ///   never trusted as authorisation.
    /// * `claimant` — the address the signature authorises.
    /// * `sig_r`, `sig_s` — signature by `sk` over `poseidon(XENIA_CLAIM_TAG_V1, key, claimant)`.
    /// * `note_id` — the open note to credit, supplied by the wallet as `${openNoteIds[0]}`.
    /// * `token`, `amount`, `expiry`, `refund_to` — ignored; the stored entry wins.
    ///
    /// **Refund** — the same shape as Claim, but valid only at or after `expiry`, and signed
    /// under a distinct domain tag so a claim signature can never be replayed as a refund.
    fn privacy_invoke(
        ref self: T,
        operation: XeniaOperation,
        commitment: felt252,
        token: ContractAddress,
        amount: u128,
        expiry: u64,
        refund_to: ContractAddress,
        claimant: ContractAddress,
        sig_r: felt252,
        sig_s: felt252,
        note_id: felt252,
    ) -> Span<OpenNoteDeposit>;
}

/// Domain-separation tags. Distinct tags keep Xenia commitments from colliding with the reference
/// escrow's, and keep a claim signature from being replayed as a refund.
pub const XENIA_COMMITMENT_TAG_V1: felt252 = 'XENIA_COMMITMENT_V1';
pub const XENIA_CLAIM_TAG_V1: felt252 = 'XENIA_CLAIM_V1';
pub const XENIA_REFUND_TAG_V1: felt252 = 'XENIA_REFUND_V1';
/// Paying out publicly is a different act from crediting a private note, so it gets its own tag.
/// Sharing one would let anyone who sees a private claim in the mempool replay it as a public
/// payout and expose the recipient — the money would still reach them, but their address would be
/// on chain against their wishes.
pub const XENIA_CLAIM_PUBLIC_TAG_V1: felt252 = 'XENIA_CLAIM_PUBLIC_V1';

pub mod errors {
    pub const ZERO_COMMITMENT: felt252 = 'ZERO_COMMITMENT';
    pub const ZERO_TOKEN: felt252 = 'ZERO_TOKEN';
    pub const ZERO_AMOUNT: felt252 = 'ZERO_AMOUNT';
    pub const EXPIRY_IN_PAST: felt252 = 'EXPIRY_IN_PAST';
    pub const COMMITMENT_EXISTS: felt252 = 'COMMITMENT_EXISTS';
    pub const COMMITMENT_NOT_FOUND: felt252 = 'COMMITMENT_NOT_FOUND';
    pub const ALREADY_CLAIMED: felt252 = 'ALREADY_CLAIMED';
    pub const CLAIM_EXPIRED: felt252 = 'CLAIM_EXPIRED';
    pub const NOT_YET_EXPIRED: felt252 = 'NOT_YET_EXPIRED';
    pub const NOT_REFUND_OWNER: felt252 = 'NOT_REFUND_OWNER';
    pub const BAD_SIGNATURE: felt252 = 'BAD_SIGNATURE';
    pub const CALLER_NOT_PRIVACY: felt252 = 'CALLER_NOT_PRIVACY';
    pub const PREFUND_TOO_LARGE: felt252 = 'PREFUND_TOO_LARGE';
}

/// The storage key for a link key pair: `poseidon(TAG, pk)`.
///
/// The link in `https://host/c#<sk>` carries the **private** key. `pk` is derived client-side and
/// only ever appears in calldata alongside a signature that binds it to one claimant address.
pub fn compute_commitment(link_pubkey: felt252) -> felt252 {
    core::poseidon::poseidon_hash_span([XENIA_COMMITMENT_TAG_V1, link_pubkey].span())
}

/// The message a claimant must present a signature over.
pub fn claim_message(commitment: felt252, claimant: ContractAddress) -> felt252 {
    core::poseidon::poseidon_hash_span([XENIA_CLAIM_TAG_V1, commitment, claimant.into()].span())
}

/// The message a public claimant must present a signature over.
pub fn public_claim_message(commitment: felt252, claimant: ContractAddress) -> felt252 {
    core::poseidon::poseidon_hash_span(
        [XENIA_CLAIM_PUBLIC_TAG_V1, commitment, claimant.into()].span(),
    )
}

/// The message a refunder must present a signature over. A separate tag keeps the two disjoint.
pub fn refund_message(commitment: felt252, refunder: ContractAddress) -> felt252 {
    core::poseidon::poseidon_hash_span([XENIA_REFUND_TAG_V1, commitment, refunder.into()].span())
}

#[starknet::contract]
pub mod XeniaEscrow {
    use core::ecdsa::check_ecdsa_signature;
    use core::num::traits::Zero;
    use openzeppelin::interfaces::token::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
    use crate::open_note::OpenNoteDeposit;
    use super::{
        ClaimEntry, IXeniaEscrow, XeniaOperation, claim_message, compute_commitment, errors,
        public_claim_message, refund_message,
    };

    #[storage]
    struct Storage {
        privacy_contract: ContractAddress,
        claims: Map<felt252, ClaimEntry>,
        /// The token the pool charges its per-transaction fee in — STRK. Held separately from the
        /// claim token because a claim denominated in USDC still owes its fee in STRK.
        fee_token: ContractAddress,
    }

    /// Every state-changing path emits one of these. This is not polish: the sprint validator
    /// requires each listed transaction to carry an event from a listed contract, and the
    /// reference escrow emits nothing (PRD §3).
    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        ClaimCreated: ClaimCreated,
        ClaimPrefunded: ClaimPrefunded,
        ClaimRedeemed: ClaimRedeemed,
        ClaimRefunded: ClaimRefunded,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ClaimCreated {
        #[key]
        pub commitment: felt252,
        pub token: ContractAddress,
        pub amount: u128,
        pub expiry: u64,
    }

    /// Emitted when a deposit pre-funds an address so the claimant can arrive with an empty wallet.
    /// Separate from `ClaimCreated` so that event's shape stays exactly as the client already reads
    /// it.
    #[derive(Drop, starknet::Event)]
    pub struct ClaimPrefunded {
        #[key]
        pub commitment: felt252,
        pub recipient: ContractAddress,
        pub amount: u128,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ClaimRedeemed {
        #[key]
        pub commitment: felt252,
        pub claimant: ContractAddress,
        pub amount: u128,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ClaimRefunded {
        #[key]
        pub commitment: felt252,
        pub refund_to: ContractAddress,
        pub amount: u128,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, privacy_contract: ContractAddress, fee_token: ContractAddress,
    ) {
        self.privacy_contract.write(privacy_contract);
        self.fee_token.write(fee_token);
    }

    #[abi(embed_v0)]
    pub impl XeniaEscrowImpl of IXeniaEscrow<ContractState> {
        fn get_claim(self: @ContractState, commitment: felt252) -> ClaimEntry {
            self.claims.read(commitment)
        }

        fn privacy_contract(self: @ContractState) -> ContractAddress {
            self.privacy_contract.read()
        }

        fn claim_public(
            ref self: ContractState,
            link_pubkey: felt252,
            claimant: ContractAddress,
            sig_r: felt252,
            sig_s: felt252,
        ) {
            // No caller check, on purpose. The signature names the destination, so whoever submits
            // this cannot send the funds anywhere else — which is what lets someone relay it for
            // a recipient with no gas.
            let key = compute_commitment(link_pubkey);
            let entry = self.claims.read(key);
            assert(entry.token.is_non_zero(), errors::COMMITMENT_NOT_FOUND);
            assert(!entry.claimed, errors::ALREADY_CLAIMED);
            assert(get_block_timestamp() < entry.expiry, errors::CLAIM_EXPIRED);

            let message = public_claim_message(key, claimant);
            assert(
                check_ecdsa_signature(message, link_pubkey, sig_r, sig_s), errors::BAD_SIGNATURE,
            );

            // Same flag as the private claim and the refund, so the three remain mutually
            // exclusive: a claim paid out here can never also be claimed privately or refunded.
            self.claims.write(key, ClaimEntry { claimed: true, ..entry });

            // Straight to the claimant. No pool, no open note, nothing required of them beyond an
            // address — which is the entire point of this path.
            IERC20Dispatcher { contract_address: entry.token }
                .transfer(recipient: claimant, amount: entry.amount.into());

            self.emit(ClaimRedeemed { commitment: key, claimant, amount: entry.amount });
        }

        fn privacy_invoke(
            ref self: ContractState,
            operation: XeniaOperation,
            commitment: felt252,
            token: ContractAddress,
            amount: u128,
            expiry: u64,
            refund_to: ContractAddress,
            claimant: ContractAddress,
            sig_r: felt252,
            sig_s: felt252,
            note_id: felt252,
        ) -> Span<OpenNoteDeposit> {
            let privacy_addr = self.privacy_contract.read();
            assert(get_caller_address() == privacy_addr, errors::CALLER_NOT_PRIVACY);

            match operation {
                XeniaOperation::Deposit => {
                    assert(commitment.is_non_zero(), errors::ZERO_COMMITMENT);
                    assert(token.is_non_zero(), errors::ZERO_TOKEN);
                    assert(amount.is_non_zero(), errors::ZERO_AMOUNT);
                    assert(expiry > get_block_timestamp(), errors::EXPIRY_IN_PAST);

                    let existing = self.claims.read(commitment);
                    assert(existing.token.is_zero(), errors::COMMITMENT_EXISTS);

                    self
                        .claims
                        .write(
                            commitment,
                            ClaimEntry { token, amount, expiry, refund_to, claimed: false },
                        );

                    self.emit(ClaimCreated { commitment, token, amount, expiry });

                    // Optional pre-funding. The sender's client withdraws the fee token to this
                    // contract alongside the claim token, and we forward it to the address derived
                    // from the link key, so the claimant can cover the pool fee without ever having
                    // held anything.
                    if claimant.is_non_zero() && note_id.is_non_zero() {
                        let prefund: u128 = note_id.try_into().expect(errors::PREFUND_TOO_LARGE);
                        IERC20Dispatcher { contract_address: self.fee_token.read() }
                            .transfer(recipient: claimant, amount: prefund.into());
                        self
                            .emit(
                                ClaimPrefunded { commitment, recipient: claimant, amount: prefund },
                            );
                    }

                    // The pool already moved the tokens here via its Withdraw action, so there is
                    // nothing for it to credit. An empty span is valid: "credit nothing".
                    //
                    // Bound to a name because a bare `[].span()` straight after an `if` block
                    // parses as an index expression on that block.
                    let nothing_to_credit: Span<OpenNoteDeposit> = [].span();
                    nothing_to_credit
                },
                XeniaOperation::Claim => {
                    // `commitment` carries the link public key; the stored key is recomputed.
                    let key = compute_commitment(commitment);
                    let entry = self.settle(key, commitment, claimant, sig_r, sig_s, false);

                    self.emit(ClaimRedeemed { commitment: key, claimant, amount: entry.amount });

                    [OpenNoteDeposit { note_id, token: entry.token, amount: entry.amount }].span()
                },
                XeniaOperation::Refund => {
                    let key = compute_commitment(commitment);
                    let entry = self.settle(key, commitment, claimant, sig_r, sig_s, true);

                    self
                        .emit(
                            ClaimRefunded {
                                commitment: key, refund_to: entry.refund_to, amount: entry.amount,
                            },
                        );

                    [OpenNoteDeposit { note_id, token: entry.token, amount: entry.amount }].span()
                },
            }
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        /// The half that claim and refund share: look the entry up, check the window, verify the
        /// signature, flip `claimed` exactly once, and approve the pool to pull.
        ///
        /// `is_refund` selects both the time window and the signature's domain tag.
        fn settle(
            ref self: ContractState,
            key: felt252,
            link_pubkey: felt252,
            recipient: ContractAddress,
            sig_r: felt252,
            sig_s: felt252,
            is_refund: bool,
        ) -> ClaimEntry {
            let entry = self.claims.read(key);
            assert(entry.token.is_non_zero(), errors::COMMITMENT_NOT_FOUND);
            assert(!entry.claimed, errors::ALREADY_CLAIMED);

            let now = get_block_timestamp();

            if is_refund {
                assert(now >= entry.expiry, errors::NOT_YET_EXPIRED);
                let message = refund_message(key, recipient);
                assert(
                    check_ecdsa_signature(message, link_pubkey, sig_r, sig_s),
                    errors::NOT_REFUND_OWNER,
                );
            } else {
                assert(now < entry.expiry, errors::CLAIM_EXPIRED);
                let message = claim_message(key, recipient);
                assert(
                    check_ecdsa_signature(message, link_pubkey, sig_r, sig_s),
                    errors::BAD_SIGNATURE,
                );
            }

            self.claims.write(key, ClaimEntry { claimed: true, ..entry });

            // Approve, never transfer — the pool pulls the tokens itself when it applies the
            // returned deposit.
            IERC20Dispatcher { contract_address: entry.token }
                .approve(spender: self.privacy_contract.read(), amount: entry.amount.into());

            entry
        }
    }
}
