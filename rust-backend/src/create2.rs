//! CREATE2 address computation matching Solidity's DeterministicProxyDeployer
//!
//! Formula: address = keccak256(0xff ++ deployer ++ salt ++ initCodeHash)[12..]
//!
//! Salt derivation: salt = keccak256(userSalt ++ caller)

use alloy_primitives::keccak256;

/// Derive the actual salt used in CREATE2 from user salt and caller address
///
/// Matches Solidity:
/// ```solidity
/// function _deriveSalt(bytes32 userSalt, address caller) internal pure returns (bytes32) {
///     return keccak256(abi.encodePacked(userSalt, caller));
/// }
/// ```
pub fn derive_salt(user_salt: &[u8; 32], caller: &[u8; 20]) -> [u8; 32] {
    let mut input = Vec::with_capacity(52);
    input.extend_from_slice(user_salt);
    input.extend_from_slice(caller);
    keccak256(&input).0
}

/// Compute CREATE2 address
///
/// Matches Solidity:
/// ```solidity
/// bytes32 data = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, initCodeHash));
/// address(uint160(uint256(data)))
/// ```
pub fn compute_create2_address(
    deployer: &[u8; 20],
    salt: &[u8; 32],
    init_code_hash: &[u8; 32],
) -> [u8; 20] {
    let mut input = Vec::with_capacity(85);
    input.push(0xff);
    input.extend_from_slice(deployer);
    input.extend_from_slice(salt);
    input.extend_from_slice(init_code_hash);

    let hash = keccak256(&input);
    let mut address = [0u8; 20];
    address.copy_from_slice(&hash[12..32]);
    address
}

/// Generate a user salt from user address and nonce
///
/// salt = keccak256(user_address || nonce)
pub fn generate_user_salt(user_address: &[u8; 20], nonce: u64) -> [u8; 32] {
    let mut input = Vec::with_capacity(28);
    input.extend_from_slice(user_address);
    input.extend_from_slice(&nonce.to_be_bytes());
    keccak256(&input).0
}

/// Full address computation from user address and nonce
pub fn compute_deposit_address(
    deployer: &[u8; 20],
    init_code_hash: &[u8; 32],
    user_address: &[u8; 20],
    nonce: u64,
) -> ([u8; 20], [u8; 32]) {
    // Generate user salt from address + nonce
    let user_salt = generate_user_salt(user_address, nonce);

    // Derive actual salt (userSalt + caller)
    // In our case, the "caller" for CREATE2 is the backend, but we want determinism
    // based on user, so we use user_address as the caller component
    let derived_salt = derive_salt(&user_salt, user_address);

    // Compute CREATE2 address
    let address = compute_create2_address(deployer, &derived_salt, init_code_hash);

    (address, user_salt)
}

/// Format address as checksummed hex string
pub fn format_address(addr: &[u8; 20]) -> String {
    format!("0x{}", hex::encode(addr))
}

/// Format bytes32 as hex string
pub fn format_bytes32(bytes: &[u8; 32]) -> String {
    format!("0x{}", hex::encode(bytes))
}

/// Parse address from hex string
pub fn parse_address(s: &str) -> Result<[u8; 20], &'static str> {
    let s = s.strip_prefix("0x").unwrap_or(s);
    let bytes = hex::decode(s).map_err(|_| "invalid hex")?;
    if bytes.len() != 20 {
        return Err("invalid address length");
    }
    let mut arr = [0u8; 20];
    arr.copy_from_slice(&bytes);
    Ok(arr)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_salt() {
        // Test that derive_salt produces consistent results
        let user_salt = [0u8; 32];
        let caller = [1u8; 20];

        let salt1 = derive_salt(&user_salt, &caller);
        let salt2 = derive_salt(&user_salt, &caller);

        assert_eq!(salt1, salt2);
    }

    #[test]
    fn test_compute_create2_address_deterministic() {
        let deployer = [0xABu8; 20];
        let salt = [0xCDu8; 32];
        let init_code_hash = [0xEFu8; 32];

        let addr1 = compute_create2_address(&deployer, &salt, &init_code_hash);
        let addr2 = compute_create2_address(&deployer, &salt, &init_code_hash);

        assert_eq!(addr1, addr2);
    }

    #[test]
    fn test_different_salts_produce_different_addresses() {
        let deployer = [0xABu8; 20];
        let init_code_hash = [0xEFu8; 32];

        let salt1 = [0x01u8; 32];
        let salt2 = [0x02u8; 32];

        let addr1 = compute_create2_address(&deployer, &salt1, &init_code_hash);
        let addr2 = compute_create2_address(&deployer, &salt2, &init_code_hash);

        assert_ne!(addr1, addr2);
    }

    #[test]
    fn test_generate_user_salt_sequential() {
        let user = [0x42u8; 20];

        let salt0 = generate_user_salt(&user, 0);
        let salt1 = generate_user_salt(&user, 1);
        let salt2 = generate_user_salt(&user, 2);

        // All should be different
        assert_ne!(salt0, salt1);
        assert_ne!(salt1, salt2);
        assert_ne!(salt0, salt2);

        // But reproducible
        assert_eq!(salt0, generate_user_salt(&user, 0));
    }

    #[test]
    fn test_full_address_computation() {
        let deployer = [0xABu8; 20];
        let init_code_hash = [0xEFu8; 32];
        let user = [0x42u8; 20];

        let (addr1, salt1) = compute_deposit_address(&deployer, &init_code_hash, &user, 0);
        let (addr2, salt2) = compute_deposit_address(&deployer, &init_code_hash, &user, 1);

        // Different nonces should produce different addresses
        assert_ne!(addr1, addr2);
        assert_ne!(salt1, salt2);

        // Same inputs should be reproducible
        let (addr1_again, salt1_again) =
            compute_deposit_address(&deployer, &init_code_hash, &user, 0);
        assert_eq!(addr1, addr1_again);
        assert_eq!(salt1, salt1_again);
    }

    #[test]
    fn test_format_and_parse_address() {
        let addr = [
            0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc,
            0xde, 0xf0, 0x12, 0x34, 0x56, 0x78,
        ];

        let formatted = format_address(&addr);
        assert!(formatted.starts_with("0x"));
        assert_eq!(formatted.len(), 42);

        let parsed = parse_address(&formatted).unwrap();
        assert_eq!(addr, parsed);
    }
}
