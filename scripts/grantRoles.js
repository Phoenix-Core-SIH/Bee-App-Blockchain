import { network } from "hardhat";

async function main() {
  const { ethers } = await network.create();
  const [deployer] = await ethers.getSigners();
  const contractAddr = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const BatchRegistry = await ethers.getContractAt("BatchRegistry", contractAddr);
  
  const BEEKEEPER_ROLE = await BatchRegistry.BEEKEEPER_ROLE();
  const PROCESSOR_ROLE = await BatchRegistry.PROCESSOR_ROLE();
  const DISTRIBUTOR_ROLE = await BatchRegistry.DISTRIBUTOR_ROLE();
  
  await BatchRegistry.grantRole(BEEKEEPER_ROLE, deployer.address);
  await BatchRegistry.grantRole(PROCESSOR_ROLE, deployer.address);
  await BatchRegistry.grantRole(DISTRIBUTOR_ROLE, deployer.address);
  
  console.log("Granted all roles to deployer:", deployer.address);
}

main().catch(console.error);
