// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDAYRIXAToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract DAYRIXAFounderVestingTest {
    IDAYRIXAToken public immutable token;
    address public immutable beneficiary;
    uint256 public immutable start;
    uint256 public immutable allocation;

    uint256 public constant CLIFF = 365 days;
    uint256 public constant VESTING_AFTER_CLIFF = 730 days;
    uint256 public released;

    constructor(address tokenAddress,address beneficiaryAddress,uint256 startTimestamp,uint256 allocationAmount) {
        require(tokenAddress != address(0), "Invalid token");
        require(beneficiaryAddress != address(0), "Invalid beneficiary");
        require(allocationAmount > 0, "Invalid allocation");
        token = IDAYRIXAToken(tokenAddress);
        beneficiary = beneficiaryAddress;
        start = startTimestamp;
        allocation = allocationAmount;
    }

    function vestedAmount() public view returns (uint256) {
        if (block.timestamp < start + CLIFF) return 0;
        if (block.timestamp >= start + CLIFF + VESTING_AFTER_CLIFF) return allocation;
        uint256 timeAfterCliff = block.timestamp - (start + CLIFF);
        return (allocation * timeAfterCliff) / VESTING_AFTER_CLIFF;
    }

    function releasable() public view returns (uint256) { return vestedAmount() - released; }

    function release() external {
        uint256 amount = releasable();
        require(amount > 0, "Nothing to release");
        released += amount;
        require(token.transfer(beneficiary, amount), "Transfer failed");
    }
}
