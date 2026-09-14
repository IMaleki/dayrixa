// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DAYRIXA Test Token
 * @notice Experimental test token for BNB Smart Chain Testnet only.
 * @dev DRXA test tokens have no monetary value and are not offered for sale.
 *
 * Fixed supply:
 * 1,000,000,000 DRXA
 *
 * This prototype has:
 * - No mint function
 * - No burn function
 * - No taxes
 * - No blacklist
 * - No owner privileges
 * - No upgradeability
 *
 * The entire fixed supply is assigned to the deployer at deployment.
 */
contract DAYRIXATestToken {
    string public constant name = "DAYRIXA";
    string public constant symbol = "DRXA";
    uint8 public constant decimals = 18;

    uint256 public constant totalSupply = 1_000_000_000 * 10 ** 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "Invalid recipient");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;

        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        require(to != address(0), "Invalid recipient");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(
            allowance[from][msg.sender] >= amount,
            "Insufficient allowance"
        );

        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);
        return true;
    }
}
