//! `OpenNoteDeposit`, mirrored from the privacy pool.
//!
//! This is a verbatim mirror of `privacy::objects::OpenNoteDeposit` in
//! [`starkware-libs/starknet-privacy`](https://github.com/starkware-libs/starknet-privacy/blob/main/packages/privacy/src/objects.cairo)
//! (Apache-2.0, StarkWare) — same fields, same order, same derives.
//!
//! ## Why mirrored rather than imported
//!
//! `OpenNoteDeposit` is the only item Xenia needs from that package, and depending on it as a git
//! dependency pulls in its whole workspace — `starkware_utils`, `ekubo`, and the vesu and shadow
//! anonymizer packages — none of which Xenia uses. That tree also breaks the build: scarb
//! re-checks-out `starkware-starknet-utils` on a second invocation in the same job and fails with
//! "Directory not empty", which took CI down. Since the contract machine cannot run the tests
//! locally, a deterministic CI build is worth more than the import.
//!
//! **This is safe because Serde is structural.** The pool deserialises our return value as
//! `Span<OpenNoteDeposit>` — three felts per entry, in this order. A structurally identical
//! struct encodes identically on the wire; the pool never sees a type name.
//!
//! If the upstream struct ever gains a field or reorders one, this must change with it. Check it
//! against the link above before a mainnet deploy.

use starknet::ContractAddress;

/// Input for depositing to an open note (returned by an invoked contract).
#[derive(Serde, Copy, Drop, PartialEq, Debug)]
pub struct OpenNoteDeposit {
    /// The identifier of the open note to deposit to.
    pub note_id: felt252,
    /// The ERC20 token contract to deposit.
    pub token: ContractAddress,
    /// The amount of tokens to deposit.
    pub amount: u128,
}
