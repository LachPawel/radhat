// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title DeterministicProxyDeployer
/// @notice Deploys minimal proxies that forward ETH to FUND_ROUTER_ADDRESS via CREATE2.
/// @dev Uses a custom CALL-based proxy (not EIP-1167 DELEGATECALL) so ETH lands in FundRouter.
contract DeterministicProxyDeployer {
    /// @dev The FundRouter address that all proxies forward ETH to.
    address public immutable FUND_ROUTER_ADDRESS;

    error Create2Failed();

    constructor(address fundRouter) {
        require(fundRouter != address(0), "router=0");
        FUND_ROUTER_ADDRESS = fundRouter;
    }

    // ---- Bytecode helpers ----

    /// @notice Returns the init code used for CREATE2 deployments.
    /// @dev Implements a CALL-based forwarding proxy that sends all received ETH to FUND_ROUTER_ADDRESS.
    ///
    /// The proxy runtime code does:
    ///   receive() external payable {
    ///     (bool success,) = FUND_ROUTER_ADDRESS.call{value: msg.value}("");
    ///     require(success);
    ///   }
    ///
    function _proxyInitCode() internal view returns (bytes memory) {
        // Runtime bytecode: forward ETH via CALL
        // 
        // CALL signature: call(gas, addr, value, argsOffset, argsSize, retOffset, retSize)
        // We want: call(gas, FUND_ROUTER, msg.value, 0, 0, 0, 0)
        //
        // Bytecode breakdown (38 bytes total):
        // Offset  Bytes   Opcode          Stack after
        // 0x00    60 00   PUSH1 0         [0]                  retSize
        // 0x02    80      DUP1            [0, 0]               retOffset
        // 0x03    80      DUP1            [0, 0, 0]            argsSize
        // 0x04    80      DUP1            [0, 0, 0, 0]         argsOffset
        // 0x05    34      CALLVALUE       [0, 0, 0, 0, val]    value
        // 0x06    73 XX   PUSH20 addr     [0, 0, 0, 0, val, addr] (21 bytes: 0x06-0x1a)
        // 0x1b    5a      GAS             [0, 0, 0, 0, val, addr, gas]
        // 0x1c    f1      CALL            [success]
        // 0x1d    60 23   PUSH1 0x23      [success, 0x23]      (jump to offset 35)
        // 0x1f    57      JUMPI           []
        // 0x20    60 00   PUSH1 0         [0]
        // 0x22    80      DUP1            [0, 0]
        // 0x23    fd      REVERT          -
        // 0x24    5b      JUMPDEST        (offset 36 = 0x24... wait, need to recalc)
        //
        // Let me recalculate offsets:
        // 0x00-0x01: 60 00 (2 bytes)
        // 0x02: 80 (1 byte)
        // 0x03: 80 (1 byte)
        // 0x04: 80 (1 byte)
        // 0x05: 34 (1 byte)
        // 0x06: 73 (1 byte)
        // 0x07-0x1a: 20-byte address (20 bytes)
        // 0x1b: 5a (1 byte)
        // 0x1c: f1 (1 byte)
        // 0x1d-0x1e: 60 XX (2 bytes) - PUSH1 for jump dest
        // 0x1f: 57 (1 byte) - JUMPI
        // 0x20-0x21: 60 00 (2 bytes)
        // 0x22: 80 (1 byte)
        // 0x23: fd (1 byte) - REVERT
        // 0x24: 5b (1 byte) - JUMPDEST (at offset 0x24 = 36)
        // 0x25: 00 (1 byte) - STOP
        // Total: 38 bytes
        // Jump destination should be 0x24 = 36
        
        bytes memory runtime = abi.encodePacked(
            hex"6000",               // PUSH1 0 (retSize)
            hex"80",                 // DUP1 (retOffset = 0)
            hex"80",                 // DUP1 (argsSize = 0)
            hex"80",                 // DUP1 (argsOffset = 0)
            hex"34",                 // CALLVALUE
            hex"73",                 // PUSH20
            FUND_ROUTER_ADDRESS,     // 20-byte target address
            hex"5a",                 // GAS
            hex"f1",                 // CALL
            hex"6024",               // PUSH1 36 (0x24 = jump destination)
            hex"57",                 // JUMPI
            hex"6000",               // PUSH1 0
            hex"80",                 // DUP1
            hex"fd",                 // REVERT
            hex"5b",                 // JUMPDEST (at offset 0x24 = 36)
            hex"00"                  // STOP
        );
        // Runtime = 2+1+1+1+1+1+20+1+1+2+1+2+1+1+1+1 = 38 bytes

        // Init code: copy runtime to memory and return it
        // The init code runs during CREATE2 and must return the runtime bytecode
        //
        // Offset  Bytes   Opcode          Description
        // 0x00    60 26   PUSH1 38        runtime length (38 = 0x26)
        // 0x02    60 0c   PUSH1 12        code offset (init code is 12 bytes before runtime)
        // 0x04    60 00   PUSH1 0         memory offset
        // 0x06    39      CODECOPY        copy(memOff=0, codeOff=12, len=38)
        // 0x07    60 26   PUSH1 38        return size
        // 0x09    60 00   PUSH1 0         return offset
        // 0x0b    f3      RETURN          return runtime from memory
        // Total init code: 12 bytes (0x0c)
        
        bytes memory initCode = abi.encodePacked(
            hex"6026",               // PUSH1 38 (runtime length)
            hex"600c",               // PUSH1 12 (code offset = init code length)
            hex"6000",               // PUSH1 0 (memory offset)
            hex"39",                 // CODECOPY
            hex"6026",               // PUSH1 38 (return size)
            hex"6000",               // PUSH1 0 (return offset)
            hex"f3",                 // RETURN
            runtime                  // actual runtime bytecode
        );

        return initCode;
    }

    /// @notice Per-caller salt derivation to avoid collisions across different users.
    /// @dev Salt = keccak256(userSalt || caller) ensures unique addresses per user.
    function _deriveSalt(bytes32 userSalt, address caller) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(userSalt, caller));
    }

    // ---- Public API ----

    /// @notice Deploy multiple proxies at deterministic addresses.
    /// @param salts Array of user-provided salts (will be derived with msg.sender)
    /// @return addrs Array of deployed proxy addresses
    function deployMultiple(bytes32[] calldata salts) external returns (address[] memory addrs) {
        bytes memory bytecode = _proxyInitCode();
        addrs = new address[](salts.length);

        for (uint256 i = 0; i < salts.length; i++) {
            bytes32 salt = _deriveSalt(salts[i], msg.sender);
            address addr;
            assembly {
                // create2(value, ptr, size, salt)
                addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            }
            if (addr == address(0)) revert Create2Failed();
            addrs[i] = addr;
        }
    }

    /// @notice Calculate deterministic addresses without deploying.
    /// @param salts Array of user-provided salts
    /// @return out Array of predicted proxy addresses
    function calculateDestinationAddresses(bytes32[] calldata salts) external view returns (address[] memory out) {
        bytes memory bytecode = _proxyInitCode();
        bytes32 initCodeHash = keccak256(bytecode);

        out = new address[](salts.length);
        for (uint256 i = 0; i < salts.length; i++) {
            bytes32 salt = _deriveSalt(salts[i], msg.sender);
            bytes32 data = keccak256(
                abi.encodePacked(bytes1(0xff), address(this), salt, initCodeHash)
            );
            out[i] = address(uint160(uint256(data)));
        }
    }

    /// @notice Get the init code hash for CREATE2 calculations.
    /// @dev Useful for off-chain address computation in Rust backend.
    function getInitCodeHash() external view returns (bytes32) {
        return keccak256(_proxyInitCode());
    }
}
