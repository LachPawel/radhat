// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IFundRouter.sol";

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

/// @title FundRouter
/// @notice Pull ETH held by a proxy and forward it (and optional ERC20s) to a treasury.
/// @dev Implements permission checks via FundRouterStorage and handles ETH/ERC20 routing.
contract FundRouter is IFundRouter {
    error NotAuthorizedCaller();
    error TreasuryNotAllowed();
    error LengthMismatch();
    error EthSendFailed();
    error ZeroTreasury();
    error ERC20TransferFailed();
    error PermissionCheckFailed();

    /// @dev External storage contract with allowlists.
    address public immutable STORAGE;

    constructor(address storageContract) {
        require(storageContract != address(0), "storage=0");
        STORAGE = storageContract;
    }

    /// @dev Check both caller and treasury permissions in a single staticcall for gas efficiency.
    /// @param caller The address attempting to call transferFunds
    /// @param treasury The treasury address to receive funds
    function _checkPermissions(address caller, address treasury) internal view {
        (bool success, bytes memory result) = STORAGE.staticcall(
            abi.encodeWithSignature("isAllowedCallerAndTreasury(address,address)", caller, treasury)
        );
        if (!success) revert PermissionCheckFailed();
        
        bool allowed = abi.decode(result, (bool));
        if (!allowed) {
            // Determine which permission failed for better error reporting
            (bool s1, bytes memory r1) = STORAGE.staticcall(
                abi.encodeWithSignature("isAllowedCaller(address)", caller)
            );
            if (!s1 || !abi.decode(r1, (bool))) revert NotAuthorizedCaller();
            revert TreasuryNotAllowed();
        }
    }

    /// @inheritdoc IFundRouter
    function transferFunds(
        uint256 etherAmount,
        address[] calldata tokens,
        uint256[] calldata amounts,
        address payable treasuryAddress
    ) external override {
        if (treasuryAddress == address(0)) revert ZeroTreasury();

        // Single staticcall to check both permissions (gas optimization)
        _checkPermissions(msg.sender, treasuryAddress);

        if (tokens.length != amounts.length) revert LengthMismatch();

        // ---- ETH routing (from this contract's balance) ----
        // IMPORTANT: ETH has already been sent here via proxy's CALL-based forwarding
        if (etherAmount > 0) {
            (bool ok, ) = treasuryAddress.call{value: etherAmount}("");
            if (!ok) revert EthSendFailed();
        }

        // ---- ERC20 routing ----
        // Assumes tokens are already held by this contract
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 amt = amounts[i];
            if (amt == 0) continue;

            bool transferred = IERC20(token).transfer(treasuryAddress, amt);
            if (!transferred) revert ERC20TransferFailed();
        }
    }

    // Accept ETH so proxies can push value here via CALL.
    receive() external payable {}
}
