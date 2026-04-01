// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title GridToken
/// @notice Infrastructure token for the xStocks Grid prediction market.
///
///  One GridToken per tracked stock (gxQQQx, gxSPYx, …).
///
///  ECONOMICS
///  ---------
///  1 GridToken = 1 USDC (always 1:1 redeemable via xStocksGrid)
///
///  How you get GridTokens:
///    A. depositUsdc()   — pay $1 USDC → receive 1 GridToken
///    B. stakeStock()    — stake real xStock worth $100 → receive 70 GridTokens
///
///  How you use GridTokens:
///    - Play the prediction grid (bet on price levels)
///    - Win → more GridTokens
///    - Redeem → burn GridTokens, get USDC back 1:1
///    - Backend then calls xChange API to convert USDC → real xAAPL/xQQQ/etc.
///
///  MINTERS
///  -------
///  Both xStocksGrid (deposit/redeem) and xStockVault (stake/unstake) can
///  mint and burn. Owner manages the minter list.
///
contract GridToken is ERC20 {

    address public owner;

    mapping(address => bool) public isMinter;

    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    constructor(
        string memory name_,
        string memory symbol_,
        address initialMinter_
    ) ERC20(name_, symbol_) {
        require(initialMinter_ != address(0), "zero minter");
        owner = msg.sender;
        isMinter[initialMinter_] = true;
        emit MinterAdded(initialMinter_);
    }

    modifier onlyMinter() {
        require(isMinter[msg.sender], "GridToken: not minter");
        _;
    }

    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyMinter {
        _burn(from, amount);
    }

    function addMinter(address m) external {
        require(msg.sender == owner,  "GridToken: not owner");
        require(m != address(0),      "zero address");
        isMinter[m] = true;
        emit MinterAdded(m);
    }

    function removeMinter(address m) external {
        require(msg.sender == owner, "GridToken: not owner");
        isMinter[m] = false;
        emit MinterRemoved(m);
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner,    "GridToken: not owner");
        require(newOwner != address(0), "zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
